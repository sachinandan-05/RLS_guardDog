export type UserRole = 'student' | 'teacher';

export interface Profile {
  id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  subject: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Classroom {
  id: string;
  student_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
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
  };
}
