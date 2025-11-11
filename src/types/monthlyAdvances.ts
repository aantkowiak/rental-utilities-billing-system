import type { MonthlyAdvanceDTO } from "@/types";

export interface MonthlyAdvanceListFilters {
  propertyId?: string;
  month?: string;
}

export interface MonthlyAdvanceListResponse {
  items: MonthlyAdvanceDTO[];
}

export interface MonthlyAdvanceResponse {
  monthlyAdvance: MonthlyAdvanceDTO;
}

export const buildMonthlyAdvanceResponse = (monthlyAdvance: MonthlyAdvanceDTO): MonthlyAdvanceResponse => ({
  monthlyAdvance,
});

export const buildMonthlyAdvancesListResponse = (items: MonthlyAdvanceDTO[]): MonthlyAdvanceListResponse => ({
  items,
});
