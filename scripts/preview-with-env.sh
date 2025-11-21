#!/bin/bash
# Wrapper script to run preview server with environment variables
# This ensures env vars are available even in standalone mode

set -e  # Exit on error

echo "================================================"
echo "🚀 Preview Server Startup (via wrapper script)"
echo "================================================"
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

echo "Environment variables BEFORE export:"
echo "  SUPABASE_URL: ${SUPABASE_URL:-[NOT SET]}"
echo "  SUPABASE_KEY length: ${#SUPABASE_KEY}"
echo "  SUPABASE_KEY (first 20): ${SUPABASE_KEY:0:20}..."
echo "  SUPABASE_SERVICE_ROLE_KEY length: ${#SUPABASE_SERVICE_ROLE_KEY}"
echo "  PUBLIC_SUPABASE_URL: ${PUBLIC_SUPABASE_URL:-[NOT SET]}"
echo "  PUBLIC_SUPABASE_ANON_KEY length: ${#PUBLIC_SUPABASE_ANON_KEY}"
echo ""

# Export all required env vars to ensure they're in process.env
export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
export SUPABASE_KEY="${SUPABASE_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
export PUBLIC_SUPABASE_URL="${PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"
export PUBLIC_SUPABASE_ANON_KEY="${PUBLIC_SUPABASE_ANON_KEY}"

echo "Environment variables AFTER export:"
echo "  SUPABASE_URL: ${SUPABASE_URL}"
echo "  SUPABASE_KEY is set: $([ -n "$SUPABASE_KEY" ] && echo 'YES' || echo 'NO')"
echo "  PUBLIC_SUPABASE_URL: ${PUBLIC_SUPABASE_URL}"
echo "  PUBLIC_SUPABASE_ANON_KEY is set: $([ -n "$PUBLIC_SUPABASE_ANON_KEY" ] && echo 'YES' || echo 'NO')"
echo ""

echo "Testing Supabase connectivity from wrapper script:"
if curl -f -s http://127.0.0.1:54321/health > /dev/null 2>&1; then
  echo "  ✅ Can reach Supabase at http://127.0.0.1:54321"
else
  echo "  ❌ CANNOT reach Supabase at http://127.0.0.1:54321"
  echo "  This is a CRITICAL problem - preview server won't work!"
fi
echo ""

echo "Checking if .env.production exists:"
if [ -f .env.production ]; then
  echo "  ✅ .env.production found"
  echo "  Contents:"
  cat .env.production | sed 's/=.*/=***/' # Hide values
else
  echo "  ⚠️  .env.production not found"
fi
echo ""

echo "Starting preview server..."
echo "Command: npm run preview"
echo "================================================"
echo ""

# Run the preview server
npm run preview

