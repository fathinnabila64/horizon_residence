"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeAllYearly, periodMonths, formatHours, PERIOD_LABEL, type Period, PRIORITY_LABEL, scoreFor, solarNoonHour, sunStatus, type Priority } from "@/lib/exposure";
import { formatRM } from "@/lib/format";
import { DISPLAY_DATE, getSunPosition, sunDirection, sunriseSunset, compassPoint, formatClock } from "@/lib/sun";
import { FACING_LABEL, UNIT_BY_ID, UNITS } from "@/lib/units";
import { DEFAULT_FILTERS, FilterPanel, matchesFilters, PriorityPicker, type FilterState } from "./Filters";
import { useShortlist } from "./ShortlistContext";
import SunControls from "./SunControls";
import UnitCard from "./UnitCard";

import type { View } from "./TowerScene";

const TowerScene = dynamic(() => import("./TowerScene"), {
  ssr: false,
  loading: () => <div className="scene-fallback">Loading 3D view…</div>,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INITIAL_VISIBLE = 6;
const EXPANDED_VISIBLE = 18;

const STATUS_COPY = {
  lit: "In direct sun at this time.",
  "facing-away": "In shade at this time: the window faces away from the sun.",
  blocked: "In shade at this time: a neighbouring block is in the way.",
  night: "No direct sun: the sun is below the horizon or too low.",
} as const;

export default function Explorer() {
  const { shortlist, toggle, notice, period, setPeriod, clear } = useShortlist();
  const [playing, setPlaying] = useState(false);
  // While playing, the sun is worked out for each month of the chosen period in turn.
  // When paused, the page returns to the fixed display day.
  const playMonths = useMemo(() => periodMonths(period), [period]);
  const playLabel = period === "year" ? "Play the year" : `Play ${PERIOD_LABEL[period].split(" ")[0]}`;
  const [monthStep, setMonthStep] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setMonthStep((s) => (s + 1) % playMonths.length), 1500);
    return () => window.clearInterval(id);
  }, [playing, playMonths]);
  const date = useMemo(
    () => (playing ? { year: 2026, month: playMonths[monthStep % playMonths.length], day: 15 } : DISPLAY_DATE),
    [playing, playMonths, monthStep],
  );
  const [minutes, setMinutes] = useState(15 * 60 + 30);
  const [priority, setPriority] = useState<Priority>("cool");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<View>("iso");
  const sceneRef = useRef<HTMLDivElement>(null);

  const sun = useMemo(() => getSunPosition(date, minutes / 60), [date, minutes]);
  const { sunrise, sunset } = useMemo(() => sunriseSunset(date), [date]);
  const solarNoon = useMemo(() => solarNoonHour(date), [date]);
  const exposures = useMemo(() => computeAllYearly(period), [period]);

  const ranked = useMemo(() => {
    return UNITS.filter((u) => matchesFilters(u, filters))
      .map((u) => {
        const exposure = exposures.get(u.id)!;
        return { unit: u, exposure, score: scoreFor(priority, exposure) };
      })
      .sort((a, b) => b.score - a.score || a.unit.priceRM - b.unit.priceRM);
  }, [filters, exposures, priority]);

  const activeIds = useMemo(() => new Set(ranked.map((r) => r.unit.id)), [ranked]);
  const visible = ranked.slice(0, expanded ? EXPANDED_VISIBLE : INITIAL_VISIBLE);

  const selected = selectedId ? UNIT_BY_ID.get(selectedId) : undefined;
  const selectedExposure = selected ? exposures.get(selected.id) : undefined;
  const selectedStatus = selected ? sunStatus(selected, sunDirection(sun), sun.altitude) : null;

  const viewUnit = useCallback((id: string) => {
    setSelectedId(id);
    // Turn the camera to the side the unit faces, so it isn't hidden behind the tower.
    const u = UNIT_BY_ID.get(id);
    if (u) setView(u.facing);
    sceneRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
  }, []);

  const sceneSummary = `3D model of the tower at ${formatClock(minutes / 60)}. ${sun.altitude > 0
      ? `Sun is in the ${compassPoint(sun.azimuth)}, ${Math.round(sun.altitude)} degrees high.`
      : "The sun is below the horizon."
    } ${ranked.length} of ${UNITS.length} units match your filters.`;

  return (
    <section id="explorer" className="section explorer" aria-labelledby="explorer-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Unit picker</p>
          <h2 id="explorer-title">Find the unit that suits how you live</h2>
          <p className="lead">
            Tell us what matters, narrow the list, then drag the time slider to watch the sun move across the tower.
            Amber windows are in direct sun right now; blue ones are in shade.
          </p>
        </header>

        <div className="explorer-grid">
          <div className="explorer-visual">
            <div className="scene-card" ref={sceneRef}>
              <div className="scene" aria-hidden="true">
                <TowerScene
                  view={view}
                  sun={sun}
                  date={date}
                  activeIds={activeIds}
                  selectedId={selectedId}
                  shortlist={shortlist}
                  onSelect={setSelectedId}
                />
              </div>
              <div className="view-row" role="group" aria-label="Camera view">
                <span className="view-label">View from</span>
                {(
                  [
                    ["iso", "Corner"],
                    ["N", "North"],
                    ["E", "East"],
                    ["S", "South"],
                    ["W", "West"],
                  ] as [View, string][]
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    className="btn btn-chip"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <ul className="legend" aria-label="3D view key">
                <li><span className="swatch swatch-lit" /> In direct sun now</li>
                <li><span className="swatch swatch-shade" /> In shade now</li>
                <li><span className="swatch swatch-muted" /> Filtered out</li>
                <li><span className="swatch swatch-pin" /> Shortlisted</li>
              </ul>
              <p className="scene-hint">Drag to rotate, scroll or pinch to zoom, click a window to select it.</p>
              <p className="sr-only" aria-live={playing ? "off" : "polite"}>{sceneSummary}</p>
            </div>

            <SunControls
              minutes={minutes}
              onMinutes={setMinutes}
              playing={playing}
              onPlaying={setPlaying}
              sun={sun}
              sunrise={sunrise}
              sunset={sunset}
              solarNoon={solarNoon}
              playLabel={playLabel}
            />
            <p className="muted" aria-live="off">
              {playing
                ? `Showing ${date.day} ${MONTHS[date.month - 1]} 2026 · month ${playMonths.indexOf(date.month) + 1} of ${playMonths.length} in ${PERIOD_LABEL[period]}.`
                : `Showing 20 Mar 2026 (fixed day). Press "${playLabel}" to move through ${PERIOD_LABEL[period]}.`}
            </p>

            <section className="selected-unit" aria-labelledby="selected-title" aria-live="polite">
              <h3 id="selected-title">Selected unit</h3>
              {selected && selectedExposure && selectedStatus ? (
                <>
                  <p className="selected-name">
                    Unit {selected.id}{" "}
                    <span>
                      · Floor {selected.floor} · {FACING_LABEL[selected.facing]}-facing · {selected.bedrooms} bed ·{" "}
                      {formatRM(selected.priceRM)}
                    </span>
                  </p>
                  <p>
                    <strong>
                      At {formatClock(minutes / 60)} on {date.day} {MONTHS[date.month - 1]}:
                    </strong>{" "}
                    {STATUS_COPY[selectedStatus.status]}
                    {selectedStatus.blockedBy ? ` (${selectedStatus.blockedBy})` : ""}
                  </p>
                  <p>
                    <strong>Average direct sun per day, {PERIOD_LABEL[period].toLowerCase()}:</strong>{" "}
                    {formatHours(selectedExposure.total)} in total, {formatHours(selectedExposure.morning)} before
                    solar noon and {formatHours(selectedExposure.afternoon)} after.
                  </p>
                  <div className="unit-actions">
                    <button
                      type="button"
                      className="btn btn-primary-outline"
                      onClick={() => toggle(selected.id)}
                      aria-pressed={shortlist.includes(selected.id)}
                    >
                      {shortlist.includes(selected.id) ? "Shortlisted ✓" : "Add to shortlist"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">Click a window in the 3D view, or choose “View in 3D” on a unit in the list.</p>
              )}
            </section>
          </div>

          <div className="explorer-side">
            <div className="preset-row" role="group" aria-label="Period">
              {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className="btn btn-chip"
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
            <PriorityPicker value={priority} onChange={setPriority} />
            <FilterPanel filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
            <button type="button" className="btn btn-secondary btn-block" onClick={clear}>
              Clear shortlist
            </button>

            <div className="results-head">
              <h3>Best matches for “{PRIORITY_LABEL[priority].title.toLowerCase()}”</h3>
              <p className="muted" aria-live="polite">
                {ranked.length === 0
                  ? "No units match. Try widening your filters."
                  : `${ranked.length} of ${UNITS.length} units match. Scores use averages for ${PERIOD_LABEL[period].toLowerCase()}.`}
              </p>
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
            </div>

            {ranked.length > 0 && (
              <>
                <ul className="unit-list">
                  {visible.map(({ unit, exposure, score }) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      exposure={exposure}
                      score={score}
                      selected={unit.id === selectedId}
                      shortlisted={shortlist.includes(unit.id)}
                      onView={viewUnit}
                      onToggle={toggle}
                    />
                  ))}
                </ul>
                {ranked.length > INITIAL_VISIBLE && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? "Show fewer matches" : `Show more matches (${Math.min(ranked.length, EXPANDED_VISIBLE) - INITIAL_VISIBLE} more)`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
