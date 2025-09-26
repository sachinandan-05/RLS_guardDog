import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from './setup';

describe('RLS Policies', () => {
  let student1Token: string;
  let student2Token: string;
  let teacherToken: string;
  let student1Id: string;
  let student2Id: string;
  let teacherId: string;

  // Helper function to create a test user
  const createUser = async (email: string, password: string, role: 'student' | 'teacher') => {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) throw signUpError;

    // Wait for the profile to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the profile with the role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
        .eq('id', authData.user?.id);

    if (updateError) throw updateError;

    return authData.user;
  };

  beforeAll(async () => {
    // Create test users
    const student1 = await createUser('student1@test.com', 'password123', 'student');
    const student2 = await createUser('student2@test.com', 'password123', 'student');
    const teacher = await createUser('teacher@test.com', 'password123', 'teacher');

    student1Id = student1?.id || '';
    student2Id = student2?.id || '';
    teacherId = teacher?.id || '';

    // Get auth tokens
    const { data: student1Data } = await supabase.auth.signInWithPassword({
      email: 'student1@test.com',
      password: 'password123',
    });
    student1Token = student1Data.session?.access_token || '';

    const { data: student2Data } = await supabase.auth.signInWithPassword({
      email: 'student2@test.com',
      password: 'password123',
    });
    student2Token = student2Data.session?.access_token || '';

    const { data: teacherData } = await supabase.auth.signInWithPassword({
      email: 'teacher@test.com',
      password: 'password123',
    });
    teacherToken = teacherData.session?.access_token || '';
  });

  describe('Progress Table', () => {
    test('Students can only see their own progress', async () => {
      // Set up clients with correct tokens
      await supabase.auth.setSession({
        access_token: teacherToken,
        refresh_token: ''
      });

      // Insert test data as teacher (who has permission)
      await supabase
        .from('progress')
        .insert([
          { user_id: student1Id, subject: 'Math', percentage: 80 },
          { user_id: student2Id, subject: 'Math', percentage: 90 },
        ]);

      // Switch to student1's token
      await supabase.auth.setSession({
        access_token: student1Token,
        refresh_token: ''
      });

      // Test student1 can only see their own progress
      const { data: student1Data } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', student1Id);
      
      expect(student1Data).toHaveLength(1);
      expect(student1Data?.[0].user_id).toBe(student1Id);
    });

    test('Teachers can see all progress', async () => {
      // Set teacher token
      await supabase.auth.setSession({
        access_token: teacherToken,
        refresh_token: ''
      });

      const { data } = await supabase
        .from('progress')
        .select('*');
      
      expect(data?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Classroom Table', () => {
    test('Students cannot access classroom data', async () => {
      // Set student token
      await supabase.auth.setSession({
        access_token: student1Token,
        refresh_token: ''
      });

      const { data, error } = await supabase
        .from('classroom')
        .select('*');
      
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501'); // Permission denied
    });

    test('Teachers can access and modify classroom data', async () => {
      // Set teacher token
      await supabase.auth.setSession({
        access_token: teacherToken,
        refresh_token: ''
      });

      const { data: insertData, error: insertError } = await supabase
        .from('classroom')
        .insert([
          { student_name: 'Test Student', notes: 'Test Notes' },
        ]);
      
      expect(insertError).toBeNull();

      const { data: selectData, error: selectError } = await supabase
        .from('classroom')
        .select('*');
      
      expect(selectError).toBeNull();
      expect(selectData?.length).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.auth.signOut();
  });
});
