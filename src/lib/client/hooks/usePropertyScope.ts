import { useMemo } from "react";

export interface PropertyScope {
  selectedPropertyId: string | null;
}

export function usePropertyScope(tenantPropertyId: string | null): PropertyScope {
  return useMemo(() => ({ selectedPropertyId: tenantPropertyId }), [tenantPropertyId]);
}
