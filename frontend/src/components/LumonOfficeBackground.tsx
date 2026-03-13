// 1-point perspective pixel-art rendering of the Lumon MDR office
// Green carpet, ceiling grid, fluorescent lights, desk workstation clusters

const SW = 1600, SH = 1000;
// Back wall boundaries
const BX1 = 380, BY1 = 260, BX2 = 1220, BY2 = 500;
const BW = BX2 - BX1; // 840

const C = {
  ceiling: '#d4dbd4',
  ceilGrid: '#c0cac0',
  wallL: '#dce3dc',
  wallR: '#d8dfd8',
  backWall: '#e8ede8',
  floor: '#4a7a4a',
  floorGrid: '#427042',
  desk: '#d4c5a9',
  deskEdge: '#baa882',
  divider: '#345e44',
  monitor: '#4a4a4a',
  monGlow: '#6bcb77',
  chair: '#333',
  light: 'rgba(255,255,245,0.9)',
  baseboard: '#8aaa7a',
  door: '#2d4a2d',
  logoText: '#8a9a8a',
};

export default function LumonOfficeBackground() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      <svg
        viewBox={`0 0 ${SW} ${SH}`}
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
        style={{ opacity: 0.28, minHeight: '100vh' }}
      >
        <Room />
      </svg>
    </div>
  );
}

function Room() {
  const ceilCrossTimes = [0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 0.96];
  const floorCrossTimes = [0.06, 0.14, 0.24, 0.36, 0.5, 0.65, 0.8, 0.93];
  const gridLines = 12;

  // Desk cluster positions (s: 0-1 left-right, t: 0-1 back-front)
  const clusters = [
    { s: 0.25, t: 0.12 },
    { s: 0.72, t: 0.18 },
    { s: 0.48, t: 0.45 },
    { s: 0.15, t: 0.68 },
    { s: 0.78, t: 0.62 },
    { s: 0.50, t: 0.85 },
  ];

  return (
    <>
      {/* Base fill */}
      <rect width={SW} height={SH} fill={C.floor} />

      {/* ─── CEILING ─── */}
      <polygon
        points={`0,0 ${SW},0 ${BX2},${BY1} ${BX1},${BY1}`}
        fill={C.ceiling}
      />
      {/* Ceiling cross-lines (parallel to back wall) */}
      {ceilCrossTimes.map((t, i) => (
        <line key={`cc${i}`}
          x1={BX1 * t} y1={BY1 * t}
          x2={SW - BX1 * t} y2={BY1 * t}
          stroke={C.ceilGrid} strokeWidth="2"
        />
      ))}
      {/* Ceiling depth-lines (converging to back wall) */}
      {Array.from({ length: gridLines }, (_, i) => {
        const s = i / (gridLines - 1);
        return (
          <line key={`cd${i}`}
            x1={SW * s} y1={0}
            x2={BX1 + BW * s} y2={BY1}
            stroke={C.ceilGrid} strokeWidth="2"
          />
        );
      })}
      {/* Fluorescent light panels */}
      {[0.25, 0.5, 0.75].flatMap((s, si) =>
        [0.3, 0.6, 0.88].map((t, ti) => {
          const y = BY1 * t;
          const lx = BX1 * t;
          const rx = SW - BX1 * t;
          const x = lx + (rx - lx) * s;
          const w = 55 * (1.1 - t * 0.5);
          const h = 7 * (1.1 - t * 0.5);
          return (
            <rect key={`lt${si}_${ti}`}
              x={x - w / 2} y={y - h / 2}
              width={w} height={h}
              fill={C.light}
            />
          );
        })
      )}

      {/* ─── WALLS ─── */}
      <polygon
        points={`0,0 ${BX1},${BY1} ${BX1},${BY2} 0,${SH}`}
        fill={C.wallL}
      />
      <polygon
        points={`${SW},0 ${BX2},${BY1} ${BX2},${BY2} ${SW},${SH}`}
        fill={C.wallR}
      />

      {/* ─── BACK WALL ─── */}
      <rect x={BX1} y={BY1} width={BW} height={BY2 - BY1} fill={C.backWall} />
      {/* Door / corridor opening */}
      <rect
        x={BX1 + BW / 2 - 30} y={BY1 + 70}
        width={60} height={BY2 - BY1 - 70}
        fill={C.door}
      />
      {/* LUMON text */}
      <text
        x={BX1 + BW / 2} y={BY1 + 45}
        textAnchor="middle"
        fill={C.logoText}
        fontSize="26"
        fontFamily="monospace"
        fontWeight="700"
        letterSpacing="6"
        shapeRendering="auto"
      >
        LUMON
      </text>
      {/* Baseboard lines (wall-floor junction) */}
      <line x1={BX1} y1={BY2} x2={BX2} y2={BY2}
        stroke={C.baseboard} strokeWidth="3" />
      <line x1={BX1} y1={BY2} x2={0} y2={SH}
        stroke={C.baseboard} strokeWidth="3" />
      <line x1={BX2} y1={BY2} x2={SW} y2={SH}
        stroke={C.baseboard} strokeWidth="3" />

      {/* ─── FLOOR (Green Carpet) ─── */}
      <polygon
        points={`${BX1},${BY2} ${BX2},${BY2} ${SW},${SH} 0,${SH}`}
        fill={C.floor}
      />
      {/* Floor cross-lines (carpet seams, parallel to back wall) */}
      {floorCrossTimes.map((t, i) => {
        const y = BY2 + (SH - BY2) * t;
        const lx = BX1 * (1 - t);
        const rx = BX2 + BX1 * t;
        return (
          <line key={`fc${i}`}
            x1={lx} y1={y} x2={rx} y2={y}
            stroke={C.floorGrid} strokeWidth="2"
          />
        );
      })}
      {/* Floor depth-lines (converging perspective) */}
      {Array.from({ length: gridLines }, (_, i) => {
        const s = i / (gridLines - 1);
        return (
          <line key={`fd${i}`}
            x1={BX1 + BW * s} y1={BY2}
            x2={SW * s} y2={SH}
            stroke={C.floorGrid} strokeWidth="2"
          />
        );
      })}

      {/* ─── DESK CLUSTERS ─── */}
      {clusters.map(({ s, t }, i) => {
        const y = BY2 + (SH - BY2) * t;
        const lx = BX1 * (1 - t);
        const rx = BX2 + BX1 * t;
        const x = lx + (rx - lx) * s;
        const scale = 0.3 + t * 0.7;
        return <DeskCluster key={i} cx={x} cy={y} scale={scale} />;
      })}
    </>
  );
}

