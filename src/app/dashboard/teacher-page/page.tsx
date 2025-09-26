"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Profile, Progress } from "@/types/database.types";
import { ChartBarIcon, UserIcon, PlusCircleIcon, CheckCircleIcon, XMarkIcon, UserPlusIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function TeacherDashboardPage() {
  type ProgressWithUser = Progress & {
    user_email: string;
  };

  const [progress, setProgress] = useState<ProgressWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<{id: string, name: string, description: string}[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<{[key: string]: string}>({});
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [students, setStudents] = useState<{id: string, email: string, name: string, isAdded: boolean}[]>([]);
  const [selectedClassroomForAdd, setSelectedClassroomForAdd] = useState('');
  const [isAddingStudents, setIsAddingStudents] = useState(false);
  
  // Classroom creation states
  const [showCreateClassroomModal, setShowCreateClassroomModal] = useState(false);
  const [newClassroom, setNewClassroom] = useState({
    name: '', // This will be mapped to student_name in the database
    description: '' // This will be mapped to notes in the database
  });
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);
  
  // Add student form states
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAllProgress();
    fetchClassrooms();
    loadExistingClassroomAssignments();
  }, []);

  useEffect(() => {
    // Fetch students when modal is opened or selected classroom changes
    if (showAddStudentsModal) {
      fetchStudents();
    }
  }, [showAddStudentsModal, selectedClassroomForAdd]);

  const loadExistingClassroomAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('classroom_students')
        .select('user_id, classroom_id');
      
      if (error) throw error;
      
      const assignments = data?.reduce((acc, item) => ({
        ...acc,
        [item.user_id]: item.classroom_id
      }), {}) || {};
      
      setSelectedClassroom(assignments);
    } catch (error) {
      console.error('Error loading classroom assignments:', error);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const { data, error } = await supabase
        .from('classroom')
        .select('id, student_name, notes')
        .order('student_name', { ascending: true });
      
      if (error) throw error;
      
      // Map the database fields to our expected format
      const formattedData = data.map(classroom => ({
        id: classroom.id,
        name: classroom.student_name,
        description: classroom.notes || ''
      }));
      
      setClassrooms(formattedData);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch classrooms');
    }
  };

  const fetchStudents = async () => {
    try {
      // Fetch all student profiles
      const { data: studentsData, error } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('role', 'student')
        .order('email', { ascending: true });

      if (error) throw error;

      // Get list of existing student IDs in the selected classroom (if any)
      const studentIds = studentsData?.map(s => s.id) || [];
      let existingStudents: Array<{ user_id: string, classroom_id: string }> = [];
      
      if (studentIds.length > 0) {
        const { data, error } = await supabase
          .from('classroom_students')
          .select('user_id, classroom_id')
          .in('user_id', studentIds);
          
        if (error) {
          console.error('Error fetching existing students:', error);
        } else {
          existingStudents = data || [];
        }
      }

      // Create a map of student IDs to their classroom assignments
      const studentClassroomMap = existingStudents.reduce((acc, item) => ({
        ...acc,
        [item.user_id]: item.classroom_id
      }), {} as Record<string, string>);

      // Format students data with isAdded flag (checks if they're in the selected classroom)
      const formattedStudents = studentsData?.map(student => ({
        id: student.id,
        email: student.email || '',
        name: student.name || `User ${student.id.substring(0, 6)}`,
        isAdded: selectedClassroomForAdd ? studentClassroomMap[student.id] === selectedClassroomForAdd : !!studentClassroomMap[student.id]
      })) || [];

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students. Please try again.');
    }
  };

  // Handle adding student by email (for form submission)
  const handleAddStudentByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim() || !selectedClassroomForAdd) {
      setError('Please enter an email and select a classroom');
      return;
    }

    setIsSubmitting(true);
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', studentEmail)
        .single();

      if (userError || !userData) {
        throw new Error('Student not found. Please check the email and try again.');
      }

      // Check if student is already in any classroom
      const { data: existingStudent, error: checkError } = await supabase
        .from('classroom_students')
        .select('id, classroom_id')
        .eq('user_id', userData.id)
        .single();

      if (existingStudent) {
        // Update existing classroom assignment
        const { error: updateError } = await supabase
          .from('classroom_students')
          .update({ classroom_id: selectedClassroomForAdd })
          .eq('user_id', userData.id);

        if (updateError) throw updateError;
      } else {
        // Add student to classroom_students table
        const { error: addError } = await supabase
          .from('classroom_students')
          .insert([{ 
            user_id: userData.id,
            classroom_id: selectedClassroomForAdd
          }]);

        if (addError) throw addError;
      }

      // Update local state
      setSelectedClassroom(prev => ({
        ...prev,
        [userData.id]: selectedClassroomForAdd
      }));

      // Refresh the student list and progress
      await fetchStudents();
      await fetchAllProgress();
      
      setStudentEmail('');
      setIsAddingStudent(false);
      setError(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred while adding the student');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle adding student to classroom (for existing students in modal)
  const handleAddToClassroom = async (userId: string, classroomId: string) => {
    try {
      if (!classroomId) return false;
      
      setError(null);
      setIsAddingStudents(true);
      
      // Check if the user is already in any classroom
      const { data: existing, error: checkError } = await supabase
        .from('classroom_students')
        .select('*')
        .eq('user_id', userId);

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw checkError;
      }

      let error = null;
      
      if (existing && existing.length > 0) {
        // Update existing classroom assignment
        const { error: updateError } = await supabase
          .from('classroom_students')
          .update({ classroom_id: classroomId })
          .eq('user_id', userId);
        error = updateError;
      } else {
        // Create new classroom assignment
        const { error: insertError } = await supabase
          .from('classroom_students')
          .insert([{ user_id: userId, classroom_id: classroomId }]);
        error = insertError;
      }

      if (error) throw error;
      
      // Update the UI to show the selected classroom
      setSelectedClassroom(prev => ({
        ...prev,
        [userId]: classroomId
      }));
      
      // Update the students list if modal is open
      if (showAddStudentsModal) {
        setStudents(prev => 
          prev.map(student => 
            student.id === userId 
              ? { ...student, isAdded: true } 
              : student
          )
        );
      }
      
      // Refresh progress data to show updated classroom assignments
      await fetchAllProgress();
      
      return true;
    } catch (error) {
      console.error('Error updating classroom:', error);
      setError(`Failed to add student to classroom: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsAddingStudents(false);
    }
  };

  // Handle dropdown change for classroom assignment
  const handleClassroomDropdownChange = async (userId: string, classroomId: string) => {
    if (!classroomId) {
      // Remove from classroom if empty value selected
      try {
        const { error } = await supabase
          .from('classroom_students')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;

        setSelectedClassroom(prev => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
      } catch (error) {
        console.error('Error removing from classroom:', error);
        setError('Failed to remove from classroom. Please try again.');
      }
      return;
    }

    await handleAddToClassroom(userId, classroomId);
  };

  const fetchAllProgress = async () => {
    try {
      setLoading(true);
      
      // Fetch all progress rows
      const { data: progressData, error: progressError } = await supabase
        .from("progress")
        .select('*')
        .order("created_at", { ascending: false });
        
      if (progressError) throw progressError;
      
      // Get all unique user IDs to fetch emails
      const userIds = Array.from(new Set((progressData || []).map(item => item.user_id)));
      
      // Fetch emails for all users
      let emailsMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
          
        if (profilesError) throw profilesError;
        
        emailsMap = (profilesData || []).reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile.email || ""
        }), {} as Record<string, string>);
      }

      // Format the data
      const formattedData: ProgressWithUser[] = (progressData || []).map(item => ({
        ...item,
        user_name: item.user_name || `User ${item.user_id.substring(0, 6)}`,
        user_email: emailsMap[item.user_id] || ""
      }));
      
      setProgress(formattedData);
    } catch (error: any) {
      setError(error.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle classroom creation
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassroom.name.trim()) {
      setError('Classroom name is required');
      return;
    }

    setIsCreatingClassroom(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('classroom')
        .insert([{ 
          student_name: newClassroom.name.trim(),
          notes: newClassroom.description.trim(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh the classrooms list
      await fetchClassrooms();
      
      // Reset form and close modal
      setNewClassroom({ name: '', description: '' });
      setShowCreateClassroomModal(false);
    } catch (error: any) {
      setError(error.message || 'Failed to create classroom');
    } finally {
      setIsCreatingClassroom(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                Teacher Dashboard
              </h1>
              <p className="mt-2 text-gray-600">View all students' progress and records</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateClassroomModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Classroom
              </button>
              <button
                onClick={() => setShowAddStudentsModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Students
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">!</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classroom</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : progress.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-black">No student progress records found.</td>
                  </tr>
                ) : (
                  progress.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-black">
                          <UserIcon className="h-5 w-5 text-indigo-400" />
                          <div>
                            <div className="font-medium">{item.user_name || `User ${item.user_id.substring(0, 6)}`}</div>
                            <div className="text-sm text-gray-500">{item.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-black">{item.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-black">{item.percentage}%</div>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-black">{new Date(item.updated_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-black">
                        <div className="flex items-center space-x-2">
                          <select
                            value={selectedClassroom[item.user_id] || ''}
                            onChange={(e) => handleClassroomDropdownChange(item.user_id, e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            <option value="">Select Classroom</option>
                            {classrooms.map((classroom) => (
                              <option key={classroom.id} value={classroom.id} className="text-black">
                                {classroom.name}
                              </option>
                            ))}
                          </select>
                          {selectedClassroom[item.user_id] && (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          )}
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

      {/* Add Students Modal */}
      {/* Create Classroom Modal */}
      {showCreateClassroomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Create New Classroom</h2>
              <button
                onClick={() => {
                  setShowCreateClassroomModal(false);
                  setNewClassroom({ name: '', description: '' });
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-500"
                disabled={isCreatingClassroom}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="p-6 space-y-4">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <XMarkIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="classroom-name" className="block text-sm font-medium text-gray-700">
                  Classroom Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="classroom-name"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-black"
                  placeholder="e.g., Math 101"
                  required
                  disabled={isCreatingClassroom}
                />
              </div>

              <div>
                <label htmlFor="classroom-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="classroom-description"
                  rows={3}
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-black"
                  placeholder="Optional: Add a description for this classroom"
                  disabled={isCreatingClassroom}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateClassroomModal(false);
                    setNewClassroom({ name: '', description: '' });
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={isCreatingClassroom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={isCreatingClassroom || !newClassroom.name.trim()}
                >
                  {isCreatingClassroom ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {showAddStudentsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Add Students to Classroom</h2>
              <button
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setIsAddingStudent(false);
                  setStudentEmail('');
                  setSelectedClassroomForAdd('');
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <label htmlFor="classroom-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Classroom
                </label>
                <select
                  id="classroom-select"
                  value={selectedClassroomForAdd}
                  onChange={(e) => setSelectedClassroomForAdd(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                >
                  <option value="">Select a classroom</option>
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Student by Email Form */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Add Student by Email</h3>
                {!isAddingStudent ? (
                  <button
                    onClick={() => setIsAddingStudent(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PlusCircleIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    Add by Email
                  </button>
                ) : (
                  <form onSubmit={handleAddStudentByEmail} className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="Enter student email"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedClassroomForAdd}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingStudent(false);
                        setStudentEmail('');
                        setError(null);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              {/* Existing Students List */}
              <div className="overflow-y-auto max-h-[40vh] border border-gray-200 rounded-md">
                {students.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No students found.</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {student.isAdded ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Added
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  if (!selectedClassroomForAdd) {
                                    setError('Please select a classroom first');
                                    return;
                                  }
                                  setIsAddingStudents(true);
                                  const success = await handleAddToClassroom(student.id, selectedClassroomForAdd);
                                  if (success) {
                                    // Update the specific student in the list
                                    setStudents(prev => 
                                      prev.map(s => 
                                        s.id === student.id 
                                          ? { ...s, isAdded: true } 
                                          : s
                                      )
                                    );
                                    
                                    // Show success message temporarily
                                    const originalError = error;
                                    setError(null);
                                    setTimeout(() => {
                                      setError(originalError);
                                    }, 100);
                                  }
                                }}
                                disabled={isAddingStudents || !selectedClassroomForAdd}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isAddingStudents ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <PlusCircleIcon className="h-4 w-4 mr-1" />
                                    Add to Class
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setIsAddingStudent(false);
                  setStudentEmail('');
                  setSelectedClassroomForAdd('');
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}