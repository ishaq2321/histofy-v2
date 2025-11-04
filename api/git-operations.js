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


}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitOperations;
} else if (typeof window !== 'undefined') {
  window.GitOperations = GitOperations;
}
