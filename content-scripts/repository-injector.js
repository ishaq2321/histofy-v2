// Repository page injector for Histofy
class RepositoryInjector {
  constructor() {
    this.isInjected = false;
    this.currentRepo = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('Histofy: Repository injector initialized');
  }

  setupEventListeners() {
    document.addEventListener('histofy-page-change', (event) => {
      const { page, username, repository } = event.detail;
      if (page === 'repository') {
        this.currentRepo = { username, repository };
        setTimeout(() => this.injectRepositoryControls(), 500);
      } else {
        this.cleanup();
      }
    });
  }

  injectRepositoryControls() {
    if (this.isInjected) {
      console.log('Histofy: Repository controls already injected');
      return;
    }

    const repoHeader = this.findRepositoryHeader();
    if (!repoHeader) {
      console.log('Histofy: Repository header not found');
      return;
    }

    this.createRepositoryPanel(repoHeader);
    this.isInjected = true;

    console.log('Histofy: Repository controls injected successfully');
  }

  findRepositoryHeader() {
    const selectors = [
      '[data-testid="repository-container-header"]',
      '.repository-content',
      '.pagehead',
      '.repohead'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  createRepositoryPanel(container) {
    const panel = document.createElement('div');
    panel.className = 'histofy-repository-panel';
    panel.innerHTML = `
      <div class="histofy-repo-header">
        <div class="histofy-repo-title">
          <h3>🔧 Histofy Repository Tools</h3>
          <span class="histofy-repo-info">${this.currentRepo.username}/${this.currentRepo.repository}</span>
        </div>
        <button class="histofy-btn histofy-btn-primary" id="histofy-toggle-repo-tools">
          <span id="histofy-toggle-text">Show Tools</span>
          <span id="histofy-toggle-icon">▼</span>
        </button>
      </div>
      
      <div class="histofy-repo-content" id="histofy-repo-content" style="display: none;">
        <div class="histofy-repo-tabs">
          <button class="histofy-tab histofy-tab-active" data-tab="commits">📝 Commit History</button>
          <button class="histofy-tab" data-tab="generator">🎲 Commit Generator</button>
          <button class="histofy-tab" data-tab="settings">⚙️ Repository Settings</button>
        </div>
        
        <div class="histofy-tab-content histofy-tab-commits histofy-tab-active">
          <div class="histofy-commits-section">
            <h4>Commit Timeline Management</h4>
            <div class="histofy-commits-controls">
              <button class="histofy-btn histofy-btn-secondary" id="histofy-activate-commit-editor">
                🎯 Activate Commit Editor
              </button>
              <button class="histofy-btn histofy-btn-secondary" id="histofy-bulk-select">
                📋 Bulk Select Mode
              </button>
              <button class="histofy-btn histofy-btn-warning" id="histofy-rewrite-history">
                ⚠️ Rewrite History
              </button>
            </div>
            <div class="histofy-commit-stats">
              <div class="histofy-stat-card">
                <span class="histofy-stat-number" id="histofy-repo-commits">-</span>
                <span class="histofy-stat-label">Total Commits</span>
              </div>
              <div class="histofy-stat-card">
                <span class="histofy-stat-number" id="histofy-selected-commits">0</span>
                <span class="histofy-stat-label">Selected</span>
              </div>
              <div class="histofy-stat-card">
                <span class="histofy-stat-number" id="histofy-pending-operations">0</span>
                <span class="histofy-stat-label">Pending</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="histofy-tab-content histofy-tab-generator">
          <div class="histofy-generator-section">
            <h4>Automated Commit Generation</h4>
            <div class="histofy-generator-form">
              <div class="histofy-form-row">
                <div class="histofy-form-group">
                  <label>Start Date:</label>
                  <input type="date" id="histofy-gen-start-date" class="histofy-input">
                </div>
                <div class="histofy-form-group">
                  <label>End Date:</label>
                  <input type="date" id="histofy-gen-end-date" class="histofy-input">
                </div>
              </div>
              <div class="histofy-form-row">
                <div class="histofy-form-group">
                  <label>Commit Pattern:</label>
                  <select id="histofy-gen-pattern" class="histofy-input">
                    <option value="random">Random Distribution</option>
                    <option value="workdays">Workdays Only</option>
                    <option value="weekends">Weekends Only</option>
                    <option value="daily">Daily Consistent</option>
                    <option value="burst">Burst Mode</option>
                  </select>
                </div>
                <div class="histofy-form-group">
                  <label>Commits Per Day:</label>
                  <select id="histofy-gen-frequency" class="histofy-input">
                    <option value="1-3">1-3 commits</option>
                    <option value="4-8">4-8 commits</option>
                    <option value="9-15">9-15 commits</option>
                    <option value="16-25">16-25 commits</option>
                  </select>
                </div>
              </div>
              <div class="histofy-form-row">
                <div class="histofy-form-group">
                  <label>Commit Message Template:</label>
                  <input type="text" id="histofy-gen-message" class="histofy-input" 
                         placeholder="Update project - {date} | Made by Histofy">
                </div>
              </div>
              <div class="histofy-generator-actions">
                <button class="histofy-btn histofy-btn-secondary" id="histofy-preview-generation">
                  👁️ Preview
                </button>
                <button class="histofy-btn histofy-btn-primary" id="histofy-queue-generation">
                  📥 Queue Generation
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="histofy-tab-content histofy-tab-settings">
          <div class="histofy-settings-section">
            <h4>Repository Configuration</h4>
            <div class="histofy-settings-form">
              <div class="histofy-form-group">
                <label>
                  <input type="checkbox" id="histofy-backup-enabled" checked>
                  Auto-backup before modifications
                </label>
              </div>
              <div class="histofy-form-group">
                <label>
                  <input type="checkbox" id="histofy-histofy-attribution">
                  Add "Made by Histofy" attribution
                </label>
              </div>
              <div class="histofy-form-group">
                <label>Default Author:</label>
                <input type="text" id="histofy-default-author" class="histofy-input" 
                       placeholder="Your Name <your.email@example.com>">
              </div>
              <div class="histofy-form-group">
                <label>Force Push Warning:</label>
                <select id="histofy-force-push-warning" class="histofy-input">
                  <option value="always">Always warn</option>
                  <option value="public">Warn for public repos only</option>
                  <option value="never">Never warn</option>
                </select>
              </div>
              <div class="histofy-settings-actions">
                <button class="histofy-btn histofy-btn-secondary" id="histofy-export-config">
                  📤 Export Config
                </button>
                <button class="histofy-btn histofy-btn-primary" id="histofy-save-settings">
                  💾 Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert panel after repository header
    container.parentNode.insertBefore(panel, container.nextSibling);
    this.setupRepositoryHandlers(panel);
    this.updateRepositoryStats();
  }

  setupRepositoryHandlers(panel) {
    // Toggle panel visibility
    const toggleBtn = panel.querySelector('#histofy-toggle-repo-tools');
    const content = panel.querySelector('#histofy-repo-content');
    const toggleText = panel.querySelector('#histofy-toggle-text');
    const toggleIcon = panel.querySelector('#histofy-toggle-icon');

    toggleBtn.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      toggleText.textContent = isVisible ? 'Show Tools' : 'Hide Tools';
      toggleIcon.textContent = isVisible ? '▼' : '▲';
    });

    // Tab switching
    const tabs = panel.querySelectorAll('.histofy-tab');
    const tabContents = panel.querySelectorAll('.histofy-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('histofy-tab-active'));
        tabContents.forEach(tc => tc.classList.remove('histofy-tab-active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('histofy-tab-active');
        panel.querySelector(`.histofy-tab-${tabName}`).classList.add('histofy-tab-active');
      });
    });

    // Commit tab handlers
    this.setupCommitTabHandlers(panel);
    
    // Generator tab handlers
    this.setupGeneratorTabHandlers(panel);
    
    // Settings tab handlers
    this.setupSettingsTabHandlers(panel);
  }

  setupCommitTabHandlers(panel) {
    const activateEditorBtn = panel.querySelector('#histofy-activate-commit-editor');
    const bulkSelectBtn = panel.querySelector('#histofy-bulk-select');
    const rewriteHistoryBtn = panel.querySelector('#histofy-rewrite-history');

    activateEditorBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('histofy-toggle-commit-editor'));
      this.showNotification('Commit editor activated!', 'success');
    });

    bulkSelectBtn.addEventListener('click', () => {
      this.showNotification('🚧 Bulk select mode coming in Phase 2!', 'info');
    });

    rewriteHistoryBtn.addEventListener('click', () => {
      this.showRewriteHistoryModal();
    });
  }

  setupGeneratorTabHandlers(panel) {
    const previewBtn = panel.querySelector('#histofy-preview-generation');
    const queueBtn = panel.querySelector('#histofy-queue-generation');

    // Set default dates
    const startDate = panel.querySelector('#histofy-gen-start-date');
    const endDate = panel.querySelector('#histofy-gen-end-date');
    const today = new Date();
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    startDate.value = oneMonthAgo.toISOString().split('T')[0];
    endDate.value = today.toISOString().split('T')[0];

    previewBtn.addEventListener('click', () => {
      this.previewCommitGeneration(panel);
    });

    queueBtn.addEventListener('click', () => {
      this.queueCommitGeneration(panel);
    });
  }

  setupSettingsTabHandlers(panel) {
    const saveBtn = panel.querySelector('#histofy-save-settings');
    const exportBtn = panel.querySelector('#histofy-export-config');

    saveBtn.addEventListener('click', () => {
      this.saveRepositorySettings(panel);
    });

    exportBtn.addEventListener('click', () => {
      this.exportConfiguration();
    });

    // Load existing settings
    this.loadRepositorySettings(panel);
  }

  showRewriteHistoryModal() {
    const modal = document.createElement('div');
    modal.className = 'histofy-modal';
    modal.innerHTML = `
      <div class="histofy-modal-content">
        <div class="histofy-modal-header">
          <h3>⚠️ Rewrite Git History</h3>
          <button class="histofy-modal-close">&times;</button>
        </div>
        <div class="histofy-modal-body">
          <div class="histofy-warning-box">
            <p><strong>⚠️ WARNING:</strong> This operation will permanently modify git history!</p>
            <p>Make sure you have a backup and understand the consequences.</p>
          </div>
          <div class="histofy-form-group">
            <label>Operation Type:</label>
            <select id="histofy-rewrite-type" class="histofy-input">
              <option value="interactive">Interactive Rebase</option>
              <option value="filter-branch">Filter Branch</option>
              <option value="reset">Soft Reset</option>
            </select>
          </div>
          <div class="histofy-form-group">
            <label>Target Range:</label>
            <input type="text" id="histofy-rewrite-range" class="histofy-input" 
                   placeholder="HEAD~10..HEAD or commit-hash">
          </div>
        </div>
        <div class="histofy-modal-footer">
          <button class="histofy-btn histofy-btn-secondary histofy-modal-cancel">Cancel</button>
          <button class="histofy-btn histofy-btn-danger" id="histofy-execute-rewrite">⚠️ Execute</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupModalHandlers(modal);
  }

  async previewCommitGeneration(panel) {
    const formData = this.getGeneratorFormData(panel);
    
    const preview = document.createElement('div');
    preview.className = 'histofy-preview-modal';
    preview.innerHTML = `
      <div class="histofy-modal-content">
        <div class="histofy-modal-header">
          <h3>👁️ Generation Preview</h3>
          <button class="histofy-modal-close">&times;</button>
        </div>
        <div class="histofy-modal-body">
          <p><strong>Pattern:</strong> ${formData.pattern}</p>
          <p><strong>Date Range:</strong> ${formData.startDate} to ${formData.endDate}</p>
          <p><strong>Frequency:</strong> ${formData.frequency} commits per day</p>
          <p><strong>Estimated Total:</strong> ~${this.calculateEstimatedCommits(formData)} commits</p>
          <div class="histofy-preview-calendar">
            <!-- Calendar preview would be generated here -->
            <p>📅 Calendar preview coming in Phase 2!</p>
          </div>
        </div>
        <div class="histofy-modal-footer">
          <button class="histofy-btn histofy-btn-secondary histofy-modal-cancel">Close</button>
          <button class="histofy-btn histofy-btn-primary" id="histofy-proceed-generation">✅ Looks Good</button>
        </div>
      </div>
    `;

    document.body.appendChild(preview);
    this.setupModalHandlers(preview);
  }

  async queueCommitGeneration(panel) {
    const formData = this.getGeneratorFormData(panel);
    
    const generationData = {
      type: 'generate_commits',
      repository: this.currentRepo,
      ...formData,
      timestamp: new Date().toISOString()
    };

    if (window.histofyStorage) {
      await window.histofyStorage.addPendingChange(generationData);
    }

    this.showNotification('Commit generation queued for deployment!', 'success');
    this.updateRepositoryStats();
  }

  getGeneratorFormData(panel) {
    return {
      startDate: panel.querySelector('#histofy-gen-start-date').value,
      endDate: panel.querySelector('#histofy-gen-end-date').value,
      pattern: panel.querySelector('#histofy-gen-pattern').value,
      frequency: panel.querySelector('#histofy-gen-frequency').value,
      messageTemplate: panel.querySelector('#histofy-gen-message').value || 'Update project - {date} | Made by Histofy'
    };
  }

  calculateEstimatedCommits(formData) {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const avgCommitsPerDay = formData.frequency.split('-').map(n => parseInt(n)).reduce((a, b) => a + b) / 2;
    return Math.round(days * avgCommitsPerDay * 0.7); // 70% activity rate
  }

  async saveRepositorySettings(panel) {
    const settings = {
      backupEnabled: panel.querySelector('#histofy-backup-enabled').checked,
      histofyAttribution: panel.querySelector('#histofy-histofy-attribution').checked,
      defaultAuthor: panel.querySelector('#histofy-default-author').value,
      forcePushWarning: panel.querySelector('#histofy-force-push-warning').value
    };

    if (window.histofyStorage) {
      await window.histofyStorage.updateUserSettings({
        [`repo_${this.currentRepo.username}_${this.currentRepo.repository}`]: settings
      });
    }

    this.showNotification('Repository settings saved!', 'success');
  }

  async loadRepositorySettings(panel) {
    if (window.histofyStorage) {
      const userSettings = await window.histofyStorage.getUserSettings();
      const repoSettings = userSettings[`repo_${this.currentRepo.username}_${this.currentRepo.repository}`];
      
      if (repoSettings) {
        panel.querySelector('#histofy-backup-enabled').checked = repoSettings.backupEnabled !== false;
        panel.querySelector('#histofy-histofy-attribution').checked = repoSettings.histofyAttribution || false;
        panel.querySelector('#histofy-default-author').value = repoSettings.defaultAuthor || '';
        panel.querySelector('#histofy-force-push-warning').value = repoSettings.forcePushWarning || 'always';
      }
    }
  }

  async updateRepositoryStats() {
    // Update repository statistics
    if (window.histofyStorage) {
      const stats = await window.histofyStorage.getStorageStats();
      const pendingElement = document.querySelector('#histofy-pending-operations');
      if (pendingElement) pendingElement.textContent = stats.pendingChanges;
    }
  }

  setupModalHandlers(modal) {
    const closeBtn = modal.querySelector('.histofy-modal-close');
    const cancelBtn = modal.querySelector('.histofy-modal-cancel');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.remove());
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.remove());

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  exportConfiguration() {
    this.showNotification('🚧 Configuration export coming in Phase 2!', 'info');
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
    // Remove injected elements when leaving repository page
    const injectedElements = document.querySelectorAll('.histofy-repository-panel');
    injectedElements.forEach(el => el.remove());
    
    this.isInjected = false;
    this.currentRepo = null;
  }
}

// Initialize repository injector
window.histofyRepositoryInjector = new RepositoryInjector();
