import { useMemo, useState } from "react";

import { apiPost } from "@/lib/client/http";

const getParam = (name: string): string => {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) ?? "";
};

export function ReadingForm(): JSX.Element {
  const [propertyId, setPropertyId] = useState<string>(getParam("propertyId"));
  const [readingAt, setReadingAt] = useState<string>(new Date().toISOString());
  const [coldM3, setColdM3] = useState<number>(0);
  const [hotM3, setHotM3] = useState<number>(0);
  const [heatingGj, setHeatingGj] = useState<number>(0);
  const [commentText, setCommentText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/v1/readings", {
        propertyId,
        readingAt,
        coldM3,
        hotM3,
        heatingGj,
        commentText: commentText || null,
      });
      setSuccess("Reading submitted");
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(err.message ?? "Failed to submit reading");
    } finally {
      setSubmitting(false);
    }
  };

  const readingAtLocal = useMemo(() => toLocalInput(readingAt), [readingAt]);

  return (
    <form aria-label="Reading Form" onSubmit={onSubmit} style={{ display: "grid", gap: "0.5rem" }}>
      {error && (
        <div role="alert" style={{ color: "#b00020" }}>
          {error}
        </div>
      )}
      {success && (
        <div role="status" aria-live="polite" style={{ color: "#0b7" }}>
          {success}
        </div>
      )}

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rf-property">Property ID</label>
        <input id="rf-property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="UUID" required />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rf-at">Reading at</label>
        <input
          id="rf-at"
          type="datetime-local"
          value={readingAtLocal}
          onChange={(e) => setReadingAt(fromLocalInput(e.target.value))}
          required
        />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rf-cold">Cold m3</label>
        <input id="rf-cold" type="number" step="0.001" value={coldM3} onChange={(e) => setColdM3(Number(e.target.value))} required />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rf-hot">Hot m3</label>
        <input id="rf-hot" type="number" step="0.001" value={hotM3} onChange={(e) => setHotM3(Number(e.target.value))} required />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rf-heat">Heating GJ</label>
        <input id="rf-heat" type="number" step="0.001" value={heatingGj} onChange={(e) => setHeatingGj(Number(e.target.value))} required />
      </div>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor="rf-comment">Comment</label>
        <textarea id="rf-comment" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
      </div>

      <div>
        <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</button>
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
  const d = new Date(local);
  return d.toISOString();
};

