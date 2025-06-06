// Contribution graph overlay for Histofy
class ContributionGraphOverlay {
  constructor() {
    this.isActive = false;
    this.contributions = {}; // Store selected contributions by date
    this.originalColors = {}; // Store original tile colors
    this.currentYear = new Date().getFullYear();
    this.username = null;
    this.debugMode = false;
    this.tileEventHandlers = new Map(); // Store event handlers for cleanup
    this.protectionHandler = null; // Store protection handler for cleanup
    
    // CORRECTED GitHub contribution levels - based on REAL deployment testing
    // Real testing showed: 2=Low✅, 6=Low❌, 13=Medium❌, 22=VeryHigh✅
    // Fixed ranges: Medium(10-14), High(20-24) to ensure proper intensity mapping
    this.contributionLevels = {
      0: { level: 0, name: 'None', color: '#ebedf0', commits: '0' },              // Light gray - no contributions
      1: { level: 1, name: 'Low', color: '#216e39', commits: '1-3' },             // DARKEST green - low activity ✅ Working correctly
      2: { level: 2, name: 'Medium', color: '#30a14e', commits: '10-14' },        // DARK green - medium activity (CORRECTED from 4-9)
      3: { level: 3, name: 'High', color: '#40c463', commits: '20-24' },          // MEDIUM green - high activity (CORRECTED from 10-19)
      4: { level: 4, name: 'Very High', color: '#9be9a8', commits: '25+' }        // LIGHTEST green - very high activity (ADJUSTED from 20+)
    };
    this.init();
  }

  async init() {
    console.log('Histofy: Contribution graph overlay initializing...');
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Additional wait for GitHub's dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    this.setupEventListeners();
    console.log('Histofy: Contribution graph overlay initialized');
  }

  setupEventListeners() {
    // Listen for page changes (GitHub SPA navigation)
    document.addEventListener('histofy-page-change', () => {
      this.handlePageChange();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.clearAllSelections();
      }
    });

