import type { ContractDTO } from "@/types";

export interface ContractFilters {
  propertyId?: string;
  tenantUserId?: string;
  active?: boolean;
}

export interface ContractListOptions {
  filters: ContractFilters;
}

export interface ContractResponse {
  contract: ContractDTO;
}

export interface ListContractsResponse {
  items: ContractDTO[];
}

export const buildContractResponse = (contract: ContractDTO): ContractResponse => ({
  contract,
});

export const buildContractsListResponse = (items: ContractDTO[]): ListContractsResponse => ({
  items,
});
