import type { MonthlyConditionDTO } from "@/types";

export interface MonthlyConditionListFilters {
  propertyId?: string;
  month?: string;
}

export interface MonthlyConditionListResponse {
  items: MonthlyConditionDTO[];
}

export interface MonthlyConditionResponse {
  monthlyCondition: MonthlyConditionDTO;
}

export const buildMonthlyConditionResponse = (monthlyCondition: MonthlyConditionDTO): MonthlyConditionResponse => ({
  monthlyCondition,
});

export const buildMonthlyConditionsListResponse = (
  items: MonthlyConditionDTO[]
): MonthlyConditionListResponse => ({
  items,
});
