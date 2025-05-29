// Deploy button component for Histofy
class DeployButton {
  constructor() {
    this.isDeploying = false;
    this.pendingChanges = [];
    this.githubAPI = null;
    this.gitOperations = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.createFloatingButton();
    await this.initializeAPI();
    console.log('Histofy: Deploy button initialized');
  }

  async initializeAPI() {
    try {
      // Initialize GitHub API if available
      if (window.GitHubAPI) {
        this.githubAPI = new window.GitHubAPI();
        await this.githubAPI.init();
      }

      // Initialize Git operations if available
      if (window.GitOperations && this.githubAPI) {
        this.gitOperations = new window.GitOperations(this.githubAPI);
        await this.gitOperations.init();
      }

      // Update UI based on authentication status
      this.updateAuthenticationUI();
    } catch (error) {
      console.error('Histofy: Failed to initialize deploy button API:', error);
    }
  }

  updateAuthenticationUI() {
    const authSection = document.querySelector('.histofy-auth-section');
    const deployBtn = document.querySelector('#histofy-main-deploy');
    
    if (!authSection || !deployBtn) return;

    if (this.githubAPI && this.githubAPI.isAuthenticated()) {
      authSection.innerHTML = `
        <div class="histofy-auth-status">
          <span class="histofy-auth-success">✅ Authenticated as ${this.githubAPI.user?.login || 'Unknown'}</span>
          <button class="histofy-btn histofy-btn-warning" id="histofy-logout">🔓 Logout</button>
        </div>
      `;
      deployBtn.disabled = false;
      this.setupLogoutHandler();
    } else {
      authSection.innerHTML = `
        <div class="histofy-auth-inputs">
          <input type="text" placeholder="GitHub Username" id="histofy-username" class="histofy-input">
          <input type="password" placeholder="Personal Access Token" id="histofy-token" class="histofy-input">
          <button class="histofy-btn histofy-btn-secondary" id="histofy-save-auth">💾 Save Credentials</button>
        </div>
        <div class="histofy-auth-help">
          <p>🔗 <a href="https://github.com/settings/tokens" target="_blank">Create Personal Access Token</a></p>
          <p>Required scopes: <code>repo</code>, <code>user</code></p>
        </div>
      `;
      deployBtn.disabled = true;
      this.setupAuthHandlers();
    }
  }

