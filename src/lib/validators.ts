import { z } from "zod";

/**
 * Validation schema for magic link request.
 * RFC 5322 compliant email with max 254 characters.
 */
export const RequestMagicLinkSchema = z.object({
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
});

/**
 * Validation schema for updating user profile (PATCH /v1/me).
 * Allows optional display name update with constraints:
 * - Max 60 characters
 * - No control characters (0x00-0x1F, 0x7F)
 * - Trimmed whitespace
 */
export const UpdateMeSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(60, "Display name must be 60 characters or less")
    .regex(/^[^\x00-\x1F\x7F]*$/, "Display name contains invalid characters")
    .optional(),
});

/**
 * Validation schema for creating a property (POST /v1/properties).
 * Validates label and startMonth with constraints:
 * - label: 1-100 characters, trimmed
 * - startMonth: ISO date string, must be first day of month
 */
export const CreatePropertySchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(100, "Label must be 100 characters or less"),
  startMonth: z
    .string()
    .refine((val) => {
      // Check if valid ISO date string
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      
      // Check if first day of month
      const isoString = date.toISOString().split("T")[0];
      return isoString.endsWith("-01");
    }, "Start month must be a valid date and the first day of a month (YYYY-MM-01)"),
});

/**
 * Validation schema for updating a property (PATCH /v1/properties/:id).
 * Partial version of CreatePropertySchema.
 */
export const UpdatePropertySchema = CreatePropertySchema.partial();

