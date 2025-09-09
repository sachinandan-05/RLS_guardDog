// lib/supabase/server.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/database.types";

// Create a type-safe Supabase client
type TypedSupabaseClient = ReturnType<typeof createServerComponentClient<Database>>;

// ✅ Always await cookies() in App Router
export const createClient = (): Promise<TypedSupabaseClient> => {
  const cookieStore = cookies();
  return Promise.resolve(createServerComponentClient<Database>({
    cookies: () => cookieStore,
  }));
};

export const getCurrentUser = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    return session?.user || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq('id', userId as string)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        // Ignore "no rows returned" error
        console.error("Error fetching user profile:", error);
      }
      return null;
    }

    return profile;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
};
