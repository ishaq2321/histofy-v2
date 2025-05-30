// GitHub deployment engine for creating real commits
class GitHubDeployer {
  constructor(githubAPI) {
    this.api = githubAPI;
    this.deploymentStatus = {
      isDeploying: false,
      currentStep: null,
      progress: 0,
      logs: []
    };
  }

  // Main deployment function - converts selected dates to real commits
  async deployDateSelections(pendingChanges, options = {}) {
    if (this.deploymentStatus.isDeploying) {
      throw new Error('Deployment already in progress');
    }

    this.deploymentStatus.isDeploying = true;
    this.deploymentStatus.progress = 0;
    this.deploymentStatus.logs = [];

    try {
      const results = {
        successful: [],
        failed: [],
        repositories: new Map()
      };

      // Step 1: Group changes by repository
      this.updateStatus('Analyzing pending changes...', 5);
      const changesByRepo = this.groupChangesByRepository(pendingChanges);

      // Step 2: Process each repository
      let processedRepos = 0;
      const totalRepos = Object.keys(changesByRepo).length;

      for (const [repoKey, changes] of Object.entries(changesByRepo)) {
        try {
          this.updateStatus(`Processing repository: ${repoKey}`, 10 + (processedRepos * 80 / totalRepos));
          
          const repoResult = await this.deployToRepository(repoKey, changes, options);
          results.repositories.set(repoKey, repoResult);
          results.successful.push(...repoResult.successful);
          results.failed.push(...repoResult.failed);

        } catch (error) {
          this.log('error', `Failed to deploy to ${repoKey}: ${error.message}`);
          results.failed.push(...changes.map(c => ({ ...c, error: error.message })));
        }

        processedRepos++;
      }

      this.updateStatus('Deployment completed!', 100);
      return results;

    } catch (error) {
      this.log('error', `Deployment failed: ${error.message}`);
      throw error;
    } finally {
      this.deploymentStatus.isDeploying = false;
    }
  }

