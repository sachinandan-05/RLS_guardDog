'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getAdminSupabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';


type AuthError = {
  message: string;
  status?: number;
  code?: string;
  details?: string;
  hint?: string;
  // Add other error properties as needed
};

type SupabaseError = {
  message: string;
  code: string;
  details: string;
  hint: string;
  status: number;
};

type AuthContextType = {
  user: User | null;
  role: 'student' | 'teacher' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; role: 'student' | 'teacher' | null }>;
  signUp: (email: string, password: string, role: 'student' | 'teacher', name?: string) => Promise<{ 
    error: AuthError | null; 
    requiresConfirmation?: boolean;
    user?: User;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user ID:', userId);
      
      // First try with the regular client
      const { data, error, status } = await supabase
        .from('profiles')
        .select('role')  // Only select the role field we need
        .eq('id', userId)
        .maybeSingle()
        .then(response => {
          console.log('Regular client response:', {
            data: response.data,
            error: response.error,
            status: response.status,
            statusText: response.statusText
          });
          return response;
        });
  
      // If we get a permissions error, try with admin client
      if (error || status >= 400) {
        console.log('Trying with admin client due to error:', {
          code: error?.code,
          message: error?.message,
          status
        });
        
        try {
          const adminSupabase = getAdminSupabase();
          const adminResult = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle()
            .then(response => {
              console.log('Admin client response:', {
                data: response.data,
                error: response.error,
                status: response.status,
                statusText: response.statusText
              });
              return response;
            });
            
          if (adminResult.error) {
            console.error('Admin client error:', adminResult.error);
            return null;
          }
          
          return adminResult.data?.role as 'student' | 'teacher' | null;
        } catch (adminError) {
          console.error('Exception with admin client:', adminError);
          return null;
        }
      }
  
      if (error) {
        const supabaseError = error as unknown as SupabaseError;
        console.error('Error fetching profile:', {
          message: supabaseError.message,
          code: supabaseError.code,
          details: supabaseError.details,
          hint: supabaseError.hint,
          status: supabaseError.status
        });
        return null;
      }
  
      if (!data) {
        console.log('No profile found for user ID:', userId);
        return null;
      }
  
      console.log('Retrieved profile data:', data);
      return data.role as 'student' | 'teacher' | null;
    } catch (error) {
      console.error('Unexpected error in fetchProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // First, check for existing session
    const checkSession = async () => {
      try {
        console.log('Checking session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setLoading(false);
          return;
        }
        
        console.log('Session check result:', session ? 'Session found' : 'No session');
        
        if (session?.user) {
          console.log('Found existing session for user:', {
            id: session.user.id,
            email: session.user.email,
            email_confirmed: session.user.email_confirmed_at ? true : false,
            user_metadata: session.user.user_metadata
          });
          
          setUser(session.user);
          
          // Wait a moment to ensure any profile creation has completed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get the user's role from the profile
          console.log('Fetching user role for ID:', session.user.id);
          const userRole = await fetchProfile(session.user.id);
          
          // If we couldn't get the role from the profile, check user_metadata
          let finalRole = userRole || 'student';
          const userMetaRole = session.user.user_metadata?.role;
          
          if (userMetaRole) {
            console.log('Found role in user_metadata:', userMetaRole);
            
            // If the role in metadata is different from the profile, update the profile
            if (userMetaRole !== finalRole) {
              console.log('Updating profile role to match user_metadata:', userMetaRole);
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: userMetaRole })
                .eq('id', session.user.id);
                
              if (!updateError) {
                console.log('Successfully updated profile role');
                finalRole = userMetaRole;
              } else {
                console.error('Failed to update profile role:', updateError);
              }
            }
          }
          
          console.log('Setting user role to:', finalRole);
          setRole(finalRole as 'student' | 'teacher');
        } else {
          console.log('No active session found');
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Then set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Fetch user role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          let userRole = profile?.role || 'student';
          // Compare with user_metadata.role
          const userMetaRole = session.user.user_metadata?.role;
          if (userMetaRole && userMetaRole !== userRole) {
            console.log('Syncing profile role to match user_metadata.role (auth state):', userMetaRole);
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: userMetaRole })
              .eq('id', session.user.id);
            if (!updateError) {
              userRole = userMetaRole;
            } else {
              console.error('Failed to sync profile role (auth state):', updateError);
            }
          }
          setRole(userRole);
        } else {
          setUser(null);
          setRole(null);
        }
      }
    );

    // Initial session check
    checkSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  const signIn = async (email: string, password: string) => {
    try {
      // 1. Sign in with email/password
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (signInError) {
        console.error('Sign in error:', signInError);
        return { error: signInError, role: null };
      }
  
      if (!authData?.user) {
        throw new Error('No user data returned from authentication');
      }
  
      const userId = authData.user.id;
      let userRole: 'student' | 'teacher' = 'student';
  
      try {
        // 2. Try to fetch the user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
  
        // 3. If profile exists, use its role
        if (profile) {
          userRole = (profile.role as 'student' | 'teacher') || 'student';
        } 
        // 4. If profile doesn't exist, create one
        else if (profileError?.code === 'PGRST116' || !profile) {
          console.log('Profile not found, creating new profile...');
          
          const userMeta = authData.user.user_metadata || {};
          const roleFromMeta = (userMeta.role as 'student' | 'teacher') || 'student';
          const nameFromMeta = userMeta.name || email.split('@')[0];
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ 
              id: userId,
              email: authData.user.email,
              role: roleFromMeta,
              name: nameFromMeta,
              created_at: new Date().toISOString()
            }])
            .select('role')
            .single();
            
          if (!createError && newProfile) {
            userRole = newProfile.role as 'student' | 'teacher';
          }
        }
  
        // 5. Update the user state
        setUser(authData.user);
        setRole(userRole);
        
        return { error: null, role: userRole };
  
      } catch (error) {
        console.error('Error handling profile:', error);
        // Even if profile handling fails, allow login with default role
        setUser(authData.user);
        setRole('student');
        return { error: null, role: 'student' as const };
      }
  
    } catch (error) {
      console.error('Authentication error:', error);
      return { 
        error: error instanceof Error ? error : new Error('An unknown error occurred'),
        role: null 
      };
    }
  };

  const signUp = async (email: string, password: string, role: 'student' | 'teacher', name?: string) => {
    console.log('Signing up with role:', role, 'and name:', name || 'not provided');
    
    const displayName = name?.trim() || email.split('@')[0];
    const cleanEmail = email.toLowerCase().trim();
    
    try {
      // Sign up the user with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: displayName,
            role: role
          },
          emailRedirectTo: `${window.location.origin}/dashboard?refresh=true`
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        return { 
          error: { 
            message: signUpError.message,
            status: signUpError.status || 400,
            code: signUpError.name
          }, 
          requiresConfirmation: false 
        };
      }

      if (!data.user) {
        console.error('No user data returned from signup');
        return { 
          error: { 
            message: 'No user data returned from signup',
            status: 500
          },
          requiresConfirmation: false 
        };
      }

      console.log('Auth signup successful, creating profile...');
      
      // Use the admin client to bypass RLS
      const adminSupabase = getAdminSupabase();
      
      try {
        // First, try to create or update the profile using the RPC function
        const { data: rpcResult, error: rpcError } = await adminSupabase.rpc(
          'create_or_update_profile',
          {
            p_user_id: data.user.id,
            p_email: cleanEmail,
            p_name: displayName,
            p_role: role
          }
        );
        
        if (rpcError) {
          console.error('RPC create_or_update_profile failed:', rpcError);
          
          // Fallback to direct upsert if RPC fails
          console.log('Falling back to direct upsert...');
          const { error: upsertError } = await adminSupabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: cleanEmail,
              name: displayName,
              role: role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (upsertError) {
            console.error('Fallback upsert also failed:', upsertError);
            throw upsertError;
          }
          console.log('Profile created successfully via fallback upsert');
        } else {
          console.log('Profile created/updated successfully via RPC:', rpcResult);
        }
        
        // Verify the profile was created
        const { data: profile, error: fetchError } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching profile after creation:', fetchError);
          throw fetchError;
        }
        
        console.log('Profile verified:', profile);
        
        // Update local state
        setUser(data.user);
        setRole(role);
        setError(null);
        
        return { 
          error: null, 
          requiresConfirmation: true, 
          user: data.user 
        };
      } catch (error) {
        console.error('Error in sign up process:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during sign up';
        setError({ 
          message: errorMessage,
          status: 500,
          details: errorMessage,
          hint: ''
        });
        return { 
          error: { 
            message: errorMessage,
            status: 500,
            details: errorMessage,
            hint: ''
          },
          requiresConfirmation: false 
        };
      }
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sign up';
      return { 
        error: { 
          message: errorMessage,
          status: 500,
          details: errorMessage,
          hint: ''
        },
        requiresConfirmation: false 
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setRole(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    role,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
