// Store Changes Validation Script
// This script can be run in the browser console to test the Store Changes functionality

console.log('=== Histofy Store Changes Validation ===');

function validateStoreChanges() {
  // Check if Histofy is loaded
  if (!window.histofyOverlay) {
    console.error('❌ Histofy overlay not found');
    return false;
  }

  console.log('✅ Histofy overlay found');
  
  // Check if overlay is active
  if (!window.histofyOverlay.isActive) {
    console.log('⚠️ Histofy overlay is not active');
    return false;
  }

  console.log('✅ Histofy overlay is active');
  
  // Test 1: Check contributions object
  const contributions = window.histofyOverlay.getContributions();
  const contributionCount = Object.keys(contributions).length;
  console.log(`📊 Current contributions: ${contributionCount}`);
  
  // Test 2: Check for visual modifications
  const modifiedTiles = document.querySelectorAll('[data-histofy-title], [title*="Modified by Histofy"]');
  console.log(`🎨 Visual modifications found: ${modifiedTiles.length}`);
  
  // Test 3: Check username detection
  console.log(`👤 Username: ${window.histofyOverlay.username || 'NOT DETECTED'}`);
  
  // Test 4: Check storage capability
  if (typeof window.histofyOverlay.forceStorePendingChanges === 'function') {
    console.log('✅ forceStorePendingChanges method available');
  } else {
    console.error('❌ forceStorePendingChanges method missing');
    return false;
  }
  
  // Test 5: Check recovery methods
  const recoveryMethods = [
    'scanForVisualModifications',
    'rebuildContributionsFromVisual', 
    'emergencyRebuildContributions'
  ];
  
  recoveryMethods.forEach(method => {
    if (typeof window.histofyOverlay[method] === 'function') {
      console.log(`✅ Recovery method ${method} available`);
    } else {
      console.log(`⚠️ Recovery method ${method} missing`);
    }
  });
  
  // Scenario Analysis
  if (contributionCount === 0 && modifiedTiles.length > 0) {
    console.log('🔍 SCENARIO: Visual modifications exist but contributions object is empty');
    console.log('   This is the exact issue we fixed - Store Changes should now handle this');
    return 'SYNC_ISSUE_DETECTED';
  } else if (contributionCount > 0) {
    console.log('✅ SCENARIO: Contributions object has data - Store Changes should work normally');
    return 'NORMAL_OPERATION';
  } else {
    console.log('📝 SCENARIO: No modifications detected - User needs to click tiles first');
    return 'NO_MODIFICATIONS';
  }
}

// Test the Store Changes button functionality
function testStoreChangesButton() {
  console.log('\n=== Testing Store Changes Button ===');
  
  const storeButton = document.querySelector('.histofy-store-btn');
  if (!storeButton) {
    console.error('❌ Store Changes button not found in DOM');
    return false;
  }
  
  console.log('✅ Store Changes button found');
  
  // Simulate clicking the button (but don't actually trigger it)
  console.log('🧪 Button click simulation would trigger handleStoreChanges()');
  
  return true;
}

// Auto-run validation
const validationResult = validateStoreChanges();
testStoreChangesButton();

console.log(`\n=== Validation Result: ${validationResult} ===`);

// Provide recommendations based on the result
switch(validationResult) {
  case 'SYNC_ISSUE_DETECTED':
    console.log('💡 Recommendation: Click "Store Changes" - our fix should handle this automatically');
    break;
  case 'NORMAL_OPERATION':
    console.log('💡 Recommendation: Store Changes should work normally');
    break;
  case 'NO_MODIFICATIONS':
    console.log('💡 Recommendation: Click some contribution tiles first, then try Store Changes');
    break;
  default:
    console.log('💡 Recommendation: Check Histofy activation and try again');
}

// Export for manual testing
window.validateHistofyStoreChanges = validateStoreChanges;
window.testHistofyStoreChangesButton = testStoreChangesButton;

console.log('\n🔧 Manual testing functions available:');
console.log('- validateHistofyStoreChanges()');
console.log('- testHistofyStoreChangesButton()');
