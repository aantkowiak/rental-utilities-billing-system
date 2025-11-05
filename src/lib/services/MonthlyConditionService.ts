import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { CreateMonthlyConditionCmd, MonthlyConditionDTO, UpdateMonthlyConditionCmd } from "@/types";
import type { MonthlyConditionListFilters, MonthlyConditionListResponse } from "@/types/monthlyConditions";

/* eslint-disable @typescript-eslint/no-extraneous-class */

type Supabase = SupabaseClient<Database>;
type MonthlyConditionsTable = Database["public"]["Tables"]["monthly_conditions"];
type MonthlyConditionRow = MonthlyConditionsTable["Row"];

export type MonthlyConditionServiceErrorCode =
  | "MONTHLY_CONDITION_NOT_FOUND"
  | "MONTHLY_CONDITION_FORBIDDEN"
  | "MONTHLY_CONDITION_DUPLICATE"
  | "MONTHLY_CONDITION_LOCKED_BY_REPORTS"
  | "DATABASE_ERROR";

export class MonthlyConditionServiceError extends Error {
  constructor(
    public readonly code: MonthlyConditionServiceErrorCode,
    message: string
  ) {
    super(message);
  }
}

export interface MonthlyConditionAccessContext {
  role: "admin" | "tenant";
  tenantPropertyId?: string | null;
}

export class MonthlyConditionService {
  static async list(
    supabase: Supabase,
    context: MonthlyConditionAccessContext,
    filters: MonthlyConditionListFilters = {}
  ): Promise<MonthlyConditionListResponse> {
    const normalized = normalizeListFilters(filters, context);

    try {
      let query = supabase
        .from("monthly_conditions")
        .select("*")
        .order("month", { ascending: false });

      if (normalized.propertyId) {
        query = query.eq("property_id", normalized.propertyId);
      }

      if (normalized.month) {
        query = query.eq("month", normalized.month);
      }

      const { data, error } = await query;

      if (error) {
        throw new MonthlyConditionServiceError("DATABASE_ERROR", error.message);
      }

      const items = (data ?? []).map(mapRowToDto);

      return {
        items,
      } satisfies MonthlyConditionListResponse;
    } catch (error) {
      if (error instanceof MonthlyConditionServiceError) {
        throw error;
      }

      throw new MonthlyConditionServiceError("DATABASE_ERROR", (error as Error).message);
    }
  }

  static async getById(
    supabase: Supabase,
    context: MonthlyConditionAccessContext,
    monthlyConditionId: string
  ): Promise<MonthlyConditionDTO> {
    const { data, error } = await supabase.from("monthly_conditions").select("*").eq("id", monthlyConditionId).single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new MonthlyConditionServiceError("MONTHLY_CONDITION_NOT_FOUND", "Monthly condition not found");
      }

      throw new MonthlyConditionServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new MonthlyConditionServiceError("MONTHLY_CONDITION_NOT_FOUND", "Monthly condition not found");
    }

    if (context.role === "tenant") {
      if (!context.tenantPropertyId) {
        throw new MonthlyConditionServiceError("MONTHLY_CONDITION_FORBIDDEN", "Tenant has no property assigned");
      }

      if (data.property_id !== context.tenantPropertyId) {
        throw new MonthlyConditionServiceError("MONTHLY_CONDITION_FORBIDDEN", "Tenant cannot access this property");
      }
    }

    return mapRowToDto(data);
  }

  static async create(
    supabase: Supabase,
    context: MonthlyConditionAccessContext,
    cmd: CreateMonthlyConditionCmd
  ): Promise<MonthlyConditionDTO> {
    if (context.role !== "admin") {
      throw new MonthlyConditionServiceError(
        "MONTHLY_CONDITION_FORBIDDEN",
        "Only admins can create monthly conditions"
      );
    }

    const insertPayload: MonthlyConditionsTable["Insert"] = {
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
        throw new MonthlyConditionServiceError(
          "MONTHLY_CONDITION_DUPLICATE",
          "Monthly condition already exists for the given property and month"
        );
      }

      throw new MonthlyConditionServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new MonthlyConditionServiceError("DATABASE_ERROR", "Failed to create monthly condition");
    }

    return mapRowToDto(data);
  }

  static async update(
    supabase: Supabase,
    context: MonthlyConditionAccessContext,
    monthlyConditionId: string,
    cmd: UpdateMonthlyConditionCmd
  ): Promise<MonthlyConditionDTO> {
    if (context.role !== "admin") {
      throw new MonthlyConditionServiceError(
        "MONTHLY_CONDITION_FORBIDDEN",
        "Only admins can update monthly conditions"
      );
    }

    const existing = await this.getById(supabase, context, monthlyConditionId);

    const updatePayload: MonthlyConditionsTable["Update"] = {};

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
      .eq("monthly_conditions_id", monthlyConditionId)
      .neq("status", "draft")
      .limit(1)
      .maybeSingle();

    if (reportsError) {
      throw new MonthlyConditionServiceError("DATABASE_ERROR", reportsError.message);
    }

    if (blockingReport) {
      throw new MonthlyConditionServiceError(
        "MONTHLY_CONDITION_LOCKED_BY_REPORTS",
        "Cannot update monthly conditions linked to realized reports"
      );
    }

    const { data, error } = await supabase
      .from("monthly_conditions")
      .update(updatePayload)
      .eq("id", monthlyConditionId)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new MonthlyConditionServiceError(
          "MONTHLY_CONDITION_DUPLICATE",
          "Monthly condition already exists for the given property and month"
        );
      }

      if (error.code === "PGRST116") {
        throw new MonthlyConditionServiceError("MONTHLY_CONDITION_NOT_FOUND", "Monthly condition not found");
      }

      throw new MonthlyConditionServiceError("DATABASE_ERROR", error.message);
    }

    if (!data) {
      throw new MonthlyConditionServiceError("MONTHLY_CONDITION_NOT_FOUND", "Monthly condition not found");
    }

    return mapRowToDto(data);
  }

  static async delete(
    supabase: Supabase,
    context: MonthlyConditionAccessContext,
    monthlyConditionId: string
  ): Promise<void> {
    if (context.role !== "admin") {
      throw new MonthlyConditionServiceError(
        "MONTHLY_CONDITION_FORBIDDEN",
        "Only admins can delete monthly conditions"
      );
    }

    const { error } = await supabase.from("monthly_conditions").delete().eq("id", monthlyConditionId);

    if (error) {
      if (error.code === "PGRST116") {
        throw new MonthlyConditionServiceError("MONTHLY_CONDITION_NOT_FOUND", "Monthly condition not found");
      }

      if (error.code === "23503") {
        throw new MonthlyConditionServiceError(
          "MONTHLY_CONDITION_LOCKED_BY_REPORTS",
          "Cannot delete monthly conditions linked to reports"
        );
      }

      throw new MonthlyConditionServiceError("DATABASE_ERROR", error.message);
    }
  }
}

interface NormalizedListFilters {
  propertyId?: string;
  month?: string;
}

const normalizeListFilters = (
  filters: MonthlyConditionListFilters,
  context: MonthlyConditionAccessContext
): NormalizedListFilters => {
  if (context.role === "tenant") {
    if (!context.tenantPropertyId) {
      throw new MonthlyConditionServiceError("MONTHLY_CONDITION_FORBIDDEN", "Tenant has no property assigned");
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

const mapRowToDto = (row: MonthlyConditionRow): MonthlyConditionDTO => ({
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
