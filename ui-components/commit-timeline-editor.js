// Commit timeline editor for repository pages
class CommitTimelineEditor {
  constructor() {
    this.editMode = false;
    this.selectedCommits = new Set();
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('Histofy: Commit timeline editor initialized');
  }

  setupEventListeners() {
    document.addEventListener('histofy-page-change', (event) => {
      const { page } = event.detail;
      if (page === 'repository' || page === 'commit') {
        setTimeout(() => this.injectCommitEditor(), 500);
      }
    });

    // Listen for edit mode toggle
    document.addEventListener('histofy-toggle-commit-editor', () => {
      this.toggleEditMode();
    });
  }

  injectCommitEditor() {
    if (!this.isCommitListVisible()) {
      console.log('Histofy: Commit list not visible');
      return;
    }

    if (document.querySelector('.histofy-commit-editor')) {
      console.log('Histofy: Commit editor already exists');
      return;
    }

    this.createCommitEditor();
  }

  isCommitListVisible() {
    return document.querySelector('.commit-group') !== null ||
           document.querySelector('[data-testid="commit-row"]') !== null ||
           document.querySelector('.commit-item') !== null;
  }

  createCommitEditor() {
    const commitContainer = this.findCommitContainer();
    if (!commitContainer) return;

    const editor = document.createElement('div');
    editor.className = 'histofy-commit-editor';
    editor.innerHTML = `
      <div class="histofy-commit-editor-header">
        <h3>🕒 Histofy Commit Timeline Editor</h3>
        <button class="histofy-btn histofy-btn-primary" id="histofy-activate-commit-editor">
          Activate Editor
        </button>
      </div>
      <div class="histofy-commit-editor-controls" style="display: none;">
        <div class="histofy-editor-toolbar">
          <button class="histofy-btn histofy-btn-secondary" id="histofy-select-all-commits">
            📋 Select All
          </button>
          <button class="histofy-btn histofy-btn-secondary" id="histofy-clear-commit-selection">
            🗑️ Clear Selection
          </button>
          <div class="histofy-date-picker-group">
            <label for="histofy-new-date">New Date:</label>
            <input type="datetime-local" id="histofy-new-date" class="histofy-input">
            <button class="histofy-btn histofy-btn-warning" id="histofy-move-selected-commits">
              🔄 Move Selected
            </button>
          </div>
        </div>
        <div class="histofy-editor-stats">
          <span>Selected: <span id="histofy-selected-commits-count">0</span> commits</span>
          <span>|</span>
          <span>Mode: <span id="histofy-current-mode">Selection</span></span>
        </div>
      </div>
    `;

    // Insert before the commit container
    commitContainer.parentNode.insertBefore(editor, commitContainer);

    this.setupCommitEditorHandlers(editor);
  }

