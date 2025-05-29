// Profile page injector for Histofy
class ProfileInjector {
  constructor() {
    this.isInjected = false;
    this.mutationObserver = null;
    this.currentYear = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('Histofy: Profile injector initialized');
  }

  setupEventListeners() {
    document.addEventListener('histofy-page-change', (event) => {
      const { page } = event.detail;
      if (page === 'profile') {
        setTimeout(() => this.injectProfileControls(), 500);
      } else {
        this.cleanup();
      }
    });
  }

  injectProfileControls() {
    // Always cleanup any existing elements first to prevent duplicates
    this.cleanup();

    const contributionGraph = this.findContributionSection();
    if (!contributionGraph) {
      console.log('Histofy: Contribution section not found');
      return;
    }

    // Extract current year from the page
    this.currentYear = this.extractCurrentYear();
    
    this.createProfileHeader(contributionGraph);
    this.createQuickActions(contributionGraph);
    this.setupYearChangeObserver();
    this.isInjected = true;

    console.log(`Histofy: Profile controls injected successfully for year ${this.currentYear}`);
  }

  findContributionSection() {
    const selectors = [
      '.js-yearly-contributions',
      '.ContributionCalendar',
      '[data-testid="contribution-graph"]',
      '.contrib-footer'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.closest('.BorderGrid-cell') || element.parentNode;
      }
    }

