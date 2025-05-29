// Git operations manager for Histofy extension
class GitOperations {
  constructor(githubAPI) {
    this.api = githubAPI;
    this.pendingOperations = [];
    this.operationHistory = [];
    this.maxHistorySize = 100;
  }

  // Initialize git operations
  async init() {
    try {
      await this.loadPendingOperations();
      console.log('Histofy: Git operations initialized');
    } catch (error) {
      console.error('Histofy: Git operations initialization failed:', error);
    }
  }

  // Load pending operations from storage
  async loadPendingOperations() {
    try {
      const result = await chrome.storage.local.get(['histofy_pending_operations']);
      this.pendingOperations = result.histofy_pending_operations || [];
    } catch (error) {
      console.error('Histofy: Failed to load pending operations:', error);
    }
  }

  // Save pending operations to storage
  async savePendingOperations() {
    try {
      await chrome.storage.local.set({
        histofy_pending_operations: this.pendingOperations
      });
    } catch (error) {
      console.error('Histofy: Failed to save pending operations:', error);
    }
  }

  // Add operation to pending queue
  async addOperation(operation) {
    const operationWithId = {
      id: this.generateOperationId(),
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...operation
    };

    this.pendingOperations.push(operationWithId);
    await this.savePendingOperations();
    
    // Notify UI about the change
    this.notifyOperationChange('added', operationWithId);
    
    return operationWithId;
  }

