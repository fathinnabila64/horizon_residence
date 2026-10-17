/**
 * Demo data for the fictional "Horizon Residence".
 * Prices and sizes are invented and exist only to drive the unit picker.
 */

export type Facing = "N" | "E" | "S" | "W";

export const FACING_LABEL: Record<Facing, string> = {
  N: "North",
  E: "East",
  S: "South",
  W: "West",
};

/** Outward unit normal of each facade in scene axes (+x East, +z South). */
export const FACING_NORMAL: Record<Facing, [number, number, number]> = {
  N: [0, 0, -1],
  E: [1, 0, 0],
  S: [0, 0, 1],
  W: [-1, 0, 0],
};

export type Unit = {
  id: string;
  floor: number;
  facing: Facing;
  bedrooms: 2 | 3;
  sqft: number;
  priceRM: number;
};

/** Axis-aligned box in scene metres. */
export type Box = { id: string; min: [number, number, number]; max: [number, number, number] };

export const TOWER = {
  width: 36, // x extent (E-W)
  depth: 24, // z extent (N-S)
  floorHeight: 3.2,
  firstFloor: 3, // floors 1-2 are the podium
  lastFloor: 30,
} as const;

export const TOWER_HEIGHT = (TOWER.lastFloor + 1) * TOWER.floorHeight;

/** Neighbouring buildings that cast shadows on the lower floors. */
export const NEIGHBOURS: Box[] = [
  { id: "Block B (existing)", min: [-78, 0, -4], max: [-48, 64, 20] },
  { id: "Block C (future)", min: [34, 0, 12], max: [70, 40, 36] },
];

const FLOOR_PLANS: Record<Facing, { bedrooms: 2 | 3; sqft: number }> = {
  N: { bedrooms: 2, sqft: 860 },
  E: { bedrooms: 3, sqft: 1180 },
  S: { bedrooms: 3, sqft: 1210 },
  W: { bedrooms: 2, sqft: 920 },
};

const FACING_PSF_PREMIUM: Record<Facing, number> = { N: 0, E: 10, S: 20, W: 0 };

function buildUnits(): Unit[] {
  const units: Unit[] = [];
  for (let floor = TOWER.firstFloor; floor <= TOWER.lastFloor; floor++) {
    (Object.keys(FLOOR_PLANS) as Facing[]).forEach((facing) => {
      const plan = FLOOR_PLANS[facing];
      const psf = 780 + floor * 7 + FACING_PSF_PREMIUM[facing];
      units.push({
        id: `${String(floor).padStart(2, "0")}-${facing}`,
        floor,
        facing,
        bedrooms: plan.bedrooms,
        sqft: plan.sqft,
        priceRM: Math.round((psf * plan.sqft) / 1000) * 1000,
      });
    });
  }
  return units;
}

export const UNITS: Unit[] = buildUnits();

export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));

export const PRICE_RANGE = {
  min: Math.min(...UNITS.map((u) => u.priceRM)),
  max: Math.max(...UNITS.map((u) => u.priceRM)),
};

/** World-space centre of a unit's main window, just outside the facade. */
export function unitAnchor(unit: Unit): [number, number, number] {
  const y = (unit.floor - 1) * TOWER.floorHeight + TOWER.floorHeight / 2;
  const [nx, , nz] = FACING_NORMAL[unit.facing];
  const x = nx * (TOWER.width / 2);
  const z = nz * (TOWER.depth / 2);
  return [x, y, z];
}
