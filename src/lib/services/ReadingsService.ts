import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  CreateReadingCmd,
  CreateReadingReplacementCmd,
  ReadingDTO,
  ReadingOrigin,
  ReadingType,
  UpdateReadingCmd,
  UpdateReadingMonthsCmd,
  YearMonth,
} from "@/types";
import { yearMonthToISODate } from "@/lib/date/month";
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
  | "READING_PAIR_NOT_FOUND"
  | "DATABASE_ERROR";

export interface ReadingPair {
  base: ReadingDTO;
  final: ReadingDTO;
}

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

    const updated = mapReadingRowToDto(data);
    await this.clearConflictingAssignments(supabase, updated);
    return updated;
  }

  static async create(
    supabase: Supabase,
    cmd: CreateReadingCmd,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: OperationContext
  ): Promise<ReadingDTO> {
    // Time window validation is disabled - tenants can submit readings at any time
    // if (context.role === "tenant") {
    //   const readingDate = new Date(cmd.readingAt);
    //   const now = context.now ?? new Date();
    //
    //   if (!isWithinTenantWindow(readingDate, now)) {
    //     throw new ReadingsServiceError("READING_WINDOW_VIOLATION", "Reading submission window exceeded for tenant");
    //   }
    // }

    const baseMonthIso = toIsoMonthOrNull(cmd.baseForMonth);
    const finalMonthIso = toIsoMonthOrNull(cmd.finalForMonth);

    await this.clearMonthAssignment(supabase, cmd.propertyId, "base_for_month", baseMonthIso);
    await this.clearMonthAssignment(supabase, cmd.propertyId, "final_for_month", finalMonthIso);

    const insertPayload = {
      property_id: cmd.propertyId,
      reading_at: cmd.readingAt,
      origin: deriveOriginForCreate(),
      reading_type: normalizeReadingType((cmd as { readingType?: string | null }).readingType),
      base_for_month: baseMonthIso,
      final_for_month: finalMonthIso,
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

    const updated = mapReadingRowToDto(data);
    await this.clearConflictingAssignments(supabase, updated);
    return updated;
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

      // Time window validation is disabled - tenants can update readings at any time
      // if (cmd.readingAt) {
      //   const readingDate = new Date(cmd.readingAt);
      //   const now = context.now ?? new Date();
      //
      //   if (!isWithinTenantWindow(readingDate, now)) {
      //     throw new ReadingsServiceError("READING_WINDOW_VIOLATION", "Reading submission window exceeded for tenant");
      //   }
      // }
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

    if (cmd.baseForMonth !== undefined) {
      const nextBaseIso = toIsoMonthOrNull(cmd.baseForMonth);
      updatePayload.base_for_month = nextBaseIso;
      if (nextBaseIso && nextBaseIso !== existing.baseForMonth) {
        await this.clearMonthAssignment(supabase, existing.propertyId, "base_for_month", nextBaseIso, existing.id);
      }
    }

    if (cmd.finalForMonth !== undefined) {
      const nextFinalIso = toIsoMonthOrNull(cmd.finalForMonth);
      updatePayload.final_for_month = nextFinalIso;
      if (nextFinalIso && nextFinalIso !== existing.finalForMonth) {
        await this.clearMonthAssignment(supabase, existing.propertyId, "final_for_month", nextFinalIso, existing.id);
      }
    }

    const readingTypeInput = (cmd as { readingType?: string | null }).readingType;
    if (readingTypeInput !== undefined) {
      updatePayload.reading_type = normalizeReadingType(readingTypeInput);
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

    const updated = mapReadingRowToDto(data);
    await this.clearConflictingAssignments(supabase, updated);
    return updated;
  }

  private static async clearConflictingAssignments(supabase: Supabase, reading: ReadingDTO): Promise<void> {
    await this.clearMonthAssignment(supabase, reading.propertyId, "base_for_month", reading.baseForMonth, reading.id);
    await this.clearMonthAssignment(supabase, reading.propertyId, "final_for_month", reading.finalForMonth, reading.id);
  }

  private static async clearMonthAssignment(
    supabase: Supabase,
    propertyId: string,
    column: "base_for_month" | "final_for_month",
    value: string | null | undefined,
    excludeId?: string
  ): Promise<void> {
    if (!value) {
      return;
    }

    let query = supabase
      .from("readings")
      .update({ [column]: null })
      .eq("property_id", propertyId)
      .eq(column, value)
      .is("deleted_at", null);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { error } = await query;

    if (error) {
      throw new ReadingsServiceError("DATABASE_ERROR", error.message);
    }
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
      reading_type: normalizeReadingType("overwrite"),
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

  /**
   * Update month assignments (baseForMonth, finalForMonth) for a reading.
   * Only admins can call this.
   */
  static async updateMonths(supabase: Supabase, readingId: string, cmd: UpdateReadingMonthsCmd): Promise<ReadingDTO> {
    const existing = await this.getById(supabase, readingId);
    const updatePayload: Database["public"]["Tables"]["readings"]["Update"] = {};

    if (cmd.baseForMonth !== undefined) {
      const nextBaseIso = cmd.baseForMonth ? yearMonthToISODate(cmd.baseForMonth) : null;
      updatePayload.base_for_month = nextBaseIso;
      if (nextBaseIso && nextBaseIso !== existing.baseForMonth) {
        await this.clearMonthAssignment(supabase, existing.propertyId, "base_for_month", nextBaseIso, readingId);
      }
    }

    if (cmd.finalForMonth !== undefined) {
      const nextFinalIso = cmd.finalForMonth ? yearMonthToISODate(cmd.finalForMonth) : null;
      updatePayload.final_for_month = nextFinalIso;
      if (nextFinalIso && nextFinalIso !== existing.finalForMonth) {
        await this.clearMonthAssignment(supabase, existing.propertyId, "final_for_month", nextFinalIso, readingId);
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.getById(supabase, readingId);
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
      // Handle unique constraint violations (23505)
      if (error.code === "23505") {
        throw new ReadingsServiceError(
          "DATABASE_ERROR",
          "Another reading is already assigned to this property and month"
        );
      }
      throw new ReadingsServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new ReadingsServiceError("READING_NOT_FOUND", "Reading not found");
    }

    return mapReadingRowToDto(data);
  }

  /**
   * Find a pair of readings (base and final) for a given property and month.
   * Returns null if either base or final is missing.
   */
  static async findPairForPropertyAndMonth(
    supabase: Supabase,
    propertyId: string,
    month: YearMonth
  ): Promise<ReadingPair | null> {
    const monthISO = yearMonthToISODate(month);

    // Find base reading (base_for_month = month)
    const { data: baseData, error: baseError } = await supabase
      .from("readings")
      .select("*")
      .eq("property_id", propertyId)
      .eq("base_for_month", monthISO)
      .is("deleted_at", null)
      .maybeSingle();

    if (baseError) {
      throw new ReadingsServiceError("DATABASE_ERROR", baseError.message);
    }

    if (!baseData) {
      return null;
    }

    // Find final reading (final_for_month = month)
    const { data: finalData, error: finalError } = await supabase
      .from("readings")
      .select("*")
      .eq("property_id", propertyId)
      .eq("final_for_month", monthISO)
      .is("deleted_at", null)
      .maybeSingle();

    if (finalError) {
      throw new ReadingsServiceError("DATABASE_ERROR", finalError.message);
    }

    if (!finalData) {
      return null;
    }

    return {
      base: mapReadingRowToDto(baseData),
      final: mapReadingRowToDto(finalData),
    };
  }

  /**
   * Get all months affected by a reading (based on its base_for_month and final_for_month).
   * Used for determining which reports need to be recomputed.
   */
  static async getAffectedMonths(supabase: Supabase, readingId: string): Promise<YearMonth[]> {
    const reading = await this.getById(supabase, readingId);
    const months: YearMonth[] = [];

    if (reading.baseForMonth) {
      months.push(reading.baseForMonth.substring(0, 7) as YearMonth);
    }

    if (reading.finalForMonth) {
      const finalMonth = reading.finalForMonth.substring(0, 7) as YearMonth;
      if (!months.includes(finalMonth)) {
        months.push(finalMonth);
      }
    }

    return months;
  }
}

const deriveOriginForCreate = (): ReadingOrigin => "tenant";

const mapReadingRowToDto = (row: Database["public"]["Tables"]["readings"]["Row"]): ReadingDTO => ({
  id: row.id,
  propertyId: row.property_id,
  readingAt: row.reading_at,
  effectiveMonth: row.effective_month,
  baseForMonth: row.base_for_month,
  finalForMonth: row.final_for_month,
  origin: row.origin as ReadingOrigin,
  readingType: normalizeReadingType(row.reading_type) as ReadingType,
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

const toIsoMonthOrNull = (month: YearMonth | null | undefined): string | null => {
  if (!month) {
    return null;
  }

  return yearMonthToISODate(month);
};

const normalizeReadingType = (readingType: string | null | undefined): ReadingType => {
  if (readingType === "overwrite" || readingType === "baseline") {
    return "overwrite" as ReadingType;
  }

  return "regular";
};
