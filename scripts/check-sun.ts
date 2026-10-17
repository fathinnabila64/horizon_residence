// Sanity checks for the solar maths and the shading logic. Run: npm run test:sun
import { getSunPosition, sunriseSunset, parseISODate } from "../lib/sun.ts";
import { computeExposure } from "../lib/exposure.ts";
import { UNIT_BY_ID } from "../lib/units.ts";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failed++;
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

const equinox = parseISODate("2026-03-20")!;
const june = parseISODate("2026-06-21")!;
const dec = parseISODate("2026-12-21")!;

// Near the equator the equinox sun passes almost overhead around local 13:10.
let peak = { alt: -90, hour: 0 };
for (let h = 11; h <= 15; h += 1 / 60) {
  const p = getSunPosition(equinox, h);
  if (p.altitude > peak.alt) peak = { alt: p.altitude, hour: h };
}
check("equinox peak altitude ~ 87 deg", near(peak.alt, 86.9, 1.5), `got ${peak.alt.toFixed(1)}`);
check("equinox solar noon ~ 13:10", near(peak.hour, 13.17, 0.2), `got ${peak.hour.toFixed(2)}`);

const sunrise = sunriseSunset(equinox).sunrise;
check("equinox sunrise ~ 07:10", near(sunrise, 7.17, 0.25), `got ${sunrise.toFixed(2)}`);

const jn = getSunPosition(june, 13.2);
check("June noon sun is north of overhead (az < 90 or > 270)", jn.azimuth < 90 || jn.azimuth > 270, `az ${jn.azimuth.toFixed(0)}`);
check("June noon altitude ~ 69 deg", near(jn.altitude, 69.7, 2), `got ${jn.altitude.toFixed(1)}`);

const dc = getSunPosition(dec, 13.0);
check("December noon sun is south (az ~ 180)", near(dc.azimuth, 180, 25), `az ${dc.azimuth.toFixed(0)}`);
check("December noon altitude ~ 63 deg", near(dc.altitude, 62.6, 2.5), `got ${dc.altitude.toFixed(1)}`);

const am = getSunPosition(equinox, 8);
const pm = getSunPosition(equinox, 17);
check("morning sun is in the east", am.azimuth > 60 && am.azimuth < 120, `az ${am.azimuth.toFixed(0)}`);
check("evening sun is in the west", pm.azimuth > 240 && pm.azimuth < 300, `az ${pm.azimuth.toFixed(0)}`);

check("rejects 2026-02-30", parseISODate("2026-02-30") === null);
check("rejects junk", parseISODate("tomorrow") === null);

// Shading: East faces get morning sun, West faces get afternoon sun, neighbours shade low floors.
const e20 = computeExposure(UNIT_BY_ID.get("20-E")!, equinox);
const w20 = computeExposure(UNIT_BY_ID.get("20-W")!, equinox);
check("20-E: morning sun, no afternoon sun", e20.morning > 3 && e20.afternoon < 0.5, JSON.stringify(e20));
check("20-W: afternoon sun, no morning sun", w20.afternoon > 3 && w20.morning < 0.5, JSON.stringify(w20));

const w04 = computeExposure(UNIT_BY_ID.get("04-W")!, equinox);
check("Block B shades low west units (04-W < 20-W afternoon sun)", w04.afternoon < w20.afternoon - 1, `04-W ${w04.afternoon.toFixed(1)} vs 20-W ${w20.afternoon.toFixed(1)}`);

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
