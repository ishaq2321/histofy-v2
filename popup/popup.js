// Popup script for Histofy extension
class HistofyPopup {
  constructor() {
    this.githubAPI = null;
    this.gitOperations = null;
    this.currentPageInfo = null;
    this.stats = {
      pending: 0,
      completed: 0,
      failed: 0
    };
    this.init();
  }

  async init() {
    console.log('Histofy: Popup initialized');
    await this.initializeAPI();
    await this.loadCurrentPageInfo();
    await this.loadStats();
    this.setupEventListeners();
    this.updateUI();
  }

  async initializeAPI() {
    try {
      // We need to use messaging to communicate with background script
      // since popup can't directly access GitHub API in Manifest V3
      const response = await this.sendMessage({ type: 'get_api_status' });
      this.apiStatus = response?.status || 'disconnected';
      this.authStatus = response?.authenticated || false;
      this.userInfo = response?.user || null;
    } catch (error) {
      console.error('Histofy: Failed to initialize popup API:', error);
      this.apiStatus = 'error';
    }
  }

  async loadCurrentPageInfo() {
    try {
      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url && tab.url.includes('github.com')) {
        // Send message to content script to get page info
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'get_page_info' });
        this.currentPageInfo = response?.pageInfo || null;
      } else {
        this.currentPageInfo = null;
      }
    } catch (error) {
      console.error('Histofy: Failed to load page info:', error);
      this.currentPageInfo = null;
    }
  }

  async loadStats() {
    try {
      const response = await this.sendMessage({ type: 'get_stats' });
      this.stats = response?.stats || this.stats;
    } catch (error) {
      console.error('Histofy: Failed to load stats:', error);
    }
  }

  setupEventListeners() {
    // Quick Actions
    document.getElementById('histofy-quick-activate')?.addEventListener('click', () => {
      this.activateOnPage();
    });

    document.getElementById('histofy-quick-clear')?.addEventListener('click', () => {
      this.clearPendingChanges();
    });

    document.getElementById('histofy-quick-backup')?.addEventListener('click', () => {
      this.createBackup();
    });

    // GitHub Authentication
    document.getElementById('histofy-auth-login')?.addEventListener('click', () => {
      this.showAuthModal();
    });

    document.getElementById('histofy-auth-logout')?.addEventListener('click', () => {
      this.logout();
    });

    // Settings
    document.getElementById('histofy-notifications')?.addEventListener('change', (e) => {
      this.updateSetting('notifications', e.target.checked);
    });

    document.getElementById('histofy-auto-backup')?.addEventListener('change', (e) => {
      this.updateSetting('autoBackup', e.target.checked);
    });

    document.getElementById('histofy-theme')?.addEventListener('change', (e) => {
      this.updateSetting('theme', e.target.value);
    });

    // Help Links
    document.getElementById('histofy-help')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/histofy/extension/wiki' });
    });

    document.getElementById('histofy-github')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/histofy/extension' });
    });

    document.getElementById('histofy-issues')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/histofy/extension/issues' });
    });
  }

  updateUI() {
    this.updatePageStatus();
    this.updateAuthStatus();
    this.updateStats();
    this.updateQuickActions();
  }

  updatePageStatus() {
    const currentPageElement = document.getElementById('histofy-current-page');
    
    if (this.currentPageInfo) {
      const pageType = this.currentPageInfo.page;
      const pageText = this.formatPageType(pageType);
      currentPageElement.textContent = pageText;
      currentPageElement.className = 'histofy-status-value histofy-status-active';
    } else {
      currentPageElement.textContent = 'Not GitHub';
      currentPageElement.className = 'histofy-status-value histofy-status-inactive';
    }
  }

  updateAuthStatus() {
    const authSection = document.querySelector('.histofy-auth-section');
    
    if (this.authStatus && this.userInfo) {
      authSection.innerHTML = `
        <div class="histofy-auth-success">
          <div class="histofy-auth-user">
            <span class="histofy-auth-avatar">👤</span>
            <div class="histofy-auth-info">
              <span class="histofy-auth-name">${this.userInfo.login}</span>
              <span class="histofy-auth-email">${this.userInfo.email || 'No email'}</span>
            </div>
          </div>
          <button class="histofy-popup-btn histofy-btn-warning" id="histofy-auth-logout">
            🔓 Logout
          </button>
        </div>
      `;
      
      // Re-attach logout handler
      document.getElementById('histofy-auth-logout')?.addEventListener('click', () => {
        this.logout();
      });
    } else {
      authSection.innerHTML = `
        <div class="histofy-auth-required">
          <p>🔑 GitHub authentication required</p>
          <button class="histofy-popup-btn histofy-btn-primary" id="histofy-auth-login">
            🔗 Connect GitHub
          </button>
        </div>
      `;
      
      // Re-attach login handler
      document.getElementById('histofy-auth-login')?.addEventListener('click', () => {
        this.showAuthModal();
      });
    }
  }

  updateStats() {
    document.getElementById('histofy-pending-count').textContent = this.stats.pending;
    document.getElementById('histofy-completed-count').textContent = this.stats.completed;
    document.getElementById('histofy-failed-count').textContent = this.stats.failed;
  }

  updateQuickActions() {
    const activateBtn = document.getElementById('histofy-quick-activate');
    const clearBtn = document.getElementById('histofy-quick-clear');
    
    // Enable/disable based on current page
    if (activateBtn) {
      activateBtn.disabled = !this.currentPageInfo;
      activateBtn.textContent = this.currentPageInfo ? '🎯 Activate on Page' : '❌ Not on GitHub';
    }
    
    // Enable/disable clear based on pending changes
    if (clearBtn) {
      clearBtn.disabled = this.stats.pending === 0;
    }
  }

  // Actions
  async activateOnPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('github.com')) {
        await chrome.tabs.sendMessage(tab.id, { type: 'activate_histofy' });
        this.showNotification('Histofy activated on current page!', 'success');
        window.close();
      }
    } catch (error) {
      console.error('Histofy: Failed to activate on page:', error);
      this.showNotification('Failed to activate on page', 'error');
    }
  }

  async clearPendingChanges() {
    if (confirm('Are you sure you want to clear all pending changes? This action cannot be undone.')) {
      try {
        await this.sendMessage({ type: 'clear_pending_changes' });
        await this.loadStats();
        this.updateStats();
        this.updateQuickActions();
        this.showNotification('All pending changes cleared', 'success');
      } catch (error) {
        console.error('Histofy: Failed to clear changes:', error);
        this.showNotification('Failed to clear changes', 'error');
      }
    }
  }

  async createBackup() {
    try {
      const response = await this.sendMessage({ type: 'create_backup' });
      if (response?.success) {
        this.showNotification('Backup created successfully', 'success');
      } else {
        this.showNotification('Failed to create backup', 'error');
      }
    } catch (error) {
      console.error('Histofy: Failed to create backup:', error);
      this.showNotification('Failed to create backup', 'error');
    }
  }

  showAuthModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'histofy-modal-overlay';
    modal.innerHTML = `
      <div class="histofy-modal">
        <div class="histofy-modal-header">
          <h3>🔗 Connect to GitHub</h3>
          <button class="histofy-modal-close" id="histofy-modal-close">✕</button>
        </div>
        <div class="histofy-modal-content">
          <div class="histofy-auth-form">
            <div class="histofy-form-group">
              <label for="histofy-token-input">Personal Access Token:</label>
              <input type="password" id="histofy-token-input" class="histofy-popup-input" 
                     placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
            </div>
            <div class="histofy-auth-help">
              <p>📝 <strong>Required token scopes:</strong> <code>repo</code>, <code>user</code></p>
              <p>🔗 <a href="https://github.com/settings/tokens/new" target="_blank">Create Personal Access Token</a></p>
              <p>💡 <strong>Tip:</strong> Tokens are stored securely in your browser</p>
            </div>
            <div class="histofy-form-actions">
              <button class="histofy-popup-btn histofy-btn-secondary" id="histofy-auth-cancel">Cancel</button>
              <button class="histofy-popup-btn histofy-btn-primary" id="histofy-auth-save">🔑 Authenticate</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup modal handlers
    const closeModal = () => {
      modal.remove();
    };

    document.getElementById('histofy-modal-close').addEventListener('click', closeModal);
    document.getElementById('histofy-auth-cancel').addEventListener('click', closeModal);
    
    document.getElementById('histofy-auth-save').addEventListener('click', async () => {
      const token = document.getElementById('histofy-token-input').value.trim();
      if (token) {
        await this.authenticate(token);
        closeModal();
      } else {
        this.showNotification('Please enter a valid token', 'error');
      }
    });

    // Auto-focus token input
    document.getElementById('histofy-token-input').focus();
  }

  async authenticate(token) {
    try {
      this.showNotification('Validating GitHub token...', 'info');
      
      const response = await this.sendMessage({ 
        type: 'authenticate', 
        token: token 
      });

      if (response?.success) {
        this.authStatus = true;
        this.userInfo = response.user;
        this.updateAuthStatus();
        this.showNotification('Authentication successful!', 'success');
      } else {
        this.showNotification(response?.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.error('Histofy: Authentication failed:', error);
      this.showNotification('Authentication failed', 'error');
    }
  }

  async logout() {
    try {
      const response = await this.sendMessage({ type: 'logout' });
      if (response?.success) {
        this.authStatus = false;
        this.userInfo = null;
        this.updateAuthStatus();
        this.showNotification('Logged out successfully', 'success');
      }
    } catch (error) {
      console.error('Histofy: Logout failed:', error);
      this.showNotification('Logout failed', 'error');
    }
  }

  async updateSetting(key, value) {
    try {
      await this.sendMessage({ 
        type: 'update_setting', 
        key: key, 
        value: value 
      });
    } catch (error) {
      console.error('Histofy: Failed to update setting:', error);
    }
  }

  // Utility functions
  formatPageType(pageType) {
    const typeMap = {
      'profile': '👤 Profile Page',
      'repository': '📁 Repository Page',
      'commit': '📝 Commit Page',
      'pulls': '🔀 Pull Requests',
      'issues': '🐛 Issues',
      'actions': '⚡ Actions',
      'settings': '⚙️ Settings'
    };
    return typeMap[pageType] || '📄 GitHub Page';
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `histofy-popup-notification histofy-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new HistofyPopup();
});