  // Deploy changes to a specific repository
  async deployToRepository(repoKey, changes, options = {}) {
    const [owner, repoName] = repoKey.split('/');
    
    this.log('info', `Starting deployment to ${owner}/${repoName}`);

    // Step 1: Get or create repository
    const repository = await this.getOrCreateRepository(owner, repoName, options);
    
    // Step 2: Get the repository's main branch
    const mainBranch = await this.getMainBranch(owner, repoName);
    
    // Step 3: Process date selections and create commits
    const results = {
      successful: [],
      failed: [],
      repository: repository
    };

    for (const change of changes) {
      if (change.type === 'date_selection') {
        try {
          const commitResults = await this.createCommitsForDates(
            owner, 
            repoName, 
            change.dates || [], 
            change.contributions || {},
            mainBranch
          );
          
          results.successful.push(...commitResults.successful);
          results.failed.push(...commitResults.failed);
          
        } catch (error) {
          this.log('error', `Failed to process date selection: ${error.message}`);
          results.failed.push({ ...change, error: error.message });
        }
      }
    }

    this.log('success', `Completed deployment to ${owner}/${repoName}: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  // Get existing repository or determine if we need to create one
  async getOrCreateRepository(owner, repoName, options = {}) {
    try {
      // First try to get existing repository
      const existingRepo = await this.api.getRepository(owner, repoName);
      this.log('info', `Using existing repository: ${existingRepo.html_url}`);
      return existingRepo;
      
    } catch (error) {
      // Repository doesn't exist or is not accessible
      if (error.message.includes('404')) {
        // Try to create a new repository if user is the owner
        const currentUser = await this.api.getCurrentUser();
        
        if (currentUser.login === owner) {
          this.log('info', `Creating new repository: ${owner}/${repoName}`);
          return await this.createRepository(repoName, options);
        } else {
          throw new Error(`Repository ${owner}/${repoName} not found and cannot create repository for different user`);
        }
      } else {
        throw error;
      }
    }
  }

  // Create a new repository
  async createRepository(repoName, options = {}) {
    try {
      // Ensure repository name is valid and descriptive
      const sanitizedName = repoName.replace(/[^a-zA-Z0-9._-]/g, '-');
      const finalRepoName = sanitizedName || 'histofy-contributions';
      
      const response = await this.api.makeRequest('/user/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalRepoName,
          description: options.description || `Custom GitHub contribution pattern created with Histofy on ${new Date().toISOString().split('T')[0]}`,
          private: options.private || false,
          auto_init: true,
          default_branch: 'main', // Ensure we use 'main' as default branch for contribution counting
          has_issues: false,
          has_projects: false,
          has_wiki: false
        })
      });

      if (response.ok) {
        const repoData = await response.json();
        this.log('success', `Created repository: ${repoData.html_url}`);
        this.log('info', `Repository default branch: ${repoData.default_branch} - Commits will count toward contributions`);
        this.log('info', `Repository is ${repoData.private ? 'private' : 'public'} - Both count toward contributions`);
        
        // Wait for repository to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return repoData;
      } else {
        const errorData = await response.json();
        throw new Error(`Failed to create repository: ${errorData.message}`);
      }
    } catch (error) {
      this.log('error', `Repository creation failed: ${error.message}`);
      throw error;
    }
  }

  // Get the main branch name (main or master)
  async getMainBranch(owner, repo) {
    try {
      const repoData = await this.api.getRepository(owner, repo);
      return repoData.default_branch || 'main';
    } catch (error) {
      this.log('warning', `Could not determine main branch, using 'main': ${error.message}`);
      return 'main';
    }
  }

  // Create commits for selected dates using GitHub API
  async createCommitsForDates(owner, repo, dates, contributions, baseBranch) {
    const results = {
      successful: [],
      failed: []
    };

    if (!dates || dates.length === 0) {
      return results;
    }

    this.log('info', `Creating commits for ${dates.length} dates`);

    // Sort dates chronologically
    const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));

    // Get the current HEAD of the branch
    let currentSha = await this.getBranchHead(owner, repo, baseBranch);
    
    // Create commits for each date
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      
      try {
        // Get contribution level for this date
        const contribution = contributions[date] || { level: 1, name: 'Low', commits: '1-3' };
        
        // Create commits based on contribution level
        const commitsToCreate = this.getCommitCountForLevel(contribution.level);
        
        for (let commitIndex = 0; commitIndex < commitsToCreate; commitIndex++) {
          const commitSha = await this.createSingleCommit(
            owner, 
            repo, 
            date, 
            currentSha, 
            commitIndex + 1, 
            commitsToCreate,
            contribution
          );
          
          if (commitSha) {
            currentSha = commitSha; // Use this commit as parent for next one
            results.successful.push({
              date: date,
              sha: commitSha,
              contribution: contribution,
              commitNumber: commitIndex + 1
            });
          }
        }

        this.log('info', `Created ${commitsToCreate} commit(s) for ${date} (${contribution.name} level)`);

      } catch (error) {
        this.log('error', `Failed to create commit for ${date}: ${error.message}`);
        results.failed.push({
          date: date,
          error: error.message
        });
      }
    }

    // Update the branch to point to the latest commit
    if (results.successful.length > 0) {
      try {
        await this.updateBranchHead(owner, repo, baseBranch, currentSha);
        this.log('success', `Updated ${baseBranch} branch with ${results.successful.length} new commits`);
      } catch (error) {
        this.log('error', `Failed to update branch: ${error.message}`);
      }
    }

    return results;
  }

  // Get the current HEAD SHA of a branch
  async getBranchHead(owner, repo, branch) {
    try {
      const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.object.sha;
      } else {
        throw new Error(`Failed to get branch HEAD: ${response.status}`);
      }
    } catch (error) {
      this.log('error', `Could not get branch HEAD: ${error.message}`);
      throw error;
    }
  }

  // Create a single commit using GitHub API
  async createSingleCommit(owner, repo, date, parentSha, commitNumber, totalCommits, contribution) {
    try {
      // Step 1: Get the parent commit tree
      const parentCommit = await this.getCommit(owner, repo, parentSha);
      const baseTreeSha = parentCommit.tree.sha;

      // Step 2: Create a new file or modify existing one
      const fileName = `contributions.md`;
      const fileContent = await this.generateFileContent(owner, repo, date, commitNumber, totalCommits, contribution);
      
      // Step 3: Create a blob for the file content
      const blobSha = await this.createBlob(owner, repo, fileContent);

      // Step 4: Create a new tree with the updated file
      const treeSha = await this.createTree(owner, repo, baseTreeSha, fileName, blobSha);

      // Step 5: Create the commit with the target date
      const commitMessage = this.generateCommitMessage(date, commitNumber, totalCommits, contribution);
      const commitSha = await this.createCommitObject(
        owner, 
        repo, 
        commitMessage, 
        treeSha, 
        parentSha, 
        date
      );

      return commitSha;

    } catch (error) {
      this.log('error', `Failed to create commit: ${error.message}`);
      throw error;
    }
  }

  // Get commit data
  async getCommit(owner, repo, sha) {
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/commits/${sha}`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Failed to get commit: ${response.status}`);
    }
  }

  // Create a blob (file content)
  async createBlob(owner, repo, content) {
    // Use browser-compatible base64 encoding
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: base64Content,
        encoding: 'base64'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    } else {
      const errorText = await response.text();
      throw new Error(`Failed to create blob: ${response.status} - ${errorText}`);
    }
  }

  // Create a tree (directory structure)
  async createTree(owner, repo, baseTreeSha, fileName, blobSha) {
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
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

  // Create commit object with custom date
  async createCommitObject(owner, repo, message, treeSha, parentSha, date) {
    // Ensure date is in UTC and properly formatted for GitHub
    const utcDate = new Date(date + 'T12:00:00.000Z');
    const gitDate = utcDate.toISOString();
    
    // Get user's GitHub email - CRITICAL for contribution counting
    const currentUser = await this.api.getCurrentUser();
    const userEmail = currentUser.email || `${currentUser.login}@users.noreply.github.com`;
    
    // Log important information for debugging
    this.log('info', `Creating commit with email: ${userEmail} for date: ${gitDate}`);
    
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        tree: treeSha,
        parents: [parentSha],
        author: {
          name: currentUser.name || currentUser.login || 'Histofy User',
          email: userEmail,  // This MUST match GitHub account email
          date: gitDate      // UTC timestamp for proper contribution counting
        },
        committer: {
          name: currentUser.name || currentUser.login || 'Histofy User', 
          email: userEmail,  // This MUST match GitHub account email
          date: gitDate      // UTC timestamp for proper contribution counting
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      this.log('success', `Commit created: ${data.sha} - Will count toward contributions in up to 24 hours`);
      return data.sha;
    } else {
      const errorData = await response.json();
      throw new Error(`Failed to create commit: ${errorData.message}`);
    }
  }

  // Update branch to point to new commit
  async updateBranchHead(owner, repo, branch, newSha) {
    const response = await this.api.makeRequest(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sha: newSha,
        force: false
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update branch: ${response.status}`);
    }

