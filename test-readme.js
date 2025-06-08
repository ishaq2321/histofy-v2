// Test script to verify README generation functionality
const GitHubDeployer = require('./api/github-deployer.js');

// Mock GitHub API class for testing
class MockGitHubAPI {
  constructor() {
    this.calls = [];
  }
  
  async makeRequest(url, options = {}) {
    this.calls.push({ url, options });
    return { ok: true, json: () => Promise.resolve({}) };
  }
}

// Test the README generation
async function testReadmeGeneration() {
  console.log('🧪 Testing README generation functionality...\n');
  
  const mockAPI = new MockGitHubAPI();
  const deployer = new GitHubDeployer(mockAPI);
  
  // Test 1: Basic README generation
  console.log('Test 1: Basic README generation');
  const basicReadme = deployer.generateContributionReadme('testuser', 'test-repo');
  console.log('✅ Basic README generated successfully');
  console.log(`📏 Length: ${basicReadme.length} characters\n`);
  
  // Test 2: README with deployment stats
  console.log('Test 2: README with deployment stats');
  const statsReadme = deployer.generateContributionReadme('testuser', 'advanced-repo', {
    totalCommits: 250,
    dateRange: { start: '2024-01-01', end: '2024-12-31' },
    createdDate: '2024-06-15'
  });
  console.log('✅ Stats-enhanced README generated successfully');
  console.log(`📏 Length: ${statsReadme.length} characters\n`);
  
  // Test 3: Verify README contains key sections
  console.log('Test 3: README content verification');
  const requiredSections = [
    '# 🎨',
    '## 📊 Repository Stats',
    '## 🎯 Purpose', 
    '## 🚀 How It Works',
    '### Contribution Levels',
    '### GitHub\'s Contribution Counting Rules',
    '## 🔧 Generated with Histofy',
    '## 📋 Repository Contents',
    '## ⚠️ Important Notes',
    '## 🌟 About Histofy'
  ];
  
  let missingSections = [];
  for (const section of requiredSections) {
    if (!basicReadme.includes(section)) {
      missingSections.push(section);
    }
  }
  
  if (missingSections.length === 0) {
    console.log('✅ All required sections found in README');
  } else {
    console.log('❌ Missing sections:', missingSections);
  }
  
  // Test 4: Verify stats are properly included
  console.log('\nTest 4: Stats integration verification');
  if (statsReadme.includes('Total Commits**: 250') && 
      statsReadme.includes('2024-01-01 to 2024-12-31')) {
    console.log('✅ Deployment stats properly integrated');
  } else {
    console.log('❌ Deployment stats not properly integrated');
  }
  
  console.log('\n🎉 README generation tests completed!');
  console.log('\n📄 Sample README preview (first 500 characters):');
  console.log('-'.repeat(60));
  console.log(basicReadme.substring(0, 500) + '...');
  console.log('-'.repeat(60));
}

// Run the tests
testReadmeGeneration().catch(console.error);