  // Remove operation from pending queue
  async removeOperation(operationId) {
    const index = this.pendingOperations.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const removedOperation = this.pendingOperations.splice(index, 1)[0];
      await this.savePendingOperations();
      this.notifyOperationChange('removed', removedOperation);
      return removedOperation;
    }
    return null;
  }

  // Get all pending operations
  getPendingOperations() {
    return [...this.pendingOperations];
  }

  // Clear all pending operations
  async clearPendingOperations() {
    this.pendingOperations = [];
    await this.savePendingOperations();
    this.notifyOperationChange('cleared', null);
  }

  // Commit timestamp modification operations
  async modifyCommitTimestamp(owner, repo, commitSha, newTimestamp, options = {}) {
    const operation = {
      type: 'modify_timestamp',
      owner,
      repo,
      commitSha,
      newTimestamp,
      originalTimestamp: null,
      options
    };

    try {
      // First, get the original commit to store its timestamp
      const originalCommit = await this.api.getCommit(owner, repo, commitSha);
      operation.originalTimestamp = originalCommit.commit.author.date;

      // Add to pending operations
      return await this.addOperation(operation);
    } catch (error) {
      console.error('Histofy: Failed to prepare timestamp modification:', error);
      throw error;
    }
  }

  // Move commit to different date (contribution graph manipulation)
  async moveCommitToDate(owner, repo, commitSha, targetDate, options = {}) {
    const operation = {
      type: 'move_commit',
      owner,
      repo,
      commitSha,
      targetDate,
      originalDate: null,
      options
    };

    try {
      // Get original commit information
      const originalCommit = await this.api.getCommit(owner, repo, commitSha);
      operation.originalDate = originalCommit.commit.author.date;

      // Add to pending operations
      return await this.addOperation(operation);
    } catch (error) {
      console.error('Histofy: Failed to prepare commit move:', error);
      throw error;
    }
  }

  // Create artificial commits for contribution graph
  async createArtificialCommit(owner, repo, date, message, options = {}) {
    const operation = {
      type: 'create_commit',
      owner,
      repo,
      date,
      message: message || `Histofy: Artificial commit for ${date}`,
      options
    };

    return await this.addOperation(operation);
  }

  // Delete commits (careful operation)
  async deleteCommit(owner, repo, commitSha, options = {}) {
    const operation = {
      type: 'delete_commit',
      owner,
      repo,
      commitSha,
      backupData: null,
      options
    };

    try {
      // Create backup of commit data
      const commitData = await this.api.getCommit(owner, repo, commitSha);
      operation.backupData = commitData;

      return await this.addOperation(operation);
    } catch (error) {
      console.error('Histofy: Failed to prepare commit deletion:', error);
      throw error;
    }
  }

  // Execute pending operations
  async executePendingOperations(options = {}) {
    if (this.pendingOperations.length === 0) {
      throw new Error('No pending operations to execute');
    }

    const results = {
      successful: [],
      failed: [],
      total: this.pendingOperations.length
    };

    // Create a backup before executing
    if (options.createBackup !== false) {
      await this.createOperationBackup();
    }

    // Execute operations in order
    for (const operation of this.pendingOperations) {
      try {
        operation.status = 'executing';
        this.notifyOperationChange('executing', operation);

        const result = await this.executeOperation(operation);
        
        operation.status = 'completed';
        operation.result = result;
        operation.completedAt = new Date().toISOString();
        
        results.successful.push(operation);
        this.addToHistory(operation);
        
        this.notifyOperationChange('completed', operation);
      } catch (error) {
        operation.status = 'failed';
        operation.error = error.message;
        operation.failedAt = new Date().toISOString();
        
        results.failed.push(operation);
        
        this.notifyOperationChange('failed', operation);
        
        if (options.stopOnError) {
          break;
        }
      }
    }

    // Clear completed operations
    this.pendingOperations = this.pendingOperations.filter(op => op.status === 'failed');
    await this.savePendingOperations();

    return results;
  }

  // Execute individual operation
  async executeOperation(operation) {
    switch (operation.type) {
      case 'modify_timestamp':
        return await this.executeTimestampModification(operation);
      case 'move_commit':
        return await this.executeMoveCommit(operation);
      case 'create_commit':
        return await this.executeCreateCommit(operation);
      case 'delete_commit':
        return await this.executeDeleteCommit(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Execute timestamp modification (requires git filter-branch or rebase)
  async executeTimestampModification(operation) {
    // Note: This is a complex operation that requires git operations
    // For now, we'll simulate the process and prepare for actual implementation
    
    console.log('Histofy: Executing timestamp modification:', operation);
    
    // This would require:
    // 1. Clone the repository
    // 2. Use git filter-branch or git rebase to modify commit timestamps
    // 3. Force push the changes (if user has permissions)
    
    // For MVP, we'll return a simulation
    return {
      type: 'timestamp_modified',
      commitSha: operation.commitSha,
      oldTimestamp: operation.originalTimestamp,
      newTimestamp: operation.newTimestamp,
      simulated: true
    };
  }

  // Execute commit move operation
  async executeMoveCommit(operation) {
    console.log('Histofy: Executing commit move:', operation);
    
    // This would involve:
    // 1. Creating a new commit with the same changes but different timestamp
    // 2. Updating branch references
    // 3. Removing or hiding the original commit
    
    return {
      type: 'commit_moved',
      commitSha: operation.commitSha,
      oldDate: operation.originalDate,
      newDate: operation.targetDate,
      simulated: true
    };
  }

  // Execute artificial commit creation
  async executeCreateCommit(operation) {
    console.log('Histofy: Executing artificial commit creation:', operation);
    
    // This would involve:
    // 1. Creating an empty commit or minimal change
    // 2. Setting the author/committer date to the target date
    // 3. Pushing to the repository
    
    return {
      type: 'commit_created',
      date: operation.date,
      message: operation.message,
      simulated: true
    };
  }

  // Execute commit deletion
  async executeDeleteCommit(operation) {
    console.log('Histofy: Executing commit deletion:', operation);
    
    // This would involve:
    // 1. Rewriting history to remove the commit
    // 2. Force pushing the changes
    // 3. Handling any merge conflicts or dependencies
    
    return {
      type: 'commit_deleted',
      commitSha: operation.commitSha,
      backupCreated: true,
      simulated: true
    };
  }

  // Backup and restore operations
  async createOperationBackup() {
    const backup = {
      id: this.generateOperationId(),
      timestamp: new Date().toISOString(),
      pendingOperations: [...this.pendingOperations],
      type: 'pre_execution_backup'
    };

    try {
      const result = await chrome.storage.local.get(['histofy_operation_backups']);
      const backups = result.histofy_operation_backups || [];
      backups.push(backup);
      
      // Keep only the last 10 backups
      if (backups.length > 10) {
        backups.splice(0, backups.length - 10);
      }
      
      await chrome.storage.local.set({ histofy_operation_backups: backups });
      console.log('Histofy: Operation backup created:', backup.id);
      
      return backup;
    } catch (error) {
      console.error('Histofy: Failed to create operation backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupId) {
    try {
      const result = await chrome.storage.local.get(['histofy_operation_backups']);
      const backups = result.histofy_operation_backups || [];
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        throw new Error('Backup not found');
      }
      
      this.pendingOperations = [...backup.pendingOperations];
      await this.savePendingOperations();
      
      console.log('Histofy: Restored from backup:', backupId);
      this.notifyOperationChange('restored', backup);
      
      return backup;
    } catch (error) {
      console.error('Histofy: Failed to restore from backup:', error);
      throw error;
    }
  }

  // Operation history management
  addToHistory(operation) {
    this.operationHistory.unshift(operation);
    
    // Keep history size manageable
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(0, this.maxHistorySize);
    }
    
    // Save to storage
    this.saveOperationHistory();
  }

  async saveOperationHistory() {
    try {
      await chrome.storage.local.set({
        histofy_operation_history: this.operationHistory
      });
    } catch (error) {
      console.error('Histofy: Failed to save operation history:', error);
    }
  }

  async loadOperationHistory() {
    try {
      const result = await chrome.storage.local.get(['histofy_operation_history']);
      this.operationHistory = result.histofy_operation_history || [];
    } catch (error) {
      console.error('Histofy: Failed to load operation history:', error);
    }
  }

  // Utility functions
  generateOperationId() {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  notifyOperationChange(type, operation) {
    // Send message to content scripts about operation changes
    const message = {
      type: 'operation_change',
      changeType: type,
      operation: operation,
      pendingCount: this.pendingOperations.length
    };

    // Notify content scripts
    chrome.tabs.query({ url: 'https://github.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors for inactive tabs
        });
      });
    });

    // Notify popup if open
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore errors if popup is not open
    });
  }

  // Validation helpers
  validateRepository(owner, repo) {
    if (!owner || !repo) {
      throw new Error('Repository owner and name are required');
    }
    
    if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
      throw new Error('Invalid repository owner or name format');
    }
  }

  validateCommitSha(sha) {
    if (!sha || !/^[a-f0-9]{40}$/.test(sha)) {
      throw new Error('Invalid commit SHA format');
    }
  }

  validateDate(date) {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Don't allow future dates
    if (dateObj > new Date()) {
      throw new Error('Future dates are not allowed');
    }
  }

  // Statistics and monitoring
  getOperationStats() {
    const pending = this.pendingOperations.length;
    const completed = this.operationHistory.filter(op => op.status === 'completed').length;
    const failed = this.operationHistory.filter(op => op.status === 'failed').length;
    
    return {
      pending,
      completed,
      failed,
      total: completed + failed
    };
  }

  // Deploy all pending operations
  async deployAllOperations(options = {}) {
    console.log('Histofy: Starting deployment of all pending operations');
    
    if (this.pendingOperations.length === 0) {
      return { success: true, message: 'No pending operations to deploy' };
    }

    try {
      // Group operations by repository
      const operationsByRepo = this.groupOperationsByRepository();
      
      const results = {
        successful: [],
        failed: [],
        skipped: []
      };

      // Process each repository separately
      for (const [repoKey, operations] of Object.entries(operationsByRepo)) {
        console.log(`Histofy: Processing ${operations.length} operations for ${repoKey}`);
        
        try {
          const repoResult = await this.deployRepositoryOperations(repoKey, operations, options);
          results.successful.push(...repoResult.successful);
          results.failed.push(...repoResult.failed);
          results.skipped.push(...repoResult.skipped);
        } catch (error) {
          console.error(`Histofy: Failed to deploy operations for ${repoKey}:`, error);
          // Mark all operations for this repo as failed
          operations.forEach(op => {
            op.status = 'failed';
            op.error = error.message;
            results.failed.push(op);
          });
        }
      }

      // Update storage
      this.pendingOperations = this.pendingOperations.filter(op => op.status === 'pending');
      await this.savePendingOperations();

      // Update statistics
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        data.histofy_data.statistics.successfulDeployments += results.successful.length;
        data.histofy_data.statistics.failedDeployments += results.failed.length;
        data.histofy_data.statistics.totalModifications += results.successful.length;
        data.histofy_data.statistics.lastActivity = new Date().toISOString();
        await chrome.storage.local.set({ histofy_data: data.histofy_data });
      }

      return {
        success: results.failed.length === 0,
        results,
        message: `Deployment completed: ${results.successful.length} successful, ${results.failed.length} failed`
      };

    } catch (error) {
      console.error('Histofy: Deployment failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Deployment failed due to unexpected error'
      };
    }
  }

  // Group operations by repository for batch processing
  groupOperationsByRepository() {
    const groups = {};
    
    this.pendingOperations.forEach(operation => {
      const key = `${operation.owner}/${operation.repo}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(operation);
    });

    return groups;
  }

  // Deploy operations for a specific repository
  async deployRepositoryOperations(repoKey, operations, options = {}) {
    const [owner, repo] = repoKey.split('/');
    
    console.log(`Histofy: Deploying ${operations.length} operations for ${owner}/${repo}`);

    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Check repository permissions first
    const hasPermissions = await this.checkRepositoryPermissions(owner, repo);
    if (!hasPermissions) {
      operations.forEach(op => {
        op.status = 'failed';
        op.error = 'Insufficient repository permissions';
        results.failed.push(op);
      });
      return results;
    }

    // Process operations based on type
    for (const operation of operations) {
      try {
        console.log(`Histofy: Processing operation ${operation.id} (${operation.type})`);
        
        switch (operation.type) {
          case 'modify_timestamp':
            await this.deployTimestampModification(operation);
            break;
          case 'move_commit':
            await this.deployMoveCommit(operation);
            break;
          case 'create_commit':
            await this.deployCreateCommit(operation);
            break;
          default:
            throw new Error(`Unsupported operation type: ${operation.type}`);
        }

        operation.status = 'completed';
        operation.completedAt = new Date().toISOString();
        results.successful.push(operation);
        
        console.log(`Histofy: Operation ${operation.id} completed successfully`);

      } catch (error) {
        console.error(`Histofy: Operation ${operation.id} failed:`, error);
        operation.status = 'failed';
        operation.error = error.message;
        operation.failedAt = new Date().toISOString();
        results.failed.push(operation);

        if (options.stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  // Check if user has permissions to modify the repository
  async checkRepositoryPermissions(owner, repo) {
    try {
      const repoInfo = await this.api.getRepository(owner, repo);
      return repoInfo.permissions?.push === true;
    } catch (error) {
      console.error('Histofy: Failed to check repository permissions:', error);
      return false;
    }
  }

  // Deploy timestamp modification (simulation for now)
  async deployTimestampModification(operation) {
    // This is a simulation of the git operation
    // In a real implementation, this would:
    // 1. Create a new commit with the modified timestamp
    // 2. Update the repository history
    // 3. Handle any conflicts or issues

    console.log('Histofy: Simulating timestamp modification deployment');
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // For now, we'll just validate the operation
    if (!operation.newTimestamp || !operation.commitSha) {
      throw new Error('Invalid timestamp modification operation');
    }

    // In the real implementation, this would involve:
    // - Using GitHub API to create new commits
    // - Potentially using git filter-branch or rebase operations
    // - Handling repository history rewriting
    
    console.log(`Histofy: Would modify commit ${operation.commitSha} timestamp to ${operation.newTimestamp}`);
  }

  // Deploy move commit operation (simulation)
  async deployMoveCommit(operation) {
    console.log('Histofy: Simulating move commit deployment');
    
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    if (!operation.fromDate || !operation.toDate) {
      throw new Error('Invalid move commit operation');
    }

    console.log(`Histofy: Would move commit from ${operation.fromDate} to ${operation.toDate}`);
  }

  // Deploy create commit operation (simulation)
  async deployCreateCommit(operation) {
    console.log('Histofy: Simulating create commit deployment');
    
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    
    if (!operation.date || !operation.message) {
      throw new Error('Invalid create commit operation');
    }

    // This would create an actual empty commit with the specified date
    console.log(`Histofy: Would create commit for ${operation.date} with message "${operation.message}"`);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitOperations;
} else if (typeof window !== 'undefined') {
  window.GitOperations = GitOperations;
}
