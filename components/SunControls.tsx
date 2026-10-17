"use client";

import { useEffect } from "react";
import { compassPoint, formatClock, type SunPosition } from "@/lib/sun";
import { useShortlist } from "./ShortlistContext";

export const MIN_MINUTES = 6 * 60;
export const MAX_MINUTES = 19 * 60 + 30;

const PRESETS = [
  { label: "Mar equinox", value: "2026-03-20" },
  { label: "Jun solstice", value: "2026-06-21" },
  { label: "Sep equinox", value: "2026-09-23" },
  { label: "Dec solstice", value: "2026-12-21" },
];

type Props = {
  minutes: number;
  onMinutes: (m: number) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
  sun: SunPosition;
  sunrise: number;
  sunset: number;
  solarNoon: number;
};

export default function SunControls({
  minutes,
  onMinutes,
  playing,
  onPlaying,
  sun,
  sunrise,
  sunset,
  solarNoon,
}: Props) {
  const { dateInput, setDateInput, dateError } = useShortlist();

  // Play the day forward in 10-minute steps; stop at the end of the slider.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      onMinutes(minutes + 10 > MAX_MINUTES ? MIN_MINUTES : minutes + 10);
    }, 140);
    return () => window.clearInterval(id);
  }, [playing, minutes, onMinutes]);

  const up = sun.altitude > 0;
  const summary = up
    ? `Sun is ${Math.round(sun.altitude)}° above the horizon, in the ${compassPoint(sun.azimuth)}.`
    : "The sun is below the horizon.";

  return (
    <section className="sun-controls" aria-labelledby="sun-controls-title">
      <h3 id="sun-controls-title">Sun settings</h3>

      <div className="date-row">
        <div className="field-group">
          <label htmlFor="sun-date" className="field-label">
            Date
          </label>
          <input
            id="sun-date"
            type="date"
            min="2026-01-01"
            max="2030-12-31"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            aria-invalid={dateError}
            aria-describedby={dateError ? "sun-date-error" : undefined}
          />
          {dateError && (
            <p id="sun-date-error" className="field-error" role="alert">
              Enter a valid date between 2026 and 2030. Showing the last valid date.
            </p>
          )}
        </div>
        <div className="preset-row" role="group" aria-label="Quick dates">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="btn btn-chip"
              aria-pressed={dateInput === p.value}
              onClick={() => setDateInput(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="time-row">
        <label htmlFor="sun-time" className="field-label">
          Time of day: <output htmlFor="sun-time">{formatClock(minutes / 60)}</output>
        </label>
        <div className="time-slider">
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => onPlaying(!playing)}
            aria-pressed={playing}
          >
            {playing ? "Pause" : "Play day"}
          </button>
          <input
            id="sun-time"
            type="range"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={10}
            value={minutes}
            onChange={(e) => {
              onPlaying(false);
              onMinutes(Number(e.target.value));
            }}
            aria-valuetext={`${formatClock(minutes / 60)}. ${summary}`}
          />
        </div>
        <p className="sun-readout" aria-live={playing ? "off" : "polite"}>
          {summary} Sunrise {formatClock(sunrise)}, solar noon {formatClock(solarNoon)}, sunset{" "}
          {formatClock(sunset)}.
        </p>
      </div>
    </section>
  );
}
