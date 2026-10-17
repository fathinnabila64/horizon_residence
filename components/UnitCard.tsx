"use client";

import { formatHours, type Exposure } from "@/lib/exposure";
import { formatRM } from "@/lib/format";
import { FACING_LABEL, type Unit } from "@/lib/units";

type Props = {
  unit: Unit;
  exposure: Exposure;
  score: number;
  selected: boolean;
  shortlisted: boolean;
  onView: (id: string) => void;
  onToggle: (id: string) => void;
};

function HoursBar({ label, hours, max, tone }: { label: string; hours: number; max: number; tone: "am" | "pm" }) {
  return (
    <div className="hours-row">
      <span className="hours-label">{label}</span>
      <span className="hours-track" aria-hidden="true">
        <span className={`hours-fill hours-${tone}`} style={{ width: `${Math.min(100, (hours / max) * 100)}%` }} />
      </span>
      <span className="hours-value">{formatHours(hours)}</span>
    </div>
  );
}

export default function UnitCard({ unit, exposure, score, selected, shortlisted, onView, onToggle }: Props) {
  return (
    <li className={`unit-card${selected ? " is-selected" : ""}`}>
      <div className="unit-head">
        <h4>
          Unit {unit.id}
          <span className="unit-sub">
            Floor {unit.floor} · {FACING_LABEL[unit.facing]}-facing
          </span>
        </h4>
        <p className="score" aria-label={`Fit score ${score} out of 100`}>
          <span aria-hidden="true">{score}</span>
          <small aria-hidden="true">/100</small>
        </p>
      </div>
      <p className="unit-specs">
        {unit.bedrooms} bed · {unit.sqft.toLocaleString("en-MY")} sq ft · <strong>{formatRM(unit.priceRM)}</strong>
      </p>
      <div className="hours">
        <HoursBar label="Morning sun" hours={exposure.morning} max={7} tone="am" />
        <HoursBar label="Afternoon sun" hours={exposure.afternoon} max={7} tone="pm" />
      </div>
      <div className="unit-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onView(unit.id)} aria-pressed={selected}>
          {selected ? "Showing in 3D" : "View in 3D"}
        </button>
        <button
          type="button"
          className="btn btn-primary-outline"
          onClick={() => onToggle(unit.id)}
          aria-pressed={shortlisted}
        >
          {shortlisted ? "Shortlisted ✓" : "Shortlist"}
        </button>
      </div>
    </li>
  );
}
