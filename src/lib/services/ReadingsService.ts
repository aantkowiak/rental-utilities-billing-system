import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  CreateReadingCmd,
  CreateReadingReplacementCmd,
  ReadingDTO,
  ReadingOrigin,
  ReadingType,
  UpdateReadingCmd,
} from "@/types";
import { isWithinTenantWindow } from "@/lib/validation/readings";
import type { ReadingListFilters, ReadingListResponse } from "@/types/readings";
import { buildReadingsListResponse } from "@/types/readings";

/* eslint-disable @typescript-eslint/no-extraneous-class */

type Supabase = SupabaseClient<Database>;

export type UserRole = "admin" | "tenant";

interface OperationContext {
  role: UserRole;
  now?: Date;
}

export class ReadingsServiceError extends Error {
  constructor(
    public readonly code: ReadingsServiceErrorCode,
    message: string
  ) {
    super(message);
  }
}

export type ReadingsServiceErrorCode =
  | "READING_NOT_FOUND"
  | "READING_FORBIDDEN"
  | "READING_WINDOW_VIOLATION"
  | "READING_DUPLICATE_REPLACEMENT"
  | "READING_PROPERTY_MISMATCH"
  | "DATABASE_ERROR";

export class ReadingsService {
  static async list(supabase: Supabase, filters: ReadingListFilters): Promise<ReadingListResponse> {
    try {
      const { propertyId, from, to } = filters;

      let query = supabase
        .from("readings")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("reading_at", { ascending: false });

      if (from) {
        query = query.gte("reading_at", from);
      }

      if (to) {
        query = query.lte("reading_at", to);
      }

      const { data, error } = await query;

      if (error) {
        throw new ReadingsServiceError("DATABASE_ERROR", error.message);
      }

      const items = (data ?? []).map(mapReadingRowToDto);

      return buildReadingsListResponse(items);
    } catch (error) {
      if (error instanceof ReadingsServiceError) {
        throw error;
      }

      throw new ReadingsServiceError("DATABASE_ERROR", (error as Error).message);
    }
  }

  static async getById(supabase: Supabase, readingId: string): Promise<ReadingDTO> {
    const { data, error } = await supabase
      .from("readings")
      .select("*")
      .eq("id", readingId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ReadingsServiceError("READING_NOT_FOUND", "Reading not found");
      }

      throw new ReadingsServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new ReadingsServiceError("READING_NOT_FOUND", "Reading not found");
    }

