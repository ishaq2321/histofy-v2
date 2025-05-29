// GitHub page detector and router for Histofy
class GitHubDetector {
  constructor() {
    this.currentPage = null;
    this.username = null;
    this.repository = null;
    this.init();
  }

  init() {
    this.detectPage();
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

  detectPage() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Reset current state
    this.currentPage = null;
    this.username = null;
    this.repository = null;

    // Profile page detection
    if (this.isProfilePage(pathname)) {
      this.currentPage = 'profile';
      this.username = this.extractUsername(pathname);
      this.notifyPageChange();
      return;
    }

    // Repository page detection
    if (this.isRepositoryPage(pathname)) {
      this.currentPage = 'repository';
      const repoInfo = this.extractRepositoryInfo(pathname);
      this.username = repoInfo.username;
      this.repository = repoInfo.repository;
      this.notifyPageChange();
      return;
    }

    // Commit page detection
    if (this.isCommitPage(pathname)) {
      this.currentPage = 'commit';
      const repoInfo = this.extractRepositoryInfo(pathname);
      this.username = repoInfo.username;
      this.repository = repoInfo.repository;
      this.notifyPageChange();
      return;
    }

    console.log('Histofy: Not on a supported GitHub page');
  }

  isProfilePage(pathname) {
    // Matches: /username or /username?tab=overview
    const profileRegex = /^\/([^\/]+)(\?.*)?$/;
    const match = pathname.match(profileRegex);
    
    if (match) {
      // Exclude known GitHub paths that aren't profiles
      const excludedPaths = [
        'explore', 'marketplace', 'topics', 'trending', 'collections',
        'events', 'github', 'about', 'contact', 'pricing', 'team',
        'enterprise', 'features', 'security', 'customer-stories',
        'sponsors', 'readme', 'site', 'business'
      ];
      
      return !excludedPaths.includes(match[1].toLowerCase());
    }
    
    return false;
  }

  isRepositoryPage(pathname) {
    // Matches: /username/repo or /username/repo/anything
    const repoRegex = /^\/([^\/]+)\/([^\/]+)/;
    return repoRegex.test(pathname);
  }

  isCommitPage(pathname) {
    // Matches: /username/repo/commit/hash or /username/repo/commits
    return pathname.includes('/commit') && this.isRepositoryPage(pathname);
  }

  extractUsername(pathname) {
    const match = pathname.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
  }

  extractRepositoryInfo(pathname) {
    const match = pathname.match(/^\/([^\/]+)\/([^\/]+)/);
    return match ? {
      username: match[1],
      repository: match[2]
    } : { username: null, repository: null };
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

  getCurrentPageInfo() {
    return {
      page: this.currentPage,
      username: this.username,
      repository: this.repository,
      url: window.location.href
    };
  }

  isContributionGraphVisible() {
    return document.querySelector('.js-yearly-contributions') !== null ||
           document.querySelector('.ContributionCalendar') !== null;
  }

  isCommitListVisible() {
    return document.querySelector('.commit-group') !== null ||
           document.querySelector('[data-testid="commit-row"]') !== null;
  }
}

// Initialize detector
window.histofyDetector = new GitHubDetector();
