import { z } from "zod";

/**
 * Validation schema for magic link request.
 * RFC 5322 compliant email with max 254 characters.
 */
export const RequestMagicLinkSchema = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
});

/**
 * Validation schema for updating user profile (PATCH /v1/me).
 * Allows optional email update with constraints:
 * - RFC 5322 compliant email
 * - Max 254 characters
 */
export const UpdateMeSchema = z.object({
  email: z
    .string()
    .email("Wprowadź poprawny adres email")
    .max(254, "Adres email może mieć maksymalnie 254 znaki")
    .transform((email) => email.toLowerCase())
    .optional(),
});

/**
 * Validation schema for creating a property (POST /v1/properties).
 * Validates label and startMonth with constraints:
 * - label: 1-100 characters, trimmed
 * - startMonth: ISO date string, must be first day of month
 */
export const CreatePropertySchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  startMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Start month must be in YYYY-MM format")
    .refine((val) => {
      // Validate it's a real month (01-12)
      const [, month] = val.split("-");
      const monthNum = parseInt(month, 10);
      return monthNum >= 1 && monthNum <= 12;
    }, "Month must be between 01 and 12"),
});

/**
 * Validation schema for updating a property (PATCH /v1/properties/:id).
 * Partial version of CreatePropertySchema.
 */
export const UpdatePropertySchema = CreatePropertySchema.partial();
