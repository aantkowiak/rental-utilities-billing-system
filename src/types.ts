// -----------------------------------------------------------------------------
// Shared DTO & Command-Model types
// Derive every DTO straight from database rows (Tables<...>) while converting
// snake_case DB columns → camelCase JSON properties expected by the REST API.
// -----------------------------------------------------------------------------

import type { Tables } from "@/db/database.types";

/* ---------- helpers ---------- */

/**
 * Convert snake_case keys to camelCase recursively.
 * Works for the database rows that use only primitive / nested objects.
 */
export type Camelize<T> = {
  [K in keyof T as CamelCase<K & string>]: T[K] extends Record<string, unknown> ? Camelize<T[K]> : T[K];
};

/* Simple snake → camel implementation (handles single underscore) */
type CamelCase<S extends string> = S extends `${infer H}_${infer R}` ? `${Lowercase<H>}${Capitalize<CamelCase<R>>}` : S;

/* ---------- raw DB row aliases ---------- */
type PropertyRow = Tables<"properties">;
type ProfileRow = Tables<"profiles">;
type ContractRow = Tables<"contracts">;
type MonthlyConditionRow = Tables<"monthly_conditions">;
type ReadingRow = Tables<"readings">;
type ReportRow = Tables<"reports">;
type ReportEmailRow = Tables<"report_emails">;
type ReportEmailAttemptRow = Tables<"report_email_attempts">;

/* ---------- DTOs ---------- */

export type PropertyDTO = Camelize<PropertyRow>;
export type ProfileDTO = Camelize<ProfileRow>;
export interface ContractPeriod {
  from: string;
  to: string;
}

export type ContractDTO = Omit<Camelize<ContractRow>, "period"> & {
  period: ContractPeriod;
};
export type MonthlyConditionDTO = Camelize<MonthlyConditionRow>;
export type ReadingDTO = Camelize<ReadingRow>;
export type ReadingOrigin = "tenant" | "admin_replacement";
export type ReadingType = "regular" | "baseline";
export type ReportDTO = Camelize<ReportRow>;
export type ReportEmailDTO = Camelize<ReportEmailRow>;
export type ReportEmailAttemptDTO = Camelize<ReportEmailAttemptRow>;

/* ---------- Command models (write-side payloads) ---------- */

/* 2.1 Auth – magic link */
export interface RequestMagicLinkCmd {
  email: string;
}

/* 2.2 Profile */
export type UpdateMeCmd = Pick<ProfileDTO, "displayName">;

/* 2.3 Properties */
export type CreatePropertyCmd = Pick<PropertyDTO, "label" | "startMonth">;
export type UpdatePropertyCmd = Partial<CreatePropertyCmd>;

/* 2.4 Contracts */
export interface CreateContractCmd {
  propertyId: string;
  tenantUserId: string;
  period: ContractPeriod;
}

export type UpdateContractCmd = Partial<CreateContractCmd>;

/* 2.5 Monthly Conditions */
export type CreateMonthlyConditionCmd = Pick<
  MonthlyConditionDTO,
  | "propertyId"
  | "month"
  | "managerFee"
  | "priceCold"
  | "priceHotHeating"
  | "priceHeating"
  | "forecastCold"
  | "forecastHot"
  | "forecastHeating"
  | "advancePayment"
>;
export type UpdateMonthlyConditionCmd = Partial<CreateMonthlyConditionCmd>;

/* 2.6 Readings */
export type CreateReadingCmd = Pick<ReadingDTO, "propertyId" | "readingAt" | "coldM3" | "hotM3" | "heatingGj"> &
  Partial<Pick<ReadingDTO, "commentText" | "commentVisibleToTenant">>;

export type UpdateReadingCmd = Partial<CreateReadingCmd>;

export type CreateReadingReplacementCmd = Pick<
  ReadingDTO,
  "propertyId" | "readingAt" | "coldM3" | "hotM3" | "heatingGj"
> & {
  effectiveMonth: string;
} & Partial<Pick<ReadingDTO, "commentText" | "commentVisibleToTenant">>;

export interface RecalculateAnchorsCmd {
  propertyId: string;
  fromMonth?: string;
  toMonth?: string;
}

/* 2.7 Reports */
export type GenerateReportCmd = Pick<ReportDTO, "contractId" | "month">;
export interface UpdateReportStatusCmd {
  status: "realized" | "unlocked";
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RegenerateReportCmd {
  /** keep same report id in path – no payload needed per plan */
}

/* 2.7 Report email manual resend */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SendReportEmailCmd {
  /** no body params – query handled via path */
}

/* Fallback utility exports */
export type { CamelCase };
