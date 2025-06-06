// GitHub page detector and router for Histofy
class GitHubDetector {
  constructor() {
    this.currentPage = null;
    this.username = null;
    this.repository = null;
    this.init();
  }

  init() {
    console.log('Histofy: GitHub detector initializing...');
    this.detectCurrentPage();
    this.setupNavigationListener();
    this.setupMessageListener();
    console.log('Histofy: GitHub detector initialized');
  }

  setupMessageListener() {
    try {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
          case 'get_page_info':
            sendResponse({
              success: true,
              pageInfo: this.getPageInfo()
            });
            break;

          case 'activate_histofy':
            this.activateHistofy();
            sendResponse({ success: true });
            break;

          case 'NAVIGATION_DETECTED':
            // Handle navigation from background script
            this.detectPage();
            break;

          case 'STORAGE_UPDATED':
            // Handle storage updates from background script
            this.handleStorageUpdate(message.changes);
            break;

          case 'PENDING_CHANGES_CLEARED':
            // Handle pending changes cleared
            this.handlePendingChangesCleared();
            break;
        }
      });
    } catch (error) {
      console.error('Histofy: Failed to setup message listener:', error);
    }
  }

  activateHistofy() {
    // Force re-injection of UI components
    this.notifyPageChange();
    
    // Scroll to relevant section if needed
    if (this.currentPage === 'profile' && this.isContributionGraphVisible()) {
      const graph = document.querySelector('.js-yearly-contributions, .ContributionCalendar');
      if (graph) {
        graph.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (this.currentPage === 'repository' && this.isCommitListVisible()) {
      const commits = document.querySelector('.commit-group, [data-testid="commit-row"]');
      if (commits) {
        commits.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  handleStorageUpdate(changes) {
    try {
      // Broadcast storage updates to UI components
      if (window.histofyContributionOverlay) {
        window.histofyContributionOverlay.handleStorageUpdate(changes);
      }
      if (window.histofyCommitEditor) {
        window.histofyCommitEditor.handleStorageUpdate(changes);
      }
      if (window.histofyDeployButton) {
        window.histofyDeployButton.handleStorageUpdate(changes);
      }
    } catch (error) {
      console.error('Histofy: Error handling storage update:', error);
    }
  }

  handlePendingChangesCleared() {
    try {
      // Notify UI components that pending changes were cleared
      if (window.histofyContributionOverlay) {
        window.histofyContributionOverlay.clearPendingChanges();
      }
      if (window.histofyCommitEditor) {
        window.histofyCommitEditor.clearPendingChanges();
      }
      if (window.histofyDeployButton) {
        window.histofyDeployButton.updatePendingCount();
      }
    } catch (error) {
      console.error('Histofy: Error handling pending changes cleared:', error);
    }
  }

  detectCurrentPage() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Parse GitHub URL structure
    const pathParts = pathname.split('/').filter(part => part.length > 0);
    
    let pageInfo = {
      url: url,
      pathname: pathname,
      isGitHub: url.includes('github.com'),
      page: 'unknown',
      username: null,
      repository: null,
      year: this.extractYear()
    };

    if (!pageInfo.isGitHub) {
      this.currentPage = pageInfo;
      return pageInfo;
    }

    // Detect page type based on URL structure
    if (pathParts.length === 0) {
      // github.com
      pageInfo.page = 'home';
    } else if (pathParts.length === 1) {
      // github.com/username
      pageInfo.page = 'profile';
      pageInfo.username = pathParts[0];
    } else if (pathParts.length === 2) {
      // github.com/username/repository
      pageInfo.page = 'repository';
      pageInfo.username = pathParts[0];
      pageInfo.repository = pathParts[1];
    } else if (pathParts.length >= 3) {
      // github.com/username/repository/...
      pageInfo.username = pathParts[0];
      pageInfo.repository = pathParts[1];
      
      if (pathParts[2] === 'commit' || pathParts[2] === 'commits') {
        pageInfo.page = 'commit';
      } else if (pathParts[2] === 'pull' || pathParts[2] === 'pulls') {
        pageInfo.page = 'pulls';
      } else if (pathParts[2] === 'issues') {
        pageInfo.page = 'issues';
      } else if (pathParts[2] === 'actions') {
        pageInfo.page = 'actions';
      } else if (pathParts[2] === 'settings') {
        pageInfo.page = 'settings';
      } else {
        pageInfo.page = 'repository';
      }
    }

    // Additional checks for specific page types
    if (pageInfo.page === 'profile') {
      // Verify this is actually a profile page
      const hasContributionGraph = document.querySelector('.ContributionCalendar, .js-yearly-contributions, .contrib-column');
      if (!hasContributionGraph) {
        pageInfo.page = 'unknown';
      }
    }

    this.currentPage = pageInfo;
    console.log('Histofy: Detected page info:', pageInfo);
    
    return pageInfo;
  }

  extractYear() {
    // Try URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from');
    if (fromParam) {
      const yearMatch = fromParam.match(/(\d{4})/);
      if (yearMatch) {
        return parseInt(yearMatch[1]);
      }
    }

    // Try page elements
    const yearSelectors = [
      '.js-year-link',
      '.js-selected-year',
      '[data-current-year]',
      '.UnderlineNav-item[aria-current="page"]'
    ];

    for (const selector of yearSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.getAttribute('data-current-year');
        const yearMatch = text.match(/(\d{4})/);
        if (yearMatch) {
          return parseInt(yearMatch[1]);
        }
      }
    }

    // Default to current year
    return new Date().getFullYear();
  }

  setupNavigationListener() {
    // Listen for GitHub's pjax navigation
    let lastUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        setTimeout(() => this.detectPage(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.detectPage(), 100);
    });

    // Listen for GitHub's turbo navigation
    document.addEventListener('turbo:load', () => {
      setTimeout(() => {
        this.detectCurrentPage();
        this.broadcastPageChange();
      }, 500);
    });
  }

  notifyPageChange() {
    try {
      const event = new CustomEvent('histofy-page-change', {
        detail: {
          page: this.currentPage,
          username: this.username,
          repository: this.repository,
          url: window.location.href
        }
      });
      
      document.dispatchEvent(event);
      console.log(`Histofy: Detected ${this.currentPage} page`, {
        username: this.username,
        repository: this.repository
      });
    } catch (error) {
      console.error('Histofy: Error notifying page change:', error);
    }
  }

  broadcastPageChange() {
    // Notify other components about page changes
    document.dispatchEvent(new CustomEvent('histofy-page-change', {
      detail: this.currentPage
    }));

    console.log('Histofy: Broadcasted page change:', this.currentPage);
  }

  getCurrentPageInfo() {
    return {
      page: this.currentPage,
      username: this.username,
      repository: this.repository,
      url: window.location.href
    };
  }

  isProfilePage() {
    return this.currentPage?.page === 'profile';
  }

  isRepositoryPage() {
    return this.currentPage?.page === 'repository';
  }

  isCommitPage(pathname) {
    // Matches: /username/repo/commit/hash or /username/repo/commits
    return pathname.includes('/commit') && this.isRepositoryPage(pathname);
  }

  hasContributionGraph() {
    const selectors = [
      '.ContributionCalendar-grid',
      '.js-calendar-graph-svg',
      '[data-test-selector="contribution-graph"]',
      '.contrib-column',
      '.js-yearly-contributions'
    ];

    return selectors.some(selector => document.querySelector(selector));
  }

  getDebugInfo() {
    return {
      currentPageInfo: this.currentPage,
      contributionGraphExists: this.hasContributionGraph(),
      contributionTiles: document.querySelectorAll('[data-date]').length,
      url: window.location.href,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize detector
window.histofyDetector = new GitHubDetector();

// Make debug info available globally
window.histofyDebug = () => {
  const info = window.histofyDetector.getDebugInfo();
  console.table(info);
  return info;
};
