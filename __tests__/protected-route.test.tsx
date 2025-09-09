import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase/client';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the auth context
const mockUseRouter = useRouter as jest.Mock;

// Mock the auth state
const mockOnAuthStateChange = jest.fn();

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

describe('ProtectedRoute', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockImplementation(() => ({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    }));

    // Mock the auth state change
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      mockOnAuthStateChange(callback);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  });

  it('should redirect to login when user is not authenticated', async () => {
    // Mock unauthenticated state
    mockOnAuthStateChange.mockImplementationOnce((callback: any) => {
      callback('SIGNED_OUT', { session: null });
    });

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should render children when user is authenticated', async () => {
    // Mock authenticated state
    mockOnAuthStateChange.mockImplementationOnce((callback: any) => {
      callback('SIGNED_IN', {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
      });
    });

    // Mock the profile fetch
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
    });

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('should redirect to unauthorized when user does not have required role', async () => {
    // Mock authenticated state with student role
    mockOnAuthStateChange.mockImplementationOnce((callback: any) => {
      callback('SIGNED_IN', {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
      });
    });

    // Mock the profile fetch with student role
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
    });

    render(
      <AuthProvider>
        <ProtectedRoute allowedRoles={['teacher']}>
          <div>Teacher Only Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/unauthorized');
    });
  });
});
