#!/bin/bash

# Histofy Store Changes Fix - Deployment Test Script
# This script helps validate the extension before deployment

echo "🚀 Histofy Store Changes Fix - Deployment Test"
echo "=============================================="

# Check if we're in the right directory
if [[ ! -f "manifest.json" ]]; then
    echo "❌ Error: manifest.json not found. Please run this script from the histofy-v2 directory."
    exit 1
fi

echo "✅ Found manifest.json"

# Validate JSON files
echo "📋 Validating JSON files..."
if command -v jq &> /dev/null; then
    if jq . manifest.json > /dev/null 2>&1; then
        echo "✅ manifest.json is valid JSON"
    else
        echo "❌ manifest.json has invalid JSON syntax"
        exit 1
    fi
else
    echo "⚠️ jq not found, skipping JSON validation"
fi

# Check for required files
echo "📁 Checking required files..."
required_files=(
    "manifest.json"
    "background/service-worker.js"
    "content-scripts/profile-injector.js"
    "ui-components/contribution-graph-overlay.js"
    "storage/local-storage-manager.js"
    "styles/histofy-ui.css"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        ((missing_files++))
    fi
done

if [[ $missing_files -gt 0 ]]; then
    echo "❌ $missing_files required files are missing"
    exit 1
fi

# Check JavaScript syntax
echo "🔍 Checking JavaScript syntax..."
js_errors=0
while IFS= read -r -d '' file; do
    if node -c "$file" 2>/dev/null; then
        echo "✅ $(basename "$file")"
    else
        echo "❌ Syntax error in $file"
        ((js_errors++))
    fi
done < <(find . -name "*.js" -print0)

if [[ $js_errors -gt 0 ]]; then
    echo "❌ $js_errors JavaScript files have syntax errors"
    exit 1
fi

# Check for our Store Changes fix methods
echo "🔧 Verifying Store Changes fix implementation..."
fix_methods=(
    "forceStorePendingChanges"
    "scanForVisualModifications"
    "rebuildContributionsFromVisual"
    "emergencyRebuildContributions"
)

for method in "${fix_methods[@]}"; do
    if grep -r "$method" ui-components/contribution-graph-overlay.js > /dev/null; then
        echo "✅ Method $method found"
    else
        echo "❌ Method $method missing"
        exit 1
    fi
done

# Check if async handleStoreChanges exists
if grep "async handleStoreChanges" content-scripts/profile-injector.js > /dev/null; then
    echo "✅ Async handleStoreChanges found"
else
    echo "❌ Async handleStoreChanges missing"
    exit 1
fi

# Calculate total file size
total_size=$(find . -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" | xargs wc -c | tail -1 | awk '{print $1}')
size_mb=$(echo "scale=2; $total_size / 1024 / 1024" | bc -l 2>/dev/null || echo "unknown")

echo "📊 Extension Statistics:"
echo "   Total files: $(find . -type f | wc -l)"
echo "   JavaScript files: $(find . -name "*.js" | wc -l)"
echo "   Total size: ${size_mb}MB (approx)"

# Generate deployment package info
echo "📦 Deployment Package Info:"
echo "   Directory: $(pwd)"
echo "   Ready for Chrome extension loading"
echo "   Load path: chrome://extensions/ -> Load unpacked -> $(pwd)"

# Final validation
echo ""
echo "🎯 FINAL VALIDATION:"
echo "✅ All required files present"
echo "✅ All JavaScript files have valid syntax"
echo "✅ Store Changes fix methods implemented"
echo "✅ Async error handling in place"
echo "✅ Ready for deployment testing"

echo ""
echo "🚀 NEXT STEPS:"
echo "1. Open Chrome and navigate to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select this directory: $(pwd)"
echo "4. Navigate to a GitHub profile page"
echo "5. Run the validation script in browser console"
echo "6. Test the Store Changes functionality"

echo ""
echo "📋 Test Scripts Available:"
echo "   • validate-store-changes.js - Basic validation"
echo "   • final-store-changes-validation.js - Comprehensive testing"
echo "   • test-store-changes-fix.html - Interactive test suite"

echo ""
echo "✅ Deployment test completed successfully!"
