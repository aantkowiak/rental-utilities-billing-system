/* eslint-disable no-console */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { ReportDTO, ReportItemDTO, YearMonth } from "@/types";
import { yearMonthToISODate, isoDateToYearMonth } from "@/lib/date/month";
import { ReadingsService, type ReadingPair } from "./ReadingsService";

/* eslint-disable @typescript-eslint/no-extraneous-class */

type Supabase = SupabaseClient<Database>;
type ReportsTable = Database["public"]["Tables"]["reports"];
type ReportRow = ReportsTable["Row"];
type ReportItemRow = Database["public"]["Tables"]["report_items"]["Row"];
type MonthlyAdvancesTable = Database["public"]["Tables"]["monthly_advances"];
type MonthlyAdvancesRow = MonthlyAdvancesTable["Row"];

export type ReportServiceErrorCode =
  | "REPORT_NOT_FOUND"
  | "REPORT_FORBIDDEN"
  | "REPORT_DUPLICATE"
  | "CONTRACT_NOT_FOUND"
  | "MISSING_READING_PAIR"
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

interface ReportItemCalculation {
  propertyId: string;
  baselineReadingId: string;
  finalReadingId: string;
  usageColdM3: number;
  usageHotM3: number;
  usageHeatingGj: number;
  costColdRaw: number;
  costHotRaw: number;
  costHeatingRaw: number;
  fixedCostRaw: number;
  amountRaw: number;
}

export class ReportService {
  /**
   * Generate a new report for a given contract and month.
   * New logic:
   * 1. Validate contract exists and user has access
   * 2. Find reading pair (base and final) for the property and month
   * 3. Fetch monthly conditions for the month
   * 4. Calculate costs for the single property (one item)
   * 5. Create report record with report_items
   */
  static async generate(
    supabase: Supabase,
    context: ReportAccessContext,
    contractId: string,
    month: YearMonth
  ): Promise<ReportDTO> {
    // Step 1: Validate contract and get property
    const contract = await this.getContractWithAccess(supabase, context, contractId);

    // Step 2: Format month as first day of month (YYYY-MM-DD)
    const monthDate = yearMonthToISODate(month);

    // Step 3: Check if report already exists
    const existingReport = await this.findExistingReportForProperty(supabase, contract.property_id, monthDate);
    if (existingReport) {
      throw new ReportServiceError(
        "REPORT_DUPLICATE",
        `Raport dla nieruchomości ${contract.property_id} i miesiąca ${month} już istnieje.`
      );
    }

    // Step 4: Find reading pair for the property and month
    const pair = await ReadingsService.findPairForPropertyAndMonth(supabase, contract.property_id, month);
    if (!pair) {
      throw new ReportServiceError(
        "MISSING_READING_PAIR",
        `Brak pary odczytów (bazowy i finalny) dla nieruchomości i miesiąca ${month}.`
      );
    }

    // Step 5: Fetch monthly conditions
    const conditions = await this.getMonthlyConditions(supabase, contract.property_id, monthDate);

    // Step 6: Calculate costs for this property
    const itemCalc = this.calculateReportItem(pair, conditions, contract.property_id);

    // Step 7: Create report (without cost columns, those are now in report_items)
    const { data: newReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        contract_id: contractId,
        property_id: contract.property_id,
        month: monthDate,
        status: "draft",
        sent: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[ReportService.generate] Error creating report:", insertError);
      throw new ReportServiceError("DATABASE_ERROR", "Nie udało się utworzyć raportu.");
    }

    // Step 8: Create report_item
    const { error: itemError } = await supabase.from("report_items").insert({
      report_id: newReport.id,
      property_id: itemCalc.propertyId,
      baseline_reading_id: itemCalc.baselineReadingId,
      final_reading_id: itemCalc.finalReadingId,
      usage_cold_m3: itemCalc.usageColdM3,
      usage_hot_m3: itemCalc.usageHotM3,
      usage_heating_gj: itemCalc.usageHeatingGj,
      cost_cold_raw: itemCalc.costColdRaw,
      cost_hot_raw: itemCalc.costHotRaw,
      cost_heating_raw: itemCalc.costHeatingRaw,
      fixed_cost_raw: itemCalc.fixedCostRaw,
      amount_raw: itemCalc.amountRaw,
    });

    if (itemError) {
      console.error("[ReportService.generate] Error creating report_item:", itemError);
      // Rollback: delete the report
      await supabase.from("reports").delete().eq("id", newReport.id);
      throw new ReportServiceError("DATABASE_ERROR", "Nie udało się utworzyć pozycji raportu.");
    }

    return mapReportRowToDto(newReport);
  }

