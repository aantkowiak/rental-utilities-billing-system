import type { SupabaseClient } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/db/database.types";
import type { MonthlyAdvanceDTO } from "@/types";
import { MonthlyAdvanceService, MonthlyAdvanceServiceError } from "@/lib/services/MonthlyAdvanceService";

const BASE_ROW: Database["public"]["Tables"]["monthly_conditions"]["Row"] = {
  id: "mc-1",
  property_id: "property-1",
  month: "2025-01-01",
  manager_fee: 123.45,
  price_cold: 1.23,
  price_hot_heating: 2.34,
  price_heating: 3.45,
  forecast_cold: 10.1,
  forecast_hot: 11.2,
  forecast_heating: 12.3,
  advance_payment: 345.67,
  created_at: "2025-01-02T00:00:00.000Z",
  updated_at: "2025-01-03T00:00:00.000Z",
};

const BASE_DTO: MonthlyAdvanceDTO = {
  id: "mc-1",
  propertyId: "property-1",
  month: "2025-01-01",
  managerFee: 123.45,
  priceCold: 1.23,
  priceHotHeating: 2.34,
  priceHeating: 3.45,
  forecastCold: 10.1,
  forecastHot: 11.2,
  forecastHeating: 12.3,
  advancePayment: 345.67,
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z",
};

describe("MonthlyAdvanceService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists monthly advances and enforces tenant property filter", async () => {
    const { supabase, builder } = createSupabaseForList({
      data: [BASE_ROW],
      count: 1,
      error: null,
    });

    const result = await MonthlyAdvanceService.list(
      supabase,
      { role: "tenant", tenantPropertyId: BASE_ROW.property_id },
      {}
    );

    expect(builder.eq).toHaveBeenCalledWith("property_id", BASE_ROW.property_id);
    expect(result.items[0]).toMatchObject({
      id: BASE_ROW.id,
      managerFee: BASE_ROW.manager_fee,
    });
  });

  it("prevents tenants from reading monthly advances of other properties", async () => {
    const { supabase } = createSupabaseForSingle(BASE_ROW);

    await expect(
      MonthlyAdvanceService.getById(supabase, { role: "tenant", tenantPropertyId: "other-property" }, BASE_ROW.id)
    ).rejects.toMatchObject({ code: "MONTHLY_ADVANCE_FORBIDDEN" satisfies MonthlyAdvanceServiceError["code"] });
  });

  it("maps unique constraint errors to duplicate conflicts on create", async () => {
    const { supabase } = createSupabaseForInsert({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });

    await expect(
      MonthlyAdvanceService.create(
        supabase,
        { role: "admin" },
        {
          propertyId: BASE_ROW.property_id,
          month: BASE_ROW.month,
          managerFee: BASE_ROW.manager_fee,
          priceCold: BASE_ROW.price_cold,
          priceHotHeating: BASE_ROW.price_hot_heating,
          priceHeating: BASE_ROW.price_heating,
          forecastCold: BASE_ROW.forecast_cold,
          forecastHot: BASE_ROW.forecast_hot,
          forecastHeating: BASE_ROW.forecast_heating,
          advancePayment: BASE_ROW.advance_payment,
        }
      )
    ).rejects.toMatchObject({ code: "MONTHLY_ADVANCE_DUPLICATE" satisfies MonthlyAdvanceServiceError["code"] });
  });

  it("returns existing entry when update payload is empty", async () => {
    const supabase = createSupabaseStub();
    vi.spyOn(MonthlyAdvanceService, "getById").mockResolvedValue(BASE_DTO);

    const result = await MonthlyAdvanceService.update(supabase, { role: "admin" }, BASE_ROW.id, {});

    expect(result).toEqual(BASE_DTO);
  });

  it("blocks updates when linked reports are realized", async () => {
    vi.spyOn(MonthlyAdvanceService, "getById").mockResolvedValue(BASE_DTO);

    const { supabase, reportsBuilder } = createSupabaseForUpdate({
      reportsResult: { data: { id: "report-1" }, error: null },
      updateResult: { data: BASE_ROW, error: null },
    });

    await expect(
      MonthlyAdvanceService.update(supabase, { role: "admin" }, BASE_ROW.id, { managerFee: 555.55 })
    ).rejects.toMatchObject({
      code: "MONTHLY_ADVANCE_LOCKED_BY_REPORTS" satisfies MonthlyAdvanceServiceError["code"],
    });

    expect(reportsBuilder.maybeSingle).toHaveBeenCalled();
  });

  it("maps foreign key violations on delete to locked error", async () => {
    const { supabase } = createSupabaseForDelete({ error: { code: "23503", message: "fk" } });

    await expect(MonthlyAdvanceService.delete(supabase, { role: "admin" }, BASE_ROW.id)).rejects.toMatchObject({
      code: "MONTHLY_ADVANCE_LOCKED_BY_REPORTS" satisfies MonthlyAdvanceServiceError["code"],
    });
  });
});

function createSupabaseStub(): SupabaseClient<Database> {
  return {
    from: vi.fn(),
  } as unknown as SupabaseClient<Database>;
}

function createSupabaseForList(rangeResult: {
  data: Database["public"]["Tables"]["monthly_conditions"]["Row"][] | null;
  error: { message?: string } | null;
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
  data: Database["public"]["Tables"]["monthly_conditions"]["Row"][] | null;
  error: { message?: string } | null;
}) {
  const executePromise = Promise.resolve(rangeResult);

  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: executePromise.then.bind(executePromise),
    catch: executePromise.catch.bind(executePromise),
    finally: executePromise.finally.bind(executePromise),
  };
}

function createSupabaseForSingle(row: Database["public"]["Tables"]["monthly_conditions"]["Row"]): {
  supabase: SupabaseClient<Database>;
} {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq, single });
  const builder = {
    select,
  };

  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase };
}

function createSupabaseForInsert(result: {
  data: Database["public"]["Tables"]["monthly_conditions"]["Row"] | null;
  error: { code?: string; message?: string } | null;
}): {
  supabase: SupabaseClient<Database>;
} {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const builder = {
    insert,
  };

  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase };
}

function createSupabaseForUpdate(options: {
  reportsResult: { data: { id: string } | null; error: { message?: string } | null };
  updateResult: {
    data: Database["public"]["Tables"]["monthly_conditions"]["Row"] | null;
    error: { code?: string; message?: string } | null;
  };
}): {
  supabase: SupabaseClient<Database>;
  reportsBuilder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    neq: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };
} {
  const maybeSingle = vi.fn().mockResolvedValue(options.reportsResult);
  const reportsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle,
  } as const;

  const single = vi.fn().mockResolvedValue(options.updateResult);
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  const monthlyConditionsBuilder = {
    update,
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "reports") {
        return reportsBuilder;
      }

      if (table === "monthly_conditions") {
        return monthlyConditionsBuilder;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient<Database>;

  return { supabase, reportsBuilder };
}

function createSupabaseForDelete(result: { error: { code?: string; message?: string } | null }): {
  supabase: SupabaseClient<Database>;
} {
  const eq = vi.fn().mockResolvedValue({ error: result.error });
  const del = vi.fn().mockReturnValue({ eq });
  const builder = {
    delete: del,
  };

  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase };
}
