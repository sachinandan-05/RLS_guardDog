import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function checkAuthSettings() {
  try {
    // Check if we can access the auth settings (requires service role key)
    const { data: settings, error } = await supabase
      .from('auth.configs')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching auth settings:', error);
      return;
    }

    console.log('Auth Settings:', JSON.stringify(settings, null, 2));
    
    // Check SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('auth.providers')
      .select('*')
      .eq('provider', 'email')
      .single();

    if (smtpError) {
      console.error('Error fetching SMTP settings:', smtpError);
    } else {
      console.log('\nEmail Provider Settings:', JSON.stringify(smtpSettings, null, 2));
    }
    
    // Check if email confirmation is required
    const { data: instanceConfig, error: configError } = await supabase
      .rpc('get_instance_config')
      .single();

    if (configError) {
      console.error('Error fetching instance config:', configError);
    } else {
      console.log('\nInstance Config:', JSON.stringify(instanceConfig, null, 2));
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAuthSettings();