    return null;
  }

  extractCurrentYear() {
    // Try to extract year from contribution graph heading or URL
    const yearElement = document.querySelector('.js-yearly-contributions h2');
    if (yearElement) {
      const match = yearElement.textContent.match(/(\d{4})/);
      if (match) return match[1];
    }

    // Fallback to current year
    return new Date().getFullYear().toString();
  }

  setupYearChangeObserver() {
    // Disconnect existing observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Find the contribution graph container to observe
    const contributionContainer = document.querySelector('.js-yearly-contributions');
    if (!contributionContainer) return;

    // Create mutation observer to detect year changes
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldReinject = false;
      
      mutations.forEach((mutation) => {
        // Check if the contribution graph content changed
        if (mutation.type === 'childList' && mutation.target.closest('.js-yearly-contributions')) {
          const newYear = this.extractCurrentYear();
          if (newYear !== this.currentYear) {
            shouldReinject = true;
          }
        }
      });

      if (shouldReinject) {
        console.log('Histofy: Year change detected, re-injecting controls');
        setTimeout(() => this.injectProfileControls(), 100);
      }
    });

    // Start observing
    this.mutationObserver.observe(contributionContainer, {
      childList: true,
      subtree: true
    });
  }

  createProfileHeader(container) {
    const header = document.createElement('div');
    header.className = 'histofy-profile-header';
    header.innerHTML = `
      <div class="histofy-profile-title">
        <h2>🎯 Histofy Profile Controls (${this.currentYear})</h2>
        <p>Manage your GitHub contribution history with precision</p>
      </div>
      <div class="histofy-profile-stats" id="histofy-profile-stats">
        <div class="histofy-stat">
          <span class="histofy-stat-number" id="histofy-pending-changes">0</span>
          <span class="histofy-stat-label">Pending Changes</span>
        </div>
        <div class="histofy-stat">
          <span class="histofy-stat-number" id="histofy-selected-dates">0</span>
          <span class="histofy-stat-label">Selected Dates</span>
        </div>
        <div class="histofy-stat">
          <span class="histofy-stat-number" id="histofy-total-contributions">-</span>
          <span class="histofy-stat-label">Total Contributions</span>
        </div>
      </div>
    `;

    container.insertBefore(header, container.firstChild);
    this.updateStats();
  }

  createQuickActions(container) {
    const actions = document.createElement('div');
    actions.className = 'histofy-quick-actions';
    actions.innerHTML = `
      <div class="histofy-actions-section">
        <h3>⚡ Quick Actions</h3>
        <div class="histofy-actions-grid">
          <button class="histofy-action-card" id="histofy-activate-selection">
            <div class="histofy-action-icon">📅</div>
            <div class="histofy-action-content">
              <h4>Activate Histofy (${this.currentYear})</h4>
              <p>Click on contribution squares to select dates for modification</p>
            </div>
          </button>
          
          <button class="histofy-action-card" id="histofy-generate-random">
            <div class="histofy-action-icon">🎲</div>
            <div class="histofy-action-content">
              <h4>Generate Random (${this.currentYear})</h4>
              <p>Create random contribution patterns for selected year</p>
            </div>
          </button>
          
          <button class="histofy-action-card" id="histofy-time-travel">
            <div class="histofy-action-icon">⏰</div>
            <div class="histofy-action-content">
              <h4>Time Travel</h4>
              <p>Move commits to past or future dates</p>
            </div>
          </button>
          
          <button class="histofy-action-card" id="histofy-pattern-maker">
            <div class="histofy-action-icon">🎨</div>
            <div class="histofy-action-content">
              <h4>Pattern Maker</h4>
              <p>Create custom contribution patterns and designs</p>
            </div>
          </button>
        </div>
      </div>
      
      <div class="histofy-intensity-section">
        <h3>📊 Contribution Intensity</h3>
        <div class="histofy-intensity-controls">
          <div class="histofy-intensity-grid">
            <button class="histofy-intensity-btn" data-commits="low" data-intensity="low">
              <span class="histofy-intensity-preview histofy-preview-low-low"></span>
              <span>Low/Low</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="low" data-intensity="medium">
              <span class="histofy-intensity-preview histofy-preview-low-medium"></span>
              <span>Low/Medium</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="low" data-intensity="high">
              <span class="histofy-intensity-preview histofy-preview-low-high"></span>
              <span>Low/High</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="medium" data-intensity="low">
              <span class="histofy-intensity-preview histofy-preview-medium-low"></span>
              <span>Medium/Low</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="medium" data-intensity="medium">
              <span class="histofy-intensity-preview histofy-preview-medium-medium"></span>
              <span>Medium/Medium</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="medium" data-intensity="high">
              <span class="histofy-intensity-preview histofy-preview-medium-high"></span>
              <span>Medium/High</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="high" data-intensity="low">
              <span class="histofy-intensity-preview histofy-preview-high-low"></span>
              <span>High/Low</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="high" data-intensity="medium">
              <span class="histofy-intensity-preview histofy-preview-high-medium"></span>
              <span>High/Medium</span>
            </button>
            <button class="histofy-intensity-btn" data-commits="high" data-intensity="high">
              <span class="histofy-intensity-preview histofy-preview-high-high"></span>
              <span>High/High</span>
            </button>
          </div>
          <div class="histofy-intensity-info">
            <p><strong>Format:</strong> Commits/Intensity</p>
            <p><strong>Commits:</strong> Number of commits per day</p>
            <p><strong>Intensity:</strong> Contribution level visual appearance</p>
          </div>
        </div>
      </div>
    `;

    // Find a good place to insert actions
    const graphContainer = container.querySelector('.js-yearly-contributions') || container;
    graphContainer.parentNode.insertBefore(actions, graphContainer.nextSibling);

    this.setupActionHandlers(actions);
  }

  setupActionHandlers(actionsContainer) {
    // Quick action buttons
    const activateBtn = actionsContainer.querySelector('#histofy-activate-selection');
    const generateBtn = actionsContainer.querySelector('#histofy-generate-random');
    const timeTravelBtn = actionsContainer.querySelector('#histofy-time-travel');
    const patternBtn = actionsContainer.querySelector('#histofy-pattern-maker');

    activateBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('histofy-toggle-overlay', {
        detail: { year: this.currentYear }
      }));
      this.showNotification(`Contribution graph overlay activated for ${this.currentYear}!`, 'success');
    });

    generateBtn.addEventListener('click', () => {
      this.showRandomGenerationModal();
    });

    timeTravelBtn.addEventListener('click', () => {
      this.showTimeTravelModal();
    });

    patternBtn.addEventListener('click', () => {
      this.showNotification('🚧 Pattern Maker coming in Phase 2!', 'info');
    });

    // Intensity buttons
    const intensityButtons = actionsContainer.querySelectorAll('.histofy-intensity-btn');
    intensityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const commits = btn.getAttribute('data-commits');
        const intensity = btn.getAttribute('data-intensity');
        this.selectIntensityPattern(commits, intensity);
      });
    });
  }

  showRandomGenerationModal() {
    const modal = document.createElement('div');
    modal.className = 'histofy-modal';
    modal.innerHTML = `
      <div class="histofy-modal-content">
        <div class="histofy-modal-header">
          <h3>🎲 Generate Random Contributions</h3>
          <button class="histofy-modal-close">&times;</button>
        </div>
        <div class="histofy-modal-body">
          <div class="histofy-form-group">
            <label>Target Year:</label>
            <select id="histofy-target-year" class="histofy-input">
              ${this.generateYearOptions()}
            </select>
          </div>
          <div class="histofy-form-group">
            <label>Commit Frequency:</label>
            <select id="histofy-commit-frequency" class="histofy-input">
              <option value="low">Low (1-3 commits per day)</option>
              <option value="medium">Medium (4-8 commits per day)</option>
              <option value="high">High (9-15 commits per day)</option>
            </select>
          </div>
          <div class="histofy-form-group">
            <label>Contribution Intensity:</label>
            <select id="histofy-contribution-intensity" class="histofy-input">
              <option value="low">Low (1-25% days active)</option>
              <option value="medium">Medium (26-60% days active)</option>
              <option value="high">High (61-90% days active)</option>
            </select>
          </div>
          <div class="histofy-form-group">
            <label>Pattern:</label>
            <select id="histofy-pattern" class="histofy-input">
              <option value="random">Random</option>
              <option value="weekdays">Weekdays Only</option>
              <option value="weekends">Weekends Only</option>
              <option value="consistent">Consistent Daily</option>
            </select>
          </div>
        </div>
        <div class="histofy-modal-footer">
          <button class="histofy-btn histofy-btn-secondary histofy-modal-cancel">Cancel</button>
          <button class="histofy-btn histofy-btn-primary" id="histofy-generate-commits">Generate</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupModalHandlers(modal);
  }

  showTimeTravelModal() {
    const modal = document.createElement('div');
    modal.className = 'histofy-modal';
    modal.innerHTML = `
      <div class="histofy-modal-content">
        <div class="histofy-modal-header">
          <h3>⏰ Time Travel Commits</h3>
          <button class="histofy-modal-close">&times;</button>
        </div>
        <div class="histofy-modal-body">
          <div class="histofy-form-group">
            <label>Source Date Range:</label>
            <input type="date" id="histofy-source-start" class="histofy-input">
            <input type="date" id="histofy-source-end" class="histofy-input">
          </div>
          <div class="histofy-form-group">
            <label>Target Date:</label>
            <input type="date" id="histofy-target-date" class="histofy-input">
          </div>
          <div class="histofy-form-group">
            <label>Operation:</label>
            <select id="histofy-time-operation" class="histofy-input">
              <option value="move">Move (relocate commits)</option>
              <option value="copy">Copy (duplicate commits)</option>
              <option value="shift">Shift (move by days offset)</option>
            </select>
          </div>
        </div>
        <div class="histofy-modal-footer">
          <button class="histofy-btn histofy-btn-secondary histofy-modal-cancel">Cancel</button>
          <button class="histofy-btn histofy-btn-primary" id="histofy-time-travel-execute">Execute</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupModalHandlers(modal);
  }

  setupModalHandlers(modal) {
    const closeBtn = modal.querySelector('.histofy-modal-close');
    const cancelBtn = modal.querySelector('.histofy-modal-cancel');

    closeBtn.addEventListener('click', () => modal.remove());
    cancelBtn.addEventListener('click', () => modal.remove());

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  generateYearOptions() {
    const currentYear = new Date().getFullYear();
    let options = '';
    for (let year = currentYear; year >= currentYear - 10; year--) {
      options += `<option value="${year}">${year}</option>`;
    }
    return options;
  }

  async selectIntensityPattern(commits, intensity) {
    const patternData = {
      type: 'intensity_pattern',
      commits: commits,
      intensity: intensity,
      timestamp: new Date().toISOString()
    };

    if (window.histofyStorage) {
      await window.histofyStorage.addPendingChange(patternData);
    }

    this.showNotification(`Selected ${commits}/${intensity} pattern`, 'success');
    this.updateStats();
  }

  async updateStats() {
    if (window.histofyStorage) {
      const stats = await window.histofyStorage.getStorageStats();
      
      const pendingElement = document.querySelector('#histofy-pending-changes');
      if (pendingElement) pendingElement.textContent = stats.pendingChanges;
    }

    // Update total contributions from the page
    const totalElement = document.querySelector('#histofy-total-contributions');
    if (totalElement) {
      const contributionText = document.querySelector('.js-yearly-contributions h2')?.textContent;
      if (contributionText) {
        const match = contributionText.match(/(\d+)/);
        totalElement.textContent = match ? match[1] : '-';
      }
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `histofy-notification histofy-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  cleanup() {
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove injected elements when leaving profile page
    const injectedElements = document.querySelectorAll('.histofy-profile-header, .histofy-quick-actions');
    injectedElements.forEach(el => el.remove());
    
    this.isInjected = false;
    this.currentYear = null;
  }
}

// Initialize profile injector
window.histofyProfileInjector = new ProfileInjector();
