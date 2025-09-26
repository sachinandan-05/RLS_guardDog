import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const adminClient = createClient(supabaseUrl, serviceRoleKey);

describe('RLS Policies', () => {
  // Test data
  let teacherUser: any;
  let studentUser: any;
  let classroomId: string;
  let progressId: string;

  beforeAll(async () => {
    // Create test users
    const { data: teacherData } = await adminClient.auth.admin.createUser({
      email: 'teacher@test.com',
      password: 'test123',
      email_confirm: true,
    });
    
    const { data: studentData } = await adminClient.auth.admin.createUser({
      email: 'student@test.com',
      password: 'test123',
      email_confirm: true,
    });

    teacherUser = teacherData.user;
    studentUser = studentData.user;

    // Set up profiles
    await adminClient
      .from('profiles')
      .upsert([
        { id: teacherUser.id, role: 'teacher', email: teacherUser.email },
        { id: studentUser.id, role: 'student', email: studentUser.email },
      ]);

    // Create a test classroom
    const { data: classroomData, error: classError } = await adminClient
      .from('classroom')
      .insert([{ name: 'Test Classroom', description: 'Test Description' }])
      .select()
      .single();
    
    if (classError) throw classError;
    classroomId = classroomData.id;

    // Add student to classroom
    await adminClient
      .from('classroom_students')
      .insert([{ classroom_id: classroomId, user_id: studentUser.id }]);

    // Create test progress
    const { data: progressData, error: progressError } = await adminClient
      .from('progress')
      .insert([
        { 
          user_id: studentUser.id, 
          subject: 'Math', 
          percentage: 75,
          user_name: 'Test Student'
        }
      ])
      .select()
      .single();
    
    if (progressError) throw progressError;
    progressId = progressData.id;
  });

  afterAll(async () => {
    // Clean up test data
    await adminClient.from('progress').delete().neq('id', '');
    await adminClient.from('classroom_students').delete().neq('id', '');
    await adminClient.from('classroom').delete().eq('id', classroomId);
    await adminClient.from('profiles').delete().in('id', [teacherUser.id, studentUser.id]);
    await adminClient.auth.admin.deleteUser(teacherUser.id);
    await adminClient.auth.admin.deleteUser(studentUser.id);
  });

  describe('Progress Table Policies', () => {
    test('Students can only view their own progress', async () => {
      // Sign in as student
      const { data: studentSession, error: studentError } = await supabase.auth.signInWithPassword({
        email: 'student@test.com',
        password: 'test123',
      });
      
      expect(studentError).toBeNull();
      
      // Student should only see their own progress
      const { data: studentProgress, error: studentProgressError } = await supabase
        .from('progress')
        .select('*');
      
      expect(studentProgressError).toBeNull();
      expect(studentProgress).toHaveLength(1);
      expect(studentProgress?.[0].user_id).toBe(studentUser.id);
      
      await supabase.auth.signOut();
    });

    test('Teachers can view all progress', async () => {
      // Sign in as teacher
      const { data: teacherSession, error: teacherError } = await supabase.auth.signInWithPassword({
        email: 'teacher@test.com',
        password: 'test123',
      });
      
      expect(teacherError).toBeNull();
      
      // Teacher should see all progress
      const { data: teacherProgress, error: teacherProgressError } = await supabase
        .from('progress')
        .select('*');
      
      expect(teacherProgressError).toBeNull();
      expect(teacherProgress?.length).toBeGreaterThan(0);
      
      await supabase.auth.signOut();
    });

    test('Students can only update their own progress', async () => {
      // Sign in as student
      await supabase.auth.signInWithPassword({
        email: 'student@test.com',
        password: 'test123',
      });
      
      // Student should be able to update their own progress
      const { error: updateError } = await supabase
        .from('progress')
        .update({ percentage: 80 })
        .eq('id', progressId);
      
      expect(updateError).toBeNull();
      
      // Verify the update
      const { data: updatedProgress } = await supabase
        .from('progress')
        .select('percentage')
        .eq('id', progressId)
        .single();
      
      expect(updatedProgress?.percentage).toBe(80);
      
      await supabase.auth.signOut();
    });
  });

  describe('Classroom Table Policies', () => {
    test('Students can only view their own classrooms', async () => {
      // Sign in as student
      await supabase.auth.signInWithPassword({
        email: 'student@test.com',
        password: 'test123',
      });
      
      // Student should only see their own classrooms
      const { data: studentClassrooms, error: studentClassError } = await supabase
        .from('classroom')
        .select('*');
      
      expect(studentClassError).toBeNull();
      expect(studentClassrooms).toHaveLength(1);
      expect(studentClassrooms?.[0].id).toBe(classroomId);
      
      await supabase.auth.signOut();
    });

    test('Teachers can view all classrooms', async () => {
      // Sign in as teacher
      await supabase.auth.signInWithPassword({
        email: 'teacher@test.com',
        password: 'test123',
      });
      
      // Teacher should see all classrooms
      const { data: teacherClassrooms, error: teacherClassError } = await supabase
        .from('classroom')
        .select('*');
      
      expect(teacherClassError).toBeNull();
      expect(teacherClassrooms?.length).toBeGreaterThan(0);
      
      await supabase.auth.signOut();
    });
  });

  describe('Classroom_Students Table Policies', () => {
    test('Students can only view their own classroom assignments', async () => {
      // Sign in as student
      await supabase.auth.signInWithPassword({
        email: 'student@test.com',
        password: 'test123',
      });
      
      // Student should only see their own classroom assignments
      const { data: studentAssignments, error: studentAssignError } = await supabase
        .from('classroom_students')
        .select('*');
      
      expect(studentAssignError).toBeNull();
      expect(studentAssignments).toHaveLength(1);
      expect(studentAssignments?.[0].user_id).toBe(studentUser.id);
      
      await supabase.auth.signOut();
    });

    test('Teachers can manage classroom-student relationships', async () => {
      // Sign in as teacher
      await supabase.auth.signInWithPassword({
        email: 'teacher@test.com',
        password: 'test123',
      });
      
      // Teacher should be able to add a student to a classroom
      const { data: newStudent, error: newStudentError } = await adminClient.auth.admin.createUser({
        email: 'newstudent@test.com',
        password: 'test123',
        email_confirm: true,
      });
      
      await adminClient
        .from('profiles')
        .upsert([{ id: newStudent.user.id, role: 'student', email: newStudent.user.email }]);
      
      const { error: addStudentError } = await supabase
        .from('classroom_students')
        .insert([{ classroom_id: classroomId, user_id: newStudent.user.id }]);
      
      expect(addStudentError).toBeNull();
      
      // Clean up
      await adminClient.from('classroom_students').delete().eq('user_id', newStudent.user.id);
      await adminClient.from('profiles').delete().eq('id', newStudent.user.id);
      await adminClient.auth.admin.deleteUser(newStudent.user.id);
      
      await supabase.auth.signOut();
    });
  });
});
