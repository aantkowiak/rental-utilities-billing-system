# 10x MVP Tracker MCP Setup

## Problem Solved

The `@przeprogramowani/10x-mvp-tracker` package had compatibility issues:
- Required Node.js >= 22 (you were running 20.13.1)
- Used outdated `fastmcp` (3.13.0) with MCP SDK incompatibilities

## Solution Applied

1. Installed Node.js 22 via Homebrew (required by the package)
2. Updated the cached fastmcp dependency from 3.13.0 to 3.23.0
3. **Patched fastmcp to declare `completions` capability** (the bug fix)
4. Created a helper script to run the tracker with the correct configuration

### The Key Fix

Added one line to FastMCP.js before `setupCompleteHandlers()` is called:
```javascript
this.#capabilities.completions = {};
```

This declares that the server supports completions, which the MCP SDK now requires.

## How to Configure in Cursor

### Option 1: Run as MCP Server (Recommended)

Add this to your Cursor MCP settings (usually in `~/.cursor/mcp_settings.json` or via Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "10x-mvp-tracker": {
      "command": "/Users/aantkowiak/IdeaProjects/rental-utilities-billing-system/scripts/run-mvp-tracker.sh",
      "args": []
    }
  }
}
```

### Option 2: Run Manually

From the project root, run:

```bash
./scripts/run-mvp-tracker.sh
```

## Keeping It Working

The patched version is stored in `~/.npm/_npx/59cf77faa285a26e/`. If you run `npx clear-npx-cache` or the hash changes, you'll need to re-apply the patches:

```bash
# Step 1: Run the tool once to cache it
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx @przeprogramowani/10x-mvp-tracker@1.0.0

# Step 2: Find the new hash
NEW_HASH=$(ls -t ~/.npm/_npx/ | head -1)

# Step 3: Update fastmcp
cd ~/.npm/_npx/$NEW_HASH/node_modules/@przeprogramowani/10x-mvp-tracker
npm install fastmcp@latest --no-save

# Step 4: Patch the FastMCP.js file
cd node_modules/fastmcp/dist
cp FastMCP.js FastMCP.js.backup
sed -i '' '392 a\
    this.#capabilities.completions = {};
' FastMCP.js

# Step 5: Update the script to use the new hash
# Edit scripts/run-mvp-tracker.sh and change the hash in the path
```

## Alternative: Wait for Official Fix

The maintainers of `@przeprogramowani/10x-mvp-tracker` need to update their `fastmcp` dependency from 3.13.0 to 3.23.0 or later. You can track this issue or report it to them.

## What Changed Since Last Week

- **fastmcp** or **@modelcontextprotocol/sdk** was updated with breaking changes
- The new version requires proper completion capability declaration
- fastmcp 3.23.0 fixes this, but the tracker still depends on 3.13.0

