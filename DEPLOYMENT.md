# Deployment Guide

## Node.js Version Requirements

This project requires **Node.js v20.18.1** for deployments to work correctly. Using newer versions (like v20.19.5+) will cause the `TypeError: Cannot redefine property: _serverlessExternalPluginName` error.

## Automatic Node.js Version Management

The deployment scripts have been configured to automatically use the correct Node.js version. You don't need to manually switch versions - the scripts will handle this for you.

### How It Works

1. **Automatic Version Detection**: Each deployment script calls `scripts/ensure-node-version.sh`
2. **nvm Integration**: The script uses nvm to install and switch to Node.js v20.18.1
3. **Verification**: The script verifies the correct version is active before proceeding
4. **pnpm Installation**: Ensures pnpm is available for the correct Node.js version

### Manual Node.js Version Management

If you need to manually use the correct Node.js version:

```bash
# Using nvm (recommended)
nvm use 20.18.1

# Or install if not available
nvm install 20.18.1
nvm use 20.18.1
```

The project includes a `.nvmrc` file, so you can also use:
```bash
nvm use
```

## Deployment Commands

All deployment commands will automatically use the correct Node.js version:

```bash
# Deploy to staging
pnpm run deploy:staging

# Deploy to production
pnpm run deploy:prod

# Deploy individual services
pnpm --filter @baseline/api run deploy:staging
pnpm --filter @baseline/web run deploy:staging
pnpm --filter @baseline/admin run deploy:staging
```

## Troubleshooting

### If you see the `_serverlessExternalPluginName` error:

1. The deployment scripts should handle this automatically
2. If the error persists, manually run: `nvm use 20.18.1`
3. Ensure nvm is installed: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`

### If nvm is not available:

The deployment scripts will check for nvm and provide helpful error messages if it's not found. Install nvm using the command above, then restart your terminal.

## CI/CD Integration

For CI/CD pipelines, ensure your build environment uses Node.js v20.18.1:

```yaml
# Example GitHub Actions
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '20.18.1'
```

Or for other CI systems, use the `.nvmrc` file:
```bash
nvm use
```
