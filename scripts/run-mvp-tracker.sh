#!/bin/bash
#
# Helper script to run the 10x MVP Tracker MCP server
# This uses the patched version with updated fastmcp

export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# Use the patched installation
exec ~/.npm/_npx/59cf77faa285a26e/node_modules/.bin/10x-mvp-tracker "$@"

