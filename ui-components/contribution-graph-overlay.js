// Contribution graph overlay for direct interaction
class ContributionGraphOverlay {
  constructor() {
    this.isActive = false;
    this.selectedDates = new Set();
    this.dragMode = null;
    this.mutationObserver = null;
    this.tileContributions = new Map();
    this.tileClickCounts = new Map();
    this.lastClickedTile = null;
    this.clickTimeout = null;
    this.boundHandleSquareClick = null;
    this.visualChanges = new Map(); // Store visual changes persistently
    this.graphRefreshTimer = null;
    this.lastGraphHTML = '';
    this.contributionLevels = [
      { level: 0, name: 'None', color: '#ebedf0', commits: 0 },
      { level: 1, name: 'Low', color: '#9be9a8', commits: '1-3' },
      { level: 2, name: 'Medium', color: '#40c463', commits: '4-6' },
      { level: 3, name: 'High', color: '#30a14e', commits: '7-10' },
      { level: 4, name: 'Very High', color: '#216e39', commits: '11+' }
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
        this.cleanupOverlays();
      }
    });

    // Listen for overlay toggle
    document.addEventListener('histofy-toggle-overlay', (event) => {
      const { year } = event.detail || {};
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
    // Stop monitoring graph changes
    this.stopGraphMonitoring();
    
    // Remove existing event listeners first
    this.removeSquareListeners();
    
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove any existing overlays to prevent duplicates
    const existingOverlays = document.querySelectorAll('.histofy-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    // Reset state but preserve visual changes if overlay is being reactivated
    this.isActive = false;
    this.selectedDates.clear();
    this.tileContributions.clear();
    this.tileClickCounts.clear();
    this.dragMode = null;
    this.lastClickedTile = null;
    
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
  }

  // New method to start monitoring graph changes
  startGraphMonitoring() {
    // Store initial graph state
    const graphContainer = this.findContributionGraph();
    if (graphContainer) {
      this.lastGraphHTML = graphContainer.innerHTML;
    }

    // Monitor for changes every 500ms
    this.graphRefreshTimer = setInterval(() => {
      this.checkForGraphRefresh();
    }, 500);
  }

  // Stop monitoring graph changes
  stopGraphMonitoring() {
    if (this.graphRefreshTimer) {
      clearInterval(this.graphRefreshTimer);
      this.graphRefreshTimer = null;
    }
  }

  // Check if GitHub refreshed the graph
  checkForGraphRefresh() {
    if (!this.isActive) return;

    const graphContainer = this.findContributionGraph();
    if (!graphContainer) return;

    const currentHTML = graphContainer.innerHTML;
    
    // If graph content changed, GitHub refreshed it
    if (currentHTML !== this.lastGraphHTML) {
      console.log('Histofy: Detected graph refresh, re-applying changes');
      this.lastGraphHTML = currentHTML;
      
      // Re-setup everything
      setTimeout(() => {
        this.reapplyAfterRefresh();
      }, 100);
    }
  }

  // Re-apply our changes after GitHub refreshes the graph
  reapplyAfterRefresh() {
    // Re-setup event listeners
    this.setupContributionSquareListeners();
    
    // Re-apply all visual changes
    this.reapplyVisualChanges();
    
    // Update UI counts
    this.updateSelectedCount();
  }

  // Re-apply stored visual changes
  reapplyVisualChanges() {
    this.visualChanges.forEach((changeData, date) => {
      const square = this.findSquareByDate(date);
      if (square) {
        this.applyVisualChange(square, changeData);
      }
    });
  }

  // Find a square by date
  findSquareByDate(date) {
    const squares = document.querySelectorAll(
      '.ContributionCalendar-day, .js-calendar-graph-svg rect[data-date], .contrib-square'
    );

    for (const square of squares) {
      const squareDate = this.extractDateFromSquare(square);
      if (squareDate === date) {
        return square;
      }
    }
    return null;
  }

  // Apply visual change to a square
  applyVisualChange(square, changeData) {
    square.style.fill = changeData.color;
    square.style.backgroundColor = changeData.color;
    
    // Update tooltip
    this.updateSquareTooltip(square, changeData.date, changeData);
  }

  // New method to properly remove square listeners
  removeSquareListeners() {
    const squares = document.querySelectorAll(
      '.ContributionCalendar-day, .js-calendar-graph-svg rect[data-date], .contrib-square'
    );

    squares.forEach(square => {
      // Remove all histofy event listeners
      if (this.boundHandleSquareClick) {
        square.removeEventListener('click', this.boundHandleSquareClick);
      }
      
      // Remove stored event handlers
      if (square._histofyMouseEnter) {
        square.removeEventListener('mouseenter', square._histofyMouseEnter);
        delete square._histofyMouseEnter;
      }
      if (square._histofyMouseLeave) {
        square.removeEventListener('mouseleave', square._histofyMouseLeave);
        delete square._histofyMouseLeave;
      }
      
      // Reset visual styles only if not in our visual changes
      const date = this.extractDateFromSquare(square);
      if (!this.visualChanges.has(date)) {
        square.style.cursor = '';
        square.style.opacity = '';
        square.style.transform = '';
        square.style.transition = '';
      }
      
      // Remove histofy attributes
      square.removeAttribute('histofy-listener-attached');
    });
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
      if (element) {
        return element;
      }
    }

    return null;
  }

  createOverlay(contributionGraph) {
    const overlay = document.createElement('div');
    overlay.className = 'histofy-overlay';
    overlay.innerHTML = `
      <div class="histofy-overlay-header">
        <h3>🎯 Histofy Contribution Graph Editor</h3>
        <div class="histofy-overlay-controls">
          <div class="histofy-mode-controls">
            <button class="histofy-btn histofy-btn-primary histofy-mode-btn active" id="histofy-select-mode">
              📅 Select Dates
            </button>
            <button class="histofy-btn histofy-btn-secondary histofy-mode-btn" id="histofy-move-mode">
              🔄 Move Mode
            </button>
          </div>
          <div class="histofy-intensity-legend">
            <span class="histofy-legend-title">Click intensity:</span>
            <div class="histofy-legend-items">
              <span class="histofy-legend-item">
                <span class="histofy-legend-dot" style="background: #9be9a8"></span>
                1x = Low
              </span>
              <span class="histofy-legend-item">
                <span class="histofy-legend-dot" style="background: #40c463"></span>
                2x = Medium
              </span>
              <span class="histofy-legend-item">
                <span class="histofy-legend-dot" style="background: #30a14e"></span>
                3x = High
              </span>
              <span class="histofy-legend-item">
                <span class="histofy-legend-dot" style="background: #216e39"></span>
                4x = Very High
              </span>
            </div>
          </div>
          <div class="histofy-selection-info">
            <span id="histofy-selected-count">0</span> dates selected
            <button class="histofy-btn histofy-btn-warning" id="histofy-clear-selection">Clear</button>
            <button class="histofy-btn histofy-btn-success" id="histofy-store-selection">✅ Store Changes</button>
          </div>
        </div>
      </div>
    `;

    // Find the best place to insert the overlay
    const graphContainer = contributionGraph.closest('.BorderGrid-cell') || contributionGraph.parentNode;
    graphContainer.insertBefore(overlay, graphContainer.firstChild);

    this.setupOverlayEventHandlers(overlay);
    this.setupContributionGraphObserver();
    this.activateOverlay(overlay);
  }

  setupContributionGraphObserver() {
    const contributionGraph = this.findContributionGraph();
    if (!contributionGraph) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldReinject = false;
      
      mutations.forEach((mutation) => {
        // Check for major structural changes
        if (mutation.type === 'childList' && mutation.target.closest('.js-yearly-contributions')) {
          // If nodes were added/removed, GitHub might have refreshed the graph
          if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
            shouldReinject = true;
          }
        }
      });

      if (shouldReinject && this.isActive) {
        console.log('Histofy: Major graph change detected via mutation observer');
        setTimeout(() => this.reapplyAfterRefresh(), 200);
      }
    });

    this.mutationObserver.observe(contributionGraph, {
      childList: true,
      subtree: true,
      attributes: false // Only watch for structural changes
    });
  }

  setupOverlayEventHandlers(overlay) {
    const selectModeBtn = overlay.querySelector('#histofy-select-mode');
    const moveModeBtn = overlay.querySelector('#histofy-move-mode');
    const clearBtn = overlay.querySelector('#histofy-clear-selection');
    const storeBtn = overlay.querySelector('#histofy-store-selection');

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

    storeBtn.addEventListener('click', () => {
      this.storeSelection();
    });
  }

  activateOverlay(overlay) {
    this.isActive = true;
    this.dragMode = 'select';
    this.setupContributionSquareListeners();
    this.startGraphMonitoring(); // Start monitoring for changes
    this.reapplyVisualChanges(); // Apply any existing changes
    this.showNotification('Histofy overlay activated! Click tiles to set contribution levels.', 'success');
  }

  setupContributionSquareListeners() {
    // Find all contribution squares
    const squares = document.querySelectorAll(
      '.ContributionCalendar-day, .js-calendar-graph-svg rect[data-date], .contrib-square'
    );

    // Create a new bound function for this setup cycle
    this.boundHandleSquareClick = (e) => {
      const square = e.currentTarget;
      this.handleSquareClick(e, square);
    };

    squares.forEach(square => {
      // Skip if already has our listener
      if (square.hasAttribute('histofy-listener-attached')) {
        return;
      }
      
      // Mark as having our listener
      square.setAttribute('histofy-listener-attached', 'true');
      
      // Add event listener with high priority
      square.addEventListener('click', this.boundHandleSquareClick, { 
        capture: true,
        passive: false
      });
      
      // Add visual feedback
      square.style.cursor = 'pointer';
      
      // Add hover effect with unique event handlers
      const handleMouseEnter = () => {
        if (this.isActive) {
          const originalOpacity = square.style.opacity;
          const originalTransform = square.style.transform;
          square.style.opacity = '0.8';
          square.style.transform = 'scale(1.1)';
          square.style.transition = 'all 0.2s ease';
          // Store original values to restore later
          square._originalOpacity = originalOpacity;
          square._originalTransform = originalTransform;
        }
      };
      
      const handleMouseLeave = () => {
        if (this.isActive) {
          // Restore original values
          square.style.opacity = square._originalOpacity || '';
          square.style.transform = square._originalTransform || '';
        }
      };
      
      square.addEventListener('mouseenter', handleMouseEnter);
      square.addEventListener('mouseleave', handleMouseLeave);
      
      // Store event handlers for cleanup
      square._histofyMouseEnter = handleMouseEnter;
      square._histofyMouseLeave = handleMouseLeave;
    });

    console.log(`Histofy: Set up listeners for ${squares.length} contribution squares`);
  }

  handleSquareClick(event, square) {
    if (!this.isActive) return;
    
    // Stop all event propagation immediately
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    const date = this.extractDateFromSquare(square);
    if (!date) {
      console.warn('Histofy: Could not extract date from square');
      return;
    }

    // Get or initialize click count for this tile
    const tileKey = `${date}_${square.dataset.level || '0'}`;
    let clickCount = this.tileClickCounts.get(tileKey) || 0;
    
    // Handle rapid clicks on same tile
    if (this.lastClickedTile === square) {
      // Clear previous timeout
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
      }
      
      // Increment click count
      clickCount = (clickCount + 1) % 5; // Cycle through 0-4 (None to Very High)
    } else {
      // Different tile clicked, start from level 1
      clickCount = 1;
      this.lastClickedTile = square;
    }
    
    // Update click count
    this.tileClickCounts.set(tileKey, clickCount);
    
    // Apply the contribution level
    this.toggleDateSelection(square, date, clickCount);
    
    // Set timeout to reset last clicked tile
    this.clickTimeout = setTimeout(() => {
      this.lastClickedTile = null;
    }, 1000);
    
    // Return false to prevent any further event handling
    return false;
  }

  extractDateFromSquare(square) {
    // Try different methods to extract date
    const dateAttr = square.getAttribute('data-date') ||
                    square.getAttribute('data-testid') ||
                    square.querySelector('title')?.textContent;
    
    if (dateAttr) {
      // Handle different date formats
      if (dateAttr.includes('contributions on')) {
        const match = dateAttr.match(/(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : null;
      }
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateAttr)) {
        return dateAttr;
      }
    }
    
    // Fallback: try to find date in nearby elements
    const titleElement = square.querySelector('title') || square.parentNode.querySelector('title');
    if (titleElement) {
      const match = titleElement.textContent.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    }
    
    return null;
  }

  toggleDateSelection(square, date, level) {
    if (!date) return;
    
    const contributionLevel = this.contributionLevels[level] || this.contributionLevels[0];
    
    // Store the change data for persistence
    const changeData = {
      level: level,
      name: contributionLevel.name,
      color: contributionLevel.color,
      commits: contributionLevel.commits,
      date: date
    };
    
    // Update visual appearance
    square.style.fill = contributionLevel.color;
    square.style.backgroundColor = contributionLevel.color;
    
    // Store contribution data and visual changes
    this.tileContributions.set(date, {
      ...changeData,
      element: square
    });
    
    // Store visual changes persistently
    if (level > 0) {
      this.visualChanges.set(date, changeData);
      this.selectedDates.add(date);
    } else {
      this.visualChanges.delete(date);
      this.selectedDates.delete(date);
      // Reset to original appearance
      square.style.fill = '';
      square.style.backgroundColor = '';
    }
    
    // Update tooltip
    this.updateSquareTooltip(square, date, this.tileContributions.get(date));
    
    // Update UI
    this.updateSelectedCount();
    
    // Show feedback
    this.showNotification(
      `${date}: ${contributionLevel.name} (${contributionLevel.commits} commits)`, 
      'info'
    );
  }

  updateSquareTooltip(square, date, contributionData) {
    if (!contributionData) return;
    
    let tooltip = square.querySelector('title');
    if (!tooltip) {
      tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      square.appendChild(tooltip);
    }
    
    const originalText = tooltip.textContent.split('\n')[0];
    tooltip.textContent = `${originalText}\nHistofy: ${contributionData.name} (${contributionData.commits} commits)`;
  }

  handleMoveOperation(square, targetDate, level) {
    // Implementation for move mode
    console.log('Histofy: Move operation not yet implemented');
  }

  setMode(mode) {
    this.dragMode = mode;
    console.log(`Histofy: Mode set to ${mode}`);
  }

  updateModeButtons(activeBtn, inactiveBtn) {
    activeBtn.classList.add('active');
    activeBtn.classList.remove('histofy-btn-secondary');
    activeBtn.classList.add('histofy-btn-primary');
    
    inactiveBtn.classList.remove('active');
    inactiveBtn.classList.remove('histofy-btn-primary');
    inactiveBtn.classList.add('histofy-btn-secondary');
  }

  clearSelection() {
    // Reset all tiles to original appearance
    this.visualChanges.forEach((changeData, date) => {
      const square = this.findSquareByDate(date);
      if (square) {
        square.style.fill = '';
        square.style.backgroundColor = '';
        
        // Reset tooltip
        const tooltip = square.querySelector('title');
        if (tooltip) {
          const lines = tooltip.textContent.split('\n');
          tooltip.textContent = lines[0]; // Keep only original text
        }
      }
    });
    
    // Clear all data
    this.selectedDates.clear();
    this.tileContributions.clear();
    this.tileClickCounts.clear();
    this.visualChanges.clear(); // Clear persistent changes
    this.lastClickedTile = null;
    
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
    
    this.updateSelectedCount();
    this.showNotification('Selection cleared', 'info');
  }

  updateSelectedCount() {
    const countElement = document.querySelector('#histofy-selected-count');
    if (countElement) {
      countElement.textContent = this.selectedDates.size;
    }
  }

  async storeSelection() {
    if (this.selectedDates.size === 0) {
      this.showNotification('No dates selected!', 'warning');
      return;
    }

    const selectionData = {
      type: 'date_selection',
      dates: Array.from(this.selectedDates),
      contributions: Object.fromEntries(this.tileContributions),
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear()
    };

    try {
      await this.addPendingChange(selectionData);
      this.showNotification(`Stored ${this.selectedDates.size} selected dates!`, 'success');
    } catch (error) {
      console.error('Histofy: Failed to store selection:', error);
      this.showNotification('Failed to store selection', 'error');
    }
  }

  async storeCurrentChanges() {
    if (this.selectedDates.size === 0) {
      this.showNotification('No dates selected to store!', 'warning');
      return;
    }

    const selectedDatesArray = Array.from(this.selectedDates);
    const contributionsData = {};
    
    // Collect contribution data for each selected date
    selectedDatesArray.forEach(date => {
      const contribution = this.selectedContributions.get(date);
      if (contribution) {
        contributionsData[date] = contribution;
      }
    });

    const changeData = {
      type: 'date_selection',
      dates: selectedDatesArray,
      contributions: contributionsData,
      timestamp: new Date().toISOString()
    };

    try {
      if (window.histofyStorage) {
        const result = await window.histofyStorage.addPendingChange(changeData);
        
        if (result === null) {
          // Duplicate detected
          this.showNotification(
            `⚠️ These ${selectedDatesArray.length} dates are already stored! No duplicate added.`, 
            'warning'
          );
        } else {
          // Successfully added
          this.showNotification(
            `✅ Stored ${selectedDatesArray.length} selected dates for deployment!`, 
            'success'
          );
        }
      }
    } catch (error) {
      console.error('Histofy: Failed to store changes:', error);
      this.showNotification('❌ Failed to store changes', 'error');
    }
  }

  async addPendingChange(change) {
    if (window.histofyStorage) {
      await window.histofyStorage.addPendingChange(change);
    } else {
      // Fallback to direct storage
      const data = await chrome.storage.local.get('histofy_data');
      if (data.histofy_data) {
        change.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        data.histofy_data.pendingChanges.push(change);
        await chrome.storage.local.set({ histofy_data: data.histofy_data });
      }
    }
  }

  showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.histofy-overlay-notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `histofy-overlay-notification histofy-notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  toggleOverlay(year = null) {
    if (this.isActive) {
      this.cleanupOverlays();
      this.showNotification('Histofy overlay deactivated', 'info');
    } else {
      this.injectOverlay();
    }
  }

  // Methods to handle storage updates and cleanup
  handleStorageUpdate(changes) {
    // Handle storage updates from background script
    console.log('Histofy: Storage updated in overlay:', changes);
  }

  clearPendingChanges() {
    // Handle pending changes cleared
    this.clearSelection();
  }
}

// Initialize contribution graph overlay
window.histofyGraphOverlay = new ContributionGraphOverlay();
