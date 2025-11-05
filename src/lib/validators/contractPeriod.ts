import { z } from "zod";

import type { ContractPeriod } from "@/types";

const ISO_DATE_REGEXP = /^\d{4}-\d{2}-\d{2}$/;

const isoDateString = z
  .string()
  .regex(ISO_DATE_REGEXP, "Date must be in YYYY-MM-DD format")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Date must be a valid ISO calendar date");

export const ContractPeriodSchema = z
  .object({
    from: isoDateString,
    to: isoDateString,
  })
  .superRefine((value, ctx) => {
    const start = startOfDayUtc(value.from);
    const end = startOfDayUtc(value.to);

    if (!isFinite(start.valueOf()) || !isFinite(end.valueOf())) {
      ctx.addIssue({ code: "custom", message: "Period dates must be finite", path: ["from"] });
      return;
    }

    const endExclusive = addDays(end, 1);

    if (endExclusive.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "Period end must be on or after period start",
        path: ["to"],
      });
    }
  });

export type ValidatedContractPeriod = z.infer<typeof ContractPeriodSchema>;

export function parseContractPeriod(input: unknown): ContractPeriod {
  const result = ContractPeriodSchema.parse(input);
  return {
    from: result.from,
    to: result.to,
  };
}

export function contractPeriodToPostgresRange(period: ContractPeriod): string {
  const start = startOfDayUtc(period.from);
  const endExclusive = addDays(startOfDayUtc(period.to), 1);

  return `[${start.toISOString()},${endExclusive.toISOString()})`;
}

export function contractPeriodFromPostgresRange(value: unknown): ContractPeriod {
  if (value == null) {
    throw new Error("CONTRACT_PERIOD_NOT_AVAILABLE");
  }

  if (typeof value === "object" && "lower" in (value as Record<string, unknown>)) {
    const record = value as { lower: string | null; upper: string | null };
    return contractPeriodFromBounds(record.lower, record.upper);
  }

  if (typeof value !== "string") {
    throw new Error("INVALID_CONTRACT_PERIOD_RANGE");
  }

  const trimmed = value.trim();
  if (trimmed.length < 2) {
    throw new Error("INVALID_CONTRACT_PERIOD_RANGE");
  }

  const lowerInclusive = trimmed.startsWith("[");
  const upperInclusive = trimmed.endsWith("]");
  const content = trimmed.slice(1, -1);
  const commaIndex = content.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("INVALID_CONTRACT_PERIOD_RANGE");
  }

  const lowerRaw = content.slice(0, commaIndex).replace(/"/g, "").trim();
  const upperRaw = content.slice(commaIndex + 1).replace(/"/g, "").trim();

  if (!lowerInclusive || upperInclusive) {
    throw new Error("UNSUPPORTED_CONTRACT_PERIOD_BOUNDS");
  }

  return contractPeriodFromBounds(lowerRaw, upperRaw);
}

function contractPeriodFromBounds(lowerRaw: string | null, upperRaw: string | null): ContractPeriod {
  if (!lowerRaw) {
    throw new Error("CONTRACT_PERIOD_LOWER_BOUND_REQUIRED");
  }

  if (!upperRaw || upperRaw.toLowerCase() === "infinity") {
    throw new Error("CONTRACT_PERIOD_OPEN_END_UNSUPPORTED");
  }

  const start = toValidDate(lowerRaw);
  const endExclusive = toValidDate(upperRaw);

  if (endExclusive.getTime() <= start.getTime()) {
    throw new Error("CONTRACT_PERIOD_INVALID_RANGE");
  }

  const inclusiveEnd = addDays(endExclusive, -1);

  if (inclusiveEnd.getTime() < start.getTime()) {
    throw new Error("CONTRACT_PERIOD_INVALID_RANGE");
  }

  return {
    from: isoDateStringFromDate(start),
    to: isoDateStringFromDate(inclusiveEnd),
  };
}

function startOfDayUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error("INVALID_CONTRACT_PERIOD_DATE");
  }
  return date;
}

function isoDateStringFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

