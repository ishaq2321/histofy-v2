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
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Wait a bit for GitHub's dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.setupEventListeners();
    
    // Create button immediately
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
      this.updateButtonVisibility();
    });

    // Listen for storage changes to update pending count more frequently
    this.updateInterval = setInterval(() => {
      this.updatePendingCount();
    }, 1000); // Check every second
    
    // Listen for DOM changes to ensure button stays visible
    this.domObserver = new MutationObserver((mutations) => {
      // Check if our button is still in the DOM
      const existingButton = document.querySelector('.histofy-deploy-button');
      if (!existingButton) {
        console.log('Histofy: Deploy button removed from DOM, recreating...');
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
    // Check if button already exists
    if (document.querySelector('.histofy-deploy-button')) {
      console.log('Histofy: Deploy button already exists, skipping creation');
      return;
    }

    console.log('Histofy: Creating deploy button...');

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
              <div class="histofy-repo-option">
                <label class="histofy-radio-label">
                  <input type="radio" name="histofy-repo-choice" value="new">
                  <span class="histofy-radio-custom"></span>
                  <div class="histofy-repo-details">
                    <strong>✨ Create New Repository</strong>
                    <p>Create a new repository with custom name and visibility</p>
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

            <div class="histofy-new-repo-form" id="histofy-new-repo-form" style="display: none;">
              <div class="histofy-form-group">
                <label>Repository Name:</label>
                <div class="histofy-repo-name-input">
                  <span class="histofy-repo-owner" id="histofy-repo-owner-display">username/</span>
                  <input type="text" id="histofy-new-repo-name" class="histofy-input" placeholder="my-contribution-pattern" maxlength="100">
                  <button class="histofy-btn histofy-btn-secondary" id="histofy-check-availability">✓ Check</button>
                </div>
                <div class="histofy-repo-name-status" id="histofy-repo-name-status"></div>
              </div>
              
              <div class="histofy-form-group">
                <label>Repository Description:</label>
                <input type="text" id="histofy-new-repo-description" class="histofy-input" 
                       placeholder="Custom GitHub contribution pattern created with Histofy" maxlength="350">
              </div>
              
              <div class="histofy-form-group">
                <label>Visibility:</label>
                <div class="histofy-visibility-options">
                  <label class="histofy-visibility-option">
                    <input type="radio" name="histofy-repo-visibility" value="public" checked>
                    <span class="histofy-visibility-icon">🌍</span>
                    <div class="histofy-visibility-details">
                      <strong>Public</strong>
                      <p>Anyone can see this repository. Contributions count toward your profile.</p>
                    </div>
                  </label>
                  <label class="histofy-visibility-option">
                    <input type="radio" name="histofy-repo-visibility" value="private">
                    <span class="histofy-visibility-icon">🔒</span>
                    <div class="histofy-visibility-details">
                      <strong>Private</strong>
                      <p>Only you can see this repository. Contributions still count toward your profile.</p>
                    </div>
                  </label>
                </div>
              </div>
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

    // Add to page
    document.body.appendChild(deployButton);
    console.log('Histofy: Deploy button added to page');

    // Setup button handlers
    this.setupButtonHandlers(deployButton);
    
    // Load saved credentials
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
    const newRepoForm = deployButton.querySelector('#histofy-new-repo-form');
    const repoInfo = deployButton.querySelector('#histofy-repo-info');
    const refreshReposBtn = deployButton.querySelector('#histofy-refresh-repos');
    const checkAvailabilityBtn = deployButton.querySelector('#histofy-check-availability');

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

    if (checkAvailabilityBtn) {
      checkAvailabilityBtn.addEventListener('click', () => {
        this.checkRepositoryAvailability();
      });
    }

    // Auto-check availability on repo name change
    const repoNameInput = deployButton.querySelector('#histofy-new-repo-name');
    if (repoNameInput) {
      let timeout;
      repoNameInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.checkRepositoryAvailability();
        }, 500);
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
    
    console.log('Histofy: Deploy panel shown, updating content...');
    
    // Force refresh of pending changes before showing panel
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
        const data = await window.histofyStorage.getData();
        this.pendingChanges = data.pendingChanges || [];
        
        console.log('Histofy Deploy: Updated pending changes:', this.pendingChanges.length);
        
        // Update badge
        const badge = document.getElementById('histofy-pending-count');
        if (badge) {
          badge.textContent = this.pendingChanges.length;
          badge.style.display = this.pendingChanges.length > 0 ? 'inline' : 'none';
        }
        
        // Update main button state
        const mainBtn = document.getElementById('histofy-main-deploy');
        if (mainBtn) {
          const hasChanges = this.pendingChanges.length > 0;
          mainBtn.classList.toggle('histofy-has-changes', hasChanges);
          
          if (hasChanges) {
            mainBtn.setAttribute('title', `${this.pendingChanges.length} pending changes ready to deploy`);
          } else {
            mainBtn.setAttribute('title', 'No pending changes to deploy');
          }
        }
        
      } else {
        console.warn('Histofy Deploy: Storage not available');
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
      console.log('Histofy: Deploy button not found, creating...');
      this.createFloatingButton();
      return;
    }

    // Always show the button on GitHub pages
    const isGitHubPage = window.location.href.includes('github.com');
    deployButton.style.display = isGitHubPage ? 'block' : 'none';
    
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
    const newRepoForm = document.querySelector('#histofy-new-repo-form');
    const repoInfo = document.querySelector('#histofy-repo-info');

    // Hide all options first
    repoSelector.style.display = 'none';
    newRepoForm.style.display = 'none';

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
    } else if (selectedOption === 'new') {
      newRepoForm.style.display = 'block';
      repoInfo.innerHTML = `
        <div class="histofy-info-card">
          <h5>✨ New Repository Benefits:</h5>
          <ul>
            <li>Complete control over repository name and description</li>
            <li>Choose between public or private visibility</li>
            <li>Clean slate with no existing commit history</li>
            <li>Optimized for contribution counting</li>
          </ul>
        </div>
      `;
      this.updateNewRepoOwnerDisplay();
    } else {
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

  updateNewRepoOwnerDisplay() {
    const ownerDisplay = document.querySelector('#histofy-repo-owner-display');
    if (ownerDisplay && this.githubAPI && this.githubAPI.user) {
      ownerDisplay.textContent = `${this.githubAPI.user.login}/`;
    }
  }

  async checkRepositoryAvailability() {
    const repoNameInput = document.querySelector('#histofy-new-repo-name');
    const statusElement = document.querySelector('#histofy-repo-name-status');
    const checkButton = document.querySelector('#histofy-check-availability');
    
    if (!repoNameInput || !statusElement) return;

    const repoName = repoNameInput.value.trim();
    
    if (!repoName) {
      statusElement.innerHTML = '';
      return;
    }

    // Validate repository name format
    if (!this.isValidRepositoryName(repoName)) {
      statusElement.innerHTML = `
        <div class="histofy-repo-status histofy-repo-status-error">
          ❌ Invalid repository name. Use letters, numbers, hyphens, and underscores only.
        </div>
      `;
      return;
    }

    if (!this.githubAPI || !this.githubAPI.isAuthenticated()) {
      statusElement.innerHTML = `
        <div class="histofy-repo-status histofy-repo-status-warning">
          ⚠️ Please authenticate to check availability
        </div>
      `;
      return;
    }

    try {
      checkButton.disabled = true;
      checkButton.textContent = '⏳ Checking...';
      
      statusElement.innerHTML = `
        <div class="histofy-repo-status histofy-repo-status-checking">
          🔍 Checking availability...
        </div>
      `;

      const currentUser = this.githubAPI.user.login;
      const fullRepoName = `${currentUser}/${repoName}`;

      // Try to get the repository - if it exists, we'll get data; if not, we'll get a 404
      try {
        await this.githubAPI.getRepository(currentUser, repoName);
        // Repository exists
        statusElement.innerHTML = `
          <div class="histofy-repo-status histofy-repo-status-error">
            ❌ Repository "${repoName}" already exists
          </div>
        `;
      } catch (error) {
        if (error.message.includes('404')) {
          // Repository doesn't exist - it's available
          statusElement.innerHTML = `
            <div class="histofy-repo-status histofy-repo-status-success">
              ✅ "${repoName}" is available!
            </div>
          `;
        } else {
          // Some other error
          statusElement.innerHTML = `
            <div class="histofy-repo-status histofy-repo-status-error">
              ❌ Error checking availability: ${error.message}
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Histofy: Failed to check repository availability:', error);
      statusElement.innerHTML = `
        <div class="histofy-repo-status histofy-repo-status-error">
          ❌ Failed to check availability
        </div>
      `;
    } finally {
      checkButton.disabled = false;
      checkButton.textContent = '✓ Check';
    }
  }

  isValidRepositoryName(name) {
    // GitHub repository name validation
    if (name.length === 0 || name.length > 100) return false;
    if (name.startsWith('.') || name.endsWith('.')) return false;
    if (name.startsWith('-') || name.endsWith('-')) return false;
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) return false;
    
    // Reserved names
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reserved.includes(name.toUpperCase())) return false;
    
    return true;
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
    let deploymentOptions = {};

    if (selectedRepoOption === 'existing') {
      const selectedRepo = document.querySelector('#histofy-repo-select')?.value;
      if (!selectedRepo) {
        this.showNotification('Please select a repository for deployment', 'error');
        return;
      }
      targetRepository = selectedRepo;
      deploymentOptions.createIfNotExists = false;
    } else if (selectedRepoOption === 'new') {
      // Handle new repository creation
      const repoName = document.querySelector('#histofy-new-repo-name')?.value.trim();
      const repoDescription = document.querySelector('#histofy-new-repo-description')?.value.trim();
      const isPrivate = document.querySelector('input[name="histofy-repo-visibility"]:checked')?.value === 'private';
      
      if (!repoName) {
        this.showNotification('Please enter a repository name', 'error');
        return;
      }

      if (!this.isValidRepositoryName(repoName)) {
        this.showNotification('Please enter a valid repository name', 'error');
        return;
      }

      // Check if the status shows the repo is available
      const statusElement = document.querySelector('#histofy-repo-name-status');
      if (!statusElement || !statusElement.innerHTML.includes('is available')) {
        this.showNotification('Please check repository availability first', 'error');
        return;
      }

      const currentUser = this.githubAPI.user?.login;
      if (!currentUser) {
        this.showNotification('Unable to determine current user', 'error');
        return;
      }

      targetRepository = `${currentUser}/${repoName}`;
      deploymentOptions = {
        createIfNotExists: true,
        private: isPrivate,
        description: repoDescription || `Custom GitHub contribution pattern created with Histofy on ${new Date().toISOString().split('T')[0]}`,
        forceCreate: true // Force creation since we've verified availability
      };
    } else {
      // Use recommended repository name
      const currentUser = this.githubAPI.user?.login;
      if (!currentUser) {
        this.showNotification('Unable to determine current user', 'error');
        return;
      }
      targetRepository = `${currentUser}/histofy-contributions`;
      deploymentOptions = {
        createIfNotExists: true,
        private: false,
        description: `Custom contribution pattern created with Histofy on ${new Date().toISOString().split('T')[0]}`
      };
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
      
      // Prepare final deployment options
      const finalDeploymentOptions = {
        targetRepository: targetRepository,
        repositoryOwner: owner,
        repositoryName: repoName,
        ...deploymentOptions
      };

      this.log('info', `Starting deployment to ${targetRepository}`);
      this.log('info', `Repository option: ${selectedRepoOption}`);
      this.log('info', `Pending changes: ${this.pendingChanges.length}`);
      
      // Use the GitHub deployer with target repository
      const results = await this.githubDeployer.deployDateSelections(this.pendingChanges, finalDeploymentOptions);
      
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

  async populateChangesList() {
    const changesList = document.querySelector('#histofy-changes-list');
    if (!changesList) return;

    // Force refresh changes before populating
    await this.updatePendingCount();

    console.log('Histofy Deploy: Populating changes list with', this.pendingChanges.length, 'changes');

    if (this.pendingChanges.length === 0) {
      changesList.innerHTML = `
        <div class="histofy-no-changes">
          <div class="histofy-no-changes-icon">📭</div>
          <h4>No Pending Changes</h4>
          <p>Select contribution tiles on a GitHub profile to create changes for deployment.</p>
          <div class="histofy-no-changes-steps">
            <p><strong>How to get started:</strong></p>
            <ol>
              <li>Go to any GitHub profile page</li>
              <li>Click "🚀 Activate Histofy"</li>
              <li>Click on contribution tiles to select dates</li>
              <li>Come back here to deploy your changes</li>
            </ol>
          </div>
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
            <button class="histofy-remove-change" data-change-id="${change.id}" title="Remove this change">🗑️</button>
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
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const changeId = btn.getAttribute('data-change-id');
        await this.removeChange(changeId);
      });
    });
  }

  formatChangeType(type) {
    const typeMap = {
      'date_selection': '📅 Date Selection',
      'move_commits': '🔄 Move Commits',
      'move_commits_timeline': '⏰ Timeline Move',
      'generate_commits': '🎲 Generate Commits',
      'intensity_pattern': '🎨 Intensity Pattern'
    };
    return typeMap[type] || '❓ Unknown';
  }

  formatChangeDetails(change) {
    switch (change.type) {
      case 'date_selection':
        const dates = change.dates || [];
        const contributions = change.contributions || {};
        const totalDates = dates.length;
        
        if (totalDates === 0) {
          return '<p>No dates selected</p>';
        }
        
        // Group by contribution level
        const levelCounts = {};
        dates.forEach(date => {
          const level = contributions[date]?.level || 0;
          const levelName = contributions[date]?.name || 'None';
          levelCounts[levelName] = (levelCounts[levelName] || 0) + 1;
        });
        
        const levelSummary = Object.entries(levelCounts)
          .map(([name, count]) => `${count} ${name}`)
          .join(', ');
        
        return `
          <p><strong>User:</strong> ${change.username} (${change.year})</p>
          <p><strong>Selected Dates:</strong> ${totalDates} dates</p>
          <p><strong>Levels:</strong> ${levelSummary}</p>
          <div class="histofy-date-range">
            <strong>Date Range:</strong> ${dates[0]} to ${dates[dates.length - 1]}
          </div>
        `;
      
      default:
        return `<p>Unknown change type: ${change.type}</p>`;
    }
  }

  formatTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (error) {
      return 'Invalid time';
    }
  }
}

// Initialize deploy button
window.histofyDeployButton = new DeployButton();