  /**
   * Regenerate (rebuild) an existing report.
   * Deletes old report_items and recalculates based on current readings and conditions.
   */
  static async regenerate(supabase: Supabase, context: ReportAccessContext, reportId: string): Promise<ReportDTO> {
    // Get existing report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*, contracts!inner(id, property_id, tenant_user_id)")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      throw new ReportServiceError("REPORT_NOT_FOUND", "Raport nie został znaleziony.");
    }

    // Check access
    const contract = report.contracts;
    if (context.role === "tenant" && contract.tenant_user_id !== context.userId) {
      throw new ReportServiceError("REPORT_FORBIDDEN", "Brak uprawnień do tego raportu.");
    }

    const month = isoDateToYearMonth(report.month);
    const propertyId = contract.property_id;

    // Find reading pair
    const pair = await ReadingsService.findPairForPropertyAndMonth(supabase, propertyId, month);
    if (!pair) {
      // No pair available - delete report and items
      await supabase.from("reports").delete().eq("id", reportId);
      throw new ReportServiceError(
        "MISSING_READING_PAIR",
        `Brak pary odczytów dla miesiąca ${month}. Raport został usunięty.`
      );
    }

    // Fetch monthly conditions
    const conditions = await this.getMonthlyConditions(supabase, propertyId, report.month);

    // Calculate new item
    const itemCalc = this.calculateReportItem(pair, conditions, propertyId);

    // Delete old items
    await supabase.from("report_items").delete().eq("report_id", reportId);

    // Insert new item
    const { error: itemError } = await supabase.from("report_items").insert({
      report_id: reportId,
      property_id: itemCalc.propertyId,
      baseline_reading_id: itemCalc.baselineReadingId,
      final_reading_id: itemCalc.finalReadingId,
      usage_cold_m3: itemCalc.usageColdM3,
      usage_hot_m3: itemCalc.usageHotM3,
      usage_heating_gj: itemCalc.usageHeatingGj,
      cost_cold_raw: itemCalc.costColdRaw,
      cost_hot_raw: itemCalc.costHotRaw,
      cost_heating_raw: itemCalc.costHeatingRaw,
      fixed_cost_raw: itemCalc.fixedCostRaw,
      amount_raw: itemCalc.amountRaw,
    });

    if (itemError) {
      console.error("[ReportService.regenerate] Error creating report_item:", itemError);
      throw new ReportServiceError("DATABASE_ERROR", "Nie udało się odtworzyć pozycji raportu.");
    }

    // Update timestamp to reflect recomputation
    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", reportId)
      .select("*")
      .single();

    if (updateError || !updatedReport) {
      throw new ReportServiceError("DATABASE_ERROR", "Nie udało się zaktualizować raportu po przeliczeniu.");
    }

