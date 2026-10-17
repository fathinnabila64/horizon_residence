"use client";

import { PRIORITY_LABEL, type Priority } from "@/lib/exposure";
import { formatRMShort } from "@/lib/format";
import { PRICE_RANGE, TOWER, type Facing, type Unit } from "@/lib/units";

export type FilterState = {
  facing: Facing | "any";
  bedrooms: 2 | 3 | "any";
  floors: "any" | "low" | "mid" | "high";
  maxPrice: number;
};

export const DEFAULT_FILTERS: FilterState = {
  facing: "any",
  bedrooms: "any",
  floors: "any",
  maxPrice: PRICE_RANGE.max,
};

const FLOOR_BANDS = {
  low: [TOWER.firstFloor, 10],
  mid: [11, 20],
  high: [21, TOWER.lastFloor],
} as const;

export function matchesFilters(u: Unit, f: FilterState): boolean {
  if (f.facing !== "any" && u.facing !== f.facing) return false;
  if (f.bedrooms !== "any" && u.bedrooms !== f.bedrooms) return false;
  if (f.floors !== "any") {
    const [lo, hi] = FLOOR_BANDS[f.floors];
    if (u.floor < lo || u.floor > hi) return false;
  }
  return u.priceRM <= f.maxPrice;
}

type ChipOption<T extends string | number> = { value: T; label: string };

function ChipGroup<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: ChipOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="field-group">
      <legend>{legend}</legend>
      <div className="chips">
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <span className="chip" key={o.value}>
              <input
                type="radio"
                id={id}
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <label htmlFor={id}>{o.label}</label>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  return (
    <fieldset className="field-group">
      <legend>What matters most to you?</legend>
      <div className="priority-options">
        {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
          <div className="priority" key={p}>
            <input
              type="radio"
              id={`priority-${p}`}
              name="priority"
              value={p}
              checked={value === p}
              onChange={() => onChange(p)}
            />
            <label htmlFor={`priority-${p}`}>
              <strong>{PRIORITY_LABEL[p].title}</strong>
              <span>{PRIORITY_LABEL[p].hint}</span>
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) => onChange({ ...filters, [key]: v });
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="filters">
      <ChipGroup<Facing | "any">
        legend="Window faces"
        name="facing"
        value={filters.facing}
        onChange={(v) => set("facing", v)}
        options={[
          { value: "any", label: "Any" },
          { value: "N", label: "North" },
          { value: "E", label: "East" },
          { value: "S", label: "South" },
          { value: "W", label: "West" },
        ]}
      />
      <ChipGroup<2 | 3 | "any">
        legend="Bedrooms"
        name="bedrooms"
        value={filters.bedrooms}
        onChange={(v) => set("bedrooms", v)}
        options={[
          { value: "any", label: "Any" },
          { value: 2, label: "2" },
          { value: 3, label: "3" },
        ]}
      />
      <ChipGroup<FilterState["floors"]>
        legend="Floors"
        name="floors"
        value={filters.floors}
        onChange={(v) => set("floors", v)}
        options={[
          { value: "any", label: "Any" },
          { value: "low", label: "3–10" },
          { value: "mid", label: "11–20" },
          { value: "high", label: "21–30" },
        ]}
      />
      <div className="field-group">
        <label htmlFor="max-price" className="field-label">
          Budget up to <output htmlFor="max-price">{formatRMShort(filters.maxPrice)}</output>
        </label>
        <input
          id="max-price"
          type="range"
          min={Math.floor(PRICE_RANGE.min / 10000) * 10000}
          max={Math.ceil(PRICE_RANGE.max / 10000) * 10000}
          step={10000}
          value={filters.maxPrice}
          onChange={(e) => set("maxPrice", Number(e.target.value))}
        />
      </div>
      <button type="button" className="btn btn-quiet" onClick={onReset} disabled={isDefault}>
        Reset filters
      </button>
    </div>
  );
}
