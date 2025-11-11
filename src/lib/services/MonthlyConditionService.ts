import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { CreateMonthlyAdvanceCmd, MonthlyAdvanceDTO, UpdateMonthlyAdvanceCmd } from "@/types";
import type { MonthlyAdvanceListFilters, MonthlyAdvanceListResponse } from "@/types/monthlyConditions";

/* eslint-disable @typescript-eslint/no-extraneous-class */

type Supabase = SupabaseClient<Database>;
type MonthlyAdvancesTable = Database["public"]["Tables"]["monthly_conditions"];
type MonthlyAdvanceRow = MonthlyAdvancesTable["Row"];

export type MonthlyAdvanceServiceErrorCode =
  | "MONTHLY_ADVANCE_NOT_FOUND"
  | "MONTHLY_ADVANCE_FORBIDDEN"
  | "MONTHLY_ADVANCE_DUPLICATE"
  | "MONTHLY_ADVANCE_LOCKED_BY_REPORTS"
  | "DATABASE_ERROR";

export class MonthlyAdvanceServiceError extends Error {
  constructor(
    public readonly code: MonthlyAdvanceServiceErrorCode,
    message: string
  ) {
    super(message);
  }
}

export interface MonthlyAdvanceAccessContext {
  role: "admin" | "tenant";
  tenantPropertyId?: string | null;
}

export class MonthlyAdvanceService {
  static async list(
    supabase: Supabase,
    context: MonthlyAdvanceAccessContext,
    filters: MonthlyAdvanceListFilters = {}
  ): Promise<MonthlyAdvanceListResponse> {
    const normalized = normalizeListFilters(filters, context);

    try {
      let query = supabase.from("monthly_conditions").select("*").order("month", { ascending: false });

      if (normalized.propertyId) {
        query = query.eq("property_id", normalized.propertyId);
      }

      if (normalized.month) {
        query = query.eq("month", normalized.month);
      }

      const { data, error } = await query;

      if (error) {
        throw new MonthlyAdvanceServiceError("DATABASE_ERROR", error.message);
      }

      const items = (data ?? []).map(mapRowToDto);

      return {
        items,
      } satisfies MonthlyAdvanceListResponse;
    } catch (error) {
      if (error instanceof MonthlyAdvanceServiceError) {
        throw error;
      }

      throw new MonthlyAdvanceServiceError("DATABASE_ERROR", (error as Error).message);
    }
  }

  static async getById(
    supabase: Supabase,
    context: MonthlyAdvanceAccessContext,
    monthlyAdvanceId: string
  ): Promise<MonthlyAdvanceDTO> {
    const { data, error } = await supabase.from("monthly_conditions").select("*").eq("id", monthlyAdvanceId).single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_NOT_FOUND", "Monthly advance not found");
      }

