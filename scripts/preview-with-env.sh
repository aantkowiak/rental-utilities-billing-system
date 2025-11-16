#!/bin/bash
# Wrapper script to run preview server with environment variables
# This ensures env vars are available even in standalone mode

echo "🚀 Starting preview server with environment variables..."
echo "SUPABASE_URL=${SUPABASE_URL}"
echo "SUPABASE_KEY length: ${#SUPABASE_KEY}"
echo "PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}"

# Export all required env vars to ensure they're in process.env
export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
export SUPABASE_KEY="${SUPABASE_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
export PUBLIC_SUPABASE_URL="${PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"
export PUBLIC_SUPABASE_ANON_KEY="${PUBLIC_SUPABASE_ANON_KEY}"

# Run the preview server
npm run preview

