// Background service worker for Histofy extension

// Import required scripts
importScripts(
  '/api/github-api.js',
  '/api/git-operations.js',
  '/storage/local-storage-manager.js'
);

class HistofyBackground {
  constructor() {
    this.githubAPI = null;
    this.gitOperations = null;
    this.init();
  }

  async init() {
    console.log('Histofy: Background service worker initialized');
    this.setupEventListeners();
    await this.initializeStorage();
    await this.initializeAPI();
  }

  async initializeAPI() {
    try {
      // Check if the classes are available
      if (typeof GitHubAPI !== 'undefined') {
        this.githubAPI = new GitHubAPI();
        await this.githubAPI.init();
      }
      
      if (typeof GitOperations !== 'undefined' && this.githubAPI) {
        this.gitOperations = new GitOperations(this.githubAPI);
        await this.gitOperations.init();
      }
      
      console.log('Histofy: API components initialized');
    } catch (error) {
      console.error('Histofy: Failed to initialize API components:', error);
    }
  }

  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates (for navigation detection)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  async handleInstallation(details) {
    if (details.reason === 'install') {
      console.log('Histofy: Extension installed for the first time');
      
      // Initialize default settings
      await this.initializeDefaultSettings();
      
      // Show welcome notification
      this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      console.log('Histofy: Extension updated to version', chrome.runtime.getManifest().version);
      
      // Handle migration if needed
      await this.handleVersionMigration(details.previousVersion);
    }
  }

