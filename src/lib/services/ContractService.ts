import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { ContractDTO, CreateContractCmd, UpdateContractCmd } from "@/types";
import type { ContractFilters, ListContractsResponse } from "@/types/contracts";
import {
  contractPeriodFromPostgresRange,
  contractPeriodToPostgresRange,
  parseContractPeriod,
} from "@/lib/validators/contractPeriod";

type ContractsTable = Database["public"]["Tables"]["contracts"];
type ContractRow = ContractsTable["Row"];

export interface ContractAccessContext {
  role: "admin" | "tenant";
  userId: string;
}

export interface ContractListParams {
  filters?: ContractFilters;
}

export class ContractService {
  static async list(
    supabase: SupabaseClient<Database>,
    context: ContractAccessContext,
    params: ContractListParams = {}
  ): Promise<ListContractsResponse> {
    const { filters = {} } = params;
    let query = supabase.from("contracts").select("*").order("created_at", { ascending: false });

    if (filters.propertyId) {
      query = query.eq("property_id", filters.propertyId);
    }

    if (filters.tenantUserId) {
      query = query.eq("tenant_user_id", filters.tenantUserId);
    }

    if (context.role === "tenant") {
      query = query.eq("tenant_user_id", context.userId);
    }

    if (filters.active !== undefined) {
      const nowIso = new Date().toISOString();

      if (filters.active) {
        query = query.overlaps("period", `[${nowIso},${nowIso}]`);
      } else {
        query = query.not("period", "ov", `[${nowIso},${nowIso}]`);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`CONTRACT_LIST_FAILED:${error.code ?? "unknown"}`);
    }

    const rows = data ?? [];
    const items = rows.map(mapRowToContractDto);

    return {
      items,
    };
  }

  static async getById(
    supabase: SupabaseClient<Database>,
    context: ContractAccessContext,
    contractId: string
  ): Promise<ContractDTO> {
    let query = supabase.from("contracts").select("*").eq("id", contractId);

    if (context.role === "tenant") {
      query = query.eq("tenant_user_id", context.userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      if (error?.code === "PGRST116" || !data) {
        throw new Error("CONTRACT_NOT_FOUND");
      }

      throw new Error(`CONTRACT_FETCH_FAILED:${error.code ?? "unknown"}`);
    }

    return mapRowToContractDto(data);
  }

  static async create(
    supabase: SupabaseClient<Database>,
    context: ContractAccessContext,
    cmd: CreateContractCmd
  ): Promise<ContractDTO> {
    if (context.role !== "admin") {
      throw new Error("CONTRACT_FORBIDDEN");
    }

    const period = parseContractPeriod(cmd.period);

    const insertData: ContractsTable["Insert"] = {
      property_id: cmd.propertyId,
      tenant_user_id: cmd.tenantUserId,
      period: contractPeriodToPostgresRange(period),
    };

    const { data, error } = await supabase.from("contracts").insert(insertData).select("*").single();

    if (error || !data) {
      if (error?.code === "23P01" || error?.message?.includes("no_overlapping_contracts")) {
        throw new Error("CONTRACT_PERIOD_OVERLAP");
      }

      if (error?.code === "23503") {
        throw new Error("CONTRACT_FOREIGN_KEY_VIOLATION");
      }

      throw new Error(`CONTRACT_CREATE_FAILED:${error?.code ?? "unknown"}`);
    }

    return mapRowToContractDto(data);
  }

  static async update(
    supabase: SupabaseClient<Database>,
    context: ContractAccessContext,
    contractId: string,
    cmd: UpdateContractCmd
  ): Promise<ContractDTO> {
    if (context.role !== "admin") {
      throw new Error("CONTRACT_FORBIDDEN");
    }

    const updateData: ContractsTable["Update"] = {};

    if (cmd.propertyId !== undefined) {
      updateData.property_id = cmd.propertyId;
    }

    if (cmd.tenantUserId !== undefined) {
      updateData.tenant_user_id = cmd.tenantUserId;
    }

    if (cmd.period !== undefined) {
      const period = parseContractPeriod(cmd.period);
      updateData.period = contractPeriodToPostgresRange(period);
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(supabase, context, contractId);
    }

    const { data, error } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", contractId)
      .select("*")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        throw new Error("CONTRACT_NOT_FOUND");
      }

      if (error?.code === "23P01" || error?.message?.includes("no_overlapping_contracts")) {
        throw new Error("CONTRACT_PERIOD_OVERLAP");
      }

      if (error?.code === "23503") {
        throw new Error("CONTRACT_FOREIGN_KEY_VIOLATION");
      }

      throw new Error(`CONTRACT_UPDATE_FAILED:${error?.code ?? "unknown"}`);
    }

    return mapRowToContractDto(data);
  }

  static async delete(
    supabase: SupabaseClient<Database>,
    context: ContractAccessContext,
    contractId: string
  ): Promise<void> {
    if (context.role !== "admin") {
      throw new Error("CONTRACT_FORBIDDEN");
    }

    const { error } = await supabase.from("contracts").delete().eq("id", contractId);

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("CONTRACT_NOT_FOUND");
      }

      throw new Error(`CONTRACT_DELETE_FAILED:${error.code ?? "unknown"}`);
    }
  }
}

function mapRowToContractDto(row: ContractRow): ContractDTO {
  return {
    id: row.id,
    propertyId: row.property_id,
    tenantUserId: row.tenant_user_id,
    period: contractPeriodFromPostgresRange(row.period),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
