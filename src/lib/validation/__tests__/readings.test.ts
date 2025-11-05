import { describe, expect, it } from "vitest";

import {
  TENANT_WINDOW_FUTURE_DAYS,
  TENANT_WINDOW_PAST_DAYS,
  createReadingSchema,
  hasMaxDecimals,
  isWithinTenantWindow,
  recalculateAnchorsSchema,
  readingValueSchema,
} from "@/lib/validation/readings";

describe("readings validation helpers", () => {
  it("accepts reading values with up to three decimal places", () => {
    expect(() => readingValueSchema.parse(123.456)).not.toThrow();
    expect(() => readingValueSchema.parse(0)).not.toThrow();
    expect(() => readingValueSchema.parse(9_999_999.999)).not.toThrow();
  });

  it("rejects reading values exceeding precision or bounds", () => {
    expect(() => readingValueSchema.parse(-1)).toThrow();
    expect(() => readingValueSchema.parse(9_999_999.9999)).toThrow();
  });

  it("checks decimal precision safely", () => {
    expect(hasMaxDecimals(10.123, 3)).toBe(true);
    expect(hasMaxDecimals(10.1234, 3)).toBe(false);
  });

  it("enforces tenant submission window", () => {
    const now = new Date("2024-05-10T00:00:00.000Z");

    const withinPast = new Date(now.getTime() - TENANT_WINDOW_PAST_DAYS * 24 * 60 * 60 * 1000 + 1000);
    const withinFuture = new Date(now.getTime() + TENANT_WINDOW_FUTURE_DAYS * 24 * 60 * 60 * 1000 - 1000);
    const outsidePast = new Date(now.getTime() - (TENANT_WINDOW_PAST_DAYS + 1) * 24 * 60 * 60 * 1000);
    const outsideFuture = new Date(now.getTime() + (TENANT_WINDOW_FUTURE_DAYS + 1) * 24 * 60 * 60 * 1000);

    expect(isWithinTenantWindow(withinPast, now)).toBe(true);
    expect(isWithinTenantWindow(withinFuture, now)).toBe(true);
    expect(isWithinTenantWindow(outsidePast, now)).toBe(false);
    expect(isWithinTenantWindow(outsideFuture, now)).toBe(false);
  });

  it("validates reading creation payloads", () => {
    const payload = {
      propertyId: crypto.randomUUID(),
      readingAt: "2024-05-10T00:00:00.000Z",
      coldM3: 10.123,
      hotM3: 20,
      heatingGj: 5.25,
    };

    expect(() => createReadingSchema.parse(payload)).not.toThrow();
  });

  it("validates anchor recalculation month ordering", () => {
    const propertyId = crypto.randomUUID();

    expect(() =>
      recalculateAnchorsSchema.parse({
        propertyId,
        fromMonth: "2024-01-01",
        toMonth: "2024-03-01",
      })
    ).not.toThrow();

    expect(() =>
      recalculateAnchorsSchema.parse({
        propertyId,
        fromMonth: "2024-03-01",
        toMonth: "2024-01-01",
      })
    ).toThrow(/toMonth must be greater than or equal to fromMonth/);
  });
});
