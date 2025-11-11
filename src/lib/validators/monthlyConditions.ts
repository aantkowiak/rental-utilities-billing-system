import { z } from "zod";

import { isStartOfMonth } from "@/lib/validation/readings";

const monetarySchema = z
  .number({
    required_error: "Value is required",
    invalid_type_error: "Value must be a number",
  })
  .min(0, { message: "Value cannot be negative" });

const monthSchema = z
  .string({ required_error: "month is required" })
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "month must be a valid ISO date" })
  .refine((value) => isStartOfMonth(new Date(value)), {
    message: "month must be the first day of a month (YYYY-MM-01)",
  });

export const MonthlyAdvancesListQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  month: z
    .string()
    .optional()
    .refine((value) => (value ? !Number.isNaN(Date.parse(value)) : true), { message: "month must be a valid ISO date" })
    .refine((value) => (value ? isStartOfMonth(new Date(value)) : true), {
      message: "month must be the first day of a month (YYYY-MM-01)",
    }),
});

const BaseMonthlyAdvanceSchema = z.object({
  propertyId: z.string().uuid({ message: "propertyId must be a valid UUID" }),
  month: monthSchema,
  managerFee: monetarySchema,
  priceCold: monetarySchema,
  priceHotHeating: monetarySchema,
  priceHeating: monetarySchema,
  forecastCold: monetarySchema,
  forecastHot: monetarySchema,
  forecastHeating: monetarySchema,
  advancePayment: monetarySchema,
});

export const CreateMonthlyAdvanceSchema = BaseMonthlyAdvanceSchema;

export const UpdateMonthlyAdvanceSchema = BaseMonthlyAdvanceSchema.partial().superRefine((value, ctx) => {
  const hasAnyField = Object.values(value).some((field) => field !== undefined);

  if (!hasAnyField) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one field must be provided" });
  }
});
