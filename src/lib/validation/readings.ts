import { z } from "zod";

import { isValidYearMonth, yearMonthToDate } from "@/lib/date/month";
import type { YearMonth } from "@/types";

const MAX_DECIMAL_VALUE = 9_999_999.999;
const DECIMAL_PRECISION = 3;
const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTHS_BACK_LIMIT = 6;

export const TENANT_WINDOW_PAST_DAYS = 3;
export const TENANT_WINDOW_FUTURE_DAYS = 5;

export const readingValueSchema = z
  .number({
    required_error: "Reading value is required",
    invalid_type_error: "Reading value must be a number",
  })
  .min(0, { message: "Reading value cannot be negative" })
  .max(MAX_DECIMAL_VALUE, { message: `Reading value cannot exceed ${MAX_DECIMAL_VALUE}` })
  .refine((value) => hasMaxDecimals(value, DECIMAL_PRECISION), {
    message: `Reading value must have at most ${DECIMAL_PRECISION} decimal places`,
  });

export const readingTimestampSchema = z
  .string({ required_error: "readingAt is required" })
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "readingAt must be a valid ISO date" });

export const monthDateSchema = z
  .string({ required_error: "effectiveMonth is required" })
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "effectiveMonth must be a valid ISO date" })
  .refine((value) => isStartOfMonth(new Date(value)), {
    message: "effectiveMonth must be the first day of a month (YYYY-MM-01)",
  });

const yearMonthSchema = z
  .string({ required_error: "Month is required" })
  .regex(YEAR_MONTH_PATTERN, { message: "Month must be in YYYY-MM format" })
  .superRefine((value, ctx) => {
    if (!isValidYearMonth(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Month must be a valid calendar month",
      });
      return;
    }

    const now = new Date();
    const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const target = yearMonthToDate(value as YearMonth);

    if (target.getTime() > current.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Month cannot be in the future",
      });
      return;
    }

    const monthsDiff =
      (current.getUTCFullYear() - target.getUTCFullYear()) * 12 + (current.getUTCMonth() - target.getUTCMonth());

    if (monthsDiff > MONTHS_BACK_LIMIT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Month cannot be older than ${MONTHS_BACK_LIMIT} months`,
      });
    }
  })
  .transform((value) => value as YearMonth);

const nullableYearMonthSchema = yearMonthSchema.or(z.null()).optional();

const readingTypeSchema = z
  .union([z.literal("regular"), z.literal("overwrite"), z.literal("baseline")])
  .optional()
  .transform((value) => {
    if (value === "baseline") {
      return "overwrite" as const;
    }
    return value;
  });

export const createReadingSchema = z.object({
  propertyId: z.string().uuid({ message: "propertyId must be a valid UUID" }),
  readingAt: readingTimestampSchema,
  coldM3: readingValueSchema,
  hotM3: readingValueSchema,
  heatingGj: readingValueSchema,
  commentText: z.string().max(2000).optional().nullable(),
  commentVisibleToTenant: z.boolean().optional(),
  baseForMonth: nullableYearMonthSchema,
  finalForMonth: nullableYearMonthSchema,
  readingType: readingTypeSchema,
});

export const updateReadingSchema = createReadingSchema.partial();

export const createReplacementReadingSchema = createReadingSchema.extend({
  effectiveMonth: monthDateSchema,
});

export const listReadingsQuerySchema = z.object({
  propertyId: z.string().uuid({ message: "propertyId must be a valid UUID" }),
  from: z
    .string()
    .optional()
    .refine((value) => (value ? !Number.isNaN(Date.parse(value)) : true), { message: "from must be a valid ISO date" }),
  to: z
    .string()
    .optional()
    .refine((value) => (value ? !Number.isNaN(Date.parse(value)) : true), { message: "to must be a valid ISO date" }),
});

// Deprecated: recalculateAnchorsSchema - anchors are no longer used
// Kept for backward compatibility during migration, will be removed
export const recalculateAnchorsSchema = z
  .object({
    propertyId: z.string().uuid({ message: "propertyId must be a valid UUID" }),
    fromMonth: z
      .string()
      .optional()
      .refine((value) => (value ? !Number.isNaN(Date.parse(value)) : true), {
        message: "fromMonth must be a valid ISO date",
      })
      .refine((value) => (value ? isStartOfMonth(new Date(value)) : true), {
        message: "fromMonth must be the first day of a month (YYYY-MM-01)",
      }),
    toMonth: z
      .string()
      .optional()
      .refine((value) => (value ? !Number.isNaN(Date.parse(value)) : true), {
        message: "toMonth must be a valid ISO date",
      })
      .refine((value) => (value ? isStartOfMonth(new Date(value)) : true), {
        message: "toMonth must be the first day of a month (YYYY-MM-01)",
      }),
  })
  .superRefine((value, ctx) => {
    if (value.fromMonth && value.toMonth) {
      const from = new Date(value.fromMonth);
      const to = new Date(value.toMonth);

      if (from.getTime() > to.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toMonth"],
          message: "toMonth must be greater than or equal to fromMonth",
        });
      }
    }
  });

export const hasMaxDecimals = (value: number, decimals: number): boolean => {
  if (!Number.isFinite(value)) {
    return false;
  }

  const multiplied = value * 10 ** decimals;
  return Math.abs(multiplied - Math.round(multiplied)) < Number.EPSILON * 10;
};

export const isStartOfMonth = (date: Date): boolean => {
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getUTCDate() === 1 && date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0
  );
};

export const isWithinTenantWindow = (readingAt: Date, now = new Date()): boolean => {
  if (Number.isNaN(readingAt.getTime())) {
    return false;
  }

  const diffMs = readingAt.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= -TENANT_WINDOW_PAST_DAYS && diffDays <= TENANT_WINDOW_FUTURE_DAYS;
};
