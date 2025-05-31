// Deploy button component for Histofy
class DeployButton {
  constructor() {
    this.isDeploying = false;
    this.pendingChanges = [];
    this.githubAPI = null;
    this.githubDeployer = null;
    this.userRepositories = [];
    this.init();
  }

  async init() {
    console.log('Histofy: Deploy button initializing...');
    
    // Wait a bit for other components to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.setupEventListeners();
    this.createFloatingButton();
    
    // Initialize API after button is created
    await this.initializeAPI();
    
    // Initial update
    await this.updatePendingCount();
    
    console.log('Histofy: Deploy button initialized successfully');
  }

  async initializeAPI() {
    try {
      // Initialize GitHub API if available
      if (window.GitHubAPI) {
        this.githubAPI = new window.GitHubAPI();
        await this.githubAPI.init();
        
        // Initialize GitHub Deployer only if API is ready
        if (window.GitHubDeployer && this.githubAPI) {
          this.githubDeployer = new window.GitHubDeployer(this.githubAPI);
          console.log('Histofy: GitHub Deployer initialized');
        }
      }

      // Update UI based on authentication status
      this.updateAuthenticationUI();
    } catch (error) {
      console.error('Histofy: Failed to initialize deploy button API:', error);
    }
  }

  updateAuthenticationUI() {
    const authSection = document.querySelector('.histofy-auth-section');
    const deployBtn = document.querySelector('#histofy-start-deploy');
    
    if (!authSection) return;

    if (this.githubAPI && this.githubAPI.isAuthenticated()) {
      authSection.innerHTML = `
        <div class="histofy-auth-status">
          <span class="histofy-auth-success">Authenticated as ${this.githubAPI.user?.login || 'Unknown'}</span>
          <button class="histofy-btn histofy-btn-warning" id="histofy-logout">Logout</button>
        </div>
      `;
      if (deployBtn) deployBtn.disabled = false;
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
      if (deployBtn) deployBtn.disabled = true;
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
      saveAuthBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.handleAuthentication();
      });
    }

    // Auto-save on enter key
    const inputs = document.querySelectorAll('#histofy-username, #histofy-token');
    inputs.forEach(input => {
      input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
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
          // Re-initialize deployer after successful authentication
          if (window.GitHubDeployer && this.githubAPI) {
            this.githubDeployer = new window.GitHubDeployer(this.githubAPI);
          }
          
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
    this.updateInterval = setInterval(() => {
      this.updatePendingCount();
    }, 2000);
    
    // Listen for DOM changes to ensure button stays visible
    this.domObserver = new MutationObserver(() => {
      if (!document.querySelector('.histofy-deploy-button')) {
        console.log('Histofy: Deploy button disappeared, recreating...');
        this.createFloatingButton();
      }
    });
    
    this.domObserver.observe(document.body, {
      childList: true,
      subtree: false
    });
  }

  // Cleanup method
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
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
          
          <div class="histofy-repository-section">
            <h4>🎯 Deployment Target</h4>
            <div class="histofy-repo-options">
              <div class="histofy-repo-option">
                <label class="histofy-radio-label">
                  <input type="radio" name="histofy-repo-choice" value="recommended" checked>
                  <span class="histofy-radio-custom"></span>
                  <div class="histofy-repo-details">
                    <strong>🌟 Histofy Contributions (Recommended)</strong>
                    <p>Deploy to a dedicated public repository for contribution patterns</p>
                  </div>
                </label>
              </div>
              <div class="histofy-repo-option">
                <label class="histofy-radio-label">
                  <input type="radio" name="histofy-repo-choice" value="existing">
                  <span class="histofy-radio-custom"></span>
                  <div class="histofy-repo-details">
                    <strong>📁 Existing Repository</strong>
                    <p>Deploy to one of your existing repositories</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="histofy-repo-selector" id="histofy-repo-selector" style="display: none;">
              <label>Select Repository:</label>
              <select id="histofy-repo-select" class="histofy-input">
                <option value="">Loading repositories...</option>
              </select>
              <button class="histofy-btn histofy-btn-secondary" id="histofy-refresh-repos">🔄 Refresh</button>
            </div>
            
            <div class="histofy-repo-info" id="histofy-repo-info">
              <div class="histofy-info-card">
                <h5>✅ Recommended Repository Benefits:</h5>
                <ul>
                  <li>Automatically created if it doesn't exist</li>
                  <li>Optimized for contribution counting</li>
                  <li>Clean history dedicated to patterns</li>
                  <li>Public visibility by default</li>
                </ul>
              </div>
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
    const clearAllBtn = deployButton.querySelector('#histofy-clear-all');
    const startDeployBtn = deployButton.querySelector('#histofy-start-deploy');

    mainBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Histofy: Main deploy button clicked');
      this.togglePanel();
    });

    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hidePanel();
    });

    clearAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.clearAllChanges();
    });

    startDeployBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Histofy: Start deployment button clicked');
      this.startDeployment();
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!deployButton.contains(e.target)) {
        this.hidePanel();
      }
    });

    // Setup authentication handlers
    this.setupAuthHandlers();

    // Repository selection handlers
    const repoRadios = deployButton.querySelectorAll('input[name="histofy-repo-choice"]');
    const repoSelector = deployButton.querySelector('#histofy-repo-selector');
    const repoInfo = deployButton.querySelector('#histofy-repo-info');
    const refreshReposBtn = deployButton.querySelector('#histofy-refresh-repos');

    repoRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.handleRepositoryOptionChange();
      });
    });

    if (refreshReposBtn) {
      refreshReposBtn.addEventListener('click', () => {
        this.loadUserRepositories(true);
      });
    }

    // Initial repository option handling
    this.handleRepositoryOptionChange();
  }

  togglePanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    if (!panel) {
      console.error('Histofy: Deploy panel not found');
      return;
    }

    if (panel.style.display === 'none' || !panel.style.display) {
      console.log('Histofy: Showing deploy panel');
      this.showPanel();
    } else {
      console.log('Histofy: Hiding deploy panel');
      this.hidePanel();
    }
  }

  async showPanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    if (!panel) return;

    panel.style.display = 'block';
    
    console.log('Histofy: Panel shown, updating content...');
    
    await this.updatePendingCount();
    await this.populateChangesList();
    
    // Load repositories if authenticated and existing repo option might be selected
    if (this.githubAPI && this.githubAPI.isAuthenticated()) {
      await this.loadUserRepositories();
    }

    // Update authentication UI
    this.updateAuthenticationUI();
  }

  hidePanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  async updatePendingCount() {
    try {
      if (window.histofyStorage) {
        const pendingChanges = await window.histofyStorage.getPendingChanges();
        this.pendingChanges = pendingChanges || [];
        
        const countElement = document.querySelector('#histofy-pending-count');
        if (countElement) {
          countElement.textContent = this.pendingChanges.length;
          countElement.style.display = this.pendingChanges.length > 0 ? 'inline' : 'none';
        }
        
        console.log(`Histofy: Updated pending count: ${this.pendingChanges.length}`);
      } else {
        console.warn('Histofy: Storage manager not available');
        this.pendingChanges = [];
      }
    } catch (error) {
      console.error('Histofy: Failed to update pending count:', error);
      this.pendingChanges = [];
    }
  }

  updateButtonVisibility() {
    const deployButton = document.querySelector('.histofy-deploy-button');
    if (!deployButton) {
      // Recreate button if it doesn't exist
      this.createFloatingButton();
      return;
    }

    // Update pending count
    this.updatePendingCount();
  }

  showDetailedNoChangesMessage() {
    this.showNotification(`
      No changes to deploy. To get started:
      1. Go to a GitHub profile page
      2. Click on contribution squares to select dates
      3. Come back here to deploy your changes
    `, 'info');
  }

  async loadUserRepositories(forceRefresh = false) {
    const repoSelect = document.querySelector('#histofy-repo-select');
    if (!repoSelect) return;

    // Check if we have cached repositories and not forcing refresh
    if (!forceRefresh && this.userRepositories && this.userRepositories.length > 0) {
      this.populateRepositorySelect();
      return;
    }

    if (!this.githubAPI || !this.githubAPI.isAuthenticated()) {
      repoSelect.innerHTML = '<option value="">Please authenticate first</option>';
      return;
    }

    try {
      repoSelect.innerHTML = '<option value="">Loading repositories...</option>';
      repoSelect.disabled = true;

      // Load user repositories
      const repositories = await this.githubAPI.getUserRepositories({
        type: 'owner',
        sort: 'updated',
        per_page: 100
      });

      // Filter repositories that user can push to
      this.userRepositories = repositories.filter(repo => 
        repo.permissions?.push === true || repo.permissions?.admin === true
      );

      this.populateRepositorySelect();

    } catch (error) {
      console.error('Histofy: Failed to load repositories:', error);
      repoSelect.innerHTML = '<option value="">Failed to load repositories</option>';
      this.showNotification('Failed to load repositories. Please check your connection.', 'error');
    } finally {
      repoSelect.disabled = false;
    }
  }

  populateRepositorySelect() {
    const repoSelect = document.querySelector('#histofy-repo-select');
    if (!repoSelect || !this.userRepositories) return;

    if (this.userRepositories.length === 0) {
      repoSelect.innerHTML = '<option value="">No repositories found</option>';
      return;
    }

    // Group repositories by visibility
    const publicRepos = this.userRepositories.filter(repo => !repo.private);
    const privateRepos = this.userRepositories.filter(repo => repo.private);

    let optionsHtml = '<option value="">Select a repository</option>';

    if (publicRepos.length > 0) {
      optionsHtml += '<optgroup label="📂 Public Repositories">';
      publicRepos.forEach(repo => {
        const description = repo.description ? ` - ${repo.description.substring(0, 50)}` : '';
        optionsHtml += `<option value="${repo.full_name}">${repo.name}${description}</option>`;
      });
      optionsHtml += '</optgroup>';
    }

    if (privateRepos.length > 0) {
      optionsHtml += '<optgroup label="🔒 Private Repositories">';
      privateRepos.forEach(repo => {
        const description = repo.description ? ` - ${repo.description.substring(0, 50)}` : '';
        optionsHtml += `<option value="${repo.full_name}">${repo.name}${description}</option>`;
      });
      optionsHtml += '</optgroup>';
    }

    repoSelect.innerHTML = optionsHtml;
  }

  async handleRepositoryOptionChange() {
    const selectedOption = document.querySelector('input[name="histofy-repo-choice"]:checked')?.value;
    const repoSelector = document.querySelector('#histofy-repo-selector');
    const repoInfo = document.querySelector('#histofy-repo-info');

    if (selectedOption === 'existing') {
      repoSelector.style.display = 'block';
      repoInfo.innerHTML = `
        <div class="histofy-info-card">
          <h5>📋 Existing Repository Requirements:</h5>
          <ul>
            <li>You must have push access to the repository</li>
            <li>Commits will be added to the default branch</li>
            <li>Repository can be public or private</li>
            <li>Existing commit history will be preserved</li>
          </ul>
        </div>
      `;
      await this.loadUserRepositories();
    } else {
      repoSelector.style.display = 'none';
      repoInfo.innerHTML = `
        <div class="histofy-info-card">
          <h5>✅ Recommended Repository Benefits:</h5>
          <ul>
            <li>Automatically created if it doesn't exist</li>
            <li>Optimized for contribution counting</li>
            <li>Clean history dedicated to patterns</li>
            <li>Public visibility by default</li>
          </ul>
        </div>
      `;
    }
  }

  async showPanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    panel.style.display = 'block';
    
    await this.updatePendingCount();
    this.populateChangesList();
    
    // Load repositories if authenticated and existing repo option might be selected
    if (this.githubAPI && this.githubAPI.isAuthenticated()) {
      await this.loadUserRepositories();
    }
  }

  hidePanel() {
    const panel = document.querySelector('#histofy-deploy-panel');
    panel.style.display = 'none';
  }

  async populateChangesList() {
    const changesList = document.querySelector('#histofy-changes-list');
    if (!changesList) return;

    // Force refresh changes before populating
    await this.updatePendingCount();

    if (this.pendingChanges.length === 0) {
      changesList.innerHTML = `
        <div class="histofy-no-changes">
          <p>📭 No pending changes</p>
          <p>💡 Go to a GitHub profile and select dates to get started!</p>
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
        const dateCount = change.dates?.length || 0;
        const sampleDates = change.dates?.slice(0, 3).join(', ') || '';
        const moreText = dateCount > 3 ? ` and ${dateCount - 3} more...` : '';
        return `Selected ${dateCount} dates: ${sampleDates}${moreText}`;
      case 'move_commits':
        return `Move ${change.sourceDates?.length || 0} dates to ${change.targetDate}`;
      case 'move_commits_timeline':
        return `Move ${change.commits?.length || 0} commits to ${change.targetDate}`;
      case 'intensity_pattern':
        return `Pattern: ${change.commits}/${change.intensity}`;
      default:
        return 'Details not available';
    }
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  async clearAllChanges() {
    if (confirm('Are you sure you want to clear all pending changes? This action cannot be undone.')) {
      if (window.histofyStorage) {
        const success = await window.histofyStorage.clearPendingChanges();
        if (success) {
          await this.updatePendingCount();
          this.populateChangesList();
          this.showNotification('All changes cleared', 'info');
        } else {
          this.showNotification('Failed to clear changes', 'error');
        }
      }
    }
  }

  async removeChange(changeId) {
    if (window.histofyStorage) {
      const success = await window.histofyStorage.removePendingChange(changeId);
      if (success) {
        await this.updatePendingCount();
        this.populateChangesList();
        this.showNotification('Change removed', 'info');
      } else {
        this.showNotification('Failed to remove change', 'error');
      }
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
    try {
      if (window.histofyStorage) {
        const settings = await window.histofyStorage.getUserSettings();
        
        if (settings.token && this.githubAPI) {
          // Try to initialize with saved token
          await this.githubAPI.saveCredentials(settings.token);
          const isValid = await this.githubAPI.validateToken();
          
          if (isValid) {
            console.log('Histofy: Loaded saved credentials successfully');
            this.updateAuthenticationUI();
          } else {
            console.log('Histofy: Saved credentials are invalid');
          }
        }
        
        // Populate form fields for manual entry
        const usernameInput = document.querySelector('#histofy-username');
        const tokenInput = document.querySelector('#histofy-token');
        
        if (usernameInput && settings.username) {
          usernameInput.value = settings.username;
        }
        // Don't populate token field for security
      }
    } catch (error) {
      console.error('Histofy: Failed to load saved credentials:', error);
    }
  }

  async startDeployment() {
    console.log('Histofy: Deploy button clicked');
    
    // Force refresh pending changes before checking
    await this.updatePendingCount();
    
    // Check for pending changes with more detailed logging
    console.log('Histofy: Checking pending changes:', this.pendingChanges);
    
    if (!this.pendingChanges || this.pendingChanges.length === 0) {
      console.log('Histofy: No pending changes found');
      this.showNotification('No changes to deploy. Please select some dates first.', 'warning');
      
      // Try to get changes directly from storage as a fallback
      try {
        if (window.histofyStorage) {
          const directChanges = await window.histofyStorage.getPendingChanges();
          console.log('Histofy: Direct storage check:', directChanges);
          if (directChanges && directChanges.length > 0) {
            this.pendingChanges = directChanges;
            console.log('Histofy: Found changes in direct check, proceeding...');
          } else {
            this.showDetailedNoChangesMessage();
            return;
          }
        } else {
          this.showNotification('Storage manager not available', 'error');
          return;
        }
      } catch (error) {
        console.error('Histofy: Error in direct storage check:', error);
        this.showNotification('Error checking for changes', 'error');
        return;
      }
    }

    // Check authentication first
    if (!this.githubAPI || !this.githubAPI.isAuthenticated()) {
      this.showNotification('Please authenticate with GitHub first', 'error');
      return;
    }

    if (this.isDeploying) {
      this.showNotification('Deployment already in progress', 'warning');
      return;
    }

    // Get selected repository option
    const selectedRepoOption = document.querySelector('input[name="histofy-repo-choice"]:checked')?.value;
    let targetRepository = null;

    if (selectedRepoOption === 'existing') {
      const selectedRepo = document.querySelector('#histofy-repo-select')?.value;
      if (!selectedRepo) {
        this.showNotification('Please select a repository for deployment', 'error');
        return;
      }
      targetRepository = selectedRepo;
    } else {
      // Use recommended repository name
      const currentUser = this.githubAPI.user?.login;
      if (!currentUser) {
        this.showNotification('Unable to determine current user', 'error');
        return;
      }
      targetRepository = `${currentUser}/histofy-contributions`;
    }

    // Check if deployer is initialized
    if (!this.githubDeployer) {
      try {
        this.githubDeployer = new window.GitHubDeployer(this.githubAPI);
      } catch (error) {
        this.showNotification('Failed to initialize GitHub deployer', 'error');
        return;
      }
    }

    try {
      this.isDeploying = true;
      this.showDeploymentStatus();
      
      // Parse repository info
      const [owner, repoName] = targetRepository.split('/');
      
      // Prepare deployment options
      const deploymentOptions = {
        targetRepository: targetRepository,
        repositoryOwner: owner,
        repositoryName: repoName,
        createIfNotExists: selectedRepoOption === 'recommended',
        private: false, // Keep public for contribution counting
        description: selectedRepoOption === 'recommended' 
          ? `Custom contribution pattern created with Histofy on ${new Date().toISOString().split('T')[0]}`
          : undefined
      };

      this.log('info', `Starting deployment to ${targetRepository}`);
      this.log('info', `Repository option: ${selectedRepoOption}`);
      this.log('info', `Pending changes: ${this.pendingChanges.length}`);
      
      // Use the GitHub deployer with target repository
      const results = await this.githubDeployer.deployDateSelections(this.pendingChanges, deploymentOptions);
      
      // Handle results
      this.handleDeploymentResults(results, targetRepository);
      
    } catch (error) {
      console.error('Histofy: Deployment failed:', error);
      this.showNotification(`Deployment failed: ${error.message}`, 'error');
      this.log('error', `Deployment failed: ${error.message}`);
    } finally {
      this.isDeploying = false;
      setTimeout(() => this.hideDeploymentStatus(), 3000);
    }
  }

  handleDeploymentResults(results, targetRepository) {
    const { successful, failed, repositories } = results;
    
    this.log('info', `Deployment completed: ${successful.length} successful, ${failed.length} failed`);
    
    if (failed.length === 0) {
      this.showNotification(`✅ Deployment successful! Created ${successful.length} commits in ${targetRepository}.`, 'success');
      
      // Show repository link
      repositories.forEach((repoResult, repoKey) => {
        if (repoResult.repository?.html_url) {
          this.log('success', `Repository: ${repoResult.repository.html_url}`);
          // Optionally open the repository in a new tab
          this.showRepositoryLink(repoResult.repository.html_url);
        }
      });
      
    } else if (successful.length > 0) {
      this.showNotification(`⚠️ Partial success: ${successful.length} succeeded, ${failed.length} failed in ${targetRepository}.`, 'warning');
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

  showRepositoryLink(repoUrl) {
    // Create a temporary notification with repository link
    const linkNotification = document.createElement('div');
    linkNotification.className = 'histofy-notification histofy-notification-success histofy-repo-link';
    linkNotification.innerHTML = `
      <div>Deployment completed!</div>
      <button onclick="window.open('${repoUrl}', '_blank')" class="histofy-repo-link-btn">
        🔗 View Repository
      </button>
    `;
    
    document.body.appendChild(linkNotification);
    
    setTimeout(() => {
      linkNotification.remove();
    }, 8000);
  }

  async clearProcessedChanges(successfulOperations) {
    // Clear all pending changes since they were processed
    if (window.histofyStorage) {
      await window.histofyStorage.clearPendingChanges();
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
            <div class="histofy-progress-fill" id="histofy-progress-fill"></div>
          </div>
          <p id="histofy-deployment-message">🚀 Preparing deployment...</p>
          <div class="histofy-deployment-logs" id="histofy-deployment-logs">
            <!-- Logs will appear here -->
          </div>
        </div>
      `;

      // Listen for deployment status updates
      document.addEventListener('histofy-deployment-status', (event) => {
        this.updateDeploymentProgress(event.detail);
      });
    }
  }

  updateDeploymentProgress(status) {
    const messageElement = document.querySelector('#histofy-deployment-message');
    const progressFill = document.querySelector('#histofy-progress-fill');
    const logsContainer = document.querySelector('#histofy-deployment-logs');

    if (messageElement) {
      messageElement.textContent = status.currentStep || 'Processing...';
    }

    if (progressFill) {
      progressFill.style.width = `${status.progress || 0}%`;
    }

    if (logsContainer && status.logs) {
      // Show last few log entries
      const recentLogs = status.logs.slice(-3);
      logsContainer.innerHTML = recentLogs.map(log => 
        `<div class="histofy-log-entry histofy-log-${log.level}">
          ${log.message}
        </div>`
      ).join('');
    }
  }

  hideDeploymentStatus() {
    const statusDiv = document.querySelector('#histofy-deploy-status');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }

    // Remove event listener
    document.removeEventListener('histofy-deployment-status', this.updateDeploymentProgress);
  }

  log(level, message) {
    console.log(`Histofy Deploy [${level.toUpperCase()}]:`, message);
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
