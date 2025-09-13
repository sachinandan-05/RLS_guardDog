'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Database } from '@/types/database.types';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  UserGroupIcon,
  ChartBarIcon,
  AcademicCapIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

type Classroom = Database['public']['Tables']['classroom']['Row'];
type Progress = Database['public']['Tables']['progress']['Row'] & {
  user_email?: string;
};

export default function ClassroomPage() {
  const [classroom, setClassroom] = useState<Classroom[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'progress'>('students');

  useEffect(() => {
    fetchClassroom();
    fetchAllProgress();
  }, []);

  const fetchClassroom = async () => {
    try {
      const { data, error } = await supabase
        .from('classroom')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClassroom(data || []);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchAllProgress = async () => {
    try {
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select(`
          *,
          profiles:user_id ( email )
        `)
        .order('created_at', { ascending: false });

      if (progressError) throw progressError;

      const formattedData = progressData.map(item => ({
        ...item,
        user_email: typeof item.profiles === 'object' && item.profiles !== null ? (item.profiles as any).email : ''
      }));

      setProgress(formattedData);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent) return;

    try {
      const { error } = await supabase
        .from('classroom')
        .insert([{ student_name: newStudent, notes: newNote }]);

      if (error) throw error;

      await fetchClassroom();
      setNewStudent('');
      setNewNote('');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const startEditing = (item: Classroom) => {
    setEditingId(item.id);
    setEditNote(item.notes || '');
  };

  const saveNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('classroom')
        .update({ notes: editNote })
        .eq('id', id);

      if (error) throw error;

      await fetchClassroom();
      setEditingId(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await supabase
        .from('classroom')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchClassroom();
    } catch (error: any) {
      setError(error.message);
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

  const stats = {
    totalStudents: classroom.length,
    avgProgress: progress.length ? Math.round(progress.reduce((acc, p) => acc + p.percentage, 0) / progress.length) : 0,
    activeSubjects: [...new Set(progress.map(p => p.subject))].length
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
    <ProtectedRoute allowedRoles={['teacher']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  Classroom Management
                </h1>
                <p className="mt-2 text-gray-600">Manage your students and track their progress</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <AcademicCapIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeSubjects}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200 bg-white rounded-t-xl">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('students')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'students'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <UserGroupIcon className="h-5 w-5 inline mr-2" />
                  Student Management
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'progress'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ChartBarIcon className="h-5 w-5 inline mr-2" />
                  Progress Overview
                </button>
              </nav>
            </div>
          </div>

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Add Student Form */}
              <div className="xl:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <PlusIcon className="h-5 w-5 text-indigo-600" />
                      Add New Student
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">Register a new student in your classroom</p>
                  </div>
                  
                  <form onSubmit={handleAddStudent} className="p-6">
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 mb-2">
                          Student Name *
                        </label>
                        <input
                          type="text"
                          id="student-name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="Enter student's full name"
                          value={newStudent}
                          onChange={(e) => setNewStudent(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          id="notes"
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                          placeholder="Add any notes about the student..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                      </div>
                      
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <PlusIcon className="h-5 w-5" />
                        Add Student
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Students List */}
              <div className="xl:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-blue-600" />
                      Student Roster ({classroom.length})
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">Manage your classroom students</p>
                  </div>
                  
                  {classroom.length === 0 ? (
                    <div className="p-12 text-center">
                      <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No students yet</h3>
                      <p className="mt-2 text-sm text-gray-500">Get started by adding your first student to the classroom.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden">
                      {classroom.map((student, index) => (
                        <div key={student.id} className={`p-6 ${index !== classroom.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                  {student.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900">{student.student_name}</h4>
                                  <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <CalendarIcon className="h-4 w-4" />
                                    Added {new Date(student.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                {editingId === student.id ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                      value={editNote}
                                      onChange={(e) => setEditNote(e.target.value)}
                                      placeholder="Add notes..."
                                    />
                                    <button
                                      onClick={() => saveNote(student.id)}
                                      className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                    >
                                      <CheckIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="p-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors"
                                    >
                                      <XMarkIcon className="h-5 w-5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md flex-1">
                                      {student.notes || 'No notes added'}
                                    </p>
                                    <button
                                      onClick={() => startEditing(student)}
                                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => deleteStudent(student.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-green-600" />
                  Student Progress Overview
                </h3>
                <p className="mt-1 text-sm text-gray-600">Track learning progress across all subjects</p>
              </div>
              
              {progress.length === 0 ? (
                <div className="p-12 text-center">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No progress data yet</h3>
                  <p className="mt-2 text-sm text-gray-500">Progress data will appear here once students start completing activities.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {progress.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {(item.user_email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.user_email || 'Unknown User'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {item.subject}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-2.5 min-w-0 max-w-24">
                                <div 
                                  className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor(item.percentage)}`}
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getProgressBadge(item.percentage)}`}>
                                {item.percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {new Date(item.updated_at).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}