/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/db/database.types";
import type { ReadingDTO } from "@/types";
import { ReadingsService } from "@/lib/services/ReadingsService";

const BASE_ROW: Database["public"]["Tables"]["readings"]["Row"] = {
  id: "reading-1",
  property_id: "property-1",
  reading_at: "2024-05-10T00:00:00.000Z",
  effective_month: null,
  base_for_month: null,
  final_for_month: null,
  origin: "tenant",
  reading_type: "regular",
  cold_m3: 10,
  hot_m3: 5,
  heating_gj: 2,
  cold_replaced: false,
  hot_replaced: false,
  heating_replaced: false,
  comment_text: null,
  comment_visible_to_tenant: true,
  deleted_at: null,
  created_at: "2024-05-10T00:00:00.000Z",
  updated_at: "2024-05-10T00:00:00.000Z",
};

const BASE_DTO: ReadingDTO = {
  id: "reading-1",
  propertyId: "property-1",
  readingAt: "2024-05-10T00:00:00.000Z",
  effectiveMonth: null,
  baseForMonth: null,
  finalForMonth: null,
  origin: "tenant",
  readingType: "regular",
  coldM3: 10,
  hotM3: 5,
  heatingGj: 2,
  coldReplaced: false,
  hotReplaced: false,
  heatingReplaced: false,
  commentText: null,
  commentVisibleToTenant: true,
  deletedAt: null,
  createdAt: "2024-05-10T00:00:00.000Z",
  updatedAt: "2024-05-10T00:00:00.000Z",
};

