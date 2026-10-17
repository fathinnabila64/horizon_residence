import { getSunPosition, sunDirection, type DateParts } from "./sun.ts";
import { FACING_NORMAL, NEIGHBOURS, UNITS, unitAnchor, type Box, type Unit } from "./units.ts";

/** Sampling window and step used for the daily exposure estimate. */
const START_HOUR = 6;
const END_HOUR = 19.5;
const STEP_MIN = 10;
/** Direct light is ignored when the sun is lower than this above the horizon. */
const MIN_ALTITUDE = 4;
/** Facade must face the sun by at least this cosine (about 85 degrees off-axis). */
const MIN_COS_INCIDENCE = 0.08;

export type Exposure = {
  /** total hours of direct sun on the main window */
  total: number;
  /** direct sun before solar noon */
  morning: number;
  /** direct sun after solar noon (the heat load) */
  afternoon: number;
};

export type Priority = "cool" | "morning" | "daylight";

export const PRIORITY_LABEL: Record<Priority, { title: string; hint: string }> = {
  cool: { title: "Cooler afternoons", hint: "Fewer hours of direct sun after solar noon" },
  morning: { title: "Bright mornings", hint: "More direct sun before solar noon" },
  daylight: { title: "Most daylight", hint: "Most hours of direct sun overall" },
};

type Sample = { hour: number; dir: [number, number, number]; altitude: number };
type DaySamples = { samples: Sample[]; solarNoon: number };

const sampleCache = new Map<string, DaySamples>();

/**
 * Sun samples for one date. Solar noon in Malaysia is ~1:10-1:25 pm on the clock,
 * so "morning" and "afternoon" sun are split at solar noon, not at 12:00.
 */
function samplesFor(date: DateParts): DaySamples {
  const key = `${date.year}-${date.month}-${date.day}`;
  const cached = sampleCache.get(key);
  if (cached) return cached;
  const samples: Sample[] = [];
  let solarNoon = 13;
  let best = -Infinity;
  for (let m = START_HOUR * 60; m <= END_HOUR * 60; m += STEP_MIN) {
    const hour = m / 60;
    const pos = getSunPosition(date, hour);
    if (pos.altitude > best) {
      best = pos.altitude;
      solarNoon = hour;
    }
    if (pos.altitude > MIN_ALTITUDE) samples.push({ hour, dir: sunDirection(pos), altitude: pos.altitude });
  }
  const out = { samples, solarNoon };
  sampleCache.set(key, out);
  return out;
}

/** Clock time (decimal hours) of solar noon on a date, to the nearest 10 minutes. */
export function solarNoonHour(date: DateParts): number {
  return samplesFor(date).solarNoon;
}

/** Slab-method ray / axis-aligned box test (ray starts outside the box). */
export function rayHitsBox(
  origin: [number, number, number],
  dir: [number, number, number],
  box: Box,
): boolean {
  let tMin = 0;
  let tMax = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dir[i]) < 1e-9) {
      if (origin[i] < box.min[i] || origin[i] > box.max[i]) return false;
    } else {
      let t1 = (box.min[i] - origin[i]) / dir[i];
      let t2 = (box.max[i] - origin[i]) / dir[i];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

export type SunStatus = "lit" | "facing-away" | "blocked" | "night";

/** Why a window is (or is not) in direct sun for one sun direction. */
export function sunStatus(unit: Unit, dir: [number, number, number], altitude: number): {
  status: SunStatus;
  blockedBy?: string;
} {
  if (altitude <= MIN_ALTITUDE) return { status: "night" };
  const n = FACING_NORMAL[unit.facing];
  const cos = n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2];
  if (cos < MIN_COS_INCIDENCE) return { status: "facing-away" };
  const a = unitAnchor(unit);
  // nudge the origin 0.5 m off the facade so the tower never shades itself
  const origin: [number, number, number] = [a[0] + n[0] * 0.5, a[1], a[2] + n[2] * 0.5];
  const blocker = NEIGHBOURS.find((box) => rayHitsBox(origin, dir, box));
  return blocker ? { status: "blocked", blockedBy: blocker.id } : { status: "lit" };
}

/** Is the unit's main window in direct sun at one sample? */
export function isSunlit(unit: Unit, dir: [number, number, number]): boolean {
  // sample directions are only generated when the sun is above MIN_ALTITUDE
  return sunStatus(unit, dir, 90).status === "lit";
}

export function computeExposure(unit: Unit, date: DateParts): Exposure {
  let morning = 0;
  let afternoon = 0;
  const { samples, solarNoon } = samplesFor(date);
  for (const s of samples) {
    if (!isSunlit(unit, s.dir)) continue;
    if (s.hour < solarNoon) morning += STEP_MIN / 60;
    else afternoon += STEP_MIN / 60;
  }
  return { total: morning + afternoon, morning, afternoon };
}

/** Exposure for every unit on one date (112 units x ~80 samples: fast enough to run per render). */
export function computeAll(date: DateParts): Map<string, Exposure> {
  const map = new Map<string, Exposure>();
  for (const u of UNITS) map.set(u.id, computeExposure(u, date));
  return map;
}

export type Period = "year" | "q1" | "q2" | "q3" | "q4";

export const PERIOD_LABEL: Record<Period, string> = {
  year: "Whole year",
  q1: "Q1 (Jan–Mar)",
  q2: "Q2 (Apr–Jun)",
  q3: "Q3 (Jul–Sep)",
  q4: "Q4 (Oct–Dec)",
};

/** Months sampled for each period. One representative day (the 15th) per month. */
const PERIOD_MONTHS: Record<Period, number[]> = {
  year: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  q1: [1, 2, 3],
  q2: [4, 5, 6],
  q3: [7, 8, 9],
  q4: [10, 11, 12],
};

/** The months a period covers, in order. */
export function periodMonths(period: Period): number[] {
  return PERIOD_MONTHS[period];
}

/** Average direct sun per day over a period, in hours. */
export function computeYearly(unit: Unit, period: Period = "year"): Exposure {
  const months = PERIOD_MONTHS[period];
  let morning = 0;
  let afternoon = 0;
  for (const month of months) {
    const e = computeExposure(unit, { year: 2026, month, day: 15 });
    morning += e.morning;
    afternoon += e.afternoon;
  }
  const m = morning / months.length;
  const a = afternoon / months.length;
  return { total: m + a, morning: m, afternoon: a };
}

/** Period averages for every unit. Does not depend on the date picker. */
export function computeAllYearly(period: Period = "year"): Map<string, Exposure> {
  const map = new Map<string, Exposure>();
  for (const u of UNITS) map.set(u.id, computeYearly(u, period));
  return map;
}

/** 0-100 fit score for what the buyer says matters most. */
export function scoreFor(priority: Priority, e: Exposure): number {
  switch (priority) {
    case "cool":
      return Math.round(100 * (1 - Math.min(e.afternoon, 7) / 7));
    case "morning":
      return Math.round(100 * (Math.min(e.morning, 6) / 6));
    case "daylight":
      return Math.round(100 * (Math.min(e.total, 11) / 11));
  }
}

export function formatHours(h: number): string {
  return `${h.toFixed(1)} h`;
}
