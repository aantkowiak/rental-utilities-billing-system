#!/bin/bash

# =====================================================================
# Database Seeding Script for Rental Utilities Billing System
# =====================================================================
# Purpose: Reset and seed the local Supabase database with test data
# 
# Usage: npm run db:seed
# 
# This script will:
# 1. Check if Supabase CLI is available
# 2. Reset the database (apply all migrations)
# 3. Load seed data from supabase/seed.sql
# =====================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
  local color=$1
  shift
  echo -e "${color}$@${NC}"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  print_message $RED "❌ Error: Supabase CLI is not installed"
  echo ""
  echo "Please install Supabase CLI:"
  echo "  npm install -g supabase"
  echo "  or"
  echo "  brew install supabase/tap/supabase"
  echo ""
  exit 1
fi

# Check if we're in the project root
if [ ! -f "supabase/config.toml" ]; then
  print_message $RED "❌ Error: supabase/config.toml not found"
  echo "Please run this script from the project root directory"
  exit 1
fi

print_message $BLUE "======================================================"
print_message $BLUE "  Database Seeding - Rental Utilities Billing System"
print_message $BLUE "======================================================"
echo ""

# Check if Supabase is running
print_message $YELLOW "🔍 Checking Supabase status..."
if ! supabase status &> /dev/null; then
  print_message $YELLOW "⚠️  Supabase is not running. Starting Supabase..."
  supabase start
  echo ""
else
  print_message $GREEN "✓ Supabase is running"
  echo ""
fi

# Confirm reset action
print_message $YELLOW "⚠️  WARNING: This will reset your local database!"
print_message $YELLOW "All existing data will be deleted and replaced with seed data."
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_message $YELLOW "Operation cancelled."
  exit 0
fi

echo ""
print_message $BLUE "🔄 Resetting database and applying migrations..."
supabase db reset

echo ""
print_message $GREEN "======================================================"
print_message $GREEN "✓ Database seeded successfully!"
print_message $GREEN "======================================================"
echo ""
print_message $BLUE "Test accounts created:"
echo "  👤 Admin:    admin@example.com    / password123"
echo "  👤 Tenant 1: tenant1@example.com  / password123"
echo "  👤 Tenant 2: tenant2@example.com  / password123"
echo ""
print_message $BLUE "Database connection:"
echo "  🔗 Studio: http://127.0.0.1:54323"
echo "  🗄️  DB Port: 54322"
echo ""
print_message $GREEN "You can now start your application with: npm run dev"
echo ""

