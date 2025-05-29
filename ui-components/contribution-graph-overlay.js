// Contribution graph overlay for direct interaction
class ContributionGraphOverlay {
  constructor() {
    this.isActive = false;
    this.selectedDates = new Set();
    this.dragMode = null; // 'select', 'move', null
    this.mutationObserver = null;
    this.tileContributions = new Map(); // Track contribution levels for each tile
    this.contributionLevels = [
      { level: 0, name: 'None', color: '#ebedf0', commits: 0 },           // Clear/No contributions
      { level: 1, name: 'Low', color: '#9be9a8', commits: '1-3' },        // Light green
      { level: 2, name: 'Medium', color: '#40c463', commits: '4-6' },     // Medium green  
      { level: 3, name: 'High', color: '#30a14e', commits: '7-10' },      // Dark green
      { level: 4, name: 'Very High', color: '#216e39', commits: '11+' }   // Darkest green
    ];
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('Histofy: Contribution graph overlay initialized');
  }

  setupEventListeners() {
    document.addEventListener('histofy-page-change', (event) => {
      const { page } = event.detail;
      if (page === 'profile') {
        setTimeout(() => this.injectOverlay(), 500);
      } else {
        // Clean up when leaving profile page
        this.cleanupOverlays();
      }
    });

    // Listen for overlay toggle
    document.addEventListener('histofy-toggle-overlay', (event) => {
      const year = event.detail?.year || new Date().getFullYear().toString();
      this.toggleOverlay(year);
    });
  }

  injectOverlay() {
    // Always cleanup existing overlays first to prevent duplicates
    this.cleanupOverlays();

    const contributionGraph = this.findContributionGraph();
    if (!contributionGraph) {
      console.log('Histofy: Contribution graph not found');
      return;
    }

    this.createOverlay(contributionGraph);
  }

