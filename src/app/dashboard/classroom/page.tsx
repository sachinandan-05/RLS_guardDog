'use client';

import { useEffect, useState, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Database } from '@/types/database.types';

type Profile = {
  email: string;
};
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

type Student = {
  id: string;
  student_name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
};

type Progress = {
  id: string;
  user_id: string;
  subject?: string;
  percentage?: number;
  created_at: string;
  updated_at: string;
  user_email?: string;
  notes?: string;
};

export default function ClassroomPage() {
  const { role } = useAuth();
  const isTeacher = role === 'teacher';
  const [classroom, setClassroom] = useState<Student[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'progress'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Progress editing state
  const [editingProgress, setEditingProgress] = useState<Progress | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    percentage: 0,
    notes: ''
  });

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
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const fetchAllProgress = async () => {
    try {
      // 1. Fetch all progress rows
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (progressError) throw progressError;

      // 2. Get all unique user_ids
      const userIds = Array.from(new Set((progressData || []).map(item => item.user_id)));
      // 3. Fetch all profiles for those user_ids
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        if (profilesError) throw profilesError;
        profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.id] = profile.email;
          return acc;
        }, {} as Record<string, string>);
      }

      // 4. Merge email into progress rows
      const formattedData = (progressData || []).map(item => ({
        ...item,
        user_email: profilesMap[item.user_id] || ''
      }));

      setProgress(formattedData);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent || !isTeacher) return; // Only teachers can add students

    try {
      const { error } = await supabase
        .from('classroom')
        .insert([{ student_name: newStudent, notes: newNote }]);

      if (error) throw error;

      await fetchClassroom();
      setNewStudent('');
      setNewNote('');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const startEditing = (item: Student | Progress) => {
    if (!isTeacher) return; // Only teachers can edit
    
    if ('student_name' in item) {
      // This is a Student
      setEditingId(item.id);
      setEditNote(item.notes || '');
    } else {
      // This is a Progress item
      setEditingId(item.id);
      setEditNote(item.notes || '');
      setEditingProgress(item);
      setFormData({
        subject: item.subject || '',
        percentage: item.percentage || 0,
        notes: item.notes || ''
      });
    }
  };

  const saveNote = async (id: string) => {
    if (!isTeacher) return; // Only teachers can save
    
    try {
      const isStudent = classroom.some(s => s.id === id);
      
      if (isStudent) {
        const { error } = await supabase
          .from('classroom')
          .update({ 
            notes: editNote,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (error) throw error;
        await fetchClassroom();
      } else {
        const { error } = await supabase
          .from('progress')
          .update({ 
            notes: editNote,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (error) throw error;
        await fetchAllProgress();
      }
      
      setEditingId(null);
      setEditingProgress(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  // Handle opening the edit progress modal
  const handleEditProgress = (progress: Progress) => {
    setEditingProgress(progress);
    setFormData({
      subject: progress.subject || '',
      percentage: progress.percentage || 0,
      notes: progress.notes || ''
    });
    setIsEditModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'percentage' ? Math.min(100, Math.max(0, Number(value))) : value
    }));
  };

  // Handle saving progress updates
  const handleSaveProgress = async () => {
    if (!editingProgress || !isTeacher) return; // Only teachers can save progress
    
    try {
      const updates = {
        subject: formData.subject,
        percentage: Number(formData.percentage),
        notes: formData.notes,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('progress')
        .update(updates)
        .eq('id', editingProgress.id);

      if (error) throw error;

      // Refresh the progress data
      await fetchAllProgress();
      setIsEditModalOpen(false);
      setEditingProgress(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update progress');
    }
  };

  // Close modal handler
  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditingProgress(null);
  };

  const deleteStudent = async (id: string) => {
    const isStudent = classroom.some(s => s.id === id);
    const message = isStudent 
      ? 'Are you sure you want to delete this student?'
      : 'Are you sure you want to delete this progress record?';
      
    if (!window.confirm(message)) return;

    try {
      if (isStudent) {
        const { error } = await supabase
          .from('classroom')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        await fetchClassroom();
      } else {
        const { error } = await supabase
          .from('progress')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        await fetchAllProgress();
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const getProgressColor = (percentage?: number) => {
    if (percentage === undefined) return 'bg-gray-200';
    if (percentage >= 90) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressBadge = (percentage?: number) => {
    if (percentage === undefined) return 'text-gray-700 bg-gray-100 border-gray-200';
    if (percentage >= 90) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (percentage >= 75) return 'text-green-700 bg-green-100 border-green-200';
    if (percentage >= 60) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    if (percentage >= 40) return 'text-orange-700 bg-orange-100 border-orange-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  // Group progress by student
  const progressByStudent = classroom.map(student => {
    const studentProgress = progress.filter(p => p.user_email === student.student_name);
    const avgProgress = studentProgress.length 
      ? Math.round(studentProgress.reduce((sum, p) => sum + (p.percentage || 0), 0) / studentProgress.length)
      : 0;
    
    return {
      ...student,
      progress: studentProgress,
      avgProgress,
      lastUpdated: studentProgress.length 
        ? new Date(Math.max(...studentProgress.map(p => new Date(p.updated_at).getTime())))
        : null
    };
  });

  // Sort students by name
  const sortedStudents = [...progressByStudent].sort((a, b) => 
    a.student_name.localeCompare(b.student_name)
  );

  // Group progress by subject
  const progressBySubject = progress.reduce((acc, p) => {
    if (!p.subject) return acc;
    if (!acc[p.subject]) {
      acc[p.subject] = [];
    }
    acc[p.subject].push(p);
    return acc;
  }, {} as Record<string, typeof progress>);

  const stats = {
    totalStudents: classroom.length,
    avgProgress: progress.length ? Math.round(progress.reduce((acc, p) => acc + (p.percentage || 0), 0) / progress.length) : 0,
    activeSubjects: Object.keys(progressBySubject).length,
    totalProgressRecords: progress.length
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

  // Progress edit modal
  const ProgressEditModal = () => (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Edit Progress
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 text-left">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="percentage" className="block text-sm font-medium text-gray-700 text-left">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    name="percentage"
                    id="percentage"
                    min="0"
                    max="100"
                    value={formData.percentage}
                    onChange={(e) => setFormData({...formData, percentage: parseInt(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 text-left">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              onClick={handleSaveProgress}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Progress edit modal component
  const EditProgressModal = () => (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Edit Progress
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 text-left">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="percentage" className="block text-sm font-medium text-gray-700 text-left">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    name="percentage"
                    id="percentage"
                    min="0"
                    max="100"
                    value={formData.percentage}
                    onChange={(e) => setFormData({...formData, percentage: parseInt(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              onClick={handleSaveProgress}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingProgress(null);
              }}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      {isEditModalOpen && <ProgressEditModal />}
      {isEditModalOpen && <ProgressEditModal />}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <UserGroupIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  Classroom Dashboard
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
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
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
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    activeTab === 'students'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Students
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    activeTab === 'progress'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Progress Overview
                </button>
              </nav>
            </div>
          </div>

          {/* Progress Tab */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                  Student Progress ({progress.length})
                </h2>
                <div className="mt-2">
                  <button
                    onClick={() => {
                      // Add logic to add to classroom
                      const studentEmail = prompt('Enter student email:');
                      if (studentEmail) {
                        // Call your API to add student to classroom
                        console.log('Adding student:', studentEmail);
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Add to Classroom
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading progress...</p>
                </div>
              ) : progress.length === 0 ? (
                <div className="p-12 text-center">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No progress records found</h3>
                  <p className="mt-2 text-sm text-gray-500">Start tracking progress to see data here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {progress.map((item) => (
                    <div key={item.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{item.subject}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {editingId === item.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => saveNote(item.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                title="Save"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-md transition-colors"
                                title="Cancel"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditing(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => deleteStudent(item.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(item.percentage)}`}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Students List */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                  Students ({classroom.length})
                </h2>
                {isTeacher && (
                  <form onSubmit={handleAddStudent} className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newStudent}
                      onChange={(e) => setNewStudent(e.target.value)}
                      placeholder="Student name"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Notes (optional)"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                      Add Student
                    </button>
                  </form>
                )}
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading students...</p>
                </div>
              ) : classroom.length === 0 ? (
                <div className="p-12 text-center">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No students found</h3>
                  <p className="mt-2 text-sm text-gray-500">Add students to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {classroom.map((student) => (
                    <div key={student.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {editingId === student.id ? (
                            <div className="flex flex-col space-y-2">
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Add notes about this student"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => saveNote(student.id)}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-lg font-medium text-gray-900">{student.student_name}</p>
                              {student.notes && (
                                <p className="mt-1 text-sm text-gray-600">{student.notes}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                Added on {new Date(student.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                        {isTeacher && (
                          <div className="ml-4 flex-shrink-0 flex space-x-2">
                            {editingId !== student.id && (
                              <>
                                <button
                                  onClick={() => startEditing(student)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => deleteStudent(student.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress Overview Tab */}
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
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                        {isTeacher && (
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {progress.length > 0 ? (
                        progress.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500">
                                  <span className="text-white font-medium text-sm">
                                    {(item.user_email || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.user_email || 'Unknown User'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(item.updated_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {item.subject || 'No Subject'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-32">
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${getProgressColor(item.percentage)}`}
                                      style={{ width: `${item.percentage || 0}%` }}
                                    />
                                  </div>
                                </div>
                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getProgressBadge(item.percentage)}`}>
                                  {item.percentage}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                <span>
                                  {new Date(item.updated_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </td>
                            {isTeacher && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleEditProgress(item)}
                                    className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50 transition-colors"
                                    title="Edit progress"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteStudent(item.id)}
                                    className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                    title="Delete progress"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isTeacher ? 5 : 4} className="px-6 py-8 text-center text-sm text-gray-500">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <ChartBarIcon className="h-12 w-12 text-gray-300" />
                              <p className="font-medium text-gray-500">No progress records found</p>
                              <p className="text-sm">Add progress to track student performance</p>
                            </div>
                          </td>
                        </tr>
                      )}
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