    // Listen for storage changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'histofy_data') {
        this.loadContributions();
      }
    });
  }

  handlePageChange() {
    console.log('Histofy: Page change detected, reinitializing overlay');
    this.deactivate();
    setTimeout(() => {
      this.init();
    }, 1000);
  }

  // Enhanced activation with better initialization and error handling
  activate() {
    console.log('Histofy: Starting activation process...');

    if (this.isActive) {
      console.log('Histofy: Overlay already active');
      return true;
    }

    try {
      // Step 1: Find contribution graph
      const contributionGraph = this.findContributionGraph();
      if (!contributionGraph) {
        console.error('Histofy: Could not find contribution graph element');
        return false;
      }
      console.log('Histofy: Found contribution graph:', contributionGraph);

      // Step 2: Find contribution tiles
      const tiles = document.querySelectorAll('[data-date]');
      if (tiles.length === 0) {
        console.error('Histofy: No contribution tiles found');
        return false;
      }
      console.log(`Histofy: Found ${tiles.length} contribution tiles`);

      // Step 3: Extract user information
      this.extractUserInfo();
      if (!this.username) {
        console.warn('Histofy: Could not extract username, using fallback');
        this.username = 'unknown-user';
      }
      console.log(`Histofy: User: ${this.username}, Year: ${this.currentYear}`);

      // Step 4: Initialize event handlers map if not exists
      if (!this.tileEventHandlers) {
        this.tileEventHandlers = new Map();
      }

      // Step 5: Mark as active EARLY to prevent interference
      this.isActive = true;
      console.log('Histofy: Marked as active');
      
      // Step 6: Set up tile interactions
      this.setupContributionTiles();
      console.log('Histofy: Tile handlers set up');
      
      // Step 7: Create instruction panel
      this.createInstructionPanel();
      console.log('Histofy: Instruction panel created');
      
      // Step 8: Load existing contributions
      setTimeout(() => {
        this.loadContributions();
        console.log('Histofy: Existing contributions loaded');
      }, 100);
      
      // Step 9: Set up protection against deactivation
      this.setupDeactivationProtection();
      console.log('Histofy: Deactivation protection enabled');
      
      console.log('Histofy: Activation completed successfully');
      return true;

    } catch (error) {
      console.error('Histofy: Activation failed with error:', error);
      this.isActive = false;
      
      // Clean up any partial setup
      this.removeContributionHandlers();
      this.removeInstructionPanel();
      
      return false;
    }
  }

  // Core contribution tile functionality
  findContributionGraph() {
    const selectors = [
      '.ContributionCalendar-grid',
      '.js-calendar-graph-svg',
      '[data-test-selector="contribution-graph"]',
      '.contrib-column'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Histofy: Found contribution graph using selector: ${selector}`);
        
        // Verify it has contribution tiles
        const tiles = element.querySelectorAll('[data-date]');
        if (tiles.length > 0) {
          console.log(`Histofy: Verified ${tiles.length} tiles in contribution graph`);
          return element;
        } else {
          console.log(`Histofy: Element found but no tiles: ${selector}`);
        }
      }
    }

    // Debug: Log all possible elements
    console.log('Histofy: Available elements for debugging:');
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${selector}: ${elements.length} elements`);
    });

    return null;
  }

  extractUserInfo() {
    // Extract username from URL or page elements
    const urlMatch = window.location.pathname.match(/^\/([^\/]+)/);
    if (urlMatch && urlMatch[1] !== 'orgs' && urlMatch[1] !== 'settings') {
      this.username = urlMatch[1];
    }

    // Alternative: Extract from page elements
    if (!this.username) {
      const userLink = document.querySelector('[data-hovercard-type="user"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href.match(/^\/([^\/]+)/);
        if (match) {
          this.username = match[1];
        }
      }
    }

    // Extract year from contribution graph or URL
    const yearMatch = window.location.search.match(/from=(\d{4})/);
    if (yearMatch) {
      this.currentYear = parseInt(yearMatch[1]);
    } else {
      // Try to get year from contribution calendar
      const yearSelector = document.querySelector('.js-year-link, .js-selected-year, [data-current-year]');
      if (yearSelector) {
        const yearText = yearSelector.textContent || yearSelector.getAttribute('data-current-year');
        const yearMatch = yearText.match(/(\d{4})/);
        if (yearMatch) {
          this.currentYear = parseInt(yearMatch[1]);
        }
      }
    }

    console.log(`Histofy: Extracted user info - Username: ${this.username}, Year: ${this.currentYear}`);
  }

  setupContributionTiles() {
    const tiles = document.querySelectorAll('[data-date]');
    console.log(`Histofy: Setting up ${tiles.length} contribution tiles`);

    if (tiles.length === 0) {
      throw new Error('No contribution tiles found with [data-date] attribute');
    }

    // Clear any existing handlers first
    this.removeContributionHandlers();

    let successCount = 0;

    tiles.forEach((tile, index) => {
      const date = tile.getAttribute('data-date');
      if (date) {
        try {
          // Store original color and properties
          this.originalColors[date] = tile.getAttribute('fill') || 
                                     tile.style.backgroundColor || 
                                     window.getComputedStyle(tile).backgroundColor;
          
          // Store original event listeners state
          const originalPointerEvents = tile.style.pointerEvents;
          
          // Create event handlers with MAXIMUM isolation
          const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (!this.isActive) {
              console.log('Histofy: Click ignored - overlay not active');
              return false;
            }
            
            console.log(`Histofy: Tile clicked: ${date}`);
            this.handleTileClick(tile, date);
            return false;
          };

          const mouseEnterHandler = (e) => {
            if (this.isActive) {
              e.stopPropagation();
              tile.style.opacity = '0.8';
              tile.style.transform = 'scale(1.05)';
            }
          };

          const mouseLeaveHandler = (e) => {
            if (this.isActive) {
              e.stopPropagation();
              tile.style.opacity = '1';
              tile.style.transform = 'scale(1)';
            }
          };

          // Create block handler for other events
          const blockHandler = (e) => {
            if (this.isActive) {
              e.stopPropagation();
              e.stopImmediatePropagation();
            }
          };

          // Store handlers for cleanup
          this.tileEventHandlers.set(tile, {
            click: clickHandler,
            mouseenter: mouseEnterHandler,
            mouseleave: mouseLeaveHandler,
            blockHandler: blockHandler,
            originalPointerEvents: originalPointerEvents
          });

          // Add event listeners with HIGH PRIORITY
          tile.addEventListener('click', clickHandler, { capture: true, passive: false });
          tile.addEventListener('mouseenter', mouseEnterHandler, { capture: true });
          tile.addEventListener('mouseleave', mouseLeaveHandler, { capture: true });
          tile.addEventListener('mousedown', blockHandler, { capture: true });
          tile.addEventListener('mouseup', blockHandler, { capture: true });
          tile.addEventListener('contextmenu', blockHandler, { capture: true });
          
          // Add visual indicators
          tile.style.cursor = 'pointer';
          tile.style.transition = 'all 0.15s ease';
          tile.setAttribute('data-histofy-active', 'true');
          
          // Ensure maximum interactivity
          tile.style.pointerEvents = 'auto';
          tile.style.zIndex = '10';
          tile.style.position = 'relative';
          
          successCount++;
          
        } catch (error) {
          console.error(`Histofy: Failed to setup tile ${index} (${date}):`, error);
        }
      }
    });
    
    console.log(`Histofy: Successfully set up ${successCount}/${tiles.length} tile handlers`);
    
    if (successCount === 0) {
      throw new Error('Failed to set up any contribution tile handlers');
    }
  }

  removeContributionHandlers() {
    console.log('Histofy: Removing contribution handlers');
    
    if (!this.tileEventHandlers || this.tileEventHandlers.size === 0) {
      console.log('Histofy: No handlers to remove');
      return;
    }
    
    // Remove event listeners using stored handlers
    this.tileEventHandlers.forEach((handlers, tile) => {
      try {
        // Remove all event listeners
        if (handlers.click) {
          tile.removeEventListener('click', handlers.click, { capture: true });
        }
        if (handlers.mouseenter) {
          tile.removeEventListener('mouseenter', handlers.mouseenter, { capture: true });
        }
        if (handlers.mouseleave) {
          tile.removeEventListener('mouseleave', handlers.mouseleave, { capture: true });
        }
        if (handlers.blockHandler) {
          tile.removeEventListener('mousedown', handlers.blockHandler, { capture: true });
          tile.removeEventListener('mouseup', handlers.blockHandler, { capture: true });
          tile.removeEventListener('contextmenu', handlers.blockHandler, { capture: true });
        }
        
        // Reset tile styles and properties
        tile.style.cursor = '';
        tile.style.opacity = '';
        tile.style.transform = '';
        tile.style.transition = '';
        tile.style.zIndex = '';
        tile.style.position = '';
        tile.style.pointerEvents = handlers.originalPointerEvents || '';
        tile.removeAttribute('data-histofy-active');
        
      } catch (error) {
        console.error('Histofy: Error removing handlers from tile:', error);
      }
    });
    
    // Clear the handlers map
    this.tileEventHandlers.clear();
    console.log('Histofy: All contribution handlers removed');
  }

  setupDeactivationProtection() {
    // Prevent accidental deactivation from page events
    this.protectionHandler = (e) => {
      // Don't let other click events deactivate the overlay
      if (this.isActive && e.target && !e.target.closest('.histofy-instruction-panel')) {
        e.stopPropagation();
      }
    };

    // Add protection with low priority
    document.addEventListener('click', this.protectionHandler, { capture: false, passive: true });
  }

  removeDeactivationProtection() {
    if (this.protectionHandler) {
      document.removeEventListener('click', this.protectionHandler, { capture: false, passive: true });
      this.protectionHandler = null;
    }
  }

  // Enhanced deactivation to ensure complete cleanup
  deactivate() {
    if (!this.isActive) {
      console.log('Histofy: Already deactivated');
      return;
    }

    console.log('Histofy: Starting deactivation...');
    
    // First, mark as inactive to prevent new interactions
    this.isActive = false;
    
    // Remove protection
    this.removeDeactivationProtection();
    
    // Remove all event handlers
    this.removeContributionHandlers();
    
    // Remove instruction panel
    this.removeInstructionPanel();
    
    // Reset any modified tiles to original state (but keep colors if user selected them)
    document.querySelectorAll('[data-histofy-active]').forEach(tile => {
      tile.style.cursor = '';
      tile.style.opacity = '';
      tile.style.transform = '';
      tile.style.transition = '';
      tile.removeAttribute('data-histofy-active');
    });
    
    console.log('Histofy: Overlay deactivated completely');
  }

  // Core tile click handling
  handleTileClick(tile, date) {
    if (!this.isActive) {
      console.log('Histofy: Click ignored - overlay not active');
      return;
    }

    console.log(`Histofy: Processing click for ${date}`);

    // Get current level or default to 0 (no contribution)
    const currentLevel = this.contributions[date]?.level || 0;
    
    // Cycle to next level (0 -> 1 -> 2 -> 3 -> 4 -> 0)
    const nextLevel = (currentLevel + 1) % 5;
    
    console.log(`Histofy: Cycling tile ${date} from level ${currentLevel} to ${nextLevel}`);

    // Update contribution data for this specific date
    if (nextLevel === 0) {
      // Remove contribution (back to original state)
      delete this.contributions[date];
      console.log(`Histofy: Removed contribution for ${date}`);
    } else {
      // Set new contribution level for this date
      this.contributions[date] = { 
        ...this.contributionLevels[nextLevel],
        date: date // Store the date for reference
      };
      console.log(`Histofy: Set ${date} to level ${nextLevel} (${this.contributionLevels[nextLevel].name})`);
    }

    // Update tile appearance immediately
    this.updateTileAppearance(tile, date, nextLevel);
    
    // Update instruction panel
    this.updateInstructionPanel();
    
    // Save to storage
    this.saveContributions();
    
    // Add ALL current contributions to pending changes (not just this one)
    this.addToPendingChanges(date, nextLevel);

    // Add visual feedback
    tile.style.transform = 'scale(1.2)';
    setTimeout(() => {
      if (this.isActive) {
        tile.style.transform = 'scale(1)';
      }
    }, 150);

    console.log(`Histofy: Successfully updated ${date} to level ${nextLevel}`);
    console.log('Histofy: Current contributions:', Object.keys(this.contributions).length, 'dates selected');
  }

  updateTileAppearance(tile, date, level) {
    const levelConfig = this.contributionLevels[level];
    
    if (level === 0) {
      // Reset to original color
      const originalColor = this.originalColors[date];
      if (tile.hasAttribute('fill')) {
        tile.setAttribute('fill', originalColor);
      } else {
        tile.style.backgroundColor = originalColor;
      }
      // Remove custom title
      tile.removeAttribute('data-histofy-title');
      if (tile.hasAttribute('title')) {
        tile.removeAttribute('title');
      }
    } else {
      // Apply new color
      if (tile.hasAttribute('fill')) {
        tile.setAttribute('fill', levelConfig.color);
      } else {
        tile.style.backgroundColor = levelConfig.color;
      }
      
      // Update tooltip/title
      const tooltip = `${date}: ${levelConfig.name} (${levelConfig.commits} commits) - Modified by Histofy`;
      tile.setAttribute('title', tooltip);
      tile.setAttribute('data-histofy-title', tooltip);
    }
  }

  // Instruction panel
  createInstructionPanel() {
    // Remove existing panel first
    this.removeInstructionPanel();

    const panel = document.createElement('div');
    panel.className = 'histofy-instruction-panel';
    panel.setAttribute('data-histofy-panel', 'true');
    panel.innerHTML = `
      <div class="histofy-panel-header">
        <h3>🎯 Histofy Active</h3>
        <button class="histofy-panel-close" data-histofy-close="panel" type="button">✕</button>
      </div>
      <div class="histofy-panel-content">
        <div class="histofy-instructions">
          <p><strong>Click tiles to cycle through contribution levels:</strong></p>
          <div class="histofy-level-examples">
            <div class="histofy-level-item">
              <span class="histofy-level-color" style="background: #ebedf0; border: 1px solid #d0d7de;"></span>
              <span>None (0 commits)</span>
            </div>
            <div class="histofy-level-item">
              <span class="histofy-level-color" style="background: #216e39"></span>
              <span>Low (1-3 commits)</span>
            </div>
            <div class="histofy-level-item">
              <span class="histofy-level-color" style="background: #30a14e"></span>
              <span>Medium (10-14 commits)</span>
            </div>
            <div class="histofy-level-item">
              <span class="histofy-level-color" style="background: #40c463"></span>
              <span>High (20-24 commits)</span>
            </div>
            <div class="histofy-level-item">
              <span class="histofy-level-color" style="background: #9be9a8"></span>
              <span>Very High (25+ commits)</span>
            </div>
          </div>
          <div class="histofy-testing-note">
            <p><strong>📊 Based on Real Testing:</strong></p>
            <p>Ranges validated: 2=Low✅, 6=Low❌, 13=Medium❌, 22=VeryHigh✅</p>
          </div>
        </div>
        <div class="histofy-stats">
          <div class="histofy-stat">
            <span class="histofy-stat-label">Selected Tiles:</span>
            <span class="histofy-stat-value" id="histofy-selected-count">0</span>
          </div>
        </div>
        <div class="histofy-panel-actions">
          <button class="histofy-btn histofy-btn-secondary" data-histofy-action="clear" type="button">🗑️ Clear All</button>
          <button class="histofy-btn histofy-btn-warning" data-histofy-action="deactivate" type="button">❌ Deactivate</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Setup panel event listeners with proper delegation
    this.setupPanelEventListeners();
  }

  setupPanelEventListeners() {
    // Use event delegation on the panel
    const panel = document.querySelector('[data-histofy_panel="true"]');
    if (!panel) return;

    const panelClickHandler = (e) => {
      e.stopPropagation();
      
      const target = e.target;
      
      // Handle close button
      if (target.hasAttribute('data-histofy-close') || target.closest('[data-histofy-close]')) {
        console.log('Histofy: Close button clicked');
        this.deactivate();
        return;
      }
      
      // Handle action buttons
      const actionButton = target.closest('[data-histofy-action]');
      if (actionButton) {
        const action = actionButton.getAttribute('data-histofy-action');
        console.log('Histofy: Action button clicked:', action);
        
        if (action === 'clear') {
          this.clearAllSelections();
        } else if (action === 'deactivate') {
          this.deactivate();
        }
        return;
      }
    };

    panel.addEventListener('click', panelClickHandler);
    
    // Store the handler for cleanup
    panel._histofyClickHandler = panelClickHandler;
  }

  updateInstructionPanel() {
    const selectedCount = Object.keys(this.contributions).length;
    const countElement = document.getElementById('histofy-selected-count');
    if (countElement) {
      countElement.textContent = selectedCount;
    }
  }

  removeInstructionPanel() {
    const panel = document.querySelector('[data-histofy-panel="true"]');
    if (panel) {
      // Remove event listener if it exists
      if (panel._histofyClickHandler) {
        panel.removeEventListener('click', panel._histofyClickHandler);
      }
      panel.remove();
    }
  }

  // Data management
  clearAllSelections() {
    console.log('Histofy: Clearing all selections');
    
    // Reset all tiles to original colors
    Object.keys(this.contributions).forEach(date => {
      const tile = document.querySelector(`[data-date="${date}"]`);
      if (tile) {
        const originalColor = this.originalColors[date];
        if (tile.hasAttribute('fill')) {
          tile.setAttribute('fill', originalColor);
        } else {
          tile.style.backgroundColor = originalColor;
        }
        // Remove histofy-specific attributes
        tile.removeAttribute('title');
        tile.removeAttribute('data-histofy-title');
      }
    });

    // Clear contributions
    this.contributions = {};
    this.updateInstructionPanel();
    this.saveContributions();

    // Clear pending changes for this user/year and update deployment button
    this.clearPendingChangesForCurrentUser();

    console.log('Histofy: All selections cleared');
  }

  async clearPendingChangesForCurrentUser() {
    if (!window.histofyStorage) return;

    try {
      const data = await window.histofyStorage.getData();
      if (!data.pendingChanges) return;

      // Remove all pending changes for current user/year
      const originalCount = data.pendingChanges.length;
      data.pendingChanges = data.pendingChanges.filter(change => 
        !(change.type === 'date_selection' && 
          change.username === this.username && 
          change.year === this.currentYear)
      );

      const removedCount = originalCount - data.pendingChanges.length;
      
      await window.histofyStorage.saveData(data);
      
      console.log(`Histofy: Removed ${removedCount} pending changes for ${this.username} (${this.currentYear})`);
      
      // Update deploy button immediately
      if (window.histofyDeployButton) {
        setTimeout(() => {
          window.histofyDeployButton.updatePendingCount();
        }, 100);
      }

    } catch (error) {
      console.error('Histofy: Failed to clear pending changes:', error);
    }
  }

  // Storage management
  async saveContributions() {
    if (!this.username || !window.histofyStorage) return;

    try {
      const data = await window.histofyStorage.getData();
      
      if (!data.contributions) {
        data.contributions = {};
      }
      if (!data.contributions[this.username]) {
        data.contributions[this.username] = {};
      }
      
      data.contributions[this.username][this.currentYear] = { ...this.contributions };
      
      await window.histofyStorage.saveData(data);
      console.log(`Histofy: Saved contributions for ${this.username} (${this.currentYear})`);
    } catch (error) {
      console.error('Histofy: Failed to save contributions:', error);
    }
  }

  async loadContributions() {
    if (!this.username || !window.histofyStorage) return;

    try {
      const data = await window.histofyStorage.getData();
      
      if (data.contributions?.[this.username]?.[this.currentYear]) {
        this.contributions = { ...data.contributions[this.username][this.currentYear] };
        
        // Apply saved contributions to tiles
        Object.entries(this.contributions).forEach(([date, contribution]) => {
          const tile = document.querySelector(`[data-date="${date}"]`);
          if (tile) {
            this.updateTileAppearance(tile, date, contribution.level);
          }
        });
        
        this.updateInstructionPanel();
        console.log(`Histofy: Loaded contributions for ${this.username} (${this.currentYear})`);
      }
    } catch (error) {
      console.error('Histofy: Failed to load contributions:', error);
    }
  }

  async addToPendingChanges(date, level) {
    if (!window.histofyStorage) return;

    try {
      // Get all currently selected dates and their levels
      const selectedDates = Object.keys(this.contributions);
      
      if (selectedDates.length === 0) {
        console.log('Histofy: No contributions to add to pending changes');
        return;
      }

      // Create a comprehensive change entry that includes ALL selected dates
      const change = {
        type: 'date_selection',
        dates: selectedDates,
        contributions: { ...this.contributions },
        username: this.username,
        year: this.currentYear,
        timestamp: new Date().toISOString(),
        id: `${this.username}_${this.currentYear}_batch_${Date.now()}`
      };

      // Get existing pending changes
      const data = await window.histofyStorage.getData();
      if (!data.pendingChanges) {
        data.pendingChanges = [];
      }

      // Remove any existing change for this same user/year combination
      data.pendingChanges = data.pendingChanges.filter(existingChange => 
        !(existingChange.type === 'date_selection' && 
          existingChange.username === this.username && 
          existingChange.year === this.currentYear)
      );

      // Add the new comprehensive change
      data.pendingChanges.push(change);
      console.log(`Histofy: Added pending changes for ${selectedDates.length} dates:`, selectedDates);

      await window.histofyStorage.saveData(data);
      
      // Update deploy button count immediately
      if (window.histofyDeployButton) {
        setTimeout(() => {
          window.histofyDeployButton.updatePendingCount();
        }, 100);
      }

    } catch (error) {
      console.error('Histofy: Failed to add pending changes:', error);
    }
  }

  // Prevent navigation events from deactivating the overlay
  preventNavigationDeactivation() {
    // Override any existing navigation handlers that might interfere
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    // Store original methods for restoration
    if (!this._originalHistoryMethods) {
      this._originalHistoryMethods = {
        pushState: originalPushState,
        replaceState: originalReplaceState
      };
      
      // Override history methods to maintain activation
      history.pushState = (...args) => {
        console.log('Histofy: Navigation detected, maintaining activation');
        originalPushState.apply(history, args);
        
        // Re-activate after navigation if we were active
        if (this.isActive) {
          setTimeout(() => {
            this.setupContributionTiles();
          }, 500);
        }
      };
      
      history.replaceState = (...args) => {
        console.log('Histofy: Page replace detected, maintaining activation');
        originalReplaceState.apply(history, args);
        
        // Re-activate after navigation if we were active
        if (this.isActive) {
          setTimeout(() => {
            this.setupContributionTiles();
          }, 500);
        }
      };
    }
  }

  // Public API methods with better logging
  getContributions() {
    const contributions = { ...this.contributions };
    console.log(`Histofy: Getting contributions - ${Object.keys(contributions).length} dates with modifications`);
    return contributions;
  }

  getSelectedDates() {
    const dates = Object.keys(this.contributions);
    console.log(`Histofy: Getting selected dates - ${dates.length} dates selected`);
    return dates;
  }

  getStats() {
    const stats = {
      total: Object.keys(this.contributions).length,
      byLevel: {}
    };

    Object.values(this.contributions).forEach(contribution => {
      const level = contribution.level;
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
    });

    console.log('Histofy: Current stats:', stats);
    return stats;
  }

  // Helper method to get contribution data formatted for deployment
  getContributionDataForDeployment() {
    const deploymentData = {
      username: this.username,
      year: this.currentYear,
      contributions: {},
      dates: []
    };

    // Format contributions for deployment
    Object.entries(this.contributions).forEach(([date, contribution]) => {
      deploymentData.contributions[date] = contribution;
      deploymentData.dates.push(date);
    });

    deploymentData.totalDates = deploymentData.dates.length;
    
    console.log(`Histofy: Formatted deployment data for ${deploymentData.totalDates} dates`);
    return deploymentData;
  }
}

// Initialize overlay
window.histofyOverlay = new ContributionGraphOverlay();
