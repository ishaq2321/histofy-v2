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
      
      // Check for duplicates before adding
      if (this.isDuplicateChange(change, data.pendingChanges)) {
        console.log('Histofy: Duplicate change detected, not adding:', change.type);
        return null; // Return null to indicate no change was added
      }
      
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

  // Check if a change is duplicate of existing pending changes
  isDuplicateChange(newChange, existingChanges) {
    return existingChanges.some(existingChange => {
      // Same type is required for comparison
      if (newChange.type !== existingChange.type) {
        return false;
      }

      switch (newChange.type) {
        case 'date_selection':
          return this.isDuplicateDateSelection(newChange, existingChange);
        
        case 'move_commits':
          return this.isDuplicateMoveCommits(newChange, existingChange);
        
        case 'move_commits_timeline':
          return this.isDuplicateTimelineMove(newChange, existingChange);
        
        case 'generate_commits':
          return this.isDuplicateGenerateCommits(newChange, existingChange);
        
        case 'intensity_pattern':
          return this.isDuplicateIntensityPattern(newChange, existingChange);
        
        default:
          // For unknown types, compare basic properties
          return this.isDuplicateBasic(newChange, existingChange);
      }
    });
  }

  // Check if date selections are duplicate
  isDuplicateDateSelection(newChange, existingChange) {
    // Compare date arrays (order independent)
    const newDates = (newChange.dates || []).sort();
    const existingDates = (existingChange.dates || []).sort();
    
    if (newDates.length !== existingDates.length) {
      return false;
    }
    
    // Check if all dates match
    const datesMatch = newDates.every((date, index) => date === existingDates[index]);
    
    // Also compare contribution levels for each date
    const contributionsMatch = this.areContributionsEqual(
      newChange.contributions || {}, 
      existingChange.contributions || {}
    );
    
    return datesMatch && contributionsMatch;
  }

  // Check if move commits operations are duplicate
  isDuplicateMoveCommits(newChange, existingChange) {
    const newSourceDates = (newChange.sourceDates || []).sort();
    const existingSourceDates = (existingChange.sourceDates || []).sort();
    
    const sourceDatesMatch = newSourceDates.length === existingSourceDates.length &&
      newSourceDates.every((date, index) => date === existingSourceDates[index]);
    
    const targetDateMatch = newChange.targetDate === existingChange.targetDate;
    
    return sourceDatesMatch && targetDateMatch;
  }

  // Check if timeline move operations are duplicate
  isDuplicateTimelineMove(newChange, existingChange) {
    const newCommits = (newChange.commits || []).sort();
    const existingCommits = (existingChange.commits || []).sort();
    
    const commitsMatch = newCommits.length === existingCommits.length &&
      newCommits.every((commit, index) => commit === existingCommits[index]);
    
    const targetDateMatch = newChange.targetDate === existingChange.targetDate;
    const repoMatch = newChange.repository === existingChange.repository;
    
    return commitsMatch && targetDateMatch && repoMatch;
  }

  // Check if generate commits operations are duplicate
  isDuplicateGenerateCommits(newChange, existingChange) {
    return newChange.startDate === existingChange.startDate &&
           newChange.endDate === existingChange.endDate &&
           newChange.pattern === existingChange.pattern &&
           newChange.frequency === existingChange.frequency &&
           newChange.messageTemplate === existingChange.messageTemplate;
  }

  // Check if intensity pattern operations are duplicate
  isDuplicateIntensityPattern(newChange, existingChange) {
    return newChange.commits === existingChange.commits &&
           newChange.intensity === existingChange.intensity;
  }

  // Basic duplicate check for unknown types
  isDuplicateBasic(newChange, existingChange) {
    // Compare JSON representation (excluding id and timestamp)
    const newCopy = { ...newChange };
    const existingCopy = { ...existingChange };
    
    delete newCopy.id;
    delete newCopy.timestamp;
    delete existingCopy.id;
    delete existingCopy.timestamp;
    
    return JSON.stringify(newCopy) === JSON.stringify(existingCopy);
  }

  // Helper to compare contributions objects
  areContributionsEqual(newContributions, existingContributions) {
    const newKeys = Object.keys(newContributions).sort();
    const existingKeys = Object.keys(existingContributions).sort();
    
    // Check if same number of dates have contributions
    if (newKeys.length !== existingKeys.length) {
      return false;
    }
    
    // Check if all keys match
    if (!newKeys.every((key, index) => key === existingKeys[index])) {
      return false;
    }
    
    // Check if contribution levels match for each date
    return newKeys.every(date => {
      const newContrib = newContributions[date];
      const existingContrib = existingContributions[date];
      
      return newContrib.level === existingContrib.level &&
             newContrib.name === existingContrib.name &&
             newContrib.commits === existingContrib.commits;
    });
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
