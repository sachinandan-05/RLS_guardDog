export type UserRole = 'student' | 'teacher';

export type Profile = {
  id: string;
  email?: string;  // Added optional email field since it's commonly needed
  name?: string;   // Added optional name field
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Progress = {
  id: string;
  user_id: string;
  user_name?: string;  // Added user_name field
  subject: string;
  percentage: number;
  created_at: string;
  updated_at: string;
};

export type Classroom = {
  id: string;
  student_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      progress: {
        Row: Progress;
        Insert: Omit<Progress, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Progress, 'id' | 'created_at'>>;
      };
      classroom: {
        Row: Classroom;
        Insert: Omit<Classroom, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Classroom, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
