import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

// Create a custom fetch implementation with proper headers
const customFetch = async (url: RequestInfo, options: RequestInit = {}) => {
  const headers = new Headers(options?.headers);
  
  // Set default headers if not already set
  if (!headers.has('apikey')) {
    headers.set('apikey', supabaseAnonKey);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Add any additional headers from options
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, String(value));
      }
    });
  }

  // Make the fetch request with the updated headers
  return fetch(url, {
    ...options,
    headers,
  });
};

// Regular client for most operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'apikey': supabaseAnonKey,
    },
  },
  db: {
    schema: 'public',
  },
});

// Override the default fetch implementation
// @ts-ignore
supabase.realtime.setAuth(supabaseAnonKey);

// Admin client for elevated permissions operations
export const getAdminSupabase = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': supabaseAnonKey,  // Use anon key here, service role is in the Authorization header
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
    },
    db: {
      schema: 'public',
    },
  });
};

export default supabase;