describe("ReadingsService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when tenant submits reading outside allowed window", async () => {
    const supabase = createSupabaseStub();

    await expect(
      ReadingsService.create(
        supabase,
        {
          propertyId: "property-1",
          readingAt: "2024-05-01T00:00:00.000Z",
          coldM3: 10,
          hotM3: 5,
          heatingGj: 3,
        },
        {
          role: "tenant",
          now: new Date("2024-05-20T00:00:00.000Z"),
        }
      )
    ).rejects.toMatchObject({ code: "READING_WINDOW_VIOLATION" });
  });

  it("inserts readings with canonical defaults", async () => {
    const insertedRow = { ...BASE_ROW, comment_text: "tenant note" };
    const { supabase, insertMock } = createSupabaseForInsert({ data: insertedRow, error: null });

    const reading = await ReadingsService.create(
      supabase,
      {
        propertyId: BASE_ROW.property_id,
        readingAt: BASE_ROW.reading_at,
        coldM3: BASE_ROW.cold_m3,
        hotM3: BASE_ROW.hot_m3,
        heatingGj: BASE_ROW.heating_gj,
        commentText: "tenant note",
      },
      { role: "tenant", now: new Date(BASE_ROW.reading_at) }
    );

    expect(reading).toMatchObject({
      propertyId: BASE_ROW.property_id,
      coldM3: BASE_ROW.cold_m3,
      commentText: "tenant note",
      origin: "tenant",
      readingType: "regular",
    });

    const payload = insertMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      origin: "tenant",
      reading_type: "regular",
      comment_visible_to_tenant: true,
      effective_month: null,
    });
  });

  it("lists readings and maps database rows to DTOs", async () => {
    const { supabase, builder } = createSupabaseForList({ data: [BASE_ROW], error: null });

    const result = await ReadingsService.list(supabase, {
      propertyId: BASE_ROW.property_id,
    });

    expect(builder.eq).toHaveBeenCalledWith("property_id", BASE_ROW.property_id);
    expect(result.items[0]).toMatchObject({
      propertyId: BASE_ROW.property_id,
      coldM3: BASE_ROW.cold_m3,
    });
  });

  it("prevents tenants from updating admin replacement readings", async () => {
    vi.spyOn(ReadingsService, "getById").mockResolvedValue({
      ...BASE_DTO,
      origin: "admin_replacement",
    });

    await expect(
      ReadingsService.update(createSupabaseStub(), "reading-1", {}, { role: "tenant" })
    ).rejects.toMatchObject({ code: "READING_FORBIDDEN" });
  });

  it("rejects replacement when property differs from source", async () => {
    vi.spyOn(ReadingsService, "getById").mockResolvedValue(BASE_DTO);

    await expect(
      ReadingsService.createReplacement(createSupabaseStub(), "reading-1", {
        propertyId: "other-property",
        readingAt: BASE_DTO.readingAt,
        effectiveMonth: "2024-05-01",
        coldM3: 12,
        hotM3: 6,
        heatingGj: 4,
      })
    ).rejects.toMatchObject({ code: "READING_PROPERTY_MISMATCH" });
  });

  it("maps unique constraint errors to domain conflicts", async () => {
    vi.spyOn(ReadingsService, "getById").mockResolvedValue(BASE_DTO);

    const { supabase } = createSupabaseForInsert({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });

    await expect(
      ReadingsService.createReplacement(supabase, "reading-1", {
        propertyId: BASE_DTO.propertyId,
        readingAt: BASE_DTO.readingAt,
        effectiveMonth: "2024-05-01",
        coldM3: 12,
        hotM3: 6,
        heatingGj: 4,
      })
    ).rejects.toMatchObject({ code: "READING_DUPLICATE_REPLACEMENT" });
  });

  it("propagates not-found errors on soft delete", async () => {
    const { supabase } = createSupabaseForSoftDelete({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    await expect(ReadingsService.softDelete(supabase, "missing")).rejects.toMatchObject({
      code: "READING_NOT_FOUND",
    });
  });

  describe("updateMonths", () => {
    it("updates base_for_month and final_for_month", async () => {
      const updatedRow = {
        ...BASE_ROW,
        base_for_month: "2024-05-01",
        final_for_month: "2024-06-01",
      };

      const single = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      const select = vi.fn().mockReturnValue({ single });

      const createChain = () => {
        const clearResult = Promise.resolve({ error: null });
        const chain: any = {
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          select,
          then: clearResult.then.bind(clearResult),
          catch: clearResult.catch.bind(clearResult),
          finally: clearResult.finally.bind(clearResult),
        };
        return chain;
      };

      const update = vi.fn(() => createChain());
      const builder = {
        update,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
            }),
          }),
        }),
      };

      const supabase = {
        from: vi.fn(() => builder),
      } as unknown as SupabaseClient<Database>;

      const result = await ReadingsService.updateMonths(supabase, "reading-1", {
        baseForMonth: "2024-05",
        finalForMonth: "2024-06",
      });

      expect(result.baseForMonth).toBe("2024-05-01");
      expect(result.finalForMonth).toBe("2024-06-01");
    });

    it("handles unique constraint violations", async () => {
      const single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate" },
      });
      const select = vi.fn().mockReturnValue({ single });

      const createChain = () => {
        const clearResult = Promise.resolve({ error: null });
        const chain: any = {
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          select,
          then: clearResult.then.bind(clearResult),
          catch: clearResult.catch.bind(clearResult),
          finally: clearResult.finally.bind(clearResult),
        };
        return chain;
      };

      const update = vi.fn(() => createChain());
      const builder = {
        update,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: BASE_ROW, error: null }),
            }),
          }),
        }),
      };

      const supabase = {
        from: vi.fn(() => builder),
      } as unknown as SupabaseClient<Database>;

      await expect(
        ReadingsService.updateMonths(supabase, "reading-1", {
          baseForMonth: "2024-05",
        })
      ).rejects.toMatchObject({
        code: "DATABASE_ERROR",
        message: expect.stringContaining("already assigned"),
      });
    });
  });

  describe("findPairForPropertyAndMonth", () => {
    it("returns pair when both base and final exist", async () => {
      const baseRow = { ...BASE_ROW, id: "base-1", base_for_month: "2024-05-01" };
      const finalRow = { ...BASE_ROW, id: "final-1", final_for_month: "2024-05-01" };

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValueOnce({ data: baseRow, error: null })
                    .mockResolvedValueOnce({ data: finalRow, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      const pair = await ReadingsService.findPairForPropertyAndMonth(supabase, "property-1", "2024-05");

      expect(pair).not.toBeNull();
      expect(pair?.base.id).toBe("base-1");
      expect(pair?.final.id).toBe("final-1");
    });

    it("returns null when base is missing", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      const pair = await ReadingsService.findPairForPropertyAndMonth(supabase, "property-1", "2024-05");

      expect(pair).toBeNull();
    });
  });

  describe("getAffectedMonths", () => {
    it("returns both months when both are set", async () => {
      vi.spyOn(ReadingsService, "getById").mockResolvedValue({
        ...BASE_DTO,
        baseForMonth: "2024-05-01",
        finalForMonth: "2024-06-01",
      });

      const months = await ReadingsService.getAffectedMonths(createSupabaseStub(), "reading-1");

      expect(months).toEqual(["2024-05", "2024-06"]);
    });

    it("returns single month when only base is set", async () => {
      vi.spyOn(ReadingsService, "getById").mockResolvedValue({
        ...BASE_DTO,
        baseForMonth: "2024-05-01",
        finalForMonth: null,
      });

      const months = await ReadingsService.getAffectedMonths(createSupabaseStub(), "reading-1");

      expect(months).toEqual(["2024-05"]);
    });

    it("returns empty array when no months are set", async () => {
      vi.spyOn(ReadingsService, "getById").mockResolvedValue({
        ...BASE_DTO,
        baseForMonth: null,
        finalForMonth: null,
      });

      const months = await ReadingsService.getAffectedMonths(createSupabaseStub(), "reading-1");

      expect(months).toEqual([]);
    });
  });
});

