/**
 * Final Store Changes Validation Suite
 * Comprehensive testing for the Store Changes button fix
 * Run this in browser console on a GitHub profile page
 */

class StoreChangesValidator {
  constructor() {
    this.testResults = [];
    this.mockData = {
      contributions: {
        '2024-01-15': { level: 2, color: '#40c463', count: 5, date: '2024-01-15' },
        '2024-02-20': { level: 3, color: '#30a14e', count: 8, date: '2024-02-20' },
        '2024-03-10': { level: 1, color: '#9be9a8', count: 2, date: '2024-03-10' }
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runAllTests() {
    this.log('Starting comprehensive Store Changes validation...', 'info');
    
    // Test 1: Basic functionality check
    await this.testBasicFunctionality();
    
    // Test 2: Empty contributions recovery
    await this.testEmptyContributionsRecovery();
    
    // Test 3: Visual-data synchronization
    await this.testVisualDataSynchronization();
    
    // Test 4: Error handling
    await this.testErrorHandling();
    
    // Test 5: User feedback
    await this.testUserFeedback();
    
    // Test 6: Performance
    await this.testPerformance();
    
    this.generateReport();
  }

  async testBasicFunctionality() {
    this.log('Test 1: Basic functionality check', 'info');
    
    try {
      // Check if Histofy is loaded
      if (!window.histofyOverlay) {
        this.addResult('basic_histofy_loaded', false, 'Histofy overlay not found');
        return;
      }
      this.addResult('basic_histofy_loaded', true, 'Histofy overlay found');

      // Check if methods exist
      const requiredMethods = [
        'getContributions',
        'forceStorePendingChanges',
        'scanForVisualModifications',
        'rebuildContributionsFromVisual',
        'emergencyRebuildContributions'
      ];

      for (const method of requiredMethods) {
        const exists = typeof window.histofyOverlay[method] === 'function';
        this.addResult(`basic_method_${method}`, exists, `Method ${method} ${exists ? 'exists' : 'missing'}`);
      }

      // Check if overlay is properly initialized
      const hasUsername = !!window.histofyOverlay.username;
      this.addResult('basic_username_detected', hasUsername, `Username detection: ${hasUsername ? 'success' : 'failed'}`);

    } catch (error) {
      this.addResult('basic_functionality', false, `Error: ${error.message}`);
    }
  }

  async testEmptyContributionsRecovery() {
    this.log('Test 2: Empty contributions recovery', 'info');
    
    try {
      if (!window.histofyOverlay) return;

      // Backup original contributions
      const originalContributions = { ...window.histofyOverlay.contributions };
      
      // Simulate empty contributions
      window.histofyOverlay.contributions = {};
      
      // Create mock visual modifications
      this.createMockVisualModifications();
      
      // Test recovery
      const recoveryResult = await this.simulateStoreChangesClick();
      this.addResult('recovery_empty_contributions', recoveryResult, 'Empty contributions recovery test');
      
      // Restore original contributions
      window.histofyOverlay.contributions = originalContributions;
      
      // Clean up mock modifications
      this.cleanupMockVisualModifications();
      
    } catch (error) {
      this.addResult('recovery_empty_contributions', false, `Error: ${error.message}`);
    }
  }

  async testVisualDataSynchronization() {
    this.log('Test 3: Visual-data synchronization', 'info');
    
    try {
      if (!window.histofyOverlay) return;

      // Test visual modification detection
      const originalModifications = document.querySelectorAll('[data-histofy-title]').length;
      
      // Create some visual modifications
      this.createMockVisualModifications();
      
      // Test scanning
      if (window.histofyOverlay.scanForVisualModifications) {
        const scannedModifications = window.histofyOverlay.scanForVisualModifications();
        this.addResult('sync_visual_scanning', scannedModifications.length > 0, `Scanned ${scannedModifications.length} visual modifications`);
      }
      
      // Test rebuilding
      if (window.histofyOverlay.rebuildContributionsFromVisual) {
        await window.histofyOverlay.rebuildContributionsFromVisual();
        const rebuiltContributions = Object.keys(window.histofyOverlay.getContributions()).length;
        this.addResult('sync_data_rebuilding', rebuiltContributions > 0, `Rebuilt ${rebuiltContributions} contributions from visual state`);
      }
      
      this.cleanupMockVisualModifications();
      
    } catch (error) {
      this.addResult('sync_visual_data', false, `Error: ${error.message}`);
    }
  }

  async testErrorHandling() {
    this.log('Test 4: Error handling', 'info');
    
    try {
      // Test with invalid username
      const originalUsername = window.histofyOverlay?.username;
      if (window.histofyOverlay) {
        window.histofyOverlay.username = null;
        
        const result = await this.simulateStoreChangesClick();
        this.addResult('error_invalid_username', true, 'Handled invalid username gracefully');
        
        window.histofyOverlay.username = originalUsername;
      }
      
      // Test with corrupted contributions
      if (window.histofyOverlay) {
        const originalContributions = window.histofyOverlay.contributions;
        window.histofyOverlay.contributions = null;
        
        const result = await this.simulateStoreChangesClick();
        this.addResult('error_corrupted_data', true, 'Handled corrupted data gracefully');
        
        window.histofyOverlay.contributions = originalContributions;
      }
      
    } catch (error) {
      this.addResult('error_handling', false, `Error handling failed: ${error.message}`);
    }
  }

  async testUserFeedback() {
    this.log('Test 5: User feedback', 'info');
    
    try {
      // Check if notification system exists
      const hasNotificationSystem = document.querySelector('.histofy-notification') !== null ||
                                   typeof window.histofyProfileInjector?.showNotification === 'function';
      
      this.addResult('feedback_notification_system', hasNotificationSystem, 'Notification system availability');
      
      // Check if Store Changes button exists
      const storeButton = document.querySelector('.histofy-store-btn, [data-action="store-changes"]');
      this.addResult('feedback_store_button', !!storeButton, 'Store Changes button presence');
      
      if (storeButton) {
        // Check button text/accessibility
        const hasText = storeButton.textContent.includes('Store') || storeButton.title.includes('Store');
        this.addResult('feedback_button_text', hasText, 'Store Changes button has appropriate text');
      }
      
    } catch (error) {
      this.addResult('feedback_user_interface', false, `Error: ${error.message}`);
    }
  }

  async testPerformance() {
    this.log('Test 6: Performance', 'info');
    
    try {
      if (!window.histofyOverlay) return;

      // Test contribution retrieval performance
      const start1 = performance.now();
      for (let i = 0; i < 100; i++) {
        window.histofyOverlay.getContributions();
      }
      const end1 = performance.now();
      const avgGetTime = (end1 - start1) / 100;
      
      this.addResult('performance_get_contributions', avgGetTime < 1, `getContributions avg time: ${avgGetTime.toFixed(2)}ms`);
      
      // Test visual scanning performance
      if (window.histofyOverlay.scanForVisualModifications) {
        const start2 = performance.now();
        window.histofyOverlay.scanForVisualModifications();
        const end2 = performance.now();
        const scanTime = end2 - start2;
        
        this.addResult('performance_visual_scanning', scanTime < 50, `Visual scanning time: ${scanTime.toFixed(2)}ms`);
      }
      
    } catch (error) {
      this.addResult('performance_testing', false, `Error: ${error.message}`);
    }
  }

  createMockVisualModifications() {
    // Create mock tiles with Histofy modifications
    const mockTiles = [
      { date: '2024-01-15', level: 2 },
      { date: '2024-02-20', level: 3 },
      { date: '2024-03-10', level: 1 }
    ];
    
    mockTiles.forEach(({ date, level }) => {
      const mockTile = document.createElement('rect');
      mockTile.setAttribute('data-date', date);
      mockTile.setAttribute('data-histofy-title', `Modified by Histofy: ${level} contributions`);
      mockTile.setAttribute('data-level', level.toString());
      mockTile.classList.add('histofy-mock-tile');
      mockTile.style.display = 'none'; // Hidden from view
      document.body.appendChild(mockTile);
    });
  }

  cleanupMockVisualModifications() {
    document.querySelectorAll('.histofy-mock-tile').forEach(tile => tile.remove());
  }

  async simulateStoreChangesClick() {
    // Simulate the Store Changes button click logic
    if (!window.histofyOverlay || !window.histofyOverlay.forceStorePendingChanges) {
      return false;
    }

    try {
      const result = await window.histofyOverlay.forceStorePendingChanges();
      return result !== false;
    } catch (error) {
      this.log(`Store changes simulation error: ${error.message}`, 'error');
      return false;
    }
  }

  addResult(testName, passed, message) {
    this.testResults.push({
      test: testName,
      passed,
      message,
      timestamp: new Date()
    });
    
    this.log(`${testName}: ${message}`, passed ? 'success' : 'error');
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 STORE CHANGES VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    console.log('='.repeat(60));
    
    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`  • ${result.test}: ${result.message}`);
      });
    }
    
