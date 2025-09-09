import { afterAll, afterEach, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import * as fs from 'fs';

// Load environment variables
config({ path: '.env.test' });

const TEST_DB_URL = process.env.TEST_SUPABASE_URL || '';
const TEST_DB_KEY = process.env.TEST_SUPABASE_ANON_KEY || '';

const supabase = createClient(TEST_DB_URL, TEST_DB_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Run migrations before all tests
beforeAll(async () => {
  // Reset the test database
  await supabase.rpc('reset_schema', {});
  
  // Apply migrations
  const migrationSQL = await fs.promises.readFile(
    './supabase/migrations/20240909071600_initial_schema.sql',
    'utf-8'
  );
  await supabase.rpc('pg_terminate_backend_all');
  await supabase.rpc('pg_sleep', { seconds: 1 });
  await supabase.rpc('exec', { query: migrationSQL });
});

// Clean up after all tests
afterAll(async () => {
  await supabase.auth.signOut();
});

export { supabase };
