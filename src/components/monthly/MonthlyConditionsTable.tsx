import { useEffect, useMemo, useState } from "react";

import type { MonthlyConditionDTO } from "@/types";
import type { MonthlyConditionListResponse } from "@/types/monthlyConditions";
import { apiGet, apiPost } from "@/lib/client/http";
import { FiltersBar } from "@/components/common/FiltersBar";

const getParam = (name: string): string => {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) ?? "";
};

export function MonthlyConditionsTable(): JSX.Element {
  const [items, setItems] = useState<MonthlyConditionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MonthlyConditionDTO>>({});

  const propertyId = getParam("propertyId");
  const month = getParam("month");

  const load = async (): Promise<void> => {
    if (!propertyId) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({ propertyId });
      if (month) query.set("month", month);
      const res = await apiGet<MonthlyConditionListResponse>(`/api/v1/monthly-conditions?${query.toString()}`);
      setItems(res.items);
    } catch (e) {
      const msg = (e as { message?: string }).message ?? "Failed to load monthly conditions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    const onPop = (): void => load().catch(() => {});
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, month]);

  const startEdit = (row: MonthlyConditionDTO): void => {
    setEditingId(row.id);
    setDraft({ ...row });
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setDraft({});
  };

  const save = async (): Promise<void> => {
    if (!editingId) return;
    try {
      setLocked(false);
      await apiPost(`/api/v1/monthly-conditions/${encodeURIComponent(editingId)}`, {
        propertyId: draft.propertyId,
        month: draft.month,
        managerFee: draft.managerFee,
        priceCold: draft.priceCold,
        priceHotHeating: draft.priceHotHeating,
        priceHeating: draft.priceHeating,
        forecastCold: draft.forecastCold,
        forecastHot: draft.forecastHot,
        forecastHeating: draft.forecastHeating,
        advancePayment: draft.advancePayment,
      });
      setEditingId(null);
      setDraft({});
      await load();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "monthly_condition_locked") {
        setLocked(true);
      } else {
        setError(err.message ?? "Failed to save monthly condition");
      }
    }
  };

  return (
    <section aria-label="Monthly Conditions" style={{ display: "grid", gap: "0.75rem" }}>
      <FiltersBar />

      {locked && (
        <div role="alert" style={{ background: "#fff3cd", color: "#856404", padding: "0.5rem", borderRadius: 4 }}>
          This monthly condition is locked by realized reports and cannot be edited.
        </div>
      )}

      {error && (
        <div role="alert" style={{ color: "#b00020" }}>{error}</div>
      )}

      <div style={{ maxHeight: "50vh", overflow: "auto", border: "1px solid #ddd", borderRadius: 4 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Month</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Manager Fee</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Prices</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Forecasts</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Advance</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "0.75rem" }}>Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "0.75rem" }}>
                  {propertyId ? "No monthly conditions" : "Enter a propertyId to load"}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id}>
                    <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>{row.month}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={draft.managerFee ?? 0}
                          onChange={(e) => setDraft((d) => ({ ...d, managerFee: Number(e.target.value) }))}
                          disabled={locked}
                        />
                      ) : (
                        row.managerFee
                      )}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            type="number"
                            step="0.01"
                            value={draft.priceCold ?? 0}
                            onChange={(e) => setDraft((d) => ({ ...d, priceCold: Number(e.target.value) }))}
                            disabled={locked}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={draft.priceHotHeating ?? 0}
                            onChange={(e) => setDraft((d) => ({ ...d, priceHotHeating: Number(e.target.value) }))}
                            disabled={locked}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={draft.priceHeating ?? 0}
                            onChange={(e) => setDraft((d) => ({ ...d, priceHeating: Number(e.target.value) }))}
                            disabled={locked}
                          />
                        </div>
                      ) : (
                        `${row.priceCold} / ${row.priceHotHeating} / ${row.priceHeating}`
                      )}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            type="number"
                            step="0.01"
                            value={draft.forecastCold ?? 0}
                            onChange={(e) => setDraft((d) => ({ ...d, forecastCold: Number(e.target.value) }))}
                            disabled={locked}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={draft.forecastHot ?? 0}
                            onChange={(e) => setDraft((d) => ({ ...d, forecastHot: Number(e.target.value) }))}
                            disabled={locked}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={draft.forecastHeating ?? 0}
                            onChange={(e) => setDraft((d) => ({ ...d, forecastHeating: Number(e.target.value) }))}
                            disabled={locked}
                          />
                        </div>
                      ) : (
                        `${row.forecastCold} / ${row.forecastHot} / ${row.forecastHeating}`
                      )}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={draft.advancePayment ?? 0}
                          onChange={(e) => setDraft((d) => ({ ...d, advancePayment: Number(e.target.value) }))}
                          disabled={locked}
                        />
                      ) : (
                        row.advancePayment
                      )}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button type="button" onClick={save} disabled={locked}>Save</button>
                          <button type="button" onClick={cancelEdit}>Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => startEdit(row)}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
