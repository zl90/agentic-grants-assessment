#!/usr/bin/env bash

# Script to ensure the correct Node.js version is used for deployments
# This prevents the _serverlessExternalPluginName error by using Node.js v20.18.1

set -e

# Define the required Node.js version
REQUIRED_NODE_VERSION="20.18.1"

# Function to check if nvm is available
check_nvm() {
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        return 0
    else
        return 1
    fi
}

# Function to get current Node.js version
get_current_node_version() {
    node -v 2>/dev/null | sed 's/v//' || echo "unknown"
}

# Function to setup Node.js version
setup_node_version() {
    echo "🔧 Setting up Node.js version $REQUIRED_NODE_VERSION for deployment..."
    
    # Load nvm if available
    if check_nvm; then
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Check if the required version is installed
        if ! nvm list | grep -q "v$REQUIRED_NODE_VERSION"; then
            echo "📦 Installing Node.js v$REQUIRED_NODE_VERSION..."
            nvm install "$REQUIRED_NODE_VERSION"
        fi
        
        # Use the required version
        echo "🔄 Switching to Node.js v$REQUIRED_NODE_VERSION..."
        nvm use "$REQUIRED_NODE_VERSION"
        
        # Verify the version
        CURRENT_VERSION=$(get_current_node_version)
        if [ "$CURRENT_VERSION" = "$REQUIRED_NODE_VERSION" ]; then
            echo "✅ Node.js version verified: v$CURRENT_VERSION"
        else
            echo "❌ Failed to switch to Node.js v$REQUIRED_NODE_VERSION. Current version: v$CURRENT_VERSION"
            exit 1
        fi
        
        # Ensure pnpm is available
        if ! command -v pnpm &> /dev/null; then
            echo "📦 Installing pnpm..."
            npm install -g pnpm
        fi
        
    else
        echo "⚠️  nvm not found. Please ensure Node.js v$REQUIRED_NODE_VERSION is installed and active."
        CURRENT_VERSION=$(get_current_node_version)
        if [ "$CURRENT_VERSION" != "$REQUIRED_NODE_VERSION" ]; then
            echo "❌ Current Node.js version (v$CURRENT_VERSION) does not match required version (v$REQUIRED_NODE_VERSION)"
            echo "   Please install nvm and Node.js v$REQUIRED_NODE_VERSION, or update this script."
            exit 1
        fi
    fi
}

# Main execution
setup_node_version
