'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Database } from '@/types/database.types';
import { 
  PlusIcon,
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  BookOpenIcon,
  XMarkIcon,
  StarIcon
} from '@heroicons/react/24/outline';

type Progress = Database['public']['Tables']['progress']['Row'];

export default function DashboardPage() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newPercentage, setNewPercentage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProgress(data || []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newPercentage) return;

    try {
      const { error } = await supabase
        .from('progress')
        .insert([
          { 
            subject: newSubject, 
            percentage: parseInt(newPercentage),
            user_id: user?.id
          },
        ]);

      if (error) throw error;

      await fetchProgress();
      setNewSubject('');
      setNewPercentage('');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressBadge = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (percentage >= 75) return 'text-green-700 bg-green-100 border-green-200';
    if (percentage >= 60) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    if (percentage >= 40) return 'text-orange-700 bg-orange-100 border-orange-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { label: 'Excellent', icon: '🏆' };
    if (percentage >= 75) return { label: 'Good', icon: '⭐' };
    if (percentage >= 60) return { label: 'Average', icon: '📚' };
    if (percentage >= 40) return { label: 'Needs Work', icon: '📖' };
    return { label: 'Beginner', icon: '🌱' };
  };

  const stats = {
    totalSubjects: progress.length,
    avgProgress: progress.length ? Math.round(progress.reduce((acc, p) => acc + p.percentage, 0) / progress.length) : 0,
    topSubject: progress.length ? progress.reduce((prev, current) => (prev.percentage > current.percentage) ? prev : current) : null,
    completedSubjects: progress.filter(p => p.percentage >= 90).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  My Learning Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                  Welcome back, {user?.email?.split('@')[0]}! Track your progress and achievements.
                </p>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XMarkIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpenIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrophyIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedSubjects}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <StarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Top Subject</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {stats.topSubject ? stats.topSubject.subject : 'None'}
                  </p>
                  {stats.topSubject && (
                    <p className="text-xs text-gray-500">{stats.topSubject.percentage}%</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Progress Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <PlusIcon className="h-5 w-5 text-indigo-600" />
                    Add Progress
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">Record your learning progress</p>
                </div>
                
                <form onSubmit={handleAddProgress} className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="e.g., Mathematics, Physics, English"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="percentage" className="block text-sm font-medium text-gray-700 mb-2">
                        Progress Percentage *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="percentage"
                          min="0"
                          max="100"
                          className="w-full px-4 py-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="0-100"
                          value={newPercentage}
                          onChange={(e) => setNewPercentage(e.target.value)}
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                      {newPercentage && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(parseInt(newPercentage))}` }
                                style={{ width: `${newPercentage}%`  }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {getPerformanceLevel(parseInt(newPercentage)).icon}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {getPerformanceLevel(parseInt(newPercentage)).label}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add Progress Entry
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Progress List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 text-blue-600" />
                    My Progress ({progress.length})
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">Your learning journey across subjects</p>
                </div>
                
                {progress.length === 0 ? (
                  <div className="p-12 text-center">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No progress yet</h3>
                    <p className="mt-2 text-sm text-gray-500">Start tracking your learning progress by adding your first subject.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    {progress.map((item, index) => {
                      const performance = getPerformanceLevel(item.percentage);
                      return (
                        <div key={item.id} className={`p-6 ${index !== progress.length - 1 ? 'border-b border-gray-100' : ''}` }>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                                {item.subject.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">{item.subject}</h4>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  Updated {new Date(item.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{performance.icon}</span>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getProgressBadge(item.percentage)}` }>
                                  {item.percentage}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">{performance.label}</p>
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(item.percentage)}` }
                              style={{ width: `${item.percentage}%` 
 }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          {progress.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-600" />
                  Achievements & Milestones
                </h3>
                <p className="mt-1 text-sm text-gray-600">Celebrate your learning achievements</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.completedSubjects > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-2xl">🏆</div>
                      <div>
                        <p className="font-semibold text-green-800">Subject Master</p>
                        <p className="text-sm text-green-600">{stats.completedSubjects} subjects completed (90%+)</p>
                      </div>
                    </div>
                  )}
                  
                  {stats.avgProgress >= 75 && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-2xl">⭐</div>
                      <div>
                        <p className="font-semibold text-blue-800">High Achiever</p>
                        <p className="text-sm text-blue-600">Average progress above 75%</p>
                      </div>
                    </div>
                  )}
                  
                  {progress.length >= 5 && (
                    <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="text-2xl">🎯</div>
                      <div>
                        <p className="font-semibold text-purple-800">Dedicated Learner</p>
                        <p className="text-sm text-purple-600">Tracking {progress.length}+ subjects</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}