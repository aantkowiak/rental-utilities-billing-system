#!/usr/bin/env node

/**
 * Script to create test users, profiles, and contracts using Supabase Auth API
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const users = [
  {
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    displayName: 'Admin User',
    propertyId: null,
  },
  {
    email: 'tenant1@example.com',
    password: 'password123',
    role: 'tenant',
    displayName: 'John Tenant',
    propertyId: '10000000-0000-0000-0000-000000000001',
  },
  {
    email: 'tenant2@example.com',
    password: 'password123',
    role: 'tenant',
    displayName: 'Jane Renter',
    propertyId: '10000000-0000-0000-0000-000000000002',
  },
];

async function createUser(user) {
  console.log(`\nCreating user: ${user.email}...`);
  
  try {
    // Create user via Auth Admin API
    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          display_name: user.displayName,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error(`  ❌ Failed to create user: ${error}`);
      return null;
    }

    const userData = await createResponse.json();
    console.log(`  ✅ User created with ID: ${userData.id}`);

    // Create profile
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userData.id,
        role: user.role,
        property_id: user.propertyId,
        display_name: user.displayName,
      }),
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.text();
      console.error(`  ❌ Failed to create profile: ${error}`);
      return null;
    }

    console.log(`  ✅ Profile created for ${user.email}`);

    // Create contract if tenant
    if (user.role === 'tenant' && user.propertyId) {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 13); // Started 13 months ago
      const endDate = new Date('2030-12-31T23:59:59Z');

      const contractResponse = await fetch(`${SUPABASE_URL}/rest/v1/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          property_id: user.propertyId,
          tenant_user_id: userData.id,
          period: `[${startDate.toISOString()},${endDate.toISOString()})`,
        }),
      });

      if (!contractResponse.ok) {
        const error = await contractResponse.text();
        console.error(`  ❌ Failed to create contract: ${error}`);
      } else {
        console.log(`  ✅ Contract created for ${user.email}`);
      }
    }

    return userData;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Creating test users, profiles, and contracts...\n');
  console.log('=========================================');

  for (const user of users) {
    await createUser(user);
  }

  console.log('\n=========================================');
  console.log('\n✅ Test users created successfully!');
  console.log('\nLogin credentials:');
  console.log('  Admin: admin@example.com / password123');
  console.log('  Tenant 1: tenant1@example.com / password123');
  console.log('  Tenant 2: tenant2@example.com / password123');
  console.log('\nYou can now log in at: http://localhost:3000/auth/login');
}

main().catch(console.error);
