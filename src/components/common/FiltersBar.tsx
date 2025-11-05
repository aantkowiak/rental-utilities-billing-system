import { useEffect, useMemo, useState } from "react";

const getParam = (name: string): string => {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) ?? "";
};

const setParam = (name: string, value: string): void => {
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(name, value);
  } else {
    url.searchParams.delete(name);
  }
  history.replaceState(null, "", url.toString());
};

export function FiltersBar(): JSX.Element {
  const [propertyId, setPropertyId] = useState<string>("");

  useEffect(() => {
    setPropertyId(getParam("propertyId"));
  }, []);

  const onPropertyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    setPropertyId(next);
    setParam("propertyId", next);
  };

  const inputId = useMemo(() => `property-filter-${Math.random().toString(36).slice(2)}`, []);

  return (
    <div role="region" aria-label="Filters" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <label htmlFor={inputId}>Property ID</label>
      <input
        id={inputId}
        value={propertyId}
        onChange={onPropertyChange}
        placeholder="UUID"
        inputMode="text"
        aria-describedby={`${inputId}-help`}
        style={{ maxWidth: "22rem" }}
      />
      <span id={`${inputId}-help`} style={{ fontSize: "0.85rem" }}>
        Syncs with URL (?propertyId=)
      </span>
    </div>
  );
}