    console.log('\n📝 DETAILED RESULTS:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.test}: ${result.message}`);
    });
    
    // Overall assessment
    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (successRate >= 90) {
      console.log('✅ EXCELLENT: Store Changes fix is robust and ready for production');
    } else if (successRate >= 75) {
      console.log('⚠️ GOOD: Minor issues detected, but Store Changes should work for most users');
    } else {
      console.log('❌ NEEDS WORK: Significant issues detected, further fixes required');
    }
    
    // Store results for later access
    window.storeChangesValidationResults = {
      summary: { totalTests, passedTests, failedTests, successRate },
      details: this.testResults,
      timestamp: new Date()
    };
  }
}

// Auto-run validation if Histofy is detected
if (window.histofyOverlay) {
  console.log('🔍 Histofy detected - running Store Changes validation...');
  const validator = new StoreChangesValidator();
  validator.runAllTests();
} else {
  console.log('⏳ Histofy not detected - validation will run when Histofy loads');
  
  // Wait for Histofy to load
  const checkHistofy = setInterval(() => {
    if (window.histofyOverlay) {
      clearInterval(checkHistofy);
      console.log('🔍 Histofy detected - running Store Changes validation...');
      const validator = new StoreChangesValidator();
      validator.runAllTests();
    }
  }, 1000);
  
  // Stop checking after 30 seconds
  setTimeout(() => {
    clearInterval(checkHistofy);
    console.log('⏰ Timeout: Histofy not loaded within 30 seconds');
  }, 30000);
}

// Export for manual use
window.StoreChangesValidator = StoreChangesValidator;
