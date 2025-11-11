import type { SupabaseClient } from "@supabase/supabase-js";

import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/db/database.types";
import { ContractService } from "@/lib/services/ContractService";
import { contractPeriodToPostgresRange } from "@/lib/validators/contractPeriod";

const CONTRACT_PERIOD = { from: "2024-01-01", to: "2024-12-31" };

const CONTRACT_ROW = {
  id: "contract-1",
  property_id: "property-1",
  tenant_user_id: "tenant-1",
  period: contractPeriodToPostgresRange(CONTRACT_PERIOD),
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
} satisfies Database["public"]["Tables"]["contracts"]["Row"];

describe("ContractService", () => {
  it("scopes tenant list requests to the authenticated user", async () => {
    const { supabase, builder } = createSupabaseForList({
      data: [CONTRACT_ROW],
      error: null,
    });

    const result = await ContractService.list(
      supabase,
      { role: "tenant", userId: "tenant-1" },
      {
        filters: {},
      }
    );

    expect(builder.eq).toHaveBeenCalledWith("tenant_user_id", "tenant-1");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].period).toEqual(CONTRACT_PERIOD);
  });

  it("applies active filter using overlaps operator", async () => {
    const { supabase, builder } = createSupabaseForList({
      data: [],
      error: null,
    });

    await ContractService.list(
      supabase,
      { role: "admin", userId: "admin-1" },
      {
        filters: {
          active: true,
        },
      }
    );

    expect(builder.overlaps).toHaveBeenCalledTimes(1);
    const [column, range] = builder.overlaps.mock.calls[0];
    expect(column).toBe("period");
    expect(range.startsWith("[")).toBe(true);
    expect(range.endsWith("]") || range.endsWith(")")).toBe(true);
  });

  it("throws domain error on period overlap during creation", async () => {
    const { supabase } = createSupabaseForInsert({
      data: null,
      error: { code: "23P01", message: "no_overlapping_contracts" },
    });

    await expect(
      ContractService.create(
        supabase,
        { role: "admin", userId: "admin-1" },
        {
          propertyId: "property-1",
          tenantUserId: "tenant-1",
          period: CONTRACT_PERIOD,
        }
      )
    ).rejects.toThrowError("CONTRACT_PERIOD_OVERLAP");
  });

  it("creates a contract and maps database row to DTO", async () => {
    const { supabase, insertMock } = createSupabaseForInsert({
      data: CONTRACT_ROW,
      error: null,
    });

    const contract = await ContractService.create(
      supabase,
      { role: "admin", userId: "admin-1" },
      {
        propertyId: "property-1",
        tenantUserId: "tenant-1",
        period: CONTRACT_PERIOD,
      }
    );

    expect(contract).toMatchObject({
      id: "contract-1",
      propertyId: "property-1",
      tenantUserId: "tenant-1",
      period: CONTRACT_PERIOD,
    });

    const inserted = insertMock.mock.calls[0]?.[0];
    expect(inserted.period).toBe(contractPeriodToPostgresRange(CONTRACT_PERIOD));
  });
});

function createSupabaseForList(rangeResult: {
  data: Database["public"]["Tables"]["contracts"]["Row"][] | null;
  error: unknown;
}): {
  supabase: SupabaseClient<Database>;
  builder: ReturnType<typeof createListBuilder>;
} {
  const builder = createListBuilder(rangeResult);
  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase, builder };
}

function createListBuilder(rangeResult: {
  data: Database["public"]["Tables"]["contracts"]["Row"][] | null;
  error: unknown;
}) {
  const executePromise = Promise.resolve(rangeResult);
  const execute = vi.fn(() => executePromise);

  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    then: executePromise.then.bind(executePromise),
    catch: executePromise.catch.bind(executePromise),
    finally: executePromise.finally.bind(executePromise),
    execute,
  };
}

function createSupabaseForInsert(result: {
  data: Database["public"]["Tables"]["contracts"]["Row"] | null;
  error: { code?: string; message?: string } | null;
}): {
  supabase: SupabaseClient<Database>;
  insertMock: ReturnType<typeof vi.fn>;
} {
  const singleMock = vi.fn().mockResolvedValue(result);
  const selectMock = vi.fn().mockReturnValue({ single: singleMock });
  const insertMock = vi.fn().mockReturnValue({ select: selectMock });
  const builder = {
    insert: insertMock,
  };

  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase, insertMock };
}