    return mapReadingRowToDto(data);
  }

  static async create(supabase: Supabase, cmd: CreateReadingCmd, context: OperationContext): Promise<ReadingDTO> {
    if (context.role === "tenant") {
      const readingDate = new Date(cmd.readingAt);
      const now = context.now ?? new Date();

      if (!isWithinTenantWindow(readingDate, now)) {
        throw new ReadingsServiceError("READING_WINDOW_VIOLATION", "Reading submission window exceeded for tenant");
      }
    }

    const insertPayload = {
      property_id: cmd.propertyId,
      reading_at: cmd.readingAt,
      origin: deriveOriginForCreate(),
      reading_type: defaultReadingType(),
      cold_m3: cmd.coldM3,
      hot_m3: cmd.hotM3,
      heating_gj: cmd.heatingGj,
      comment_text: cmd.commentText ?? null,
      comment_visible_to_tenant: cmd.commentVisibleToTenant ?? true,
      effective_month: null,
      cold_replaced: false,
      hot_replaced: false,
      heating_replaced: false,
    } satisfies Database["public"]["Tables"]["readings"]["Insert"];

    const { data, error } = await supabase.from("readings").insert(insertPayload).select("*").single();

    if (error) {
      throw new ReadingsServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new ReadingsServiceError("DATABASE_ERROR", "Failed to create reading");
    }

    return mapReadingRowToDto(data);
  }

  static async update(
    supabase: Supabase,
    readingId: string,
    cmd: UpdateReadingCmd,
    context: OperationContext
  ): Promise<ReadingDTO> {
    const existing = await this.getById(supabase, readingId);

    if (context.role === "tenant") {
      if (existing.origin !== "tenant") {
        throw new ReadingsServiceError("READING_FORBIDDEN", "Tenants cannot modify admin replacement readings");
      }

      if (cmd.readingAt) {
        const readingDate = new Date(cmd.readingAt);
        const now = context.now ?? new Date();

        if (!isWithinTenantWindow(readingDate, now)) {
          throw new ReadingsServiceError("READING_WINDOW_VIOLATION", "Reading submission window exceeded for tenant");
        }
      }
    }

    const updatePayload: Database["public"]["Tables"]["readings"]["Update"] = {};

    if (cmd.readingAt !== undefined) {
      updatePayload.reading_at = cmd.readingAt;
    }

    if (cmd.coldM3 !== undefined) {
      updatePayload.cold_m3 = cmd.coldM3;
    }

    if (cmd.hotM3 !== undefined) {
      updatePayload.hot_m3 = cmd.hotM3;
    }

    if (cmd.heatingGj !== undefined) {
      updatePayload.heating_gj = cmd.heatingGj;
    }

    if (cmd.commentText !== undefined) {
      updatePayload.comment_text = cmd.commentText ?? null;
    }

    if (cmd.commentVisibleToTenant !== undefined) {
      updatePayload.comment_visible_to_tenant = cmd.commentVisibleToTenant;
    }

    if (Object.keys(updatePayload).length === 0) {
      return existing;
    }

    const { data, error } = await supabase
      .from("readings")
      .update(updatePayload)
      .eq("id", readingId)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ReadingsServiceError("READING_NOT_FOUND", "Reading not found");
      }
      throw new ReadingsServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new ReadingsServiceError("READING_NOT_FOUND", "Reading not found");
    }

    return mapReadingRowToDto(data);
  }

  static async softDelete(supabase: Supabase, readingId: string): Promise<void> {
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from("readings")
      .update({ deleted_at: timestamp })
      .eq("id", readingId)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ReadingsServiceError("READING_NOT_FOUND", "Reading not found");
      }
      throw new ReadingsServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new ReadingsServiceError("READING_NOT_FOUND", "Reading not found");
    }
  }

  static async createReplacement(
    supabase: Supabase,
    sourceReadingId: string,
    cmd: CreateReadingReplacementCmd
  ): Promise<ReadingDTO> {
    const sourceRow = await this.getById(supabase, sourceReadingId);

    if (sourceRow.propertyId !== cmd.propertyId) {
      throw new ReadingsServiceError("READING_PROPERTY_MISMATCH", "Replacement must target the same property");
    }

    const coldSource = sourceRow.coldM3;
    const hotSource = sourceRow.hotM3;
    const heatingSource = sourceRow.heatingGj;

    const insertPayload = {
      property_id: cmd.propertyId,
      reading_at: cmd.readingAt,
      effective_month: cmd.effectiveMonth,
      origin: "admin_replacement" as ReadingOrigin,
      reading_type: defaultReadingType(),
      cold_m3: cmd.coldM3,
      hot_m3: cmd.hotM3,
      heating_gj: cmd.heatingGj,
      cold_replaced: cmd.coldM3 !== coldSource,
      hot_replaced: cmd.hotM3 !== hotSource,
      heating_replaced: cmd.heatingGj !== heatingSource,
      comment_text: cmd.commentText ?? null,
      comment_visible_to_tenant: cmd.commentVisibleToTenant ?? false,
    } satisfies Database["public"]["Tables"]["readings"]["Insert"];

    const { data, error } = await supabase.from("readings").insert(insertPayload).select("*").single();

    if (error) {
      if (error.code === "23505") {
        throw new ReadingsServiceError(
          "READING_DUPLICATE_REPLACEMENT",
          "Only one replacement is allowed per property per month"
        );
      }

      throw new ReadingsServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new ReadingsServiceError("DATABASE_ERROR", "Failed to create replacement reading");
    }

    return mapReadingRowToDto(data);
  }
}

const deriveOriginForCreate = (): ReadingOrigin => "tenant";

const defaultReadingType = (): ReadingType => "regular";

const mapReadingRowToDto = (row: Database["public"]["Tables"]["readings"]["Row"]): ReadingDTO => ({
  id: row.id,
  propertyId: row.property_id,
  readingAt: row.reading_at,
  effectiveMonth: row.effective_month,
  origin: row.origin as ReadingOrigin,
  readingType: row.reading_type as ReadingType,
  coldM3: toNumber(row.cold_m3),
  hotM3: toNumber(row.hot_m3),
  heatingGj: toNumber(row.heating_gj),
  coldReplaced: row.cold_replaced,
  hotReplaced: row.hot_replaced,
  heatingReplaced: row.heating_replaced,
  commentText: row.comment_text,
  commentVisibleToTenant: row.comment_visible_to_tenant,
  deletedAt: row.deleted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toNumber = (value: number | string): number => {
  if (typeof value === "number") {
    return value;
  }

  return parseFloat(value);
};
