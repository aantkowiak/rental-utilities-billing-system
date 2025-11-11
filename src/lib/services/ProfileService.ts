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
export class ProfileService {
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
      propertyId: row.property_id,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      email: row.email,
    }));

    return { items };
  }
  /**
   * Updates the display name for a user's profile.
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID whose profile to update
   * @param displayName - New display name (optional, undefined means no update)
   * @returns Updated profile as ProfileDTO
   * @throws Error if profile not found or database operation fails
   */
  static async updateDisplayName(
    supabase: SupabaseClient<Database>,
    userId: string,
    displayName?: string
  ): Promise<ProfileDTO> {
    // Build update object only if displayName is provided
    const updateData: { display_name?: string; updated_at?: string } = {};

    if (displayName !== undefined) {
      updateData.display_name = displayName;
    }

    // Perform update and fetch the updated row
    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      // Check if profile doesn't exist
      if (error.code === "PGRST116") {
        throw new Error("PROFILE_NOT_FOUND");
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    // Map snake_case DB columns to camelCase DTO
    const profileDTO: ProfileDTO = {
      userId: data.user_id,
      role: data.role,
      propertyId: data.property_id,
      displayName: data.display_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return profileDTO;
  }
}