function DeskCluster({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  const dw = 60 * scale;
  const dh = 35 * scale;
  const gap = 3 * scale;
  const mw = 14 * scale;
  const mh = 6 * scale;
  const cs = 8 * scale;
  const sw = Math.max(1, scale);

  // Monitor positions: [x_center, y_top]
  const monitors = [
    [cx - dw / 2 - gap, cy - gap - mh],
    [cx + gap + dw / 2, cy - gap - mh],
    [cx - dw / 2 - gap, cy + gap],
    [cx + gap + dw / 2, cy + gap],
  ];

  // Chair positions: [x_center, y_top]
  const chairs = [
    [cx - dw / 2 - gap, cy - dh - gap - cs - 2 * scale],
    [cx + gap + dw / 2, cy - dh - gap - cs - 2 * scale],
    [cx - dw / 2 - gap, cy + gap + dh + 2 * scale],
    [cx + gap + dw / 2, cy + gap + dh + 2 * scale],
  ];

  return (
    <g>
      {/* 4 desk surfaces */}
      <rect x={cx - dw - gap} y={cy - dh - gap} width={dw} height={dh}
        fill={C.desk} stroke={C.deskEdge} strokeWidth={sw} />
      <rect x={cx + gap} y={cy - dh - gap} width={dw} height={dh}
        fill={C.desk} stroke={C.deskEdge} strokeWidth={sw} />
      <rect x={cx - dw - gap} y={cy + gap} width={dw} height={dh}
        fill={C.desk} stroke={C.deskEdge} strokeWidth={sw} />
      <rect x={cx + gap} y={cy + gap} width={dw} height={dh}
        fill={C.desk} stroke={C.deskEdge} strokeWidth={sw} />

      {/* Green partition dividers (cross shape) */}
      <rect x={cx - dw - gap} y={cy - gap} width={2 * (dw + gap)} height={2 * gap}
        fill={C.divider} />
      <rect x={cx - gap} y={cy - dh - gap} width={2 * gap} height={2 * (dh + gap)}
        fill={C.divider} />

      {/* CRT monitors with green glow screens */}
      {monitors.map(([mx, my], mi) => (
        <g key={`m${mi}`}>
          <rect x={mx - mw / 2} y={my} width={mw} height={mh} fill={C.monitor} />
          <rect
            x={mx - mw / 2 + scale} y={my + scale}
            width={Math.max(1, mw - 2 * scale)} height={Math.max(1, mh - 2 * scale)}
            fill={C.monGlow}
          />
        </g>
      ))}

      {/* Office chairs */}
      {chairs.map(([chx, chy], ci) => (
        <rect key={`c${ci}`}
          x={chx - cs / 2} y={chy}
          width={cs} height={cs}
          fill={C.chair}
        />
      ))}
    </g>
  );
}
