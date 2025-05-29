// Local storage manager for Histofy extension
class LocalStorageManager {
  constructor() {
    this.storageKey = 'histofy_data';
    this.defaultData = {
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
      templates: [],
      statistics: {
        totalModifications: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        lastActivity: null,
        featuresUsed: []
      }
    };
    this.init();
  }

  async init() {
    await this.ensureDataStructure();
    console.log('Histofy: Local storage manager initialized');
  }

  async ensureDataStructure() {
    try {
      const data = await chrome.storage.local.get(this.storageKey);
      if (!data[this.storageKey]) {
        await chrome.storage.local.set({
          [this.storageKey]: { ...this.defaultData }
        });
        console.log('Histofy: Initialized default storage structure');
      }
    } catch (error) {
      console.error('Histofy: Failed to ensure data structure:', error);
    }
  }

  async getData() {
    try {
      if (!chrome?.storage?.local) {
        console.warn('Histofy: Chrome storage API not available');
        return { ...this.defaultData };
      }
      
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || { ...this.defaultData };
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Histofy: Extension context invalidated, using default data');
        return { ...this.defaultData };
      }
      console.error('Histofy: Failed to get data:', error);
      return { ...this.defaultData };
    }
  }

  async saveData(data) {
    try {
      if (!chrome?.storage?.local) {
        console.warn('Histofy: Chrome storage API not available');
        return false;
      }
      
      await chrome.storage.local.set({ [this.storageKey]: data });
      return true;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Histofy: Extension context invalidated, cannot save data');
        return false;
      }
      console.error('Histofy: Failed to save data:', error);
      return false;
    }
  }

  // Pending changes management
  async addPendingChange(change) {
    try {
      const data = await this.getData();
      change.id = change.id || this.generateId();
      change.timestamp = change.timestamp || new Date().toISOString();
      
      data.pendingChanges.push(change);
      const saved = await this.saveData(data);
      
      if (saved) {
        console.log('Histofy: Added pending change:', change.id);
        return change;
      } else {
        throw new Error('Failed to save pending change');
      }
    } catch (error) {
      console.error('Histofy: Failed to add pending change:', error);
      throw error;
    }
  }

  async getPendingChanges() {
    try {
      const data = await this.getData();
      return data.pendingChanges || [];
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Histofy: Extension context invalidated, returning empty pending changes');
        return [];
      }
      console.error('Histofy: Failed to get pending changes:', error);
      return [];
    }
  }

  async removePendingChange(changeId) {
    try {
      const data = await this.getData();
      const index = data.pendingChanges.findIndex(change => change.id === changeId);
      
      if (index !== -1) {
        const removed = data.pendingChanges.splice(index, 1)[0];
        await this.saveData(data);
        console.log('Histofy: Removed pending change:', changeId);
        return removed;
      }
      
      return null;
    } catch (error) {
      console.error('Histofy: Failed to remove pending change:', error);
      throw error;
    }
  }

  async clearPendingChanges() {
    try {
      const data = await this.getData();
      const count = data.pendingChanges.length;
      data.pendingChanges = [];
      await this.saveData(data);
      
      console.log(`Histofy: Cleared ${count} pending changes`);
      return count;
    } catch (error) {
      console.error('Histofy: Failed to clear pending changes:', error);
      throw error;
    }
  }

  // User settings management
  async getUserSettings() {
    try {
      const data = await this.getData();
      return data.userSettings || { ...this.defaultData.userSettings };
    } catch (error) {
      console.error('Histofy: Failed to get user settings:', error);
      return { ...this.defaultData.userSettings };
    }
  }

  async updateUserSettings(newSettings) {
    try {
      const data = await this.getData();
      data.userSettings = { ...data.userSettings, ...newSettings };
      await this.saveData(data);
      
      console.log('Histofy: Updated user settings');
      return true;
    } catch (error) {
      console.error('Histofy: Failed to update user settings:', error);
      return false;
    }
  }

  // Statistics management
  async getStatistics() {
    try {
      const data = await this.getData();
      return data.statistics || { ...this.defaultData.statistics };
    } catch (error) {
      console.error('Histofy: Failed to get statistics:', error);
      return { ...this.defaultData.statistics };
    }
  }

  async updateStatistics(newStats) {
    try {
      const data = await this.getData();
      data.statistics = { ...data.statistics, ...newStats };
      data.statistics.lastActivity = new Date().toISOString();
      await this.saveData(data);
      
      return true;
    } catch (error) {
      console.error('Histofy: Failed to update statistics:', error);
      return false;
    }
  }

  // Storage statistics
  async getStorageStats() {
    try {
      const data = await this.getData();
      return {
        pendingChanges: data.pendingChanges?.length || 0,
        backups: data.backups?.length || 0,
        templates: data.templates?.length || 0,
        totalSize: JSON.stringify(data).length
      };
    } catch (error) {
      console.error('Histofy: Failed to get storage stats:', error);
      return {
        pendingChanges: 0,
        backups: 0,
        templates: 0,
        totalSize: 0
      };
    }
  }

  // Utility methods
  generateId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Export/Import functionality
  async exportData() {
    try {
      const data = await this.getData();
      return {
        ...data,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('Histofy: Failed to export data:', error);
      throw error;
    }
  }

  async importData(importedData) {
    try {
      // Validate imported data structure
      if (!importedData || typeof importedData !== 'object') {
        throw new Error('Invalid import data format');
      }

      // Merge with default structure to ensure all required fields exist
      const mergedData = {
        ...this.defaultData,
        ...importedData,
        userSettings: {
          ...this.defaultData.userSettings,
          ...(importedData.userSettings || {})
        },
        statistics: {
          ...this.defaultData.statistics,
          ...(importedData.statistics || {})
        }
      };

      await this.saveData(mergedData);
      console.log('Histofy: Data imported successfully');
      return true;
    } catch (error) {
      console.error('Histofy: Failed to import data:', error);
      throw error;
    }
  }
}

// Initialize storage manager
window.histofyStorage = new LocalStorageManager();
