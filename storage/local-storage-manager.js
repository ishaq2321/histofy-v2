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
      const data = await this.getData();
      if (!data) {
        const defaultData = {
          pendingChanges: [],
          userSettings: {
            username: '',
            token: '',
            autoBackup: true,
            theme: 'auto',
            notifications: true
          },
          statistics: {
            totalModifications: 0,
            successfulDeployments: 0,
            failedDeployments: 0,
            lastActivity: null
          }
        };
        await this.saveData(defaultData);
      }
    } catch (error) {
      console.error('Histofy: Failed to ensure data structure:', error);
    }
  }

  async getData() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || null;
    } catch (error) {
      console.error('Histofy: Failed to get data:', error);
      return null;
    }
  }

  async saveData(data) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: data });
      return true;
    } catch (error) {
      console.error('Histofy: Failed to save data:', error);
      return false;
    }
  }

  // Pending changes management
  async addPendingChange(change) {
    try {
      const data = await this.getData();
      
      if (!data.pendingChanges) {
        data.pendingChanges = [];
      }

      // For date selections, ensure only one change per date per user/year
      if (change.type === 'date_selection') {
        // Remove any existing change for the same date/user/year
        data.pendingChanges = data.pendingChanges.filter(existingChange => 
          !(existingChange.type === 'date_selection' && 
            existingChange.date === change.date && 
            existingChange.username === change.username && 
            existingChange.year === change.year)
        );

        // Only add if level > 0 (don't store "no contribution" selections)
        if (change.level > 0) {
          change.id = change.id || this.generateId();
          data.pendingChanges.push(change);
          console.log(`Storage: Added pending change for ${change.date} at level ${change.level}`);
        } else {
          console.log(`Storage: Removed pending change for ${change.date} (level 0)`);
        }
      } else {
        // For other change types, check for duplicates normally
        const isDuplicate = this.isDuplicateChange(change, data.pendingChanges);
        
        if (!isDuplicate) {
          change.id = change.id || this.generateId();
          data.pendingChanges.push(change);
          console.log(`Storage: Added pending change: ${change.type}`);
        } else {
          console.log(`Storage: Skipped duplicate change: ${change.type}`);
        }
      }

      await this.saveData(data);
      return change.id;
    } catch (error) {
      console.error('Storage: Failed to add pending change:', error);
      throw error;
    }
  }

  // Enhanced method to get pending changes with better filtering
  async getPendingChangesByUser(username, year) {
    try {
      const data = await this.getData();
      
      if (!data.pendingChanges) {
        return [];
      }

      // Filter changes for specific user and year
      const userChanges = data.pendingChanges.filter(change => 
        change.username === username && 
        change.year === year
      );

      console.log(`Storage: Found ${userChanges.length} pending changes for ${username} (${year})`);
      return userChanges;
    } catch (error) {
      console.error('Storage: Failed to get pending changes by user:', error);
      return [];
    }
  }

  // Clear pending changes for specific user/year
  async clearPendingChangesForUser(username, year) {
    try {
      const data = await this.getData();
      
      if (!data.pendingChanges) {
        return 0;
      }

      const originalCount = data.pendingChanges.length;
      
      // Remove changes for specific user/year
      data.pendingChanges = data.pendingChanges.filter(change => 
        !(change.username === username && change.year === year)
      );

      const removedCount = originalCount - data.pendingChanges.length;
      
      await this.saveData(data);
      
      console.log(`Storage: Cleared ${removedCount} pending changes for ${username} (${year})`);
      return removedCount;
    } catch (error) {
      console.error('Storage: Failed to clear pending changes for user:', error);
      return 0;
    }
  }

  // Get all pending changes
  async getPendingChanges() {
    try {
      const data = await this.getData();
      return data?.pendingChanges || [];
    } catch (error) {
      console.error('Storage: Failed to get pending changes:', error);
      return [];
    }
  }

  // Clear all pending changes
  async clearPendingChanges() {
    try {
      const data = await this.getData();
      if (!data) {
        await this.ensureDataStructure();
        return true;
      }

      data.pendingChanges = [];
      await this.saveData(data);
      console.log('Storage: Cleared all pending changes');
      return true;
    } catch (error) {
      console.error('Storage: Failed to clear pending changes:', error);
      return false;
    }
  }

  // Remove a specific pending change by ID
  async removePendingChange(changeId) {
    try {
      const data = await this.getData();
      if (!data?.pendingChanges) {
        return false;
      }

      const originalLength = data.pendingChanges.length;
      data.pendingChanges = data.pendingChanges.filter(change => change.id !== changeId);
      
      if (data.pendingChanges.length < originalLength) {
        await this.saveData(data);
        console.log(`Storage: Removed pending change ${changeId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Storage: Failed to remove pending change:', error);
      return false;
    }
  }

  // Store a single pending change (alias for addPendingChange)
  async storePendingChange(change) {
    return await this.addPendingChange(change);
  }

  // Check if a change is duplicate of existing pending changes
  isDuplicateChange(newChange, existingChanges) {
    return existingChanges.some(existing => {
      if (existing.type !== newChange.type) return false;

      switch (newChange.type) {
        case 'date_selection':
          return this.isDuplicateDateSelection(newChange, existing);
        case 'move_commits':
          return this.isDuplicateMoveCommits(newChange, existing);
        case 'move_commits_timeline':
          return this.isDuplicateTimelineMove(newChange, existing);
        case 'generate_commits':
          return this.isDuplicateGenerateCommits(newChange, existing);
        case 'intensity_pattern':
          return this.isDuplicateIntensityPattern(newChange, existing);
        default:
          return this.isDuplicateBasic(newChange, existing);
      }
    });
  }

  // Check if date selections are duplicate (enhanced)
  isDuplicateDateSelection(newChange, existingChange) {
    return existingChange.type === 'date_selection' &&
           existingChange.date === newChange.date &&
           existingChange.username === newChange.username &&
           existingChange.year === newChange.year;
           // Note: We don't check level because we want to replace with new level
  }

  // Check if move commits operations are duplicate
  isDuplicateMoveCommits(newChange, existingChange) {
    return newChange.targetDate === existingChange.targetDate &&
           JSON.stringify(newChange.sourceDates) === JSON.stringify(existingChange.sourceDates);
  }

  // Check if timeline move operations are duplicate
  isDuplicateTimelineMove(newChange, existingChange) {
    return newChange.targetDate === existingChange.targetDate &&
           JSON.stringify(newChange.commits) === JSON.stringify(existingChange.commits);
  }

  // Check if generate commits operations are duplicate
  isDuplicateGenerateCommits(newChange, existingChange) {
    return newChange.startDate === existingChange.startDate &&
           newChange.endDate === existingChange.endDate &&
           newChange.pattern === existingChange.pattern;
  }

  // Check if intensity pattern operations are duplicate
  isDuplicateIntensityPattern(newChange, existingChange) {
    return newChange.commits === existingChange.commits &&
           newChange.intensity === existingChange.intensity;
  }

  // Basic duplicate check for unknown types
  isDuplicateBasic(newChange, existingChange) {
    return JSON.stringify(newChange) === JSON.stringify(existingChange);
  }

  // Helper to compare contributions objects
  areContributionsEqual(newContributions, existingContributions) {
    if (!newContributions && !existingContributions) return true;
    if (!newContributions || !existingContributions) return false;
    return JSON.stringify(newContributions) === JSON.stringify(existingContributions);
  }

  // User settings management
  async getUserSettings() {
    try {
      const data = await this.getData();
      return data?.userSettings || {};
    } catch (error) {
      console.error('Histofy: Failed to get user settings:', error);
      return {};
    }
  }

  async updateUserSettings(newSettings) {
    try {
      const data = await this.getData();
      if (!data) {
        await this.ensureDataStructure();
        return await this.updateUserSettings(newSettings);
      }

      data.userSettings = { ...data.userSettings, ...newSettings };
      await this.saveData(data);
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
      return data?.statistics || {
        totalModifications: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        lastActivity: null
      };
    } catch (error) {
      console.error('Histofy: Failed to get statistics:', error);
      return {
        totalModifications: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        lastActivity: null
      };
    }
  }

  async updateStatistics(newStats) {
    try {
      const data = await this.getData();
      if (!data) {
        await this.ensureDataStructure();
        return await this.updateStatistics(newStats);
      }

      data.statistics = { ...data.statistics, ...newStats };
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
      const pendingChanges = data?.pendingChanges?.length || 0;
      const statistics = data?.statistics || {};
      
      return {
        pendingChanges: pendingChanges,
        totalModifications: statistics.totalModifications || 0,
        successfulDeployments: statistics.successfulDeployments || 0,
        failedDeployments: statistics.failedDeployments || 0
      };
    } catch (error) {
      console.error('Histofy: Failed to get storage stats:', error);
      return {
        pendingChanges: 0,
        totalModifications: 0,
        successfulDeployments: 0,
        failedDeployments: 0
      };
    }
  }

  // Get deployment statistics
  async getDeploymentStats() {
    try {
      const data = await this.getData();
      
      const stats = {
        totalPending: data.pendingChanges?.length || 0,
        pendingByType: {},
        pendingByUser: {},
        totalCompleted: data.statistics?.successfulDeployments || 0,
        totalFailed: data.statistics?.failedDeployments || 0
      };

      // Group pending changes by type and user
      if (data.pendingChanges) {
        data.pendingChanges.forEach(change => {
          // By type
          stats.pendingByType[change.type] = (stats.pendingByType[change.type] || 0) + 1;
          
          // By user
          const userKey = `${change.username}_${change.year}`;
          stats.pendingByUser[userKey] = (stats.pendingByUser[userKey] || 0) + 1;
        });
      }

      return stats;
    } catch (error) {
      console.error('Storage: Failed to get deployment stats:', error);
      return {
        totalPending: 0,
        pendingByType: {},
        pendingByUser: {},
        totalCompleted: 0,
        totalFailed: 0
      };
    }
  }

  // Utility methods
  generateId() {
    return 'histofy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Export/Import functionality
  async exportData() {
    try {
      const data = await this.getData();
      const exportData = {
        ...data,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Histofy: Failed to export data:', error);
      return null;
    }
  }

  async importData(importedData) {
    try {
      const parsedData = typeof importedData === 'string' ? JSON.parse(importedData) : importedData;
      
      // Validate imported data structure
      if (!parsedData.pendingChanges && !parsedData.userSettings) {
        throw new Error('Invalid import data format');
      }

      await this.saveData(parsedData);
      console.log('Histofy: Data imported successfully');
      return true;
    } catch (error) {
      console.error('Histofy: Failed to import data:', error);
      return false;
    }
  }
}

// Initialize storage manager
window.histofyStorage = new LocalStorageManager();
