import { useEffect, useMemo, useState } from "react";

import type { ReadingDTO } from "@/types";
import type { ReadingListResponse } from "@/types/readings";
import { apiGet } from "@/lib/client/http";
import { FiltersBar } from "@/components/common/FiltersBar";
import { ReplacementForm } from "@/components/readings/ReplacementForm";

const getParam = (name: string): string => {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) ?? "";
};

export function ReadingsTable(): JSX.Element {
  const [items, setItems] = useState<ReadingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceSource, setReplaceSource] = useState<ReadingDTO | null>(null);

  const propertyId = getParam("propertyId");

  const load = async (): Promise<void> => {
    if (!propertyId) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet<ReadingListResponse>(`/api/v1/readings?propertyId=${encodeURIComponent(propertyId)}`);
      setItems(res.items);
    } catch (e) {
      const msg = (e as { message?: string }).message ?? "Failed to load readings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    const onPop = (): void => {
      load().catch(() => {});
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  return (
    <section aria-label="Readings" style={{ display: "grid", gap: "0.75rem" }}>
      <FiltersBar />

      {error && (
        <div role="alert" style={{ color: "#b00020" }}>
          {error}
        </div>
      )}

      <div style={{ maxHeight: "50vh", overflow: "auto", border: "1px solid #ddd", borderRadius: 4 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Date</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Cold m3</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Hot m3</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Heating GJ</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Origin</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "0.75rem" }}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "0.75rem" }}>
                  {propertyId ? "No readings found" : "Enter a propertyId to load readings"}
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>{new Date(r.readingAt).toISOString().slice(0, 10)}</td>
                  <td style={{ padding: "0.5rem" }}>{r.coldM3}</td>
                  <td style={{ padding: "0.5rem" }}>{r.hotM3}</td>
                  <td style={{ padding: "0.5rem" }}>{r.heatingGj}</td>
                  <td style={{ padding: "0.5rem" }}>{r.origin}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <button type="button" onClick={() => setReplaceSource(r)}>Replace</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {replaceSource && (
        <div aria-label="Replacement Panel" style={{ border: "1px solid #ddd", borderRadius: 4, padding: "0.75rem" }}>
          <ReplacementForm source={replaceSource} onClose={() => setReplaceSource(null)} onSuccess={() => {
            setReplaceSource(null);
            load().catch(() => {});
          }} />
        </div>
      )}
    </section>
  );
}