  cleanupOverlays() {
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove any existing overlays to prevent duplicates
    const existingOverlays = document.querySelectorAll('.histofy-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    // Reset state
    this.isActive = false;
    this.selectedDates.clear();
    this.tileContributions.clear();
    this.dragMode = null;
  }

  findContributionGraph() {
    // Try different selectors for different GitHub layouts
    const selectors = [
      '.js-yearly-contributions',
      '.ContributionCalendar',
      '[data-testid="contribution-graph"]',
      '.contrib-column'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  createOverlay(contributionGraph) {
    const overlay = document.createElement('div');
    overlay.className = 'histofy-overlay';
    overlay.innerHTML = `
      <div class="histofy-overlay-controls">
        <button class="histofy-btn histofy-btn-primary" id="histofy-activate-overlay">
          🎯 Activate Histofy
        </button>
        <button class="histofy-btn histofy-btn-secondary" id="histofy-select-mode" style="display: none;">
          📅 Select Dates
        </button>
        <button class="histofy-btn histofy-btn-secondary" id="histofy-move-mode" style="display: none;">
          🔄 Move Commits
        </button>
        <button class="histofy-btn histofy-btn-danger" id="histofy-clear-selection" style="display: none;">
          🗑️ Clear Selection
        </button>
        <span class="histofy-selected-count" style="display: none;">
          Selected: <span id="histofy-count">0</span> days
        </span>
      </div>
      <div class="histofy-overlay-canvas" style="display: none;">
        <div class="histofy-instructions">
          <h4>📝 How to Use:</h4>
          <div class="histofy-instruction-grid">
            <div class="histofy-instruction-item">
              <span class="histofy-click-demo" style="background-color: #ebedf0; border: 1px solid #d0d7de;">1st</span>
              <span>Clear (no contributions)</span>
            </div>
            <div class="histofy-instruction-item">
              <span class="histofy-click-demo" style="background-color: #9be9a8;">2nd</span>
              <span>Low (1-3 commits)</span>
            </div>
            <div class="histofy-instruction-item">
              <span class="histofy-click-demo" style="background-color: #40c463;">3rd</span>
              <span>Medium (4-6 commits)</span>
            </div>
            <div class="histofy-instruction-item">
              <span class="histofy-click-demo" style="background-color: #30a14e;">4th</span>
              <span>High (7-10 commits)</span>
            </div>
            <div class="histofy-instruction-item">
              <span class="histofy-click-demo" style="background-color: #216e39;">5th</span>
              <span>Very High (11+ commits)</span>
            </div>
          </div>
          <p><strong>Tip:</strong> Click tiles to cycle through contribution levels. After 5th click, tile returns to clear state.</p>
        </div>
        <div class="histofy-selection-summary" id="histofy-selection-summary">
          <h4>📊 Current Selections:</h4>
          <div id="histofy-level-breakdown" class="histofy-level-breakdown">
            <div class="histofy-level-stat">
              <span class="histofy-level-color" style="background-color: #9be9a8;"></span>
              <span>Low: <span id="histofy-low-count">0</span></span>
            </div>
            <div class="histofy-level-stat">
              <span class="histofy-level-color" style="background-color: #40c463;"></span>
              <span>Medium: <span id="histofy-medium-count">0</span></span>
            </div>
            <div class="histofy-level-stat">
              <span class="histofy-level-color" style="background-color: #30a14e;"></span>
              <span>High: <span id="histofy-high-count">0</span></span>
            </div>
            <div class="histofy-level-stat">
              <span class="histofy-level-color" style="background-color: #216e39;"></span>
              <span>Very High: <span id="histofy-very-high-count">0</span></span>
            </div>
          </div>
          <p class="histofy-total-selected">Total: <span id="histofy-total-selected">0</span> tiles modified</p>
        </div>
      </div>
    `;

    // Insert overlay before the contribution graph
    contributionGraph.parentNode.insertBefore(overlay, contributionGraph);

    this.setupOverlayEventHandlers(overlay);
    this.setupContributionGraphObserver();
  }

  setupContributionGraphObserver() {
    // Disconnect existing observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Find the contribution graph container to observe
    const contributionContainer = document.querySelector('.js-yearly-contributions');
    if (!contributionContainer) return;

    // Create mutation observer to detect graph changes (like year changes)
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldReinject = false;
      
      mutations.forEach((mutation) => {
        // Check if the contribution graph content changed
        if (mutation.type === 'childList' && mutation.target.closest('.js-yearly-contributions')) {
          shouldReinject = true;
        }
      });

      if (shouldReinject) {
        console.log('Histofy: Contribution graph change detected, re-injecting overlay');
        setTimeout(() => this.injectOverlay(), 100);
      }
    });

    // Start observing
    this.mutationObserver.observe(contributionContainer, {
      childList: true,
      subtree: true
    });
  }

  setupOverlayEventHandlers(overlay) {
    const activateBtn = overlay.querySelector('#histofy-activate-overlay');
    const selectModeBtn = overlay.querySelector('#histofy-select-mode');
    const moveModeBtn = overlay.querySelector('#histofy-move-mode');
    const clearBtn = overlay.querySelector('#histofy-clear-selection');
    const canvas = overlay.querySelector('.histofy-overlay-canvas');

    activateBtn.addEventListener('click', () => {
      this.activateOverlay(overlay);
    });

    selectModeBtn.addEventListener('click', () => {
      this.setMode('select');
      this.updateModeButtons(selectModeBtn, moveModeBtn);
    });

    moveModeBtn.addEventListener('click', () => {
      this.setMode('move');
      this.updateModeButtons(moveModeBtn, selectModeBtn);
    });

    clearBtn.addEventListener('click', () => {
      this.clearSelection();
    });
  }

  activateOverlay(overlay) {
    this.isActive = true;
    
    // Hide activate button and show mode controls
    overlay.querySelector('#histofy-activate-overlay').style.display = 'none';
    overlay.querySelector('#histofy-select-mode').style.display = 'inline-block';
    overlay.querySelector('#histofy-move-mode').style.display = 'inline-block';
    overlay.querySelector('#histofy-clear-selection').style.display = 'inline-block';
    overlay.querySelector('.histofy-selected-count').style.display = 'inline-block';
    overlay.querySelector('.histofy-overlay-canvas').style.display = 'block';

    // Set default mode
    this.setMode('select');
    this.updateModeButtons(
      overlay.querySelector('#histofy-select-mode'),
      overlay.querySelector('#histofy-move-mode')
    );

    this.setupContributionSquareListeners();
    
    // Show success message
    this.showNotification('Histofy overlay activated! Click tiles to cycle through contribution levels (1-5 clicks).', 'success');
  }

  setupContributionSquareListeners() {
    const squares = document.querySelectorAll('[data-date]');
    
    squares.forEach(square => {
      if (square.hasAttribute('histofy-listener')) return;
      
      square.setAttribute('histofy-listener', 'true');
      square.style.cursor = 'pointer';
      
      square.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSquareClick(square);
      });

      square.addEventListener('mouseenter', () => {
        if (this.isActive && this.dragMode === 'select') {
          const date = square.getAttribute('data-date');
          const currentLevel = this.tileContributions.get(date) || 0;
          const nextLevel = (currentLevel + 1) % this.contributionLevels.length;
          
          // Show subtle preview - just a light border, no color change
          square.style.outline = '1px dashed #0969da';
          
          // Show tooltip preview of what the next click will do
          const nextLevelName = this.contributionLevels[nextLevel].name;
          const previewText = nextLevel === 0 ? 'Click to clear' : `Click for ${nextLevelName} level`;
          square.setAttribute('data-histofy-preview', previewText);
        }
      });

      square.addEventListener('mouseleave', () => {
        if (this.isActive && this.dragMode === 'select') {
          const date = square.getAttribute('data-date');
          const currentLevel = this.tileContributions.get(date) || 0;
          
          // Remove preview outline only if tile is not currently selected
          if (currentLevel === 0) {
            square.style.outline = 'none';
          } else {
            // Keep the selection outline for selected tiles
            square.style.outline = '2px solid #0969da';
          }
          
          square.removeAttribute('data-histofy-preview');
        }
      });
    });
  }

  handleSquareClick(square) {
    if (!this.isActive) return;

    const date = square.getAttribute('data-date');
    const level = square.getAttribute('data-level') || '0';

    if (this.dragMode === 'select') {
      this.toggleDateSelection(square, date, level);
    } else if (this.dragMode === 'move') {
      this.handleMoveOperation(square, date, level);
    }
  }

  toggleDateSelection(square, date, level) {
    // Get current contribution level for this tile (default to 0)
    const currentLevel = this.tileContributions.get(date) || 0;
    
    // Cycle to next level (0 → 1 → 2 → 3 → 4 → 0)
    const nextLevel = (currentLevel + 1) % this.contributionLevels.length;
    
    // Update the contribution level
    this.tileContributions.set(date, nextLevel);
    
    // Apply visual styling based on the new level
    const contributionData = this.contributionLevels[nextLevel];
    
    // Log the click action for debugging
    console.log(`Histofy: Tile ${date} clicked - Level ${currentLevel} → ${nextLevel} (${contributionData.name})`);
    
    if (nextLevel === 0) {
      // Clear state - remove from selected dates
      this.selectedDates.delete(date);
      square.style.outline = 'none';
      square.style.backgroundColor = '';
      square.style.fill = ''; // For SVG squares
      square.setAttribute('data-histofy-level', '0');
      this.tileContributions.delete(date); // Remove from map when cleared
      
      this.showNotification(`Tile ${date} cleared`, 'info');
    } else {
      // Add to selected dates and apply styling
      this.selectedDates.add(date);
      square.style.outline = '2px solid #0969da';
      square.style.backgroundColor = contributionData.color;
      square.style.fill = contributionData.color; // For SVG squares
      square.setAttribute('data-histofy-level', nextLevel.toString());
      
      this.showNotification(`Tile ${date}: ${contributionData.name} level (${contributionData.commits} commits)`, 'success');
    }

    // Update tooltip to show contribution level
    this.updateSquareTooltip(square, date, contributionData);

    this.updateSelectedCount();
    this.storeSelection();
  }

  updateSquareTooltip(square, date, contributionData) {
    // Create or update tooltip for the square
    const tooltip = square.getAttribute('aria-label') || square.getAttribute('title') || '';
    const baseTooltip = tooltip.split(' - Histofy:')[0]; // Remove existing Histofy info
    
    if (contributionData.level === 0) {
      // Remove Histofy tooltip info
      square.setAttribute('aria-label', baseTooltip);
      square.setAttribute('title', baseTooltip);
    } else {
      // Add Histofy contribution level info
      const histofyInfo = ` - Histofy: ${contributionData.name} (${contributionData.level}/4)`;
      square.setAttribute('aria-label', baseTooltip + histofyInfo);
      square.setAttribute('title', baseTooltip + histofyInfo);
    }
  }

  handleMoveOperation(square, targetDate, level) {
    if (this.selectedDates.size === 0) {
      this.showNotification('No dates selected to move!', 'error');
      return;
    }

    // Create move operation
    const moveOperation = {
      type: 'move_commits',
      sourceDates: Array.from(this.selectedDates),
      targetDate: targetDate,
      timestamp: new Date().toISOString()
    };

    this.addPendingChange(moveOperation);
    this.showNotification(`Queued move of ${this.selectedDates.size} dates to ${targetDate}`, 'success');
    this.clearSelection();
  }

  setMode(mode) {
    this.dragMode = mode;
    const cursor = mode === 'select' ? 'pointer' : 'move';
    
    document.querySelectorAll('[data-date]').forEach(square => {
      square.style.cursor = cursor;
    });
  }

  updateModeButtons(activeBtn, inactiveBtn) {
    activeBtn.classList.add('histofy-btn-active');
    inactiveBtn.classList.remove('histofy-btn-active');
  }

  clearSelection() {
    this.selectedDates.clear();
    this.tileContributions.clear();
    
    document.querySelectorAll('[data-date]').forEach(square => {
      square.style.outline = 'none';
      square.style.backgroundColor = '';
      square.style.fill = '';
      square.removeAttribute('data-histofy-level');
      
      // Reset tooltip
      const tooltip = square.getAttribute('aria-label') || square.getAttribute('title') || '';
      const baseTooltip = tooltip.split(' - Histofy:')[0];
      square.setAttribute('aria-label', baseTooltip);
      square.setAttribute('title', baseTooltip);
    });

    this.updateSelectedCount();
  }

  updateSelectedCount() {
    const countElement = document.querySelector('#histofy-count');
    if (countElement) {
      countElement.textContent = this.selectedDates.size;
    }
  }

  async storeSelection() {
    if (window.histofyStorage) {
      // Create selection data with contribution levels
      const selectionData = {};
      this.selectedDates.forEach(date => {
        const level = this.tileContributions.get(date) || 0;
        if (level > 0) { // Only store dates with actual contributions
          selectionData[date] = {
            level: level,
            name: this.contributionLevels[level].name,
            color: this.contributionLevels[level].color,
            commits: this.contributionLevels[level].commits
          };
        }
      });

      const selection = {
        type: 'contribution_modification',
        dates: selectionData, // Now includes full data: { "2024-01-01": { level: 2, name: "Medium", color: "#40c463", commits: "4-6" } }
        totalTiles: Object.keys(selectionData).length,
        timestamp: new Date().toISOString()
      };
      
      // Log the stored data for debugging
      console.log('Histofy: Stored contribution data:', selection);
      
      await window.histofyStorage.addPendingChange(selection);
    }
  }

  async addPendingChange(change) {
    if (window.histofyStorage) {
      await window.histofyStorage.addPendingChange(change);
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

  toggleOverlay(year = null) {
    const overlay = document.querySelector('.histofy-overlay');
    if (overlay) {
      this.isActive = !this.isActive;
      overlay.style.display = this.isActive ? 'block' : 'none';
      
      if (this.isActive && year) {
        console.log(`Histofy: Overlay activated for year ${year}`);
      }
    }
  }
}

// Initialize contribution graph overlay
window.histofyGraphOverlay = new ContributionGraphOverlay();
