# 🎨 Histofy - GitHub History Modifier

**Transform your GitHub contribution history with ease!**

Histofy is a powerful Chrome/Edge extension that allows you to modify your GitHub contribution graph by clicking individual tiles and cycling through different contribution levels. Perfect for creating visual patterns, cleaning up your history, or just having fun with your GitHub profile.

## ✨ Features

### 🎯 Core Functionality
- **Click-to-Cycle**: Click any contribution tile to cycle through 5 levels:
  1. **1st click**: Low contributions (1-3 commits) - Darkest green (#216e39)
  2. **2nd click**: Medium contributions (4-9 commits) - Dark green (#30a14e)
  3. **3rd click**: High contributions (10-19 commits) - Medium green (#40c463)
  4. **4th click**: Very high contributions (20+ commits) - Lightest green (#9be9a8)
  5. **5th click**: Back to no contributions (clear) - No color (#ebedf0)

### 🔧 Advanced Features
- **Persistent Storage**: Your modifications are automatically saved per user/year
- **Year Navigation**: Works seamlessly when switching between different years
- **Visual Feedback**: Hover previews and color-coded instruction panel
- **Duplicate Button Prevention**: Smart detection prevents multiple "Activate" buttons

### 🎨 User Interface
- **Clean Integration**: Seamlessly integrates with GitHub's existing UI
- **Responsive Design**: Works on all screen sizes
- **Dark Mode Support**: Automatically adapts to GitHub's theme
- **Real-time Feedback**: Live counter showing selected tiles and their levels

## 🚀 Installation

### Method 1: Load Unpacked Extension (Recommended for Testing)

1. **Download/Clone the Extension**
   ```bash
   git clone <repository-url>
   cd Histofy
   ```

2. **Open Chrome/Edge Extensions Page**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `Histofy` folder
   - Extension should now appear in your extensions list

5. **Verify Installation**
   - The Histofy icon should appear in your browser toolbar
   - Visit any GitHub profile page to test

### Method 2: Extension Store (Coming Soon)
*We're working on publishing to the Chrome Web Store!*

## 📖 Usage Guide

### Getting Started

1. **Visit a GitHub Profile**
   - Navigate to any GitHub user's profile (e.g., `github.com/username`)
   - Scroll down to the contribution graph section

2. **Activate Histofy**
   - Look for the "🚀 Activate Histofy" button near the contribution graph
   - Click the button to enable the overlay

3. **Start Editing**
   - Click any contribution tile to cycle through levels
   - Watch the color change and counter update in real-time
   - Use the instruction panel to understand the color coding

### GitHub Contribution Levels (CORRECTED)

Based on GitHub's official contribution intensity algorithm:

- **🔲 None (0 commits)**: No color (#ebedf0)
- **🟢 Low (1-3 commits)**: Darkest green (#216e39) - Most saturated  
- **🟢 Medium (4-9 commits)**: Dark green (#30a14e)
- **🟢 High (10-19 commits)**: Medium green (#40c463)
- **🟢 Very High (20+ commits)**: Lightest green (#9be9a8) - Least saturated

**Important Note:** GitHub uses an inverse color intensity system where fewer commits result in darker (more saturated) greens, and more commits result in lighter (less saturated) greens. This is opposite to most visualization systems but is GitHub's established design pattern.

## 🛠️ Development

### File Structure
```
Histofy/
├── manifest.json                 # Extension configuration
├── storage/
│   └── local-storage-manager.js  # Data persistence
├── ui-components/
│   ├── contribution-graph-overlay.js  # Main overlay logic
│   ├── commit-timeline-editor.js      # Timeline editing
│   └── deploy-button.js              # Deployment features
├── content-scripts/
│   ├── github-detector.js        # Page detection
│   ├── profile-injector.js       # Profile page integration
│   └── repository-injector.js    # Repository page features
├── styles/
│   └── histofy-ui.css           # Extension styling
├── api/
│   ├── github-api.js            # GitHub API integration
│   └── git-operations.js        # Git operations
├── background/
│   └── service-worker.js        # Background tasks
├── popup/
│   ├── popup.html               # Extension popup
│   ├── popup.css                # Popup styling
│   └── popup.js                 # Popup functionality
└── icons/                       # Extension icons
```

### Key Components

#### 1. Contribution Graph Overlay
- **File**: `ui-components/contribution-graph-overlay.js`
- **Purpose**: Main logic for tile interaction and visual feedback
- **Features**: Click handling, level cycling, storage integration

#### 2. Local Storage Manager
- **File**: `storage/local-storage-manager.js`
- **Purpose**: Persistent data storage per user/year
- **Features**: Save/load contributions, data export/import

#### 3. Profile Injector
- **File**: `content-scripts/profile-injector.js`
- **Purpose**: Injects the "Activate Histofy" button on profile pages
- **Features**: Mutation observer, year change detection, duplicate prevention

### Testing

#### Run Diagnostics
```bash
cd Histofy
./test-extension.sh
```

#### Test Page
Open `test-page.html` in your browser to test functionality without GitHub:
```bash
# Open in browser
open test-page.html  # macOS
xdg-open test-page.html  # Linux
start test-page.html  # Windows
```

#### Debug Mode
Enable debug logging by setting `debugMode = true` in the overlay constructor.

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Loading
- **Solution**: Check that all files are present and manifest.json is valid
- **Debug**: Run `./test-extension.sh` to verify file integrity

#### Button Not Appearing
- **Cause**: Page might not be detected as a GitHub profile
- **Solution**: Refresh the page, check URL format
- **Debug**: Look for "Histofy:" messages in browser console

#### Tiles Not Responding
- **Cause**: Overlay might not be properly activated
- **Solution**: Click "Activate Histofy" button first
- **Debug**: Check if contribution squares have `[data-date]` attributes

#### Storage Not Working
- **Cause**: LocalStorage might be disabled or full
- **Solution**: Check browser storage settings
- **Debug**: Look for storage error messages in console

### Debug Information

#### Browser Console Messages
Look for messages starting with "Histofy:" to track extension behavior:
```
Histofy: Contribution graph overlay initialized
Histofy: Found 365 contribution squares
Histofy: Cycling tile 2024-01-01 from level 0 to 1
Histofy: Stored contributions for username (2024)
```

#### Extension Diagnostics
Run the diagnostic script to check extension health:
```bash
./test-extension.sh
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the Repository**
2. **Create a Feature Branch**
3. **Make Your Changes**
4. **Test Thoroughly**
5. **Submit a Pull Request**

### Development Guidelines
- Follow existing code style and patterns
- Add console logging for debugging (prefix with "Histofy:")
- Test on multiple GitHub profiles and years
- Ensure responsive design compatibility

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This extension modifies the visual appearance of GitHub contribution graphs locally in your browser. It does not actually change your Git history or create fake commits. The modifications are purely cosmetic and are stored locally in your browser.

## 🆘 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Debug**: Use the built-in test page and diagnostic tools
- **Community**: Share tips and tricks with other users

---

**Made with ❤️ by the Histofy Team**

*Transform your GitHub story, one tile at a time!*
