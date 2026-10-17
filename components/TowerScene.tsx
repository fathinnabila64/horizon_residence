"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { getSunPosition, sunDirection, type DateParts, type SunPosition } from "@/lib/sun";
import { sunStatus } from "@/lib/exposure";
import {
  FACING_NORMAL,
  NEIGHBOURS,
  TOWER,
  TOWER_HEIGHT,
  UNIT_BY_ID,
  UNITS,
  unitAnchor,
  type Facing,
  type Unit,
} from "@/lib/units";
import { PALETTE } from "@/lib/palette";

export type View = "iso" | Facing;

export const VIEW_POSITIONS: Record<View, [number, number, number]> = {
  iso: [-125, 80, 135],
  N: [0, 70, -195],
  E: [195, 70, 0],
  S: [0, 70, 195],
  W: [-195, 70, 0],
};

type Props = {
  view: View;
  sun: SunPosition;
  date: DateParts;
  activeIds: Set<string>;
  selectedId: string | null;
  shortlist: string[];
  onSelect: (id: string) => void;
};

const PANEL_H = 2.3;
const PANEL_W: Record<Facing, number> = { N: 12, S: 12, E: 9, W: 9 };

/** Sky tint by sun altitude: dark blue at night, pale warm blue by day. */
function skyColor(altitude: number): string {
  if (altitude <= -6) return "#16212b";
  if (altitude <= 4) return "#e7a977";
  if (altitude <= 14) return "#cfd9d8";
  return "#bfe0ea";
}

function UnitPanel({
  unit,
  lit,
  active,
  selected,
  pinned,
  onSelect,
}: {
  unit: Unit;
  lit: boolean;
  active: boolean;
  selected: boolean;
  pinned: boolean;
  onSelect: (id: string) => void;
}) {
  const [x, y, z] = unitAnchor(unit);
  const [nx, , nz] = FACING_NORMAL[unit.facing];
  const rotY = unit.facing === "E" || unit.facing === "W" ? Math.PI / 2 : 0;
  const w = PANEL_W[unit.facing];
  const color = !active ? PALETTE.muted : lit ? PALETTE.sun : PALETTE.shade;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(unit.id);
  };

  return (
    <group position={[x + nx * 0.12, y, z + nz * 0.12]} rotation={[0, rotY, 0]}>
      {selected && (
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[w + 1, PANEL_H + 0.9, 0.2]} />
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
      )}
      <mesh
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[w, PANEL_H, 0.2]} />
        <meshStandardMaterial
          color={color}
          emissive={active && lit ? PALETTE.sun : "#000000"}
          emissiveIntensity={active && lit ? 0.35 : 0}
          transparent={!active}
          opacity={active ? 1 : 0.45}
          roughness={0.35}
        />
      </mesh>
      {selected && (
        <mesh position={[0, PANEL_H / 2 + 4.5, 0.4]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[2.8, 5.5, 16]} />
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
      )}
      {pinned && (
        <mesh position={[0, PANEL_H / 2 + 1.1, 0.2]}>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshBasicMaterial color={PALETTE.teal} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Compass letter drawn as a sprite. Plain three.js objects avoid drei's <Html>,
 * which mounts a nested React root and triggers unmount-during-render warnings.
 */
function CompassMark({ label, position }: { label: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.fillStyle = "#1f2a30";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 72px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, size / 2, size / 2 + 4);
    }
    return new THREE.CanvasTexture(canvas);
  }, [label]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[14, 14, 1]}>
      <spriteMaterial map={texture} depthTest transparent />
    </sprite>
  );
}

/** Moves the camera when the person picks a preset view. */
function CameraRig({ view }: { view: View }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { update: () => void } | null;
  useEffect(() => {
    const [x, y, z] = VIEW_POSITIONS[view];
    camera.position.set(x, y, z);
    camera.lookAt(0, 42, 0);
    controls?.update();
  }, [view, camera, controls]);
  return null;
}

/** Handlers that make a solid building block clicks/hovers on windows hidden behind it. */
const occlude = {
  onClick: (e: ThreeEvent<MouseEvent>) => e.stopPropagation(),
  onPointerOver: (e: ThreeEvent<PointerEvent>) => e.stopPropagation(),
};

