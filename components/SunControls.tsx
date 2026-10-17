"use client";

import { compassPoint, formatClock, type SunPosition } from "@/lib/sun";

export const MIN_MINUTES = 6 * 60;
export const MAX_MINUTES = 19 * 60 + 30;

type Props = {
  minutes: number;
  onMinutes: (m: number) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
  sun: SunPosition;
  sunrise: number;
  sunset: number;
  solarNoon: number;
  playLabel: string;
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
  playLabel,
}: Props) {

  const up = sun.altitude > 0;
  const summary = up
    ? `Sun is ${Math.round(sun.altitude)}° above the horizon, in the ${compassPoint(sun.azimuth)}.`
    : "The sun is below the horizon.";

  return (
    <section className="sun-controls" aria-labelledby="sun-controls-title">
      <h3 id="sun-controls-title">Sun settings</h3>

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
            {playing ? "Pause" : playLabel}
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
