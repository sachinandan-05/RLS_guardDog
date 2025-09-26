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
    persistSession: false
  }
});

async function checkEmailLogs() {
  try {
    console.log('Fetching recent email logs...');
    
    // Get recent auth events
    const { data: authEvents, error: authError } = await supabase
      .from('auth.audit_log_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (authError) {
      console.error('Error fetching auth logs:', authError);
    } else {
      console.log('\nRecent Auth Events:');
      console.table(authEvents.map(entry => ({
        id: entry.id,
        event: entry.event,
        created_at: new Date(entry.created_at).toLocaleString(),
        ip: entry.ip_address,
        user_id: entry.user_id?.substring(0, 8) + '...',
        email: entry.traits?.email || 'N/A'
      })));
    }
    
    // Check if the email logs table exists (may require table creation in some setups)
    const { data: emailLogs, error: emailError } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (emailError) {
      console.log('\nNote: Could not fetch email logs directly. You may need to enable email logging in your Supabase project.');
      console.log('To enable email logging, go to: https://supabase.com/dashboard/project/_/database/logs/email');
    } else if (emailLogs && emailLogs.length > 0) {
      console.log('\nRecent Email Logs:');
      console.table(emailLogs.map(log => ({
        id: log.id,
        to: log.to_email,
        subject: log.subject,
        status: log.status,
        created_at: new Date(log.created_at).toLocaleString(),
        error: log.error || 'None'
      })));
    } else {
      console.log('\nNo email logs found. This could mean:');
      console.log('1. No emails have been sent yet');
      console.log('2. Email logging is not enabled in your Supabase project');
      console.log('3. There was an error sending the email');
    }
    
  } catch (error) {
    console.error('Error checking email logs:', error);
  }
}

checkEmailLogs();
