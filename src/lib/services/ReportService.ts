import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { ReportDTO } from "@/types";

/* eslint-disable @typescript-eslint/no-extraneous-class */

type Supabase = SupabaseClient<Database>;
type ReportsTable = Database["public"]["Tables"]["reports"];
type ReportRow = ReportsTable["Row"];
type ReadingsTable = Database["public"]["Tables"]["readings"];
type ReadingRow = ReadingsTable["Row"];
type MonthlyConditionsTable = Database["public"]["Tables"]["monthly_conditions"];
type MonthlyConditionsRow = MonthlyConditionsTable["Row"];

export type ReportServiceErrorCode =
  | "REPORT_NOT_FOUND"
  | "REPORT_FORBIDDEN"
  | "REPORT_DUPLICATE"
  | "CONTRACT_NOT_FOUND"
  | "MISSING_ANCHOR_READINGS"
  | "MISSING_MONTHLY_CONDITIONS"
  | "DATABASE_ERROR";

export class ReportServiceError extends Error {
  constructor(
    public readonly code: ReportServiceErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export interface ReportAccessContext {
  role: "admin" | "tenant";
  userId: string;
}

interface AnchorReadings {
  currentMonth: ReadingRow;
  nextMonth: ReadingRow;
}

interface ReportCalculation {
  fixedCostRaw: number;
  meterCostColdRaw: number;
  meterCostHotRaw: number;
  meterCostHeatingRaw: number;
  actualRentRaw: number;
  balanceRaw: number;
}

export class ReportService {
  /**
   * Generate a new report for a given contract and month.
   * This will:
   * 1. Validate contract exists and user has access
   * 2. Find anchor readings for month M and M+1
   * 3. Fetch monthly conditions for the month
   * 4. Calculate costs
   * 5. Create report record
   */
  static async generate(
    supabase: Supabase,
    context: ReportAccessContext,
    contractId: string,
    month: string
  ): Promise<ReportDTO> {
    // Step 1: Validate contract and get property
    const contract = await this.getContractWithAccess(supabase, context, contractId);

    // Step 2: Format month as first day of month (YYYY-MM-DD)
    const monthDate = `${month}-01`;

    // Step 3: Check if report already exists
    const existingReport = await this.findExistingReport(supabase, contractId, monthDate);
    if (existingReport) {
      throw new ReportServiceError(
        "REPORT_DUPLICATE",
        `Raport dla kontraktu ${contractId} i miesiąca ${month} już istnieje.`
      );
    }

    // Step 4: Find anchor readings
    const anchors = await this.findAnchorReadings(supabase, contract.property_id, monthDate);

    // Step 5: Fetch monthly conditions
    const conditions = await this.getMonthlyConditions(supabase, contract.property_id, monthDate);

    // Step 6: Calculate costs
    const calculation = this.calculateReportCosts(anchors, conditions);

    // Step 7: Create report
    const { data: newReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        contract_id: contractId,
        month: monthDate,
        status: "draft",
        anchor_reading_id: anchors.currentMonth.id,
        anchor_reading_next_id: anchors.nextMonth.id,
        monthly_conditions_id: conditions.id,
        fixed_cost_raw: calculation.fixedCostRaw,
        meter_cost_cold_raw: calculation.meterCostColdRaw,
        meter_cost_hot_raw: calculation.meterCostHotRaw,
        meter_cost_heating_raw: calculation.meterCostHeatingRaw,
        actual_rent_raw: calculation.actualRentRaw,
        balance_raw: calculation.balanceRaw,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[ReportService.generate] Error creating report:", insertError);
      throw new ReportServiceError("DATABASE_ERROR", "Nie udało się utworzyć raportu.");
    }

    return mapReportRowToDto(newReport);
  }

  /**
   * Get contract and verify user access
   */
  private static async getContractWithAccess(
    supabase: Supabase,
    context: ReportAccessContext,
    contractId: string
  ): Promise<{ id: string; property_id: string; tenant_user_id: string }> {
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("id, property_id, tenant_user_id")
      .eq("id", contractId)
      .single();

    if (error || !contract) {
      throw new ReportServiceError("CONTRACT_NOT_FOUND", `Kontrakt ${contractId} nie został znaleziony.`);
    }

    // Check access
    if (context.role === "tenant" && contract.tenant_user_id !== context.userId) {
      throw new ReportServiceError("REPORT_FORBIDDEN", "Brak uprawnień do tego kontraktu.");
    }

    return contract;
  }

  /**
   * Check if report already exists for this contract and month
   */
  private static async findExistingReport(
    supabase: Supabase,
    contractId: string,
    monthDate: string
  ): Promise<ReportRow | null> {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("contract_id", contractId)
      .eq("month", monthDate)
      .maybeSingle();

    return data;
  }

  /**
   * Find anchor readings for the given month (M) and next month (M+1)
   * According to FR-006:
   * 1. If admin_replacement with effective_month exists, use it
   * 2. Otherwise, use latest reading in -3/+5 day window
   */
  private static async findAnchorReadings(
    supabase: Supabase,
    propertyId: string,
    monthDate: string
  ): Promise<AnchorReadings> {
    // Calculate next month
    const currentDate = new Date(monthDate);
    const nextMonthDate = new Date(currentDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toISOString().substring(0, 10);

    // Find anchor for current month
    const currentAnchor = await this.findAnchorForMonth(supabase, propertyId, monthDate);

    // Find anchor for next month
    const nextAnchor = await this.findAnchorForMonth(supabase, propertyId, nextMonth);

    // Validate we have both anchors
    const missingAnchors: string[] = [];
    if (!currentAnchor) {
      missingAnchors.push(monthDate.substring(0, 7));
    }
    if (!nextAnchor) {
      missingAnchors.push(nextMonth.substring(0, 7));
    }

    if (missingAnchors.length > 0) {
      throw new ReportServiceError(
        "MISSING_ANCHOR_READINGS",
        `Brak odczytów dla miesięcy: ${missingAnchors.join(", ")}. Dodaj odczyty w systemie przed wygenerowaniem raportu.`,
        { missingMonths: missingAnchors }
      );
    }

    return {
      currentMonth: currentAnchor,
      nextMonth: nextAnchor,
    };
  }

  /**
   * Find anchor reading for a specific month
   * FR-006: Try admin replacement first, then fall back to latest reading in window
   */
  private static async findAnchorForMonth(
    supabase: Supabase,
    propertyId: string,
    monthDate: string
  ): Promise<ReadingRow | null> {
    // Step 1: Check for admin replacement with effective_month
    const { data: adminReplacement } = await supabase
      .from("readings")
      .select("*")
      .eq("property_id", propertyId)
      .eq("effective_month", monthDate)
      .eq("origin", "admin_replacement")
      .is("deleted_at", null)
      .maybeSingle();

    if (adminReplacement) {
      return adminReplacement;
    }

    // Step 2: Find latest reading in the -3/+5 day window
    // Window: last 3 days of previous month through first 5 days of current month
    const monthStart = new Date(monthDate);
    const prevMonth = new Date(monthStart);
    prevMonth.setMonth(prevMonth.getMonth() - 1);

    // Calculate window boundaries
    const windowStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0); // Last day of prev month
    windowStart.setDate(windowStart.getDate() - 2); // Go back 2 more days (last 3 days)
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(monthStart);
    windowEnd.setDate(5); // First 5 days
    windowEnd.setHours(23, 59, 59, 999);

    const { data: readings } = await supabase
      .from("readings")
      .select("*")
      .eq("property_id", propertyId)
      .gte("reading_at", windowStart.toISOString())
      .lte("reading_at", windowEnd.toISOString())
      .is("deleted_at", null)
      .order("reading_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);

    if (readings && readings.length > 0) {
      return readings[0];
    }

    return null;
  }

  /**
   * Get monthly conditions for the given property and month
   */
  private static async getMonthlyConditions(
    supabase: Supabase,
    propertyId: string,
    monthDate: string
  ): Promise<MonthlyConditionsRow> {
    const { data: conditions, error } = await supabase
      .from("monthly_conditions")
      .select("*")
      .eq("property_id", propertyId)
      .eq("month", monthDate)
      .maybeSingle();

    if (error || !conditions) {
      throw new ReportServiceError(
        "MISSING_MONTHLY_CONDITIONS",
        `Brak warunków miesięcznych dla nieruchomości ${propertyId} i miesiąca ${monthDate.substring(0, 7)}.`
      );
    }

    return conditions;
  }

  /**
   * Calculate report costs based on anchor readings and monthly conditions
   * According to FR-011 from PRD:
   * - cold water cost = consumption_cold × price_cold
   * - hot water cost = consumption_hot × (price_cold + price_heating_hot)
   * - heating cost = consumption_heating × price_heating
   * - fixed_cost = manager_fee - (forecast_cold × price_cold + forecast_hot × (price_cold + price_heating_hot) + forecast_heating × price_heating)
   * - actual_rent = fixed_cost + (sum of meter costs)
   * - balance = advance_payment - actual_rent
   */
  private static calculateReportCosts(anchors: AnchorReadings, conditions: MonthlyConditionsRow): ReportCalculation {
    // Calculate consumption (difference between next and current reading)
    const consumptionCold = Number(anchors.nextMonth.cold_m3) - Number(anchors.currentMonth.cold_m3);
    const consumptionHot = Number(anchors.nextMonth.hot_m3) - Number(anchors.currentMonth.hot_m3);
    const consumptionHeating = Number(anchors.nextMonth.heating_gj) - Number(anchors.currentMonth.heating_gj);

    // Get prices
    const priceCold = Number(conditions.price_cold);
    const priceHotHeating = Number(conditions.price_hot_heating);
    const priceHeating = Number(conditions.price_heating);
    const managerFee = Number(conditions.manager_fee);
    const advancePayment = Number(conditions.advance_payment);

    // Get forecasts
    const forecastCold = Number(conditions.forecast_cold);
    const forecastHot = Number(conditions.forecast_hot);
    const forecastHeating = Number(conditions.forecast_heating);

    // Calculate meter costs
    const meterCostColdRaw = consumptionCold * priceCold;
    const meterCostHotRaw = consumptionHot * (priceCold + priceHotHeating);
    const meterCostHeatingRaw = consumptionHeating * priceHeating;

    // Calculate fixed cost (manager fee minus forecast costs)
    const forecastCostTotal =
      forecastCold * priceCold + forecastHot * (priceCold + priceHotHeating) + forecastHeating * priceHeating;
    const fixedCostRaw = managerFee - forecastCostTotal;

    // Calculate actual rent (fixed cost + all meter costs)
    const actualRentRaw = fixedCostRaw + meterCostColdRaw + meterCostHotRaw + meterCostHeatingRaw;

    // Calculate balance (advance payment - actual rent)
    const balanceRaw = advancePayment - actualRentRaw;

    return {
      fixedCostRaw,
      meterCostColdRaw,
      meterCostHotRaw,
      meterCostHeatingRaw,
      actualRentRaw,
      balanceRaw,
    };
  }
}

/**
 * Map database row to DTO
 */
function mapReportRowToDto(row: ReportRow): ReportDTO {
  return {
    id: row.id,
    contractId: row.contract_id,
    month: row.month.substring(0, 7), // Convert "YYYY-MM-DD" to "YYYY-MM"
    status: row.status as ReportDTO["status"],
    anchorReadingId: row.anchor_reading_id,
    anchorReadingNextId: row.anchor_reading_next_id,
    monthlyConditionsId: row.monthly_conditions_id,
    fixedCostRaw: Number(row.fixed_cost_raw),
    meterCostColdRaw: Number(row.meter_cost_cold_raw),
    meterCostHotRaw: Number(row.meter_cost_hot_raw),
    meterCostHeatingRaw: Number(row.meter_cost_heating_raw),
    actualRentRaw: Number(row.actual_rent_raw),
    balanceRaw: Number(row.balance_raw),
    realizedAt: row.realized_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

