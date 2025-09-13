
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/database.types";
import { supabase } from "./client";

export const getCurrentUser = async () => {
  try {
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
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user profile:", error);
    }

    return profile ?? null;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
};