function SceneContent({ view, sun, date, activeIds, selectedId, shortlist, onSelect }: Props) {
  const dir = useMemo(() => sunDirection(sun), [sun]);
  const daytime = sun.altitude > 0;

  // The sun's path across the sky for the chosen date, drawn as an arc.
  const sunPath = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let h = 5.5; h <= 20; h += 0.25) {
      const p = getSunPosition(date, h);
      if (p.altitude > -1) {
        const d = sunDirection(p);
        pts.push([d[0] * 170, d[1] * 170, d[2] * 170]);
      }
    }
    return pts;
  }, [date]);

  const litById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const u of UNITS) map.set(u.id, sunStatus(u, dir, sun.altitude).status === "lit");
    return map;
  }, [dir, sun.altitude]);

  const selected = selectedId ? UNIT_BY_ID.get(selectedId) : undefined;
  const selectedAnchor = selected ? unitAnchor(selected) : null;
  const selectedLit = selected ? litById.get(selected.id) : false;
  const sunPoint: [number, number, number] = [dir[0] * 170, dir[1] * 170, dir[2] * 170];

  const slabs = useMemo(
    () => Array.from({ length: TOWER.lastFloor + 1 }, (_, i) => (i + 1) * TOWER.floorHeight),
    [],
  );

  return (
    <>
      <color attach="background" args={[skyColor(sun.altitude)]} />
      <ambientLight intensity={daytime ? 0.55 : 0.18} />
      <hemisphereLight args={["#e6f1f5", "#b9ae96", daytime ? 0.5 : 0.12]} />
      <directionalLight
        position={[dir[0] * 220, Math.max(dir[1], 0.02) * 220, dir[2] * 220]}
        intensity={daytime ? 2.4 : 0}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-130}
        shadow-camera-right={130}
        shadow-camera-top={130}
        shadow-camera-bottom={-130}
        shadow-camera-near={1}
        shadow-camera-far={600}
        shadow-bias={-0.0006}
      />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} />
      </mesh>

      {/* main tower */}
      <mesh position={[0, TOWER_HEIGHT / 2, 0]} castShadow receiveShadow {...occlude}>
        <boxGeometry args={[TOWER.width, TOWER_HEIGHT, TOWER.depth]} />
        <meshStandardMaterial color={PALETTE.tower} roughness={0.9} />
      </mesh>
      {slabs.map((y) => (
        <mesh key={y} position={[0, y - 0.15, 0]} castShadow>
          <boxGeometry args={[TOWER.width + 0.8, 0.3, TOWER.depth + 0.8]} />
          <meshStandardMaterial color={PALETTE.slab} roughness={0.9} />
        </mesh>
      ))}

      {/* neighbours that shade the lower floors */}
      {NEIGHBOURS.map((b) => {
        const size: [number, number, number] = [
          b.max[0] - b.min[0],
          b.max[1] - b.min[1],
          b.max[2] - b.min[2],
        ];
        const pos: [number, number, number] = [
          (b.min[0] + b.max[0]) / 2,
          (b.min[1] + b.max[1]) / 2,
          (b.min[2] + b.max[2]) / 2,
        ];
        return (
          <mesh key={b.id} position={pos} castShadow receiveShadow {...occlude}>
            <boxGeometry args={size} />
            <meshStandardMaterial color={PALETTE.neighbour} roughness={0.95} />
          </mesh>
        );
      })}

      {/* unit windows */}
      {UNITS.map((u) => (
        <UnitPanel
          key={u.id}
          unit={u}
          lit={litById.get(u.id) ?? false}
          active={activeIds.has(u.id)}
          selected={u.id === selectedId}
          pinned={shortlist.includes(u.id)}
          onSelect={onSelect}
        />
      ))}

      {/* sun arc, sun, and the ray to the selected window */}
      {sunPath.length > 1 && <Line points={sunPath} color="#d9822b" lineWidth={1.2} dashed dashSize={4} gapSize={4} />}
      {daytime && (
        <mesh position={sunPoint}>
          <sphereGeometry args={[7, 24, 24]} />
          <meshBasicMaterial color="#ffc94d" />
        </mesh>
      )}
      {daytime && selectedAnchor && (
        <Line
          points={[selectedAnchor, sunPoint]}
          color={selectedLit ? PALETTE.sunRay : PALETTE.blocked}
          lineWidth={selectedLit ? 2 : 1.2}
          dashed={!selectedLit}
          dashSize={3}
          gapSize={3}
        />
      )}

      {/* compass */}
      {(
        [
          ["N", [0, 8, -105]],
          ["E", [105, 8, 0]],
          ["S", [0, 8, 105]],
          ["W", [-105, 8, 0]],
        ] as [string, [number, number, number]][]
      ).map(([label, pos]) => (
        <CompassMark key={label} label={label} position={pos} />
      ))}

      <CameraRig view={view} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={70}
        maxDistance={260}
        maxPolarAngle={Math.PI / 2 - 0.04}
        target={[0, 42, 0]}
        enableDamping
      />
    </>
  );
}

function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setOk(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

export default function TowerScene(props: Props) {
  const webgl = useWebGL();

  if (webgl === false) {
    return (
      <div className="scene-fallback" role="status">
        <p>
          3D view isn&apos;t available in this browser. You can still compare every unit using the list and
          hours-of-sun figures beside this panel.
        </p>
      </div>
    );
  }
  if (webgl === null) return <div className="scene-fallback" aria-hidden="true" />;

  return (
    <Canvas
      shadows={{ enabled: true, type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: VIEW_POSITIONS.iso, fov: 42, near: 1, far: 900 }}
      gl={{ antialias: true }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