  async initializeStorage() {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (!data.histofy_data) {
        await this.initializeDefaultSettings();
      }
    } catch (error) {
      console.error('Histofy: Error initializing storage:', error);
    }
  }

  async initializeDefaultSettings() {
    const defaultData = {
      pendingChanges: [],
      userSettings: {
        username: '',
        token: '',
        autoBackup: true,
        theme: 'auto',
        notifications: true,
        analyticsEnabled: false
      },
      backups: [],
      templates: [
        {
          id: 'consistent-daily',
          name: 'Consistent Daily',
          description: 'Regular daily contributions',
          pattern: 'daily',
          intensity: 'medium'
        },
        {
          id: 'weekend-warrior',
          name: 'Weekend Warrior',
          description: 'Heavy weekend activity',
          pattern: 'weekends',
          intensity: 'high'
        },
        {
          id: 'workday-focus',
          name: 'Workday Focus',
          description: 'Active during weekdays only',
          pattern: 'weekdays',
          intensity: 'medium'
        }
      ],
      statistics: {
        totalModifications: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        lastActivity: null,
        featuresUsed: []
      }
    };

    await chrome.storage.local.set({ histofy_data: defaultData });
    console.log('Histofy: Default settings initialized');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_STORAGE_DATA':
          const data = await chrome.storage.local.get('histofy_data');
          sendResponse({ success: true, data: data.histofy_data });
          break;

        case 'UPDATE_STORAGE_DATA':
          await chrome.storage.local.set({ histofy_data: message.data });
          sendResponse({ success: true });
          break;

        case 'BACKUP_CURRENT_STATE':
          const backupResult = await this.createBackup(message.repoInfo);
          sendResponse({ success: true, backupId: backupResult });
          break;

        case 'VALIDATE_GITHUB_TOKEN':
          const validationResult = await this.validateGitHubToken(message.token);
          sendResponse({ success: true, valid: validationResult });
          break;

        case 'GET_GITHUB_USER_INFO':
          const userInfo = await this.getGitHubUserInfo(message.token);
          sendResponse({ success: true, userInfo });
          break;

        case 'TRACK_FEATURE_USAGE':
          await this.trackFeatureUsage(message.feature);
          sendResponse({ success: true });
          break;

        case 'GET_EXTENSION_STATUS':
          const status = await this.getExtensionStatus();
          sendResponse({ success: true, status });
          break;

        // Popup message handlers
        case 'get_api_status':
          const apiStatus = await this.getAPIStatus();
          sendResponse(apiStatus);
          break;

        case 'get_stats':
          const stats = await this.getStats();
          sendResponse({ success: true, stats });
          break;

        case 'clear_pending_changes':
          const clearResult = await this.clearPendingChanges();
          sendResponse({ success: clearResult });
          break;

        case 'create_backup':
          const backupId = await this.createBackup({ url: 'popup' });
          sendResponse({ success: !!backupId, backupId });
          break;

        case 'authenticate':
          const authResult = await this.authenticateUser(message.token);
          sendResponse(authResult);
          break;

        case 'logout':
          const logoutResult = await this.logoutUser();
          sendResponse(logoutResult);
          break;

        case 'update_setting':
          const settingResult = await this.updateUserSetting(message.key, message.value);
          sendResponse({ success: settingResult });
          break;

        default:
          console.warn('Histofy: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Histofy: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Only care about URL changes on GitHub
    if (changeInfo.url && changeInfo.url.includes('github.com')) {
      // Send message to content script about navigation
      chrome.tabs.sendMessage(tabId, {
        type: 'NAVIGATION_DETECTED',
        url: changeInfo.url
      }).catch(() => {
        // Ignore errors if content script is not ready
      });
    }
  }

  handleStorageChange(changes, namespace) {
    if (namespace === 'local' && changes.histofy_data) {
      // Broadcast storage changes to all GitHub tabs
      this.broadcastToGitHubTabs({
        type: 'STORAGE_UPDATED',
        changes: changes.histofy_data
      });
    }
  }

  async broadcastToGitHubTabs(message) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://github.com/*' });
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors for tabs without content script
        });
      });
    } catch (error) {
      console.error('Histofy: Error broadcasting to tabs:', error);
    }
  }

  async createBackup(repoInfo) {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (!data.histofy_data) return null;

      const backup = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        repository: repoInfo,
        pendingChanges: [...data.histofy_data.pendingChanges],
        userSettings: { ...data.histofy_data.userSettings }
      };

      data.histofy_data.backups.unshift(backup);
      // Keep only last 20 backups
      data.histofy_data.backups = data.histofy_data.backups.slice(0, 20);

      await chrome.storage.local.set({ histofy_data: data.histofy_data });
      
      console.log('Histofy: Backup created with ID:', backup.id);
      return backup.id;
    } catch (error) {
      console.error('Histofy: Error creating backup:', error);
      return null;
    }
  }

  async validateGitHubToken(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Histofy-Extension'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Histofy: Error validating GitHub token:', error);
      return false;
    }
  }

  async getGitHubUserInfo(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Histofy-Extension'
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        return {
          login: userInfo.login,
          name: userInfo.name,
          email: userInfo.email,
          avatar_url: userInfo.avatar_url,
          public_repos: userInfo.public_repos,
          private_repos: userInfo.total_private_repos
        };
      }
    } catch (error) {
      console.error('Histofy: Error getting GitHub user info:', error);
    }

    return null;
  }

  async trackFeatureUsage(feature) {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        if (!data.histofy_data.statistics.featuresUsed.includes(feature)) {
          data.histofy_data.statistics.featuresUsed.push(feature);
        }
        data.histofy_data.statistics.lastActivity = new Date().toISOString();
        
        await chrome.storage.local.set({ histofy_data: data.histofy_data });
      }
    } catch (error) {
      console.error('Histofy: Error tracking feature usage:', error);
    }
  }

  async getExtensionStatus() {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      const manifest = chrome.runtime.getManifest();

      return {
        version: manifest.version,
        isActive: true,
        pendingChanges: data.histofy_data?.pendingChanges?.length || 0,
        backups: data.histofy_data?.backups?.length || 0,
        lastActivity: data.histofy_data?.statistics?.lastActivity,
        featuresUsed: data.histofy_data?.statistics?.featuresUsed?.length || 0
      };
    } catch (error) {
      console.error('Histofy: Error getting extension status:', error);
      return null;
    }
  }

  async handleVersionMigration(previousVersion) {
    console.log(`Histofy: Migrating from version ${previousVersion}`);
    
    // Add migration logic here for future versions
    // For now, just ensure the current data structure is valid
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        // Ensure new fields exist
        if (!data.histofy_data.statistics) {
          data.histofy_data.statistics = {
            totalModifications: 0,
            successfulDeployments: 0,
            failedDeployments: 0,
            lastActivity: null,
            featuresUsed: []
          };
        }

        // Ensure failedDeployments exists for existing statistics
        if (data.histofy_data.statistics && !data.histofy_data.statistics.hasOwnProperty('failedDeployments')) {
          data.histofy_data.statistics.failedDeployments = 0;
        }

        await chrome.storage.local.set({ histofy_data: data.histofy_data });
      }
    } catch (error) {
      console.error('Histofy: Error during migration:', error);
    }
  }

  showWelcomeNotification() {
    // This would be implemented if we had notification permissions
    console.log('Histofy: Welcome! Extension is ready to use on GitHub.');
  }

  // New popup message handlers
  async getAPIStatus() {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      const userSettings = data.histofy_data?.userSettings;
      
      let status = 'disconnected';
      let authenticated = false;
      let user = null;

      if (userSettings?.token) {
        const isValid = await this.validateGitHubToken(userSettings.token);
        if (isValid) {
          status = 'connected';
          authenticated = true;
          user = await this.getGitHubUserInfo(userSettings.token);
        } else {
          status = 'invalid_token';
        }
      }

      return {
        status,
        authenticated,
        user
      };
    } catch (error) {
      console.error('Histofy: Error getting API status:', error);
      return {
        status: 'error',
        authenticated: false,
        user: null
      };
    }
  }

  async getStats() {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (!data.histofy_data) {
        return { pending: 0, completed: 0, failed: 0 };
      }

      const pendingCount = data.histofy_data.pendingChanges?.length || 0;
      const completedCount = data.histofy_data.statistics?.successfulDeployments || 0;
      const failedCount = data.histofy_data.statistics?.failedDeployments || 0;

      return {
        pending: pendingCount,
        completed: completedCount,
        failed: failedCount
      };
    } catch (error) {
      console.error('Histofy: Error getting stats:', error);
      return { pending: 0, completed: 0, failed: 0 };
    }
  }

  async clearPendingChanges() {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        data.histofy_data.pendingChanges = [];
        await chrome.storage.local.set({ histofy_data: data.histofy_data });
        
        // Broadcast change to GitHub tabs
        this.broadcastToGitHubTabs({
          type: 'PENDING_CHANGES_CLEARED'
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Histofy: Error clearing pending changes:', error);
      return false;
    }
  }

  async authenticateUser(token) {
    try {
      const isValid = await this.validateGitHubToken(token);
      if (!isValid) {
        return { success: false, error: 'Invalid GitHub token' };
      }

      const user = await this.getGitHubUserInfo(token);
      if (!user) {
        return { success: false, error: 'Failed to get user info' };
      }

      // Save token and user info
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        data.histofy_data.userSettings.token = token;
        data.histofy_data.userSettings.username = user.login;
        await chrome.storage.local.set({ histofy_data: data.histofy_data });
      }

      return { success: true, user };
    } catch (error) {
      console.error('Histofy: Error authenticating user:', error);
      return { success: false, error: error.message };
    }
  }

  async logoutUser() {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        data.histofy_data.userSettings.token = '';
        data.histofy_data.userSettings.username = '';
        await chrome.storage.local.set({ histofy_data: data.histofy_data });
      }
      return { success: true };
    } catch (error) {
      console.error('Histofy: Error logging out user:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserSetting(key, value) {
    try {
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        data.histofy_data.userSettings[key] = value;
        await chrome.storage.local.set({ histofy_data: data.histofy_data });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Histofy: Error updating setting:', error);
      return false;
    }
  }

  // Cleanup method for extension shutdown
  cleanup() {
    console.log('Histofy: Background service worker cleanup');
  }
}

// Initialize the background service worker
const histofyBackground = new HistofyBackground();

// Handle service worker lifecycle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cleanup on unload (though this might not always fire in service workers)
self.addEventListener('beforeunload', () => {
  histofyBackground.cleanup();
});
