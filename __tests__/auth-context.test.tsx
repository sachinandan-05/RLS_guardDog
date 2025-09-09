import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';

// Test component that uses the auth context
const TestComponent = () => {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-email">{user?.email}</div>
      <div data-testid="user-role">{role}</div>
    </div>
  );
};

describe('AuthContext', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should provide auth context to children', async () => {
    // Mock the auth state change
    const mockOnAuthStateChange = jest.fn((callback) => {
      callback('SIGNED_IN', {
        session: {
          user: mockUser,
        },
      });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    // Mock the profile fetch
    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({
      data: { role: 'student' },
      error: null,
    });

    // @ts-ignore
    supabase.auth.onAuthStateChange = mockOnAuthStateChange;
    // @ts-ignore
    supabase.from = mockFrom;
    // @ts-ignore
    mockFrom.mockReturnValue({ select: mockSelect });
    // @ts-ignore
    mockSelect.mockReturnValue({ eq: mockEq });
    // @ts-ignore
    mockEq.mockReturnValue({ single: mockEq });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Check if the component renders with the user data
    await waitFor(() => {
      const emailElement = screen.getByTestId('user-email');
      const roleElement = screen.getByTestId('user-role');
      
      expect(emailElement.textContent).toBe('test@example.com');
      expect(roleElement.textContent).toBe('student');
    });
  });

  it('should handle sign in', async () => {
    const mockSignInWithPassword = jest.fn().mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });
    // @ts-ignore
    supabase.auth.signInWithPassword = mockSignInWithPassword;

    let authContext: any;
    const TestSignIn = () => {
      authContext = useAuth();
      return null;
    };

    render(
      <AuthProvider>
        <TestSignIn />
      </AuthProvider>
    );

    await act(async () => {
      await authContext.signIn('test@example.com', 'password');
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle sign up', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });
    // @ts-ignore
    supabase.auth.signUp = mockSignUp;

    // Mock the profile update
    const mockUpdate = jest.fn().mockResolvedValue({ error: null });
    // @ts-ignore
    supabase.from = jest.fn().mockReturnValue({ update: mockUpdate });

    let authContext: any;
    const TestSignUp = () => {
      authContext = useAuth();
      return null;
    };

    render(
      <AuthProvider>
        <TestSignUp />
      </AuthProvider>
    );

    await act(async () => {
      await authContext.signUp('test@example.com', 'password', 'student');
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        data: {
          role: 'student',
        },
      },
    });
  });
});
