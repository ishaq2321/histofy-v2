// GitHub API manager for Histofy extension
class GitHubAPI {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.token = null;
    this.user = null;
    this.rateLimit = {
      remaining: 5000,
      resetTime: null
    };
    this.init();
  }

  async init() {
    try {
      await this.loadCredentials();
      if (this.token) {
        await this.validateToken();
      }
    } catch (error) {
      console.error('Histofy: GitHub API initialization failed:', error);
    }
  }

  // Credential Management
  async loadCredentials() {
    try {
      if (!chrome?.storage?.local) {
        console.warn('Histofy: Chrome storage API not available');
        return;
      }
      
      const result = await chrome.storage.local.get(['histofy_github_token', 'histofy_github_user']);
      this.token = result.histofy_github_token || null;        this.user = result.histofy_github_user || null;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Histofy: Extension context invalidated, cannot load credentials');
      } else {
        console.error('Histofy: Failed to load credentials:', error);
      }
    }
  }

  async saveCredentials(token, user = null) {
    try {
      if (!chrome?.storage?.local) {
        console.warn('Histofy: Chrome storage API not available');
        return false;
      }
      
      await chrome.storage.local.set({
        histofy_github_token: token,
        histofy_github_user: user
      });
      this.token = token;
      this.user = user;
      return true;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Histofy: Extension context invalidated, cannot save credentials');
      } else {
        console.error('Histofy: Failed to save credentials:', error);
      }
      return false;
    }
  }

  async clearCredentials() {
    try {
      await chrome.storage.local.remove(['histofy_github_token', 'histofy_github_user']);
      this.token = null;
      this.user = null;
      console.log('Histofy: GitHub credentials cleared');
      return true;
    } catch (error) {
      console.error('Histofy: Failed to clear credentials:', error);
      return false;
    }
  }

  // Authentication
  async validateToken() {
    if (!this.token) {
      throw new Error('No GitHub token available');
    }

    try {
      const response = await this.makeRequest('/user');
      if (response.ok) {
        const userData = await response.json();
        this.user = userData;
        await this.saveCredentials(this.token, userData);
        return true;
      } else {
        console.error('Histofy: Invalid GitHub token');
        await this.clearCredentials();
        return false;
      }
    } catch (error) {
      console.error('Histofy: Token validation failed:', error);
      return false;
    }
  }

  isAuthenticated() {
    return this.token !== null && this.user !== null;
  }

  // HTTP Request Helper
  async makeRequest(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('No GitHub token available');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Histofy-Extension/1.0.0'
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Update rate limit information
      this.updateRateLimit(response);
      
      return response;
    } catch (error) {
      console.error('Histofy: API request failed:', error);
      throw error;
    }
  }

  updateRateLimit(response) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const resetTime = response.headers.get('X-RateLimit-Reset');
    
    if (remaining) {
      this.rateLimit.remaining = parseInt(remaining);
    }
    if (resetTime) {
      this.rateLimit.resetTime = new Date(parseInt(resetTime) * 1000);
    }
  }

  // Repository Operations
  async getRepository(owner, repo) {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}`);
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get repository: ${response.status}`);
      }
    } catch (error) {
      console.error('Histofy: Failed to get repository:', error);
      throw error;
    }
  }

  async getRepositoryCommits(owner, repo, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.since) params.append('since', options.since);
      if (options.until) params.append('until', options.until);
      if (options.author) params.append('author', options.author);
      if (options.per_page) params.append('per_page', options.per_page);
      if (options.page) params.append('page', options.page);

      const endpoint = `/repos/${owner}/${repo}/commits${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.makeRequest(endpoint);
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get commits: ${response.status}`);
      }
    } catch (error) {
      console.error('Histofy: Failed to get repository commits:', error);
      throw error;
    }
  }

  async getCommit(owner, repo, sha) {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/commits/${sha}`);
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get commit: ${response.status}`);
      }
    } catch (error) {
      console.error('Histofy: Failed to get commit:', error);
      throw error;
    }
  }

  // User Operations
  async getCurrentUser() {
    if (this.user) {
      return this.user;
    }

    try {
      const response = await this.makeRequest('/user');
      if (response.ok) {
        this.user = await response.json();
        return this.user;
      } else {
        throw new Error(`Failed to get current user: ${response.status}`);
      }
    } catch (error) {
      console.error('Histofy: Failed to get current user:', error);
      throw error;
    }
  }

  async getUserRepositories(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.type) params.append('type', options.type);
      if (options.sort) params.append('sort', options.sort);
      if (options.per_page) params.append('per_page', options.per_page);
      if (options.page) params.append('page', options.page);

      const endpoint = `/user/repos${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.makeRequest(endpoint);
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get user repositories: ${response.status}`);
      }
    } catch (error) {
      console.error('Histofy: Failed to get user repositories:', error);
      throw error;
    }
  }

  // Git Operations (for future commit manipulation)
  async createRef(owner, repo, ref, sha) {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: ref,
          sha: sha
        })
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to create ref: ${response.status}`);
      }
    } catch (error) {
      console.error('Histofy: Failed to create ref:', error);
      throw error;
    }
  }

  async updateRef(owner, repo, ref, sha, force = false) {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/git/refs/${ref}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: sha,
          force: force
        })
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to update ref: ${response.status}`);
      }
    } catch (error) {
      console.error('Histofy: Failed to update ref:', error);
      throw error;
    }
  }

  // Rate Limit Information
  getRateLimit() {
    return { ...this.rateLimit };
  }

  async checkRateLimit() {
    try {
      const response = await this.makeRequest('/rate_limit');
      if (response.ok) {
        const data = await response.json();
        this.rateLimit = {
          remaining: data.rate.remaining,
          resetTime: new Date(data.rate.reset * 1000)
        };
        return data;
      }
    } catch (error) {
      console.error('Histofy: Failed to check rate limit:', error);
      throw error;
    }
  }

  // Error Handling Helpers
  handleAPIError(error, context = '') {
    if (error.status === 401) {
      return `Authentication failed. Please check your GitHub token. ${context}`;
    } else if (error.status === 403) {
      if (this.rateLimit.remaining <= 0) {
        return `Rate limit exceeded. Resets at ${this.rateLimit.resetTime}. ${context}`;
      }
      return `Access forbidden. Check repository permissions. ${context}`;
    } else if (error.status === 404) {
      return `Resource not found. Check repository and commit details. ${context}`;
    } else {
      return `API error: ${error.message} ${context}`;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubAPI;
} else if (typeof window !== 'undefined') {
  window.GitHubAPI = GitHubAPI;
}