  setupLogoutHandler() {
    const logoutBtn = document.querySelector('#histofy-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (this.githubAPI) {
          await this.githubAPI.clearCredentials();
          this.updateAuthenticationUI();
          this.showNotification('Logged out successfully', 'success');
        }
      });
    }
  }

  setupAuthHandlers() {
    const saveAuthBtn = document.querySelector('#histofy-save-auth');
    if (saveAuthBtn) {
      saveAuthBtn.addEventListener('click', async () => {
        await this.handleAuthentication();
      });
    }

    // Auto-save on enter key
    const inputs = document.querySelectorAll('#histofy-username, #histofy-token');
    inputs.forEach(input => {
      input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await this.handleAuthentication();
        }
      });
    });
  }

  async handleAuthentication() {
    const usernameInput = document.querySelector('#histofy-username');
    const tokenInput = document.querySelector('#histofy-token');
    
    if (!usernameInput || !tokenInput) return;

    const token = tokenInput.value.trim();
    
    if (!token) {
      this.showNotification('Please enter a GitHub token', 'error');
      return;
    }

    try {
      this.showNotification('Validating credentials...', 'info');
      
      if (this.githubAPI) {
        await this.githubAPI.saveCredentials(token);
        const isValid = await this.githubAPI.validateToken();
        
        if (isValid) {
          this.updateAuthenticationUI();
          this.showNotification('Authentication successful!', 'success');
          usernameInput.value = '';
          tokenInput.value = '';
        } else {
          this.showNotification('Invalid token. Please check your credentials.', 'error');
        }
      }
    } catch (error) {
      console.error('Histofy: Authentication failed:', error);
      this.showNotification('Authentication failed. Please try again.', 'error');
    }
  }

  setupEventListeners() {
    document.addEventListener('histofy-page-change', () => {
      setTimeout(() => this.updateButtonVisibility(), 100);
    });

    // Listen for storage changes to update pending count
    setInterval(() => this.updatePendingCount(), 2000);
  }

  createFloatingButton() {
    if (document.querySelector('.histofy-deploy-button')) {
      return;
    }

    const deployButton = document.createElement('div');
    deployButton.className = 'histofy-deploy-button';
    deployButton.innerHTML = `
      <div class="histofy-deploy-main">
        <button class="histofy-deploy-btn" id="histofy-main-deploy">
          <span class="histofy-deploy-icon">🚀</span>
          <span class="histofy-deploy-text">Deploy Changes</span>
          <span class="histofy-pending-badge" id="histofy-pending-count">0</span>
        </button>
      </div>
      <div class="histofy-deploy-panel" id="histofy-deploy-panel" style="display: none;">
        <div class="histofy-deploy-header">
          <h3>📋 Pending Changes</h3>
          <button class="histofy-close-panel" id="histofy-close-panel">✕</button>
        </div>
        <div class="histofy-deploy-content">
          <div class="histofy-auth-section">
            <div class="histofy-auth-inputs">
              <input type="text" placeholder="GitHub Username" id="histofy-username" class="histofy-input">
              <input type="password" placeholder="Personal Access Token" id="histofy-token" class="histofy-input">
              <button class="histofy-btn histofy-btn-secondary" id="histofy-save-auth">💾 Save Credentials</button>
            </div>
          </div>
          <div class="histofy-changes-list" id="histofy-changes-list">
            <!-- Changes will be populated here -->
          </div>
          <div class="histofy-deploy-actions">
            <button class="histofy-btn histofy-btn-danger" id="histofy-clear-all">🗑️ Clear All</button>
            <button class="histofy-btn histofy-btn-primary" id="histofy-start-deploy">🚀 Start Deployment</button>
          </div>
          <div class="histofy-deploy-status" id="histofy-deploy-status" style="display: none;">
            <!-- Deployment status will be shown here -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(deployButton);
    this.setupButtonHandlers(deployButton);
    this.loadSavedCredentials();
  }

  setupButtonHandlers(deployButton) {
    const mainBtn = deployButton.querySelector('#histofy-main-deploy');
    const panel = deployButton.querySelector('#histofy-deploy-panel');
    const closeBtn = deployButton.querySelector('#histofy-close-panel');
    const saveAuthBtn = deployButton.querySelector('#histofy-save-auth');
    const clearAllBtn = deployButton.querySelector('#histofy-clear-all');
    const startDeployBtn = deployButton.querySelector('#histofy-start-deploy');

    mainBtn.addEventListener('click', () => {
      this.togglePanel();
    });

    closeBtn.addEventListener('click', () => {
      this.hidePanel();
    });

    saveAuthBtn.addEventListener('click', () => {
      this.saveCredentials();
    });

    clearAllBtn.addEventListener('click', () => {
      this.clearAllChanges();
    });

    startDeployBtn.addEventListener('click', () => {
      this.startDeployment();
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!deployButton.contains(e.target)) {
        this.hidePanel();
      }
    });
  }

  async updateButtonVisibility() {
    const deployButton = document.querySelector('.histofy-deploy-button');
    if (!deployButton) return;

    const pageInfo = window.histofyDetector?.getCurrentPageInfo();
    const shouldShow = pageInfo && (pageInfo.page === 'profile' || pageInfo.page === 'repository');

    deployButton.style.display = shouldShow ? 'block' : 'none';
  }

  async updatePendingCount() {
    if (window.histofyStorage) {
      const changes = await window.histofyStorage.getPendingChanges();
      const countElement = document.querySelector('#histofy-pending-count');
      if (countElement) {
        countElement.textContent = changes.length;
        countElement.style.display = changes.length > 0 ? 'block' : 'none';
      }
      this.pendingChanges = changes;
    }
  }

  togglePanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    if (panel.style.display === 'none') {
      this.showPanel();
    } else {
      this.hidePanel();
    }
  }

  async showPanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    panel.style.display = 'block';
    
    await this.updatePendingCount();
    this.populateChangesList();
  }

  hidePanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    panel.style.display = 'none';
  }

  async populateChangesList() {
    const changesList = document.querySelector('#histofy-changes-list');
    if (!changesList) return;

    if (this.pendingChanges.length === 0) {
      changesList.innerHTML = `
        <div class="histofy-no-changes">
          <p>No pending changes</p>
          <p>Start by selecting dates or commits to modify!</p>
        </div>
      `;
      return;
    }

    const changesHtml = this.pendingChanges.map((change, index) => {
      return `
        <div class="histofy-change-item" data-change-id="${change.id}">
          <div class="histofy-change-header">
            <span class="histofy-change-type">${this.formatChangeType(change.type)}</span>
            <span class="histofy-change-time">${this.formatTime(change.timestamp)}</span>
            <button class="histofy-remove-change" data-change-id="${change.id}">🗑️</button>
          </div>
          <div class="histofy-change-details">
            ${this.formatChangeDetails(change)}
          </div>
        </div>
      `;
    }).join('');

    changesList.innerHTML = changesHtml;

    // Setup remove buttons
    changesList.querySelectorAll('.histofy-remove-change').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const changeId = e.target.getAttribute('data-change-id');
        this.removeChange(changeId);
      });
    });
  }

  formatChangeType(type) {
    const typeMap = {
      'date_selection': '📅 Date Selection',
      'move_commits': '🔄 Move Commits',
      'move_commits_timeline': '⏰ Timeline Move',
      'generate_commits': '🎲 Generate Commits'
    };
    return typeMap[type] || '❓ Unknown';
  }

  formatChangeDetails(change) {
    switch (change.type) {
      case 'date_selection':
        return `Selected ${change.dates?.length || 0} dates`;
      case 'move_commits':
        return `Move ${change.sourceDates?.length || 0} dates to ${change.targetDate}`;
      case 'move_commits_timeline':
        return `Move ${change.commits?.length || 0} commits to ${change.targetDate}`;
      default:
        return 'Details not available';
    }
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  async removeChange(changeId) {
    if (window.histofyStorage) {
      await window.histofyStorage.removePendingChange(changeId);
      await this.updatePendingCount();
      this.populateChangesList();
      this.showNotification('Change removed', 'info');
    }
  }

  async clearAllChanges() {
    if (window.histofyStorage) {
      await window.histofyStorage.clearPendingChanges();
      await this.updatePendingCount();
      this.populateChangesList();
      this.showNotification('All changes cleared', 'info');
    }
  }

  async saveCredentials() {
    const username = document.querySelector('#histofy-username').value;
    const token = document.querySelector('#histofy-token').value;

    if (!username || !token) {
      this.showNotification('Please enter both username and token', 'error');
      return;
    }

    if (window.histofyStorage) {
      await window.histofyStorage.updateUserSettings({
        username: username,
        token: token
      });
      this.showNotification('Credentials saved securely', 'success');
    }
  }

  async loadSavedCredentials() {
    if (window.histofyStorage) {
      const settings = await window.histofyStorage.getUserSettings();
      if (settings.username) {
        const usernameInput = document.querySelector('#histofy-username');
        if (usernameInput) usernameInput.value = settings.username;
      }
      if (settings.token) {
        const tokenInput = document.querySelector('#histofy-token');
        if (tokenInput) tokenInput.value = settings.token;
      }
    }
  }

  async startDeployment() {
    if (!this.githubAPI || !this.githubAPI.isAuthenticated()) {
      this.showNotification('Please authenticate with GitHub first', 'error');
      return;
    }

    if (this.pendingChanges.length === 0) {
      this.showNotification('No changes to deploy', 'warning');
      return;
    }

    if (this.isDeploying) {
      this.showNotification('Deployment already in progress', 'warning');
      return;
    }

    try {
      this.isDeploying = true;
      this.showDeploymentStatus();
      
      // Convert pending changes to git operations
      await this.convertPendingChangesToOperations();
      
      // Execute the operations
      const results = await this.executeDeployment();
      
      // Handle results
      this.handleDeploymentResults(results);
      
    } catch (error) {
      console.error('Histofy: Deployment failed:', error);
      this.showNotification(`Deployment failed: ${error.message}`, 'error');
    } finally {
      this.isDeploying = false;
      this.hideDeploymentStatus();
    }
  }

  async convertPendingChangesToOperations() {
    if (!this.gitOperations) {
      throw new Error('Git operations not initialized');
    }

    const pageInfo = window.histofyDetector?.getCurrentPageInfo();
    if (!pageInfo || (!pageInfo.username && !pageInfo.owner)) {
      throw new Error('Cannot determine repository information');
    }

    const owner = pageInfo.owner || pageInfo.username;
    const repo = pageInfo.repository;

    this.updateDeploymentStatus('Converting changes to git operations...');

    for (const change of this.pendingChanges) {
      try {
        switch (change.type) {
          case 'date_selection':
            await this.convertDateSelectionToOperations(change, owner, repo);
            break;
          case 'move_commits':
            await this.convertMoveCommitsToOperations(change, owner, repo);
            break;
          case 'move_commits_timeline':
            await this.convertTimelineMoveToOperations(change, owner, repo);
            break;
          case 'generate_commits':
            await this.convertGenerateCommitsToOperations(change, owner, repo);
            break;
          default:
            console.warn('Histofy: Unknown change type:', change.type);
        }
      } catch (error) {
        console.error('Histofy: Failed to convert change to operation:', change, error);
        throw new Error(`Failed to process change: ${change.type}`);
      }
    }
  }

  async convertDateSelectionToOperations(change, owner, repo) {
    // Convert date selections to artificial commit operations
    for (const date of change.dates || []) {
      await this.gitOperations.createArtificialCommit(
        owner,
        repo,
        date,
        `Histofy: Contribution for ${date}`,
        { 
          source: 'date_selection',
          changeId: change.id 
        }
      );
    }
  }

  async convertMoveCommitsToOperations(change, owner, repo) {
    // Convert move operations to commit timestamp modifications
    const targetDate = change.targetDate;
    
    for (const sourceDate of change.sourceDates || []) {
      // Get commits for the source date
      const commits = await this.getCommitsForDate(owner, repo, sourceDate);
      
      for (const commit of commits) {
        await this.gitOperations.moveCommitToDate(
          owner,
          repo,
          commit.sha,
          targetDate,
          {
            source: 'move_commits',
            changeId: change.id,
            originalDate: sourceDate
          }
        );
      }
    }
  }

  async convertTimelineMoveToOperations(change, owner, repo) {
    // Convert timeline moves to specific commit operations
    const targetDate = change.targetDate;
    
    for (const commitInfo of change.commits || []) {
      await this.gitOperations.moveCommitToDate(
        owner,
        repo,
        commitInfo.sha,
        targetDate,
        {
          source: 'timeline_move',
          changeId: change.id,
          originalDate: commitInfo.date
        }
      );
    }
  }

  async convertGenerateCommitsToOperations(change, owner, repo) {
    // Convert generated commit patterns to artificial commits
    for (const commitData of change.commits || []) {
      await this.gitOperations.createArtificialCommit(
        owner,
        repo,
        commitData.date,
        commitData.message || `Histofy: Generated commit for ${commitData.date}`,
        {
          source: 'generate_commits',
          changeId: change.id
        }
      );
    }
  }

  async executeDeployment() {
    this.updateDeploymentStatus('Executing git operations...');
    
    // Use the new deployment system
    const deploymentResult = await this.gitOperations.deployAllOperations({
      createBackup: true,
      stopOnError: false
    });

    if (!deploymentResult.success) {
      throw new Error(deploymentResult.message || 'Deployment failed');
    }

    return deploymentResult.results;
  }

  handleDeploymentResults(results) {
    const { successful, failed, total } = results;
    
    if (failed.length === 0) {
      this.showNotification(`✅ Deployment successful! ${successful.length} operations completed.`, 'success');
    } else if (successful.length > 0) {
      this.showNotification(`⚠️ Partial success: ${successful.length} succeeded, ${failed.length} failed.`, 'warning');
    } else {
      this.showNotification(`❌ Deployment failed: All ${failed.length} operations failed.`, 'error');
    }

    // Clear successful operations from pending changes
    if (successful.length > 0) {
      this.clearProcessedChanges(successful);
    }

    // Update UI
    this.updatePendingCount();
    this.populateChangesList();
  }

  async clearProcessedChanges(successfulOperations) {
    const processedChangeIds = new Set(
      successfulOperations
        .map(op => op.options?.changeId)
        .filter(id => id)
    );

    if (window.histofyStorage) {
      for (const changeId of processedChangeIds) {
        await window.histofyStorage.removePendingChange(changeId);
      }
    }
  }

  async getCommitsForDate(owner, repo, date) {
    // Get commits for a specific date
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    try {
      const commits = await this.githubAPI.getRepositoryCommits(owner, repo, {
        since: startDate.toISOString(),
        until: endDate.toISOString(),
        per_page: 100
      });

      return commits || [];
    } catch (error) {
      console.error('Histofy: Failed to get commits for date:', date, error);
      return [];
    }
  }

  updateDeploymentStatus(message) {
    const statusDiv = document.querySelector('#histofy-deploy-status');
    if (statusDiv) {
      const progressDiv = statusDiv.querySelector('.histofy-deployment-progress p');
      if (progressDiv) {
        progressDiv.textContent = message;
      }
    }
  }

  showDeploymentStatus() {
    const statusDiv = document.querySelector('#histofy-deploy-status');
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = `
        <div class="histofy-deployment-progress">
          <div class="histofy-progress-bar">
            <div class="histofy-progress-fill"></div>
          </div>
          <p>🚀 Preparing deployment...</p>
        </div>
      `;
    }
  }

  hideDeploymentStatus() {
    const statusDiv = document.querySelector('#histofy-deploy-status');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `histofy-notification histofy-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 4000);
  }
}

// Initialize deploy button
window.histofyDeployButton = new DeployButton();