  findCommitContainer() {
    const selectors = [
      '.commit-groups-container',
      '.commits-listing',
      '[data-testid="commits-list"]',
      '.commit-list'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    // Fallback: find parent of commit groups
    const commitGroup = document.querySelector('.commit-group, [data-testid="commit-row"]');
    return commitGroup ? commitGroup.parentNode : null;
  }

  setupCommitEditorHandlers(editor) {
    const activateBtn = editor.querySelector('#histofy-activate-commit-editor');
    const selectAllBtn = editor.querySelector('#histofy-select-all-commits');
    const clearBtn = editor.querySelector('#histofy-clear-commit-selection');
    const moveBtn = editor.querySelector('#histofy-move-selected-commits');
    const dateInput = editor.querySelector('#histofy-new-date');

    activateBtn.addEventListener('click', () => {
      this.activateCommitEditor(editor);
    });

    selectAllBtn.addEventListener('click', () => {
      this.selectAllCommits();
    });

    clearBtn.addEventListener('click', () => {
      this.clearCommitSelection();
    });

    moveBtn.addEventListener('click', () => {
      const newDate = dateInput.value;
      if (newDate) {
        this.moveSelectedCommits(newDate);
      } else {
        this.showNotification('Please select a target date!', 'error');
      }
    });

    // Set default date to today
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.value = today.toISOString().slice(0, 16);
  }

  activateCommitEditor(editor) {
    this.editMode = true;

    // Show controls
    editor.querySelector('.histofy-commit-editor-controls').style.display = 'block';
    editor.querySelector('#histofy-activate-commit-editor').style.display = 'none';

    this.setupCommitClickHandlers();
    this.showNotification('Commit timeline editor activated!', 'success');
  }

  setupCommitClickHandlers() {
    const commits = this.findAllCommits();
    
    commits.forEach(commit => {
      if (commit.hasAttribute('histofy-commit-listener')) return;
      
      commit.setAttribute('histofy-commit-listener', 'true');
      commit.style.cursor = 'pointer';
      
      // Add visual indicator
      const indicator = document.createElement('div');
      indicator.className = 'histofy-commit-indicator';
      indicator.innerHTML = '🎯';
      indicator.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        font-size: 12px;
        opacity: 0.7;
        pointer-events: none;
      `;
      
      if (commit.style.position !== 'relative') {
        commit.style.position = 'relative';
      }
      commit.appendChild(indicator);
      
      commit.addEventListener('click', (e) => {
        if (this.editMode) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleCommitSelection(commit);
        }
      });

      commit.addEventListener('mouseenter', () => {
        if (this.editMode) {
          commit.style.backgroundColor = 'rgba(9, 105, 218, 0.1)';
        }
      });

      commit.addEventListener('mouseleave', () => {
        if (this.editMode && !this.selectedCommits.has(commit)) {
          commit.style.backgroundColor = '';
        }
      });
    });
  }

  findAllCommits() {
    const selectors = [
      '.commit-group .commit',
      '[data-testid="commit-row"]',
      '.commit-item',
      '.commit-group-item'
    ];

    let commits = [];
    for (const selector of selectors) {
      commits = commits.concat(Array.from(document.querySelectorAll(selector)));
    }

    return commits;
  }

  toggleCommitSelection(commit) {
    const commitHash = this.extractCommitHash(commit);
    if (!commitHash) return;

    if (this.selectedCommits.has(commit)) {
      this.selectedCommits.delete(commit);
      commit.style.backgroundColor = '';
      commit.style.border = '';
    } else {
      this.selectedCommits.add(commit);
      commit.style.backgroundColor = 'rgba(9, 105, 218, 0.2)';
      commit.style.border = '2px solid #0969da';
    }

    this.updateSelectedCommitsCount();
  }

  extractCommitHash(commit) {
    // Try different methods to extract commit hash
    const hashSelectors = [
      '.commit-sha',
      '[data-clipboard-text]',
      'a[href*="/commit/"]',
      '.sha'
    ];

    for (const selector of hashSelectors) {
      const element = commit.querySelector(selector);
      if (element) {
        const hash = element.getAttribute('data-clipboard-text') || 
                    element.href?.split('/commit/')[1]?.split('?')[0] ||
                    element.textContent?.trim();
        if (hash && hash.length >= 7) {
          return hash;
        }
      }
    }

    return null;
  }

  selectAllCommits() {
    const commits = this.findAllCommits();
    commits.forEach(commit => {
      if (!this.selectedCommits.has(commit)) {
        this.selectedCommits.add(commit);
        commit.style.backgroundColor = 'rgba(9, 105, 218, 0.2)';
        commit.style.border = '2px solid #0969da';
      }
    });
    
    this.updateSelectedCommitsCount();
    this.showNotification(`Selected ${commits.length} commits`, 'success');
  }

  clearCommitSelection() {
    this.selectedCommits.forEach(commit => {
      commit.style.backgroundColor = '';
      commit.style.border = '';
    });
    
    this.selectedCommits.clear();
    this.updateSelectedCommitsCount();
    this.showNotification('Selection cleared', 'info');
  }

  async moveSelectedCommits(newDate) {
    if (this.selectedCommits.size === 0) {
      this.showNotification('No commits selected!', 'error');
      return;
    }

    const commitHashes = Array.from(this.selectedCommits)
      .map(commit => this.extractCommitHash(commit))
      .filter(hash => hash !== null);

    if (commitHashes.length === 0) {
      this.showNotification('Could not extract commit hashes!', 'error');
      return;
    }

    const moveOperation = {
      type: 'move_commits_timeline',
      commits: commitHashes,
      targetDate: newDate,
      repository: window.histofyDetector?.repository,
      username: window.histofyDetector?.username,
      timestamp: new Date().toISOString()
    };

    if (window.histofyStorage) {
      await window.histofyStorage.addPendingChange(moveOperation);
    }

    this.showNotification(`Queued ${commitHashes.length} commits for move to ${newDate}`, 'success');
    this.clearCommitSelection();
  }

  updateSelectedCommitsCount() {
    const countElement = document.querySelector('#histofy-selected-commits-count');
    if (countElement) {
      countElement.textContent = this.selectedCommits.size;
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `histofy-notification histofy-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    
    if (!this.editMode) {
      this.clearCommitSelection();
    }
  }
}

// Initialize commit timeline editor
window.histofyCommitEditor = new CommitTimelineEditor();
