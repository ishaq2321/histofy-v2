# 🎨 Histofy - GitHub History Modifier

**Transform your GitHub contribution history with precision and deploy real commits to match your vision!**

Histofy is a powerful Chrome extension that allows you to modify your GitHub contribution graph visually and deploy actual commits to create your desired contribution pattern. Perfect for learning about GitHub's contribution system, creating visual patterns, or demonstrating git workflows.

## ✨ Features

### 🎯 Visual Contribution Editor
- **Interactive Graph Editing**: Click any date tile to cycle through contribution levels
- **Real-time Preview**: See changes instantly with proper GitHub color mapping
- **Persistent Storage**: Your selections are saved automatically per user/repository
- **Year Navigation**: Works seamlessly across different years

### 🚀 Real Deployment System
- **GitHub API Integration**: Deploy actual commits to create real contribution patterns
- **Repository Management**: Automatically creates or uses existing repositories
- **Commit Optimization**: Generates multiple commits per date based on contribution intensity
- **Compliance**: Follows GitHub's contribution counting rules for proper recognition

### 📊 Contribution Levels
Based on extensive testing and GitHub's contribution intensity system:

- **🔲 None**: 0 commits - No color (#ebedf0)
- **🟢 Low**: 1-3 commits - Darkest green (#216e39)
- **🟢 Medium**: 10-14 commits - Dark green (#30a14e)
- **🟢 High**: 20-24 commits - Medium green (#40c463)
- **🟢 Very High**: 25+ commits - Lightest green (#9be9a8)

*Note: Commit ranges have been validated through real deployment testing to ensure accurate mapping to GitHub's contribution graph intensity levels.*

## 🚀 Installation

### Load as Unpacked Extension

1. **Download the Extension**
   ```bash
   git clone [repository-url]
   cd histofy-v2
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner

3. **Install Extension**
   - Click "Load unpacked"
   - Select the `histofy-v2` folder
   - The Histofy icon should appear in your browser toolbar

4. **Grant Permissions**
   - The extension needs access to GitHub.com and GitHub API
   - These permissions enable visual editing and commit deployment

## 📖 How to Use

### 1. Visual Editing Mode

1. **Visit a GitHub Profile**
   - Go to any GitHub user's profile page
   - Scroll to the contribution graph section

2. **Activate Histofy**
   - Look for the "🚀 Activate Histofy" button
   - Click to enable the interactive overlay

3. **Edit Contributions**
   - Click any date tile to cycle through contribution levels
   - Use the color guide to understand intensity levels
   - Your selections are automatically saved

### 2. Deployment Mode

1. **Configure GitHub Token**
   - Click the Histofy extension icon in your toolbar
   - Navigate to Settings and add your GitHub Personal Access Token
   - Required scopes: `repo`, `user:email`

2. **Deploy Changes**
   - After making visual selections, click "Deploy to GitHub"
   - Choose target repository or create a new one
   - Monitor deployment progress in real-time

3. **Verify Results**
   - Changes will appear in your contribution graph within 24 hours
   - All commits follow GitHub's contribution counting rules

## 🏗️ Architecture

### Core Components

```
histofy-v2/
├── manifest.json                     # Extension configuration
├── api/
│   ├── github-api.js                # GitHub API client
│   ├── github-deployer.js           # Deployment engine
│   └── git-operations.js            # Git operations wrapper
├── content-scripts/
│   ├── github-detector.js           # Page type detection
│   ├── profile-injector.js          # Profile page integration
│   └── repository-injector.js       # Repository page features
├── ui-components/
│   ├── contribution-graph-overlay.js # Visual editor
│   └── deploy-button.js             # Deployment interface
├── storage/
│   └── local-storage-manager.js     # Data persistence
├── background/
│   └── service-worker.js            # Background processes
├── popup/
│   ├── popup.html                   # Extension popup
│   ├── popup.css                    # Popup styling
│   └── popup.js                     # Popup logic
├── styles/
│   └── histofy-ui.css              # Extension UI styles
└── icons/                          # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Key Features

#### GitHub API Integration
- **Authentication**: Secure token-based authentication
- **Repository Operations**: Create, read, and modify repositories
- **Commit Management**: Deploy commits with proper timestamps and metadata
- **Rate Limiting**: Built-in handling of GitHub API rate limits

#### Data Management
- **Local Storage**: Persistent storage of contribution selections
- **User Isolation**: Separate data storage per GitHub user
- **Export/Import**: Backup and restore contribution patterns

#### Contribution System Compliance
- **Email Verification**: Uses GitHub account email for proper attribution
- **UTC Timestamps**: Ensures commits are properly dated
- **Default Branch**: Commits to main/master branch for contribution counting
- **Repository Ownership**: Verifies push permissions before deployment

## 🔧 Development

### Prerequisites
- Chrome/Chromium browser
- GitHub Personal Access Token (for deployment features)
- Basic knowledge of JavaScript and Chrome Extension APIs

### Testing
- Visual editing works immediately after installation
- Deployment requires valid GitHub token and repository permissions
- Use test repositories to verify deployment functionality

### Debug Mode
Enable debug logging by opening browser console and looking for "Histofy:" prefixed messages.

## ⚠️ Important Notes

### GitHub Contribution Rules
This extension creates real commits that follow GitHub's contribution counting rules:

1. **Email Match**: Commits use your GitHub account email
2. **Repository Access**: You must have push access to the target repository
3. **Default Branch**: Commits are made to the repository's default branch
4. **UTC Timestamps**: All commits use proper UTC timestamps
5. **24-Hour Delay**: New contributions may take up to 24 hours to appear

### Responsible Usage
- Use this tool for learning, demonstration, or legitimate pattern creation
- Don't create misleading contribution history for deceptive purposes
- Respect GitHub's Terms of Service and community guidelines
- Consider the impact on repository history when deploying to shared repositories

## 🐛 Troubleshooting

### Common Issues

**Extension Button Not Appearing**
- Refresh the GitHub page
- Verify you're on a valid GitHub profile or repository page
- Check browser console for error messages

**Deployment Failures**
- Verify GitHub token has correct permissions (`repo`, `user:email`)
- Ensure target repository exists and you have push access
- Check network connection and GitHub API status

**Contribution Graph Not Updating**
- Wait up to 24 hours for GitHub to process new commits
- Verify commits appear in the target repository
- Check that commits use your GitHub account email

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues, feature requests, or questions:
- Check the browser console for debug information
- Verify GitHub token permissions and repository access
- Ensure you're following GitHub's contribution counting requirements

---

**Histofy v1.0.0** - Educational tool for understanding GitHub contributions through visual editing and real commit deployment.

*⚠️ This tool creates real commits. Use responsibly and in accordance with GitHub's Terms of Service.*
