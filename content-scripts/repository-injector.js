// Repository page injector for Histofy
class RepositoryInjector {
  constructor() {
    this.isInjected = false;
    this.currentRepo = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('Repository injector initialized');
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
      console.log('Repository controls already injected');
      return;
    }

    // Repository tools panel removed
    this.isInjected = true;

    console.log('Repository controls injection skipped (tools removed)');
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
