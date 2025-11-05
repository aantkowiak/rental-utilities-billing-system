import { z } from "zod";

import { ContractPeriodSchema } from "./contractPeriod";

export const ContractsListQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  tenantUserId: z.string().uuid().optional(),
  active: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .refine((value) => value === "true" || value === "false", "Active must be 'true' or 'false'")
    .transform((value) => value === "true")
    .optional(),
});

export const CreateContractSchema = z.object({
  propertyId: z.string().uuid(),
  tenantUserId: z.string().uuid(),
  period: ContractPeriodSchema,
});

export const UpdateContractSchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    tenantUserId: z.string().uuid().optional(),
    period: ContractPeriodSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.propertyId === undefined && value.tenantUserId === undefined && value.period === undefined) {
      ctx.addIssue({ code: "custom", message: "At least one field must be provided" });
    }
  });

