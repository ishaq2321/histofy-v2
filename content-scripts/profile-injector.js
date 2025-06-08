// Profile page injector for Histofy
class ProfileInjector {
  constructor() {
    this.activateButton = null;
    this.isInjected = false;
    this.currentYear = new Date().getFullYear();
    this.init();
  }

  // Enhanced initialization with retry logic
  async init() {
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Wait for GitHub's dynamic content with retries
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000 + (attempts * 500)));
      
      if (this.hasContributionGraph()) {
        break;
      }
      
      attempts++;
    }

    this.setupMutationObserver();
    this.injectUI();
    
    // Notify that profile injector is ready
    document.dispatchEvent(new CustomEvent('histofy-profile-ready', {
      detail: { hasContributionGraph: this.hasContributionGraph() }
    }));
  }

  setupMutationObserver() {
    // Watch for GitHub's dynamic content changes
    const observer = new MutationObserver((mutations) => {
      let shouldReinject = false;
      
      mutations.forEach(mutation => {
        // Check if contribution graph area changed
        if (mutation.target.closest?.('.js-yearly-contributions, .contrib-column, .ContributionCalendar')) {
          shouldReinject = true;
        }
        
        // Check if our injected elements were removed
        if (mutation.removedNodes) {
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node.classList?.contains('histofy-activate-section') || 
                 node.querySelector?.('.histofy-activate-section'))) {
              shouldReinject = true;
            }
          });
        }
      });
      
      if (shouldReinject) {
        setTimeout(() => this.injectUI(), 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Enhanced UI injection with better error handling
  injectUI() {
    try {
      // Only inject on profile pages with contribution graphs
      if (!this.isProfilePage() || !this.hasContributionGraph()) {
        return;
      }

      // Prevent duplicate injection
      if (document.querySelector('.histofy-activate-section')) {
        return;
      }

      this.createActivateButton();
      this.isInjected = true;
      
    } catch (error) {
      console.error('Failed to inject UI:', error);
    }
  }

  isProfilePage() {
    // Check if we're on a profile page
    const profileIndicators = [
      '.vcard-names', // Profile name section
      '[itemtype="http://schema.org/Person"]', // Schema.org person
      '.user-profile-nav', // Profile navigation
      '.js-yearly-contributions' // Contribution section
    ];

    return profileIndicators.some(selector => document.querySelector(selector));
  }

  hasContributionGraph() {
    const contributionSelectors = [
      '.ContributionCalendar-grid',
      '.js-calendar-graph-svg',
      '[data-test-selector="contribution-graph"]',
      '.contrib-column'
    ];

    return contributionSelectors.some(selector => document.querySelector(selector));
  }

  createActivateButton() {
    // Find the best place to inject the button
    const contributionSection = this.findContributionSection();
    if (!contributionSection) {
      return;
    }

    // Extract current year from URL or page
    this.extractCurrentYear();

    // Create activation section
    const activateSection = document.createElement('div');
    activateSection.className = 'histofy-activate-section';
    activateSection.innerHTML = `
      <div class="histofy-activate-container">
        <div class="histofy-activate-header">
          <h3>🎯 Histofy - GitHub History Modifier</h3>
          <p>Click contribution tiles to cycle through 5 different contribution levels</p>
        </div>
        <div class="histofy-activate-actions">
          <button class="histofy-activate-btn" id="histofy-activate-btn">
            🚀 Activate Histofy (${this.currentYear})
          </button>
          <div class="histofy-control-buttons" id="histofy-control-buttons" style="display: none;">
            <button class="histofy-store-btn" id="histofy-store-btn">
              💾 Store Changes
            </button>
            <button class="histofy-clear-btn" id="histofy-clear-btn">
              🗑️ Clear All
            </button>
          </div>
        </div>
        <div class="histofy-activate-info">
          <p>• <strong>1st click:</strong> Low contributions (1-3 commits) - Darkest green ✅</p>
          <p>• <strong>2nd click:</strong> Medium contributions (10-14 commits) - Dark green ✅</p>
          <p>• <strong>3rd click:</strong> High contributions (20-24 commits) - Medium green ✅</p>
          <p>• <strong>4th click:</strong> Very high contributions (25+ commits) - Light green ✅</p>
          <p>• <strong>5th click:</strong> Back to no contributions (original state)</p>
        </div>
      </div>
    `;

    // Insert the activation section
    contributionSection.insertBefore(activateSection, contributionSection.firstChild);

    // Setup event listeners
    this.setupActivateButton();
    this.setupControlButtons();
  }

  findContributionSection() {
    // Try multiple selectors to find the contribution section
    const selectors = [
      '.js-yearly-contributions',
      '.js-contribution-graph',
      '.contrib-column',
      '.ContributionCalendar',
      '[data-test-selector="yearly-contribution-graph"]'
    ];

    for (const selector of selectors) {
      const section = document.querySelector(selector);
      if (section) {
        return section;
      }
    }

    return null;
  }

  extractCurrentYear() {
    // Try to get year from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from');
    if (fromParam) {
      const yearMatch = fromParam.match(/(\d{4})/);
      if (yearMatch) {
        this.currentYear = parseInt(yearMatch[1]);
        return;
      }
    }

    // Try to get year from page elements
    const yearElements = document.querySelectorAll('.float-left select option[selected], .float-left select option:first-child');
    yearElements.forEach(element => {
      const yearMatch = element.textContent.match(/(\d{4})/);
      if (yearMatch) {
        this.currentYear = parseInt(yearMatch[1]);
      }
    });

  }

  setupActivateButton() {
    const activateBtn = document.getElementById('histofy-activate-btn');
    if (!activateBtn) return;

    // Remove any existing event listeners
    const newButton = activateBtn.cloneNode(true);
    activateBtn.parentNode.replaceChild(newButton, activateBtn);

    // Add new event listener with proper isolation
    newButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      this.handleActivateClick();
    }, { capture: true, once: false });

  }

  handleActivateClick() {
    console.log('Activate button clicked');

    // Check if already active - if so, deactivate
    if (window.histofyOverlay && window.histofyOverlay.isActive) {
      this.handleDeactivateClick();
      return;
    }

    // Temporarily disable the button to prevent double-clicks
    const activateBtn = document.getElementById('histofy-activate-btn');
    if (activateBtn) {
      activateBtn.disabled = true;
      activateBtn.textContent = '⏳ Activating...';
    }

    // Add comprehensive checks before activation
    setTimeout(async () => {
      try {
        // Step 1: Check if we're on the right page
        if (!this.isValidActivationPage()) {
          throw new Error('Not on a valid GitHub profile page');
        }

        // Step 2: Check if overlay is available
        if (!window.histofyOverlay) {
          console.error('Overlay not available, attempting to reinitialize...');
          
          // Try to reinitialize the overlay
          if (window.ContributionGraphOverlay) {
            window.histofyOverlay = new ContributionGraphOverlay();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for initialization
          } else {
            throw new Error('Histofy overlay class not loaded');
          }
        }

        // Step 3: Check if already active
        if (window.histofyOverlay.isActive) {
          this.showNotification('Histofy is already active!', 'warning');
          this.updateActivateButton(true);
          return;
        }

        // Step 4: Verify contribution graph exists
        if (!this.hasValidContributionGraph()) {
          throw new Error('No valid contribution graph found on this page');
        }

        // Step 5: Attempt activation
        const success = await window.histofyOverlay.activate();
        
        if (success) {
          this.showNotification('Histofy activated! Click on contribution tiles to modify them.', 'success');
          this.updateActivateButton(true);
          
          // Start monitoring for deactivation
          this.startDeactivationMonitoring();
          
        } else {
          throw new Error('Overlay activation returned false');
        }

      } catch (error) {
        console.error('Activation failed:', error);
        this.showNotification(`Activation failed: ${error.message}`, 'error');
        this.updateActivateButton(false);
        
        // Provide helpful troubleshooting message
        this.showTroubleshootingInfo(error);
      }
    }, 200);
  }

  handleDeactivateClick() {
    
    if (window.histofyOverlay && window.histofyOverlay.isActive) {
      window.histofyOverlay.deactivate();
      this.showNotification('Histofy deactivated', 'info');
      this.updateActivateButton(false);
      this.showControlButtons(false);
    }
  }

  setupControlButtons() {
    // Setup Store Changes button
    const storeBtn = document.getElementById('histofy-store-btn');
    if (storeBtn) {
      storeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleStoreChanges();
      });
    }

    // Setup Clear All button
    const clearBtn = document.getElementById('histofy-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleClearAll();
      });
    }
  }

  async handleStoreChanges() {
    console.log('Store Changes button clicked');
    
    if (!window.histofyOverlay || !window.histofyOverlay.isActive) {
      this.showNotification('Histofy is not active', 'warning');
      return;
    }

    // Get the current contributions
    const contributions = window.histofyOverlay.getContributions();
    const selectedCount = Object.keys(contributions).length;
    
    console.log('Store Changes - Current contributions:', contributions);
    console.log('Store Changes - Selected count:', selectedCount);
    
    if (selectedCount === 0) {
      console.log('No contributions found, attempting to reload...');
      
      // Try to reload contributions first
      if (window.histofyOverlay.loadContributions) {
        await window.histofyOverlay.loadContributions();
        const reloadedContributions = window.histofyOverlay.getContributions();
        const reloadedCount = Object.keys(reloadedContributions).length;
        console.log('After reload - contributions count:', reloadedCount);
        
        if (reloadedCount > 0) {
          // Now we have contributions, continue with storing
          if (window.histofyOverlay.forceStorePendingChanges) {
            const success = await window.histofyOverlay.forceStorePendingChanges();
            if (success) {
              this.showNotification(`✅ Stored ${reloadedCount} changes to pending deployment`, 'success');
            } else {
              this.showNotification('Failed to store changes. Please try again.', 'error');
            }
          }
          return;
        }
      }
      
      // Still no contributions - check for visual modifications
      const modifiedTiles = document.querySelectorAll('[data-histofy-title], [title*="Modified by Histofy"]');
      if (modifiedTiles.length > 0) {
        console.log(`Found ${modifiedTiles.length} visually modified tiles, forcing rebuild...`);
        this.showNotification('Detected modified tiles, rebuilding data...', 'info');
        
        if (window.histofyOverlay.forceStorePendingChanges) {
          const success = await window.histofyOverlay.forceStorePendingChanges();
          if (success) {
            this.showNotification(`✅ Rebuilt and stored changes to pending deployment`, 'success');
          } else {
            this.showNotification('Failed to rebuild changes. Please try clicking tiles again.', 'error');
          }
        }
        return;
      }
      
      this.showNotification('No changes to store. Please select some dates first by clicking on contribution tiles.', 'warning');
      return;
    }

    // Force add to pending changes
    if (window.histofyOverlay.forceStorePendingChanges) {
      const success = await window.histofyOverlay.forceStorePendingChanges();
      if (success) {
        this.showNotification(`✅ Stored ${selectedCount} changes to pending deployment`, 'success');
      } else {
        this.showNotification('Failed to store changes. Please try again.', 'error');
      }
    } else {
      this.showNotification('Unable to store changes. Please try again.', 'error');
    }
  }

  handleClearAll() {
    console.log('Clear All button clicked');
    
    if (!window.histofyOverlay || !window.histofyOverlay.isActive) {
      this.showNotification('Histofy is not active', 'warning');
      return;
    }

    // Clear all selections and pending changes
    window.histofyOverlay.clearAllSelections();
    this.showNotification('🗑️ Cleared all selections and stored changes', 'info');
  }

  showControlButtons(show) {
    const controlButtons = document.getElementById('histofy-control-buttons');
    if (controlButtons) {
      controlButtons.style.display = show ? 'flex' : 'none';
    }
  }

  isValidActivationPage() {
    // More comprehensive page validation
    const url = window.location.href;
    const isGitHub = url.includes('github.com');
    const isProfile = this.isProfilePage();
    const hasContributions = this.hasContributionGraph();
    
    console.log('Page validation:', {
      url,
      isGitHub,
      isProfile,
      hasContributions
    });
    
    return isGitHub && isProfile && hasContributions;
  }

  hasValidContributionGraph() {
    const selectors = [
      '.ContributionCalendar-grid',
      '.js-calendar-graph-svg',
      '[data-test-selector="contribution-graph"]',
      '.contrib-column'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const tiles = element.querySelectorAll('[data-date]');
        console.log(`Found contribution graph with ${tiles.length} tiles using selector: ${selector}`);
        return tiles.length > 0;
      }
    }

    console.log('No valid contribution graph found');
    return false;
  }

  showTroubleshootingInfo(error) {
    const troubleshootingMessages = {
      'Not on a valid GitHub profile page': 'Please navigate to a GitHub user profile page (github.com/username)',
      'Histofy overlay class not loaded': 'Extension scripts may not be loaded. Try refreshing the page.',
      'No valid contribution graph found': 'This page doesn\'t have a contribution graph. Make sure you\'re on a profile page.',
      'Overlay activation returned false': 'Could not find contribution tiles. The page might still be loading.'
    };

    const helpMessage = troubleshootingMessages[error.message] || 'Unknown error occurred. Try refreshing the page.';
    
    setTimeout(() => {
      this.showNotification(`💡 Tip: ${helpMessage}`, 'info');
    }, 2000);
  }

  startDeactivationMonitoring() {
    // Clear any existing monitoring
    if (this.deactivationTimer) {
      clearInterval(this.deactivationTimer);
    }

    // Monitor overlay state every 500ms
    this.deactivationTimer = setInterval(() => {
      if (window.histofyOverlay && !window.histofyOverlay.isActive) {
        console.log('Overlay deactivated, updating button');
        this.updateActivateButton(false);
        clearInterval(this.deactivationTimer);
        this.deactivationTimer = null;
      }
    }, 500);
  }

  updateActivateButton(isActive) {
    const activateBtn = document.getElementById('histofy-activate-btn');
    if (!activateBtn) return;

    if (isActive) {
      activateBtn.textContent = '🔴 Deactivate Histofy';
      activateBtn.disabled = false;
      activateBtn.classList.add('histofy-btn-active');
      activateBtn.classList.remove('histofy-btn-success');
      activateBtn.style.opacity = '1';
      activateBtn.style.cursor = 'pointer';
      this.showControlButtons(true);
    } else {
      activateBtn.textContent = `🚀 Activate Histofy (${this.currentYear})`;
      activateBtn.disabled = false;
      activateBtn.classList.remove('histofy-btn-active', 'histofy-btn-success');
      activateBtn.style.opacity = '1';
      activateBtn.style.cursor = 'pointer';
      this.showControlButtons(false);
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `histofy-notification histofy-notification-${type}`;
    notification.textContent = message;
    
    // Position notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10001';
    notification.style.padding = '12px 16px';
    notification.style.borderRadius = '6px';
    notification.style.fontSize = '14px';
    notification.style.fontWeight = '500';
    notification.style.maxWidth = '300px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

    // Set colors based on type
    const colors = {
      success: { bg: '#1a7f37', color: 'white' },
      error: { bg: '#d1242f', color: 'white' },
      warning: { bg: '#fb8500', color: 'white' },
      info: { bg: '#0969da', color: 'white' }
    };

    const colorConfig = colors[type] || colors.info;
    notification.style.backgroundColor = colorConfig.bg;
    notification.style.color = colorConfig.color;

    document.body.appendChild(notification);

    // Auto-remove notification
    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  // Public methods
  refreshUI() {
    this.isInjected = false;
    const existingSection = document.querySelector('.histofy-activate-section');
    if (existingSection) {
      existingSection.remove();
    }
    this.injectUI();
  }

  deactivateOverlay() {
    if (window.histofyOverlay) {
      window.histofyOverlay.deactivate();
      this.updateActivateButton(false);
    }
  }
}

// Initialize profile injector
window.histofyProfileInjector = new ProfileInjector();
