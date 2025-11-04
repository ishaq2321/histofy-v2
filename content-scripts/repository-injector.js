// Repository page injector for Histofy
class RepositoryInjector {
  constructor() {
    this.isInjected = false;
    this.currentRepo = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('histofy-page-change', (event) => {
      const { page, username, repository } = event.detail;
      if (page === 'repository') {
        this.currentRepo = { username, repository };
        setTimeout(() => this.injectRepositoryControls(), 500);
      } else {
        this.cleanup();
      }
    });
  }

  injectRepositoryControls() {
    if (this.isInjected) {
      return;
    }

    // Repository tools panel removed
    this.isInjected = true;
  }

  findRepositoryHeader() {
    const selectors = [
      '[data-testid="repository-container-header"]',
      '.repository-content',
      '.pagehead',
      '.repohead'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  cleanup() {
    // Remove injected elements when leaving repository page
    const injectedElements = document.querySelectorAll('.histofy-repository-panel');
    injectedElements.forEach(el => el.remove());
    
    this.isInjected = false;
    this.currentRepo = null;
  }
}

// Initialize repository injector
window.histofyRepositoryInjector = new RepositoryInjector();
