import type { ReadingDTO } from "@/types";

export interface ReadingListFilters {
  propertyId: string;
  from?: string;
  to?: string;
}

export interface ReadingResponse {
  reading: ReadingDTO;
}

export interface ReadingListResponse {
  items: ReadingDTO[];
}

export const buildReadingResponse = (reading: ReadingDTO): ReadingResponse => ({
  reading,
});

export const buildReadingsListResponse = (
  items: ReadingDTO[]
): ReadingListResponse => ({
  items,
});
