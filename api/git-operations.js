// Git operations manager for Histofy extension
class GitOperations {
  constructor(githubAPI) {
    this.api = githubAPI;
    this.pendingOperations = [];
  }

  // Initialize git operations
  async init() {
    try {
      await this.loadPendingOperations();
    } catch (error) {
      console.error('Git operations initialization failed:', error);
    }
  }

  // Load pending operations from storage
  async loadPendingOperations() {
    try {
      const result = await chrome.storage.local.get(['histofy_pending_operations']);
      this.pendingOperations = result.histofy_pending_operations || [];
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }

  // Save pending operations to storage
  async savePendingOperations() {
    try {
      await chrome.storage.local.set({
        histofy_pending_operations: this.pendingOperations
      });
    } catch (error) {
      console.error('Failed to save pending operations:', error);
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
      console.error('Failed to prepare timestamp modification:', error);
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
      console.error('Failed to prepare commit move:', error);
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
      console.error('Failed to prepare commit deletion:', error);
      throw error;
    }
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
    return {
      type: 'commit_created',
      date: operation.date,
      message: operation.message,
      simulated: true
    };
  }

  // Execute commit deletion
  async executeDeleteCommit(operation) {
    return {
      type: 'commit_deleted',
      commitSha: operation.commitSha,
      backupCreated: true,
      simulated: true
    };
  }

  // Utility functions
  generateOperationId() {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  notifyOperationChange(type, operation) {
    // Simple notification - just track pending count
    const message = {
      type: 'operation_change',
      changeType: type,
      pendingCount: this.pendingOperations.length
    };

    chrome.runtime.sendMessage(message).catch(() => {});
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
    if (this.pendingOperations.length === 0) {
      return { success: true, message: 'No pending operations to deploy' };
    }

    try {
      const operationsByRepo = this.groupOperationsByRepository();
      const results = {
        successful: [],
        failed: [],
        skipped: []
      };

      for (const [repoKey, operations] of Object.entries(operationsByRepo)) {
        try {
          const repoResult = await this.deployRepositoryOperations(repoKey, operations, options);
          results.successful.push(...repoResult.successful);
          results.failed.push(...repoResult.failed);
          results.skipped.push(...repoResult.skipped);
        } catch (error) {
          operations.forEach(op => {
            op.status = 'failed';
            op.error = error.message;
            results.failed.push(op);
          });
        }
      }

      this.pendingOperations = this.pendingOperations.filter(op => op.status === 'pending');
      await this.savePendingOperations();

      return {
        success: results.failed.length === 0,
        results,
        message: `Deployment completed: ${results.successful.length} successful, ${results.failed.length} failed`
      };

    } catch (error) {
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
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    const hasPermissions = await this.checkRepositoryPermissions(owner, repo);
    if (!hasPermissions) {
      operations.forEach(op => {
        op.status = 'failed';
        op.error = 'Insufficient repository permissions';
        results.failed.push(op);
      });
      return results;
    }

    for (const operation of operations) {
      try {
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

      } catch (error) {
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
      return false;
    }
  }

  // Deploy timestamp modification (simulation for now)
  async deployTimestampModification(operation) {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    if (!operation.newTimestamp || !operation.commitSha) {
      throw new Error('Invalid timestamp modification operation');
    }
  }

  async deployMoveCommit(operation) {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    if (!operation.fromDate || !operation.toDate) {
      throw new Error('Invalid move commit operation');
    }
  }

  async deployCreateCommit(operation) {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
    
    if (!operation.date || !operation.message) {
      throw new Error('Invalid create commit operation');
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitOperations;
} else if (typeof window !== 'undefined') {
  window.GitOperations = GitOperations;
}
