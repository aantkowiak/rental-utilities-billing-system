import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { CreatePropertyCmd, PropertyDTO, UpdatePropertyCmd } from "@/types";

export interface PropertyListResponse {
  items: PropertyDTO[];
}

/**
 * Service for managing property operations.
 * Handles business logic and database interactions for properties.
 */
export class PropertyService {
  static async list(supabase: SupabaseClient<Database>): Promise<PropertyListResponse> {
    const query = supabase.from("properties").select("*").order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Map snake_case DB columns to camelCase DTOs
    const items: PropertyDTO[] = (data || []).map((row) => ({
      id: row.id,
      label: row.label,
      // Convert YYYY-MM-DD back to YYYY-MM for API response
      startMonth: row.start_month.slice(0, 7),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      items,
    };
  }

  /**
   * Creates a new property.
   *
   * @param supabase - Supabase client instance
   * @param cmd - Create property command with label and startMonth
   * @returns Created property as PropertyDTO
   * @throws Error if property creation fails or validation fails
   */
  static async create(supabase: SupabaseClient<Database>, cmd: CreatePropertyCmd): Promise<PropertyDTO> {
    // Convert YYYY-MM to YYYY-MM-01 (first day of month)
    const startMonthDate = `${cmd.startMonth}-01`;

    // Insert new property
    const { data, error } = await supabase
      .from("properties")
      .insert({
        label: cmd.label,
        start_month: startMonthDate,
      })
      .select("*")
      .single();

    if (error) {
      // Check for unique constraint violation (if label uniqueness is enforced)
      if (error.code === "23505") {
        throw new Error("DUPLICATE_LABEL");
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to create property");
    }

    // Map snake_case DB columns to camelCase DTO
    const propertyDTO: PropertyDTO = {
      id: data.id,
      label: data.label,
      // Convert YYYY-MM-DD back to YYYY-MM for API response
      startMonth: data.start_month.slice(0, 7),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return propertyDTO;
  }

  /**
   * Gets a single property by ID, filtered by user role.
   *
   * @param supabase - Supabase client instance
   * @param role - User role ('admin' or 'tenant')
   * @param propertyId - Property UUID
   * @returns Property as PropertyDTO
   * @throws Error with "PROPERTY_NOT_FOUND" if not found or no access
   */
  static async getById(supabase: SupabaseClient<Database>, role: string, propertyId: string): Promise<PropertyDTO> {
    // Query property - RLS automatically filters for tenants
    const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();

    if (error) {
      // Check if property doesn't exist or no access (RLS filtered)
      if (error.code === "PGRST116") {
        throw new Error("PROPERTY_NOT_FOUND");
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    // Map snake_case DB columns to camelCase DTO
    const propertyDTO: PropertyDTO = {
      id: data.id,
      label: data.label,
      // Convert YYYY-MM-DD back to YYYY-MM for API response
      startMonth: data.start_month.slice(0, 7),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return propertyDTO;
  }

  /**
   * Updates a property by ID.
   *
   * @param supabase - Supabase client instance
   * @param propertyId - Property UUID
   * @param cmd - Update property command (partial)
   * @returns Updated property as PropertyDTO
   * @throws Error with "PROPERTY_NOT_FOUND" if not found
   */
  static async update(
    supabase: SupabaseClient<Database>,
    propertyId: string,
    cmd: UpdatePropertyCmd
  ): Promise<PropertyDTO> {
    // Build update object only with provided fields
    const updateData: { label?: string; start_month?: string } = {};

    if (cmd.label !== undefined) {
      updateData.label = cmd.label;
    }

    if (cmd.startMonth !== undefined) {
      // Convert YYYY-MM to YYYY-MM-01 (first day of month)
      updateData.start_month = `${cmd.startMonth}-01`;
    }

    // Perform update and fetch the updated row
    const { data, error } = await supabase
      .from("properties")
      .update(updateData)
      .eq("id", propertyId)
      .select("*")
      .single();

    if (error) {
      // Check if property doesn't exist
      if (error.code === "PGRST116") {
        throw new Error("PROPERTY_NOT_FOUND");
      }
      // Check for unique constraint violation
      if (error.code === "23505") {
        throw new Error("DUPLICATE_LABEL");
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    // Map snake_case DB columns to camelCase DTO
    const propertyDTO: PropertyDTO = {
      id: data.id,
      label: data.label,
      // Convert YYYY-MM-DD back to YYYY-MM for API response
      startMonth: data.start_month.slice(0, 7),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return propertyDTO;
  }

  /**
   * Deletes a property by ID.
   *
   * @param supabase - Supabase client instance
   * @param propertyId - Property UUID
   * @throws Error with "PROPERTY_NOT_FOUND" if not found
   */
  static async delete(supabase: SupabaseClient<Database>, propertyId: string): Promise<void> {
    const { error } = await supabase.from("properties").delete().eq("id", propertyId);

    if (error) {
      // Check if property doesn't exist
      if (error.code === "PGRST116") {
        throw new Error("PROPERTY_NOT_FOUND");
      }
      throw new Error(`Database error: ${error.message}`);
    }
  }
}
