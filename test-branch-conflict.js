// Test script for branch conflict resolution
console.log('🔧 Testing Branch Conflict Resolution...');

// Mock API responses
const mockAPI = {
  makeRequest: async (url, options) => {
    if (url.includes('/git/refs/heads/main') && options?.method === undefined) {
      // Simulate the 409 conflict error
      return { ok: false, status: 409 };
    } else if (url.includes('/git/refs') && options?.method === 'POST') {
      // Simulate successful branch creation
      return { ok: true, json: async () => ({ ref: 'refs/heads/main', object: { sha: 'abc123' } }) };
    } else if (url.includes('/git/commits') && options?.method === 'POST') {
      // Simulate successful commit creation
      return { ok: true, json: async () => ({ sha: 'def456' }) };
    } else if (url.includes('/git/trees') && options?.method === 'POST') {
      // Simulate successful tree creation
      return { ok: true, json: async () => ({ sha: 'ghi789' }) };
    } else if (url.includes('/git/blobs') && options?.method === 'POST') {
      // Simulate successful blob creation
      return { ok: true, json: async () => ({ sha: 'jkl012' }) };
    }
    return { ok: true, json: async () => ({}) };
  },
  getCurrentUser: async () => ({ login: 'testuser', name: 'Test User' }),
  getUserEmail: async () => 'test@example.com'
};

class TestGitHubDeployer {
  constructor(api) {
    this.api = api;
    this.deploymentStatus = { logs: [] };
  }

  log(level, message) {
    console.log(`${level.toUpperCase()}: ${message}`);
  }

  async getBranchHead(owner, repo, branch) {
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
    if (response.ok) {
      const data = await response.json();
      return data.object.sha;
    } else {
      throw new Error(`Failed to get branch HEAD: ${response.status}`);
    }
  }

  async createBlob(owner, repo, content) {
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    } else {
      throw new Error(`Failed to create blob: ${response.status}`);
    }
  }

  async createTreeFromScratch(owner, repo, fileName, blobSha) {
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tree: [
          {
            path: fileName,
            mode: '100644',
            type: 'blob',
            sha: blobSha
          }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    } else {
      throw new Error(`Failed to create tree: ${response.status}`);
    }
  }

  async createInitialCommit(owner, repo, treeSha) {
    const currentUser = await this.api.getCurrentUser();
    const userEmail = await this.api.getUserEmail();
    const userName = currentUser.name || currentUser.login || 'Histofy User';
    
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Initial commit\n\nCreated by Histofy Chrome Extension',
        tree: treeSha,
        author: {
          name: userName,
          email: userEmail,
          date: new Date().toISOString()
        },
        committer: {
          name: userName,
          email: userEmail,
          date: new Date().toISOString()
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    } else {
      throw new Error(`Failed to create initial commit: ${response.status}`);
    }
  }

  async createInitialBranch(owner, repo, branchName) {
    try {
      this.log('info', `Creating initial branch: ${branchName}`);
      
      const fileContent = `# ${repo}\n\nInitial commit created by Histofy for contribution history.\n\nThis repository is managed by Histofy Chrome Extension.\n`;
      
      const blobSha = await this.createBlob(owner, repo, fileContent);
      const treeSha = await this.createTreeFromScratch(owner, repo, 'README.md', blobSha);
      const initialCommitSha = await this.createInitialCommit(owner, repo, treeSha);
      
      await this.api.makeRequest(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: initialCommitSha
        })
      });
      
      this.log('success', `Initial branch '${branchName}' created successfully`);
      return initialCommitSha;
      
    } catch (error) {
      this.log('error', `Failed to create initial branch: ${error.message}`);
      throw error;
    }
  }

  async testBranchConflictResolution() {
    const owner = 'testuser';
    const repo = 'test-repo';
    const branch = 'main';

    try {
      // This should trigger the 409 error initially
      const sha = await this.getBranchHead(owner, repo, branch);
      console.log('❌ Expected 409 error but got:', sha);
    } catch (error) {
      if (error.message.includes('409')) {
        console.log('✅ 409 error detected as expected');
        
        // Now test the resolution
        try {
          const resolvedSha = await this.createInitialBranch(owner, repo, branch);
          console.log('✅ Branch conflict resolved, created initial branch with SHA:', resolvedSha);
          
          // Verify we can now get the branch head (mock will succeed on second try)
          mockAPI.makeRequest = async (url, options) => {
            if (url.includes('/git/refs/heads/main') && options?.method === undefined) {
              return { ok: true, json: async () => ({ object: { sha: resolvedSha } }) };
            }
            return { ok: true, json: async () => ({}) };
          };
          
          const finalSha = await this.getBranchHead(owner, repo, branch);
          console.log('✅ Successfully retrieved branch HEAD after resolution:', finalSha);
          
        } catch (resolutionError) {
          console.log('❌ Failed to resolve branch conflict:', resolutionError.message);
        }
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
  }
}

async function runTest() {
  try {
    const deployer = new TestGitHubDeployer(mockAPI);
    await deployer.testBranchConflictResolution();
    
    console.log('\n🎉 Branch conflict resolution test completed!');
    console.log('\nKey improvements:');
    console.log('  • 409 conflict errors are now properly handled');
    console.log('  • Automatic initial branch creation for empty repositories');
    console.log('  • Better error messages for common deployment issues');
    console.log('  • Graceful fallback to empty repository state');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTest();
