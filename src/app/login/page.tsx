'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  EyeIcon,
  EyeSlashIcon,
  AcademicCapIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  
  // Check for email confirmation success message in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('confirmation_success') === 'true') {
        setSuccess('Email confirmed successfully! You can now sign in.');
        // Remove the success message after 5 seconds
        const timer = setTimeout(() => setSuccess(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Reset form when toggling between login/signup
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    // Clear name field when switching to login
    if (mode === 'signup') {
      setName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        console.log('Login attempt:', { email, mode });
        const { error, role: userRole } = await signIn(email, password);
        console.log('Login response:', { error, userRole });
        
        if (error) throw error;
        
        console.log('Redirecting user with role:', userRole);
        router.push(userRole === 'teacher' ? '/dashboard/classroom' : '/dashboard');
      } else {
        console.log('Signup attempt:', { email, name, role, mode });
        const { error, requiresConfirmation } = await signUp(email, password, role, name);
        console.log('Signup response:', { error, requiresConfirmation });
        
        if (error) throw error;
        
        if (requiresConfirmation) {
          setSuccess(`A confirmation email has been sent to ${email}. Please check your inbox to verify your email address.`);
          // Reset form
          setEmail('');
          setPassword('');
          setName('');
          setMode('login');
          return;
        }
      }
    } catch (error: unknown) {
      console.error('Auth error:', error);
      if (error instanceof Error) {
        if (error.message.includes('security purposes')) {
          setError('Please wait a moment before trying again (rate limit)');
        } else if (error.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
          setMode('login');
        } else {
          setError(error.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'teacher':
        return '👨‍🏫';
      case 'student':
        return '🎓';
      default:
        return '👤';
    }
  };

  const passwordStrength = password.length >= 8 ? 'strong' : password.length >= 6 ? 'medium' : 'weak';
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'strong': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <AcademicCapIcon className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            RLS Guard Dog
          </h1>
          <p className="text-gray-600 font-medium mb-6">Education Platform</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'login' ? 'Welcome back!' : 'Join us today!'}
          </h2>
          <p className="text-gray-600">
            {mode === 'login' ? 'Sign in to your account to continue' : 'Create your account to get started'}
          </p>
          
          <div className="mt-4 flex justify-center">
            <button
              onClick={toggleMode}
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all duration-200"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top duration-300">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <form className="px-8 py-8 space-y-6" onSubmit={handleSubmit}>
            {/* Error and Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <XMarkIcon className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                <CheckIcon className="h-5 w-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}
            
            {/* Name Field (only for signup) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Email Field */}
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator (for signup) */}
              {mode === 'signup' && password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ 
                          width: passwordStrength === 'strong' ? '100%' : 
                                 passwordStrength === 'medium' ? '60%' : '30%' 
                        }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength === 'strong' ? 'text-green-600' :
                      passwordStrength === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {passwordStrength === 'strong' ? 'Strong' :
                       passwordStrength === 'medium' ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {password.length < 6 ? 'At least 6 characters required' : 
                     password.length < 8 ? 'Recommended: 8+ characters' : 
                     'Great password strength!'}
                  </p>
                </div>
              )}
            </div>

            {/* Role Selection (for signup) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      role === 'student'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-2xl">{getRoleIcon('student')}</span>
                      <span className="font-medium">Student</span>
                      {role === 'student' && (
                        <CheckIcon className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      role === 'teacher'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-2xl">{getRoleIcon('teacher')}</span>
                      <span className="font-medium">Teacher</span>
                      {role === 'teacher' && (
                        <CheckIcon className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform ${
                loading ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRightIcon className="h-4 w-4" />
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By {mode === 'signup' ? 'creating an account' : 'signing in'}, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}