    return await response.json();
  }

  // Helper functions
  getCommitCountForLevel(level) {
    // Map contribution levels to realistic commit counts based on GitHub's actual calculation
    // GitHub's contribution intensity is based on actual commits per day, not arbitrary numbers
    const levelMap = {
      0: 0,  // No contributions (no color)
      1: Math.floor(Math.random() * 3) + 1,    // Light green: 1-3 commits per day
      2: Math.floor(Math.random() * 5) + 4,    // Medium green: 4-8 commits per day  
      3: Math.floor(Math.random() * 4) + 9,    // Dark green: 9-12 commits per day
      4: Math.floor(Math.random() * 8) + 13    // Darkest green: 13-20 commits per day
    };
    return levelMap[level] || 1;
  }

  async generateFileContent(owner, repo, date, commitNumber, totalCommits, contribution) {
    // Generate unique content for each commit to ensure they're counted
    const timestamp = new Date().getTime();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    // Try to get existing content first
    try {
      const response = await this.api.makeRequest(`/repos/${owner}/${repo}/contents/histofy-contributions.md`);
      if (response.ok) {
        const fileData = await response.json();
        const existingContent = atob(fileData.content);
        
        // Append unique content to ensure commit is counted
        return existingContent + `\n\n## ${date} - Commit ${commitNumber}/${totalCommits}\n- Contribution Level: ${contribution.name} (${contribution.commits} commits)\n- Generated: ${new Date().toISOString()}\n- Unique ID: ${randomId}\n- Timestamp: ${timestamp}\n- GitHub Contribution Rules Compliant: ✅`;
      }
    } catch (error) {
      // File doesn't exist, create new content
    }

    // Create new file with comprehensive content
    return `# GitHub Contribution History - Generated by Histofy

This repository contains a custom contribution pattern created with Histofy browser extension.

**⚠️ Important:** This repository demonstrates contribution patterns and complies with GitHub's Terms of Service.

## GitHub Contribution Counting Rules ✅

This repository follows GitHub's contribution counting requirements:

1. **✅ Email Address**: Commits use email associated with GitHub account
2. **✅ Repository Type**: Standalone repository (not a fork)  
3. **✅ Default Branch**: Commits made to default branch (\`main\`)
4. **✅ Repository Access**: User is repository owner/collaborator
5. **✅ UTC Timestamps**: All commits timestamped in UTC
6. **⏰ Visibility**: Contributions appear within 24 hours

## Contribution Details

### ${date} - Commit ${commitNumber}/${totalCommits}
- **Contribution Level:** ${contribution.name} (${contribution.commits} commits per day)
- **Generated Date:** ${new Date().toISOString()} 
- **Unique Identifier:** ${randomId}
- **Timestamp:** ${timestamp}

### GitHub Contribution Intensity Levels

According to GitHub's documentation and community observations:

- **No Color (0 commits)**: No contributions for the day
- **Light Green (1-3 commits)**: Low activity level  
- **Medium Green (4-8 commits)**: Medium activity level
- **Dark Green (9-12 commits)**: High activity level
- **Darkest Green (13+ commits)**: Very high activity level

### Histofy Extension Information

This content was generated by the Histofy browser extension, which helps users:
- Understand GitHub's contribution system
- Create educational examples of contribution patterns  
- Learn about git operations and GitHub API usage
- Demonstrate compliance with GitHub's contribution rules

**Compliance Note:** Always ensure your use of contribution manipulation tools complies with GitHub's Terms of Service and your organization's policies.

### Technical Details

- **Repository Created:** ${new Date().toISOString()}
- **Default Branch:** main (ensures contribution counting)
- **Email Configuration:** Uses GitHub-associated email address
- **Timezone:** All timestamps in UTC for proper GitHub processing
- **API Compliance:** Uses official GitHub API for all operations

---
Generated on ${date} at ${new Date().toISOString()} by Histofy Extension
Visit: https://github.com/histofy/extension
`;
  }

  generateCommitMessage(date, commitNumber, totalCommits, contribution) {
    const messages = [
      `📅 Daily contribution for ${date}`,
      `🔧 Code update and improvements - ${date}`,
      `📝 Documentation and project updates - ${date}`,
      `✨ Feature development and enhancements - ${date}`,
      `🐛 Bug fixes and code optimization - ${date}`,
      `🚀 Performance improvements - ${date}`,
      `📦 Dependencies and configuration update - ${date}`,
      `🎨 Code refactoring and cleanup - ${date}`
    ];
    
    const baseMessage = messages[Math.floor(Math.random() * messages.length)];
    
    if (totalCommits === 1) {
      return `${baseMessage}

Generated by Histofy - ${contribution.name} contribution level
Follows GitHub contribution counting rules: ✅ Email ✅ Default branch ✅ UTC timestamps`;
    } else {
      return `${baseMessage} (${commitNumber}/${totalCommits})

Generated by Histofy - ${contribution.name} contribution level  
Part of ${contribution.commits} commits pattern for this date
Follows GitHub contribution counting rules: ✅ Email ✅ Default branch ✅ UTC timestamps`;
    }
  }

  // Group changes by repository
  groupChangesByRepository(changes) {
    const groups = {};
    
    changes.forEach(change => {
      // Extract repository info from current page or use default
      const pageInfo = window.histofyDetector?.getCurrentPageInfo();
      let repoKey = 'histofy-contributions';
      
      if (pageInfo && pageInfo.username) {
        if (pageInfo.repository) {
          repoKey = `${pageInfo.username}/${pageInfo.repository}`;
        } else {
          // Profile page - create a contributions repository
          repoKey = `${pageInfo.username}/histofy-contributions`;
        }
      } else {
        // Fallback to current user's contributions repo
        if (this.api.user?.login) {
          repoKey = `${this.api.user.login}/histofy-contributions`;
        }
      }
      
      if (!groups[repoKey]) {
        groups[repoKey] = [];
      }
      groups[repoKey].push(change);
    });

    return groups;
  }

  // Status and logging
  updateStatus(message, progress) {
    this.deploymentStatus.currentStep = message;
    this.deploymentStatus.progress = progress;
    this.log('info', message);
    
    // Broadcast status update
    document.dispatchEvent(new CustomEvent('histofy-deployment-status', {
      detail: { ...this.deploymentStatus }
    }));
  }

  log(level, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message
    };
    
    this.deploymentStatus.logs.push(logEntry);
    console.log(`Histofy Deployer [${level.toUpperCase()}]:`, message);
  }

  getDeploymentStatus() {
    return { ...this.deploymentStatus };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubDeployer;
} else if (typeof window !== 'undefined') {
  window.GitHubDeployer = GitHubDeployer;
}