    return mapReportRowToDto(updatedReport);
  }

  /**
   * Recompute ALL reports in the system.
   * This is called after any CRUD operation on readings or monthly advances.
   */
  static async recomputeAll(supabase: Supabase): Promise<void> {
    // Get all reports
    const { data: allReports, error: reportsError } = await supabase.from("reports").select("id, property_id, month");

    if (reportsError) {
      console.error("[ReportService.recomputeAll] Failed to fetch reports:", reportsError);
      return;
    }

    if (!allReports || allReports.length === 0) {
      console.info("[ReportService.recomputeAll] No reports to recompute");
      return;
    }

    // Regenerate each report
    for (const report of allReports) {
      try {
        const month = isoDateToYearMonth(report.month);
        const pair = await ReadingsService.findPairForPropertyAndMonth(supabase, report.property_id, month);

        if (!pair) {
          // No pair available - delete report
          await supabase.from("reports").delete().eq("id", report.id);
          console.info(
            `[ReportService.recomputeAll] Deleted report ${report.id} for property ${report.property_id} and month ${month} (missing pair)`
          );
          continue;
        }

        await this.regenerate(supabase, { role: "admin", userId: "system" }, report.id);
        console.info(`[ReportService.recomputeAll] Regenerated report ${report.id}`);
      } catch (error) {
        console.error(`[ReportService.recomputeAll] Error processing report ${report.id}:`, error);
      }
    }
  }

  /**
   * Recompute reports affected by a reading change.
   * This is called after updating a reading's baseForMonth or finalForMonth.
   */
  static async recomputeForReading(supabase: Supabase, readingId: string): Promise<void> {
    // Get affected months
    const months = await ReadingsService.getAffectedMonths(supabase, readingId);

    // Get the property for this reading
    const reading = await ReadingsService.getById(supabase, readingId);
    const propertyId = reading.propertyId;

    // For each month, find all reports for contracts on this property
    for (const month of months) {
      const monthISO = yearMonthToISODate(month);

      const { data: existingReports, error: reportsError } = await supabase
        .from("reports")
        .select("id")
        .eq("property_id", propertyId)
        .eq("month", monthISO);

      if (reportsError) {
        console.error("[ReportService.recomputeForReading] Failed to fetch reports:", reportsError);
        continue;
      }

      const pair = await ReadingsService.findPairForPropertyAndMonth(supabase, propertyId, month);

      if (!pair) {
        if (existingReports && existingReports.length > 0) {
          const ids = existingReports.map((report) => report.id);
          await supabase.from("reports").delete().in("id", ids);
          console.info(
            `[ReportService.recomputeForReading] Deleted ${ids.length} report(s) for property ${propertyId} and month ${month} (missing pair)`
          );
        }
        continue;
      }

      if (existingReports && existingReports.length > 0) {
        for (const report of existingReports) {
          try {
            await this.regenerate(supabase, { role: "admin", userId: "system" }, report.id);
            console.info(`[ReportService.recomputeForReading] Regenerated report ${report.id}`);
          } catch (error) {
            console.error(`[ReportService.recomputeForReading] Error regenerating report ${report.id}:`, error);
          }
        }
        continue;
      }

      try {
        const contract = await this.getContractForPropertyMonth(supabase, propertyId, monthISO);
        if (!contract) {
          console.info(
            `[ReportService.recomputeForReading] Skipping auto-generation for property ${propertyId} and month ${month} (no contract found)`
          );
          continue;
        }

        await this.generate(supabase, { role: "admin", userId: "system" }, contract.id, month);
        console.info(
          `[ReportService.recomputeForReading] Auto-generated report for property ${propertyId}, contract ${contract.id}, month ${month}`
        );
      } catch (error) {
        console.error(
          `[ReportService.recomputeForReading] Failed to auto-generate report for property ${propertyId} and month ${month}:`,
          error
        );
      }
    }
  }

  /**
   * Update report sent status
   */
  static async updateSent(supabase: Supabase, reportId: string, sent: boolean): Promise<ReportDTO> {
    const { data, error } = await supabase.from("reports").update({ sent }).eq("id", reportId).select().single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ReportServiceError("REPORT_NOT_FOUND", "Raport nie został znaleziony.");
      }
      throw new ReportServiceError("DATABASE_ERROR", error.message);
    }

    return mapReportRowToDto(data);
  }

  /**
   * Get report by ID with access check
   */
  static async getById(supabase: Supabase, context: ReportAccessContext, reportId: string): Promise<ReportDTO> {
    const { data: report, error } = await supabase
      .from("reports")
      .select("*, contracts!inner(tenant_user_id)")
      .eq("id", reportId)
      .single();

    if (error || !report) {
      throw new ReportServiceError("REPORT_NOT_FOUND", "Raport nie został znaleziony.");
    }

    // Check access
    if (context.role === "tenant" && report.contracts.tenant_user_id !== context.userId) {
      throw new ReportServiceError("REPORT_FORBIDDEN", "Brak uprawnień do tego raportu.");
    }

    return mapReportRowToDto(report);
  }

  /**
   * Get report items for a report
   */
  static async getItems(supabase: Supabase, reportId: string): Promise<ReportItemDTO[]> {
    const { data, error } = await supabase
      .from("report_items")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new ReportServiceError("DATABASE_ERROR", error.message);
    }

    return (data ?? []).map(mapReportItemRowToDto);
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
  private static async findExistingReportForProperty(
    supabase: Supabase,
    propertyId: string,
    monthDate: string
  ): Promise<ReportRow | null> {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("property_id", propertyId)
      .eq("month", monthDate)
      .maybeSingle();

    return data;
  }

  /**
   * Find contract covering given property and month (inclusive).
   */
  private static async getContractForPropertyMonth(
    supabase: Supabase,
    propertyId: string,
    monthDate: string
  ): Promise<{ id: string; property_id: string; tenant_user_id: string } | null> {
    const monthStart = new Date(`${monthDate}T00:00:00.000Z`);
    if (Number.isNaN(monthStart.getTime())) {
      return null;
    }

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const range = `[${monthStart.toISOString()},${monthEnd.toISOString()}]`;

    const { data, error } = await supabase
      .from("contracts")
      .select("id, property_id, tenant_user_id")
      .eq("property_id", propertyId)
      .overlaps("period", range);

    if (error) {
      throw new ReportServiceError("DATABASE_ERROR", error.message);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  }

  /**
   * Get monthly conditions for the given property and month
   */
  private static async getMonthlyConditions(
    supabase: Supabase,
    propertyId: string,
    monthDate: string
  ): Promise<MonthlyAdvancesRow> {
    const { data: conditions, error } = await supabase
      .from("monthly_advances")
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
   * Calculate report item costs based on reading pair and monthly conditions.
   * According to FR-011 from PRD:
   * - cold water cost = consumption_cold × price_cold
   * - hot water cost = consumption_hot × (price_cold + price_heating_hot)
   * - heating cost = consumption_heating × price_heating
   * - fixed_cost = manager_fee - (forecast_cold × price_cold + forecast_hot × (price_cold + price_heating_hot) + forecast_heating × price_heating)
   * - amount = fixed_cost + (sum of meter costs)
   */
  private static calculateReportItem(
    pair: ReadingPair,
    conditions: MonthlyAdvancesRow,
    propertyId: string
  ): ReportItemCalculation {
    // Calculate consumption (difference between final and base reading)
    // Ensure non-negative (max with 0)
    const usageColdM3 = Math.max(0, Number(pair.final.coldM3) - Number(pair.base.coldM3));
    const usageHotM3 = Math.max(0, Number(pair.final.hotM3) - Number(pair.base.hotM3));
    const usageHeatingGj = Math.max(0, Number(pair.final.heatingGj) - Number(pair.base.heatingGj));

    // Get prices
    const priceCold = Number(conditions.price_cold);
    const priceHotHeating = Number(conditions.price_hot_heating);
    const priceHeating = Number(conditions.price_heating);
    const managerFee = Number(conditions.manager_fee);

    // Get forecasts
    const forecastCold = Number(conditions.forecast_cold);
    const forecastHot = Number(conditions.forecast_hot);
    const forecastHeating = Number(conditions.forecast_heating);

    // Calculate meter costs
    const costColdRaw = usageColdM3 * priceCold;
    const costHotRaw = usageHotM3 * (priceCold + priceHotHeating);
    const costHeatingRaw = usageHeatingGj * priceHeating;

    // Calculate fixed cost (manager fee minus forecast costs)
    const forecastCostTotal =
      forecastCold * priceCold + forecastHot * (priceCold + priceHotHeating) + forecastHeating * priceHeating;
    const fixedCostRaw = managerFee - forecastCostTotal;

    // Calculate total amount for this item (fixed cost + all meter costs)
    const amountRaw = fixedCostRaw + costColdRaw + costHotRaw + costHeatingRaw;

    return {
      propertyId,
      baselineReadingId: pair.base.id,
      finalReadingId: pair.final.id,
      usageColdM3,
      usageHotM3,
      usageHeatingGj,
      costColdRaw,
      costHotRaw,
      costHeatingRaw,
      fixedCostRaw,
      amountRaw,
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
    propertyId: row.property_id,
    month: row.month.substring(0, 7), // Convert "YYYY-MM-DD" to "YYYY-MM"
    status: row.status as ReportDTO["status"],
    sent: row.sent,
    realizedAt: row.realized_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map report_item row to DTO
 */
function mapReportItemRowToDto(row: ReportItemRow): ReportItemDTO {
  return {
    id: row.id,
    reportId: row.report_id,
    propertyId: row.property_id,
    baselineReadingId: row.baseline_reading_id,
    finalReadingId: row.final_reading_id,
    usageColdM3: Number(row.usage_cold_m3),
    usageHotM3: Number(row.usage_hot_m3),
    usageHeatingGj: Number(row.usage_heating_gj),
    costColdRaw: Number(row.cost_cold_raw),
    costHotRaw: Number(row.cost_hot_raw),
    costHeatingRaw: Number(row.cost_heating_raw),
    fixedCostRaw: Number(row.fixed_cost_raw),
    amountRaw: Number(row.amount_raw),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