      throw new MonthlyAdvanceServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_NOT_FOUND", "Monthly advance not found");
    }

    if (context.role === "tenant") {
      if (!context.tenantPropertyId) {
        throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_FORBIDDEN", "Tenant has no property assigned");
      }

      if (data.property_id !== context.tenantPropertyId) {
        throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_FORBIDDEN", "Tenant cannot access this property");
      }
    }

    return mapRowToDto(data);
  }

  static async create(
    supabase: Supabase,
    context: MonthlyAdvanceAccessContext,
    cmd: CreateMonthlyAdvanceCmd
  ): Promise<MonthlyAdvanceDTO> {
    if (context.role !== "admin") {
      throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_FORBIDDEN", "Only admins can create monthly advances");
    }

    const insertPayload: MonthlyAdvancesTable["Insert"] = {
      property_id: cmd.propertyId,
      month: cmd.month,
      manager_fee: cmd.managerFee,
      price_cold: cmd.priceCold,
      price_hot_heating: cmd.priceHotHeating,
      price_heating: cmd.priceHeating,
      forecast_cold: cmd.forecastCold,
      forecast_hot: cmd.forecastHot,
      forecast_heating: cmd.forecastHeating,
      advance_payment: cmd.advancePayment,
    };

    const { data, error } = await supabase.from("monthly_conditions").insert(insertPayload).select("*").single();

    if (error) {
      if (error.code === "23505") {
        throw new MonthlyAdvanceServiceError(
          "MONTHLY_ADVANCE_DUPLICATE",
          "Monthly advance already exists for the given property and month"
        );
      }

      throw new MonthlyAdvanceServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new MonthlyAdvanceServiceError("DATABASE_ERROR", "Failed to create monthly advance");
    }

    return mapRowToDto(data);
  }

  static async update(
    supabase: Supabase,
    context: MonthlyAdvanceAccessContext,
    monthlyAdvanceId: string,
    cmd: UpdateMonthlyAdvanceCmd
  ): Promise<MonthlyAdvanceDTO> {
    if (context.role !== "admin") {
      throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_FORBIDDEN", "Only admins can update monthly advances");
    }

    const existing = await this.getById(supabase, context, monthlyAdvanceId);

    const updatePayload: MonthlyAdvancesTable["Update"] = {};

    if (cmd.propertyId !== undefined) {
      updatePayload.property_id = cmd.propertyId;
    }

    if (cmd.month !== undefined) {
      updatePayload.month = cmd.month;
    }

    if (cmd.managerFee !== undefined) {
      updatePayload.manager_fee = cmd.managerFee;
    }

    if (cmd.priceCold !== undefined) {
      updatePayload.price_cold = cmd.priceCold;
    }

    if (cmd.priceHotHeating !== undefined) {
      updatePayload.price_hot_heating = cmd.priceHotHeating;
    }

    if (cmd.priceHeating !== undefined) {
      updatePayload.price_heating = cmd.priceHeating;
    }

    if (cmd.forecastCold !== undefined) {
      updatePayload.forecast_cold = cmd.forecastCold;
    }

    if (cmd.forecastHot !== undefined) {
      updatePayload.forecast_hot = cmd.forecastHot;
    }

    if (cmd.forecastHeating !== undefined) {
      updatePayload.forecast_heating = cmd.forecastHeating;
    }

    if (cmd.advancePayment !== undefined) {
      updatePayload.advance_payment = cmd.advancePayment;
    }

    if (Object.keys(updatePayload).length === 0) {
      return existing;
    }

    const { data: blockingReport, error: reportsError } = await supabase
      .from("reports")
      .select("id")
      .eq("monthly_conditions_id", monthlyAdvanceId)
      .neq("status", "draft")
      .limit(1)
      .maybeSingle();

    if (reportsError) {
      throw new MonthlyAdvanceServiceError("DATABASE_ERROR", reportsError.message);
    }

    if (blockingReport) {
      throw new MonthlyAdvanceServiceError(
        "MONTHLY_ADVANCE_LOCKED_BY_REPORTS",
        "Cannot update monthly advances linked to realized reports"
      );
    }

    const { data, error } = await supabase
      .from("monthly_conditions")
      .update(updatePayload)
      .eq("id", monthlyAdvanceId)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new MonthlyAdvanceServiceError(
          "MONTHLY_ADVANCE_DUPLICATE",
          "Monthly advance already exists for the given property and month"
        );
      }

      if (error.code === "PGRST116") {
        throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_NOT_FOUND", "Monthly advance not found");
      }

      throw new MonthlyAdvanceServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_NOT_FOUND", "Monthly advance not found");
    }

    return mapRowToDto(data);
  }

  static async delete(
    supabase: Supabase,
    context: MonthlyAdvanceAccessContext,
    monthlyAdvanceId: string
  ): Promise<void> {
    if (context.role !== "admin") {
      throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_FORBIDDEN", "Only admins can delete monthly advances");
    }

    const { error } = await supabase.from("monthly_conditions").delete().eq("id", monthlyAdvanceId);

    if (error) {
      if (error.code === "PGRST116") {
        throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_NOT_FOUND", "Monthly advance not found");
      }

      if (error.code === "23503") {
        throw new MonthlyAdvanceServiceError(
          "MONTHLY_ADVANCE_LOCKED_BY_REPORTS",
          "Cannot delete monthly advances linked to reports"
        );
      }

      throw new MonthlyAdvanceServiceError("DATABASE_ERROR", error.message);
    }
  }
}

interface NormalizedListFilters {
  propertyId?: string;
  month?: string;
}

const normalizeListFilters = (
  filters: MonthlyAdvanceListFilters,
  context: MonthlyAdvanceAccessContext
): NormalizedListFilters => {
  if (context.role === "tenant") {
    if (!context.tenantPropertyId) {
      throw new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_FORBIDDEN", "Tenant has no property assigned");
    }

    return {
      propertyId: context.tenantPropertyId,
      month: filters.month,
    } satisfies NormalizedListFilters;
  }

  return {
    propertyId: filters.propertyId,
    month: filters.month,
  } satisfies NormalizedListFilters;
};

const mapRowToDto = (row: MonthlyAdvanceRow): MonthlyAdvanceDTO => ({
  id: row.id,
  propertyId: row.property_id,
  month: row.month,
  managerFee: row.manager_fee,
  priceCold: row.price_cold,
  priceHotHeating: row.price_hot_heating,
  priceHeating: row.price_heating,
  forecastCold: row.forecast_cold,
  forecastHot: row.forecast_hot,
  forecastHeating: row.forecast_heating,
  advancePayment: row.advance_payment,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
