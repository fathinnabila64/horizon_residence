/**
 * Solar position for a given place, date and local clock time.
 *
 * Implements the NOAA "General Solar Position Calculations" (low-precision,
 * accurate to roughly 0.1 degree) so the site needs no third-party sun library.
 *
 * Conventions
 *  - azimuth: degrees clockwise from true north (N = 0, E = 90, S = 180, W = 270)
 *  - altitude: degrees above the horizon
 *  - scene axes (three.js): +x = East, +y = Up, +z = South (so North is -z)
 */

export const SITE = {
  name: "Taman Horizon, Petaling Jaya (fictional)",
  latitude: 3.1073,
  longitude: 101.6067,
  /** Malaysia Time, UTC+8, no daylight saving. */
  utcOffsetHours: 8,
} as const;

export type SunPosition = {
  /** degrees above horizon (negative = below) */
  altitude: number;
  /** degrees clockwise from north, 0-360 */
  azimuth: number;
};

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type DateParts = { year: number; month: number; day: number };

/** The fixed day used for the 3D sun path and the time slider. The list and comparison use yearly averages. */
export const DISPLAY_DATE: DateParts = { year: 2026, month: 3, day: 20 };

/** Parse "YYYY-MM-DD". Returns null if the string is not a real calendar date. */
export function parseISODate(value: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/**
 * @param date   calendar date (local)
 * @param hour   local clock time as decimal hours, e.g. 13.5 = 13:30
 */
export function getSunPosition(
  date: DateParts,
  hour: number,
  latitude: number = SITE.latitude,
  longitude: number = SITE.longitude,
  utcOffsetHours: number = SITE.utcOffsetHours,
): SunPosition {
  // Julian day at the given local time
  const utcMs =
    Date.UTC(date.year, date.month - 1, date.day) + (hour - utcOffsetHours) * 3_600_000;
  const jd = utcMs / 86_400_000 + 2_440_587.5;
  const T = (jd - 2_451_545.0) / 36_525;

  // Sun's geometric mean longitude and anomaly (degrees)
  const L0 = (280.46646 + T * (36_000.76983 + 0.0003032 * T)) % 360;
  const M = 357.52911 + T * (35_999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  // Equation of centre -> true longitude -> apparent longitude
  const C =
    Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) +
    Math.sin(rad(3 * M)) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));

  // Obliquity of the ecliptic -> declination
  const eps0 =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda)));

  // Equation of time (minutes)
  const y = Math.tan(rad(eps) / 2) ** 2;
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * rad(L0)) -
        2 * e * Math.sin(rad(M)) +
        4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) -
        0.5 * y * y * Math.sin(4 * rad(L0)) -
        1.25 * e * e * Math.sin(2 * rad(M)),
    );

  // True solar time -> hour angle
  const trueSolarTime = hour * 60 + eqTime + 4 * longitude - 60 * utcOffsetHours;
  const hourAngle = trueSolarTime / 4 - 180;

  const lat = rad(latitude);
  const H = rad(hourAngle);
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith)));
  const altitude = 90 - deg(zenith);

  const sinZ = Math.sin(zenith);
  let azimuth = 0;
  if (sinZ > 1e-6) {
    const cosAz = (Math.sin(lat) * cosZenith - Math.sin(decl)) / (Math.cos(lat) * sinZ);
    const az = deg(Math.acos(Math.min(1, Math.max(-1, cosAz))));
    azimuth = hourAngle > 0 ? (az + 180) % 360 : (540 - az) % 360;
  }

  return { altitude, azimuth };
}

/** Unit vector pointing from the ground towards the sun, in scene axes. */
export function sunDirection({ altitude, azimuth }: SunPosition): [number, number, number] {
  const alt = rad(altitude);
  const az = rad(azimuth);
  return [Math.cos(alt) * Math.sin(az), Math.sin(alt), -Math.cos(alt) * Math.cos(az)];
}

/** Compass label for an azimuth, e.g. 95 -> "E". */
export function compassPoint(azimuth: number): string {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8];
}

/** Local sunrise/sunset as decimal hours, found by scanning in 2-minute steps. */
export function sunriseSunset(date: DateParts): { sunrise: number; sunset: number } {
  let sunrise = NaN;
  let sunset = NaN;
  let prev = getSunPosition(date, 0).altitude;
  for (let minute = 2; minute <= 24 * 60; minute += 2) {
    const h = minute / 60;
    const alt = getSunPosition(date, h).altitude;
    if (prev <= 0 && alt > 0 && Number.isNaN(sunrise)) sunrise = h;
    if (prev > 0 && alt <= 0) sunset = h;
    prev = alt;
  }
  return { sunrise, sunset };
}

/** "13.5" -> "1:30 pm" */
export function formatClock(hour: number): string {
  const total = Math.round(hour * 60);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
