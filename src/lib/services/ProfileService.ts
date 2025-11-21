import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { ProfileDTO } from "@/types";

export interface ProfileWithEmail extends ProfileDTO {
  email: string;
}

export interface ProfileListResponse {
  items: ProfileWithEmail[];
}

/**
 * Service for managing user profile operations.
 * Handles business logic and database interactions for profile updates.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ProfileService {
  /**
   * Gets a single user profile with email.
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID whose profile to fetch
   * @returns Profile with email
   * @throws Error if profile not found or database operation fails
   */
  static async getWithEmail(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileWithEmail> {
    // Get user email using RPC function
    const { data: email, error: authError } = await supabase.rpc("get_user_email", { user_uuid: userId });

    if (authError || !email) {
      throw new Error("UNAUTHORIZED");
    }

    // Get profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        throw new Error("PROFILE_NOT_FOUND");
      }
      throw new Error(`Database error: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    // Map to DTO with email
    return {
      userId: profile.user_id,
      role: profile.role,
      propertyId: profile.property_id,
      displayName: profile.display_name,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      email: email ?? "",
    };
  }

  /**
   * Lists all user profiles with their emails.
   * Available only for admins.
   *
   * @param supabase - Supabase client instance
   * @returns List of profiles with emails
   * @throws Error if database operation fails
   */
  static async list(supabase: SupabaseClient<Database>): Promise<ProfileListResponse> {
    const { data, error } = await supabase.rpc("list_profiles_with_emails");

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const profiles = data ?? [];

    const items: ProfileWithEmail[] = profiles.map((row) => ({
      userId: row.user_id,
      role: row.role,
      propertyId: row.property_id ?? null,
      displayName: row.display_name ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      email: row.email,
    }));

    return { items };
  }
  /**
   * Updates the email for a user.
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID whose email to update
   * @param email - New email address
   * @returns Updated profile with new email
   * @throws Error if update fails or user not found
   */
  static async updateEmail(
    supabase: SupabaseClient<Database>,
    userId: string,
    email: string
  ): Promise<ProfileWithEmail> {
    // Update email in auth.users table directly
    const { data: authData, error: authError } = await supabase
      .from("auth.users" as unknown as "profiles")
      .update({ email: email } as Record<string, unknown>)
      .eq("id", userId)
      .select("id, email")
      .single();

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!authData) {
      throw new Error("UNAUTHORIZED");
    }

    // Get profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        throw new Error("PROFILE_NOT_FOUND");
      }
      throw new Error(`Database error: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    // Return profile with updated email
    return {
      userId: profile.user_id,
      role: profile.role,
      propertyId: profile.property_id,
      displayName: profile.display_name,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      email: authData.email ?? email,
    };
  }
}