function createSupabaseStub(): SupabaseClient<Database> {
  return {
    from: vi.fn(),
  } as unknown as SupabaseClient<Database>;
}

function createSupabaseForInsert(result: {
  data: Database["public"]["Tables"]["readings"]["Row"] | null;
  error: { code?: string; message?: string } | null;
}): {
  supabase: SupabaseClient<Database>;
  insertMock: ReturnType<typeof vi.fn>;
} {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insertMock = vi.fn().mockReturnValue({ select });
  const builder = {
    insert: insertMock,
  };

  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase, insertMock };
}

function createSupabaseForList(rangeResult: {
  data: Database["public"]["Tables"]["readings"]["Row"][] | null;
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
  data: Database["public"]["Tables"]["readings"]["Row"][] | null;
  error: { message?: string } | null;
}) {
  const executePromise = Promise.resolve(rangeResult);

  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: executePromise.then.bind(executePromise),
    catch: executePromise.catch.bind(executePromise),
    finally: executePromise.finally.bind(executePromise),
  };
}

function createSupabaseForSoftDelete(result: { data: unknown; error: { code?: string; message?: string } | null }): {
  supabase: SupabaseClient<Database>;
} {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const isMethod = vi.fn().mockReturnValue({ select });
  const eqMethod = vi.fn().mockReturnValue({ is: isMethod, select });
  const update = vi.fn().mockReturnValue({ eq: eqMethod });
  const builder = {
    update,
  };

  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createSupabaseForUpdate(result: {
  data: Database["public"]["Tables"]["readings"]["Row"] | null;
  error: { code?: string; message?: string } | null;
}): {
  supabase: SupabaseClient<Database>;
} {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });

  const createChain = () => {
    const clearResult = Promise.resolve({ error: null });
    const chain: any = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      select,
      then: clearResult.then.bind(clearResult),
      catch: clearResult.catch.bind(clearResult),
      finally: clearResult.finally.bind(clearResult),
    };
    return chain;
  };

  const update = vi.fn(() => createChain());
  const builder = { update };

  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient<Database>;

  return { supabase };
}
