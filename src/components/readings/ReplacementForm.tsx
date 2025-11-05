import { useMemo, useState } from "react";

import type { ReadingDTO } from "@/types";
import { apiPost } from "@/lib/client/http";

interface ReplacementFormProps {
  source: ReadingDTO;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function ReplacementForm({ source, onSuccess, onClose }: ReplacementFormProps): JSX.Element {
  const [readingAt, setReadingAt] = useState<string>(source.readingAt);
  const [effectiveMonth, setEffectiveMonth] = useState<string>(() => {
    const d = new Date(source.readingAt);
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    return first.toISOString().split("T")[0];
  });
  const [coldM3, setColdM3] = useState<number>(source.coldM3);
  const [hotM3, setHotM3] = useState<number>(source.hotM3);
  const [heatingGj, setHeatingGj] = useState<number>(source.heatingGj);
  const [commentText, setCommentText] = useState<string>("");
  const [queuedMsg, setQueuedMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setQueuedMsg(null);
    try {
      await apiPost(`/api/v1/readings/${encodeURIComponent(source.id)}/replacement`, {
        propertyId: source.propertyId,
        readingAt,
        effectiveMonth,
        coldM3,
        hotM3,
        heatingGj,
        commentText: commentText || null,
        commentVisibleToTenant: false,
      });

      // Enqueue anchors for the month, show inline queued info
      await apiPost("/api/v1/readings/recalculate-anchors", {
        propertyId: source.propertyId,
        fromMonth: effectiveMonth,
        toMonth: effectiveMonth,
      });

      setQueuedMsg("Anchor recalculation queued for the selected month");
      onSuccess?.();
    } catch (e) {
      const msg = (e as { message?: string }).message ?? "Failed to create replacement";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form aria-label="Replacement Reading Form" onSubmit={onSubmit} style={{ display: "grid", gap: "0.5rem" }}>
      {error && (
        <div role="alert" style={{ color: "#b00020" }}>
          {error}
        </div>
      )}
      {queuedMsg && (
        <div role="status" aria-live="polite" style={{ color: "#0b7" }}>
          {queuedMsg}
        </div>
      )}

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rep-readingAt">Reading at</label>
        <input
          id="rep-readingAt"
          type="datetime-local"
          value={toLocalInput(readingAt)}
          onChange={(e) => setReadingAt(fromLocalInput(e.target.value))}
          required
        />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rep-effectiveMonth">Effective month</label>
        <input
          id="rep-effectiveMonth"
          type="date"
          value={effectiveMonth}
          onChange={(e) => setEffectiveMonth(e.target.value)}
          required
        />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rep-cold">Cold m3</label>
        <input id="rep-cold" type="number" step="0.001" value={coldM3} onChange={(e) => setColdM3(Number(e.target.value))} required />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rep-hot">Hot m3</label>
        <input id="rep-hot" type="number" step="0.001" value={hotM3} onChange={(e) => setHotM3(Number(e.target.value))} required />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rep-heat">Heating GJ</label>
        <input id="rep-heat" type="number" step="0.001" value={heatingGj} onChange={(e) => setHeatingGj(Number(e.target.value))} required />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rep-comment">Comment</label>
        <textarea id="rep-comment" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save replacement"}</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </form>
  );
}

const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (local: string): string => {
  // Treat local input as local time, convert to ISO
  const d = new Date(local);
  return d.toISOString();
};

