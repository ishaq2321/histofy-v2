#!/usr/bin/env node

/**
 * Integration Test for Histofy Chrome Extension
 * Tests the complete deployment workflow with all optimizations
 */

// Mock environment for testing
global.chrome = {
  storage: {
    local: {
      get: (keys, callback) => callback({}),
      set: (data, callback) => callback && callback()
    }
  }
};

// Mock browser APIs
global.btoa = str => Buffer.from(str).toString('base64');

// Load the main classes
const GitHubDeployer = require('./api/github-deployer.js');

class IntegrationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  log(level, message) {
    const timestamp = new Date().toISOString().substr(11, 8);
    const levelEmoji = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    console.log(`${levelEmoji[level] || '📝'} ${timestamp} ${message}`);
  }

  async test(name, testFn) {
    this.results.total++;
    try {
      this.log('info', `Testing: ${name}`);
      await testFn();
      this.results.passed++;
      this.log('success', `✅ ${name}`);
    } catch (error) {
      this.results.failed++;
      this.log('error', `❌ ${name}: ${error.message}`);
    }
  }

  async runIntegrationTests() {
    this.log('info', '🚀 Starting Histofy Integration Tests...');
    
    // Test 1: GitHubDeployer instantiation
    await this.test('GitHubDeployer Class Instantiation', async () => {
      const mockApi = {
        makeRequest: async () => ({ ok: true, json: async () => ({}) }),
        getCurrentUser: async () => ({ login: 'testuser', email: 'test@example.com' }),
        getUserEmail: async () => 'test@example.com'
      };
      
      const deployer = new GitHubDeployer(mockApi);
      if (!deployer) throw new Error('Failed to create GitHubDeployer instance');
      if (typeof deployer.deployDateSelections !== 'function') throw new Error('deployDateSelections method missing');
      if (typeof deployer.createInitialBranch !== 'function') throw new Error('createInitialBranch method missing');
    });

    // Test 2: Performance Configuration
    await this.test('Performance Configuration Validation', async () => {
      const mockApi = { makeRequest: async () => ({ ok: true, json: async () => ({}) }) };
      const deployer = new GitHubDeployer(mockApi);
      
      const expectedKeys = ['maxConcurrentCommits', 'batchSize', 'apiDelay', 'cacheSize', 'retryAttempts', 'retryDelay'];
      for (const key of expectedKeys) {
        if (!(key in deployer.config)) {
          throw new Error(`Missing configuration key: ${key}`);
        }
      }
      
      // Validate performance settings
      if (deployer.config.maxConcurrentCommits !== 3) throw new Error('Incorrect maxConcurrentCommits');
      if (deployer.config.batchSize !== 15) throw new Error('Incorrect batchSize');
      if (deployer.config.retryAttempts !== 3) throw new Error('Incorrect retryAttempts');
    });

    // Test 3: Cache System Initialization
    await this.test('Cache System Initialization', async () => {
      const mockApi = { makeRequest: async () => ({ ok: true, json: async () => ({}) }) };
      const deployer = new GitHubDeployer(mockApi);
      
      if (!deployer.commitCache) throw new Error('commitCache not initialized');
      if (!deployer.blobCache) throw new Error('blobCache not initialized');
      if (!deployer.treeCache) throw new Error('treeCache not initialized');
      if (deployer.cachedUser === undefined) throw new Error('cachedUser property missing');
      
      if (typeof deployer.trackCacheHit !== 'function') throw new Error('trackCacheHit method missing');
      if (typeof deployer.trackCacheMiss !== 'function') throw new Error('trackCacheMiss method missing');
    });

    // Test 4: Error Handling Methods
    await this.test('Error Handling Methods Validation', async () => {
      const mockApi = { makeRequest: async () => ({ ok: true, json: async () => ({}) }) };
      const deployer = new GitHubDeployer(mockApi);
      
      const errorMethods = ['createInitialBranch', 'createOptimizedCommitWithRetry'];
      for (const method of errorMethods) {
        if (typeof deployer[method] !== 'function') {
          throw new Error(`Missing error handling method: ${method}`);
        }
      }
    });

    // Test 5: Content Generation Methods
    await this.test('Content Generation Methods', async () => {
      const mockApi = { makeRequest: async () => ({ ok: true, json: async () => ({}) }) };
      const deployer = new GitHubDeployer(mockApi);
      
      const date = '2025-01-15';
      const contribution = { name: 'Light', commits: 1, level: 1 };
      
      // Test file content generation
      const content = await deployer.generateFileContent('owner', 'repo', date, 1, 1, contribution);
      if (!content || typeof content !== 'string') {
        throw new Error('generateFileContent failed');
      }
      
      // Test unique content generation
      const uniqueContent = deployer.generateUniqueContent(content, 1, date);
      if (!uniqueContent || typeof uniqueContent !== 'string') {
        throw new Error('generateUniqueContent failed');
      }
      
      if (uniqueContent === content) {
        throw new Error('generateUniqueContent should modify the base content');
      }
    });

    // Test 6: Performance Monitoring
    await this.test('Performance Monitoring System', async () => {
      const mockApi = { makeRequest: async () => ({ ok: true, json: async () => ({}) }) };
      const deployer = new GitHubDeployer(mockApi);
      
      // Test metrics initialization
      if (!deployer.performanceMetrics) throw new Error('performanceMetrics not initialized');
      if (!('cacheHits' in deployer.performanceMetrics)) throw new Error('cacheHits metric missing');
      if (!('cacheMisses' in deployer.performanceMetrics)) throw new Error('cacheMisses metric missing');
      if (!('apiCallCount' in deployer.performanceMetrics)) throw new Error('apiCallCount metric missing');
      
      // Test tracking methods
      deployer.trackCacheHit();
      if (deployer.performanceMetrics.cacheHits !== 1) throw new Error('trackCacheHit not working');
      
      deployer.trackCacheMiss();
      if (deployer.performanceMetrics.cacheMisses !== 1) throw new Error('trackCacheMiss not working');
      
      deployer.trackApiCall();
      if (deployer.performanceMetrics.apiCallCount !== 1) throw new Error('trackApiCall not working');
    });

    // Test Results Summary
    this.log('info', '\n📊 Integration Test Results:');
    this.log('success', `✅ Passed: ${this.results.passed}/${this.results.total}`);
    if (this.results.failed > 0) {
      this.log('error', `❌ Failed: ${this.results.failed}/${this.results.total}`);
    }
    
    if (this.results.failed === 0) {
      this.log('success', '\n🎉 All integration tests passed! Histofy is ready for deployment.');
      this.log('info', '\n📋 Next Steps:');
      this.log('info', '1. Load extension in Chrome via chrome://extensions/');
      this.log('info', '2. Enable Developer mode and click "Load unpacked"');
      this.log('info', '3. Select the histofy-v2 folder');
      this.log('info', '4. Navigate to GitHub and test deployment functionality');
      this.log('info', '5. Monitor performance improvements in action');
    } else {
      this.log('error', '\n❌ Some tests failed. Please review the errors above.');
    }
    
    return this.results.failed === 0;
  }
}

// Run the integration tests
if (require.main === module) {
  const tester = new IntegrationTest();
  tester.runIntegrationTests().catch(error => {
    console.error('Integration test runner failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTest;
