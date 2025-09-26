'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'teacher')[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  // Get current path (client only)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevent running on server
    if (loading) return;
    // If user is not logged in, redirect to login
    if (!user && currentPath !== '/login') {
      router.replace('/login');
      return;
    }
    // If role is required but user doesn't have a role yet, wait
    if (allowedRoles && !role) {
      return;
    }
    // If role is required but user doesn't have the required role, redirect to dashboard
    if (allowedRoles && role && !allowedRoles.includes(role) && currentPath !== '/dashboard') {
      router.replace('/dashboard');
    }
  }, [user, role, loading, allowedRoles, router, currentPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Avoid rendering null on SSR, show a fallback if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Not Authenticated</h1>
          <p className="mt-2 text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  // If role is required but user doesn't have the required role, show unauthorized
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Unauthorized</h1>
          <p className="mt-2 text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
