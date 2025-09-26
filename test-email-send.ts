const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testEmailSignup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const testEmail = `test-${Date.now()}@example.com`;
  const password = 'Test@1234';
  
  console.log('Attempting to sign up with email:', testEmail);
  console.log('Supabase URL:', supabaseUrl);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: password,
      options: {
        data: {
          role: 'student',
          name: 'Test User'
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (error) {
      console.error('Error during signup:');
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Status:', error.status);
      return;
    }

    console.log('\nSignup successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email sent to:', data.user?.email);
    console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('Session:', data.session ? 'Created' : 'Not created (email confirmation required)');
    
    if (data.user?.identities?.length === 0) {
      console.warn('Warning: User might already exist');
    }
    
  } catch (error) {
    console.error('\nUnexpected error:');
    console.error(error);
  }
}

testEmailSignup().catch(console.error);
