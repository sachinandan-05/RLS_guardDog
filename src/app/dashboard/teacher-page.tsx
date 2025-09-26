"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Profile, Progress } from "@/types/database.types";
import { 
  ChartBarIcon, 
  UserIcon, 
  AcademicCapIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export default function TeacherDashboardPage() {
  const [progress, setProgress] = useState<(Progress & { user_email?: string })[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  
  // State for new classroom form
  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [newClassroom, setNewClassroom] = useState({
    classroom_name: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllProgress();
    fetchAllStudents();
  }, []);

  
  // Handle adding a new classroom
  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassroom.classroom_name.trim()) {
      setSubmitError('Classroom name is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data, error } = await supabase
        .from('classroom')
        .insert([{
          classroom_name: newClassroom.classroom_name.trim(),
          notes: newClassroom.notes.trim()
        }])
        .select()
        .single();

      if (error) throw error;

      // Reset form and close modal
      setNewClassroom({ classroom_name: '', notes: '' });
      setShowAddClassroom(false);
      // Refresh the data
      fetchAllStudents();
      
    } catch (error) {
      console.error('Error adding classroom:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to add classroom');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch all students (profiles with role 'student')
  const fetchAllStudents = async () => {
    try {
      setStudentsLoading(true);
      setStudentsError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, created_at, updated_at')
        .eq('role', 'student')
        .order('email', { ascending: true });

      if (error) throw error;
      
      // Type assertion is safe here because we're selecting all required fields
      setStudents(data as Profile[]);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudentsError(error instanceof Error ? error.message : 'Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const fetchAllProgress = async () => {
    try {
      // 1. Fetch all progress rows
      const { data: progressData, error: progressQueryError } = await supabase
        .from("progress")
        .select("*")
        .order("created_at", { ascending: false });
      if (progressQueryError) throw progressQueryError;
      // 2. Get all unique user_ids
      const userIds = Array.from(new Set((progressData || []).map(item => item.user_id)));
      // 3. Fetch all profiles for those user_ids
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.id] = profile.email;
          return acc;
        }, {} as Record<string, string>);
      }
      // 4. Merge email into progress rows
      const formattedData = (progressData || []).map(item => ({
        ...item,
        user_email: profilesMap[item.user_id] || ""
      }));
      setProgress(formattedData);
    } catch (error: any) {
      setError(error.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    if (percentage >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return "bg-gradient-to-r from-emerald-500 to-green-500";
    if (percentage >= 60) return "bg-gradient-to-r from-amber-500 to-yellow-500";
    if (percentage >= 40) return "bg-gradient-to-r from-orange-500 to-amber-500";
    return "bg-gradient-to-r from-red-500 to-rose-500";
  };

  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23e0e7ff%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
        
        <div className="relative px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Students List */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-blue-600" />
            All Students
          </h2>
          {studentsLoading ? (
            <div className="text-gray-500">Loading students...</div>
          ) : studentsError ? (
            <div className="text-red-500">{studentsError}</div>
          ) : students.length === 0 ? (
            <div className="text-gray-500">No students found.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {students.map((student) => (
                <li key={student.id} className="py-2 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-black">{student.email}</span>
                  <span className="ml-2 text-xs text-black bg-blue-50 rounded px-2 py-0.5">{student.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
          {/* Header Section */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <ChartBarIcon className="h-10 w-10 text-white" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-4">
              <h1 className="text-4xl font-bold text-gray-900">
                Teacher Dashboard
              </h1>
              <button
                onClick={() => setShowAddClassroom(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5" />
                Add Student to Classroom
              </button>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Monitor and track all your students' learning progress across different subjects
            </p>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 font-medium">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {Array.from(new Set(progress.map(p => p.user_email))).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-black font-medium">Subjects</p>
                    <p className="text-3xl font-bold text-black">
                      {Array.from(new Set(progress.map(p => p.subject))).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <AcademicCapIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Avg Progress</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {progress.length > 0 ? Math.round(progress.reduce((sum, p) => sum + p.percentage, 0) / progress.length) : 0}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error occurred</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Table */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm bg-white/95">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-indigo-600" />
                Student Progress Overview
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-16">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                            <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-r-purple-600 animate-spin animation-delay-75"></div>
                          </div>
                          <p className="text-gray-500 font-medium">Loading student progress...</p>
                        </div>
                      </td>
                    </tr>
                  ) : progress.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-16">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                            <ChartBarIcon className="h-10 w-10 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-900 mb-1">No Progress Records</p>
                            <p className="text-gray-500">Student progress data will appear here once available.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    progress.map((item, idx) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                              <UserIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-black group-hover:text-indigo-600 transition-colors">
                                {item.user_email || item.user_id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <AcademicCapIcon className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{item.subject}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getProgressColor(item.percentage)}`}>
                                {item.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-2 rounded-full transition-all duration-1000 ease-out ${getProgressBarColor(item.percentage)}`}
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <ClockIcon className="h-4 w-4" />
                            <span>{new Date(item.updated_at).toLocaleString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      
      {showAddClassroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Classroom</h2>
              <button 
                onClick={() => setShowAddClassroom(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            
            <form onSubmit={(e) => handleAddClassroom(e)} className="space-y-4">
              <div>
                <label htmlFor="classroom_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom Name *
                </label>
                <input
                  type="text"
                  id="classroom_name"
                  value={newClassroom.classroom_name}
                  onChange={(e) => setNewClassroom({...newClassroom, classroom_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter classroom name"
                  required
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={newClassroom.notes}
                  onChange={(e) => setNewClassroom({...newClassroom, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add any notes about this classroom"
                />
              </div>
              {submitError && (
                <div className="text-red-500 text-sm">{submitError}</div>
              )}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassroom(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  disabled={isSubmitting || !newClassroom.classroom_name.trim()}
                >
                  {isSubmitting ? 'Adding...' : 'Add Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  </ProtectedRoute>
  );
}
