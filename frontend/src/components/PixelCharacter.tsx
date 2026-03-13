// Pixel Art Character Component + Severance Corporate Avatar
// Uses CSS box-shadow technique to draw 16x16 pixel characters
// Each character represents an agent in different states

type CharacterState = 'running' | 'stopped' | 'error' | 'creating';

const PIXEL = 3; // size of each "pixel" in actual px

// Color shortcuts
const S = '#3d2e22'; // skin
const H = '#5b4a3f'; // hair (dark brown)
const E = '#1a1a1a'; // eyes
const T = 'transparent';

// Shirt colors per state
const shirtColors: Record<CharacterState, string> = {
  running: '#7c6fea',   // purple - working
  stopped: '#a0a0a0',   // gray - resting
  error: '#ff6b6b',     // red - trouble
  creating: '#ffd93d',  // yellow - new hire
};

// Desk color
const D = '#c4a882';   // wood desk
const M = '#8a8a8a';   // monitor
const MG = '#6bcb77';  // monitor glow (green screen)

// Build a pixel art grid as box-shadow string
// Grid is defined as rows of color values. T = transparent (skip)
function buildBoxShadow(grid: string[][], px: number): string {
  const shadows: string[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const color = grid[y][x];
      if (color !== T) {
        shadows.push(`${x * px}px ${y * px}px 0 ${color}`);
      }
    }
  }
  return shadows.join(',');
}

// Running: sitting at desk, typing on computer
function runningGrid(shirt: string): string[][] {
  return [
    // Row 0-2: Head
    [T,T,T,T, T,H,H,H, H,H,T,T, T,T,T,T],
    [T,T,T,T, H,H,H,H, H,H,H,T, T,T,T,T],
    [T,T,T,T, H,S,S,S, S,S,H,T, T,T,T,T],
    [T,T,T,T, T,S,E,S, E,S,T,T, T,T,T,T],
    [T,T,T,T, T,S,S,S, S,S,T,T, T,T,T,T],
    [T,T,T,T, T,T,S,S, S,T,T,T, T,T,T,T],
    // Row 6-8: Body with arms reaching to keyboard
    [T,T,T,S, shirt,shirt,shirt,shirt, shirt,shirt,shirt,S, T,T,T,T],
    [T,T,T,T, shirt,shirt,shirt,shirt, shirt,shirt,shirt,T, T,T,T,T],
    [T,T,T,S, S,shirt,shirt,shirt, shirt,shirt,S,S, T,T,T,T],
    // Row 9: Desk surface
    [T,T,D,D, D,D,D,D, D,D,D,D, D,D,T,T],
    [T,T,D,D, D,D,D,D, D,D,D,D, D,D,T,T],
    // Row 10-11: Monitor on desk
    [T,T,T,T, M,M,M,M, M,M,M,T, T,T,T,T],
    [T,T,T,T, M,MG,MG,MG, MG,MG,M,T, T,T,T,T],
    [T,T,T,T, M,MG,MG,MG, MG,MG,M,T, T,T,T,T],
    [T,T,T,T, M,M,M,M, M,M,M,T, T,T,T,T],
    [T,T,T,T, T,T,M,M, M,T,T,T, T,T,T,T],
  ];
}

// Stopped: sleeping at desk (head down on desk)
function stoppedGrid(shirt: string): string[][] {
  const Z = '#a0a0a0'; // zzz color
  return [
    // Row 0-3: empty space + zzz
    [T,T,T,T, T,T,T,T, T,T,T,T, T,Z,T,T],
    [T,T,T,T, T,T,T,T, T,T,T,T, Z,T,T,T],
    [T,T,T,T, T,T,T,T, T,T,T,Z, T,T,T,T],
    [T,T,T,T, T,T,T,T, T,T,T,T, T,T,T,T],
    // Row 4-5: Head face-down
    [T,T,T,T, H,H,H,H, H,H,H,T, T,T,T,T],
    [T,T,T,T, H,H,H,H, H,H,H,T, T,T,T,T],
    // Row 6-8: Body slouched
    [T,T,T,S, shirt,shirt,shirt,shirt, shirt,shirt,shirt,S, T,T,T,T],
    [T,T,T,T, shirt,shirt,shirt,shirt, shirt,shirt,shirt,T, T,T,T,T],
    [T,T,T,S, S,shirt,shirt,shirt, shirt,shirt,S,S, T,T,T,T],
    // Row 9: Desk
    [T,T,D,D, D,D,D,D, D,D,D,D, D,D,T,T],
    [T,T,D,D, D,D,D,D, D,D,D,D, D,D,T,T],
    // Monitor (dark - turned off)
    [T,T,T,T, M,M,M,M, M,M,M,T, T,T,T,T],
    [T,T,T,T, M,'#333','#333','#333', '#333','#333',M,T, T,T,T,T],
    [T,T,T,T, M,'#333','#333','#333', '#333','#333',M,T, T,T,T,T],
    [T,T,T,T, M,M,M,M, M,M,M,T, T,T,T,T],
    [T,T,T,T, T,T,M,M, M,T,T,T, T,T,T,T],
  ];
}

// Error: standing with head smoking/sparking
function errorGrid(shirt: string): string[][] {
  const F = '#ff6b6b'; // fire/spark
  const Y = '#ffd93d'; // yellow spark
  return [
    // Row 0-1: Smoke/sparks above head
    [T,T,T,T, T,F,T,Y, T,F,T,T, T,T,T,T],
    [T,T,T,T, T,Y,F,T, F,Y,T,T, T,T,T,T],
    // Row 2-5: Head (distressed)
    [T,T,T,T, T,H,H,H, H,H,T,T, T,T,T,T],
    [T,T,T,T, H,S,S,S, S,S,H,T, T,T,T,T],
    [T,T,T,T, T,S,'#c00',S, '#c00',S,T,T, T,T,T,T],
    [T,T,T,T, T,S,S,'#c00', S,S,T,T, T,T,T,T],
    // Row 6-8: Body
    [T,T,T,S, shirt,shirt,shirt,shirt, shirt,shirt,shirt,S, T,T,T,T],
    [T,T,T,T, shirt,shirt,shirt,shirt, shirt,shirt,shirt,T, T,T,T,T],
    [T,T,T,T, S,shirt,shirt,shirt, shirt,shirt,S,T, T,T,T,T],
    // Row 9: Desk
    [T,T,D,D, D,D,D,D, D,D,D,D, D,D,T,T],
    [T,T,D,D, D,D,D,D, D,D,D,D, D,D,T,T],
    // Monitor (error screen - red)
    [T,T,T,T, M,M,M,M, M,M,M,T, T,T,T,T],
    [T,T,T,T, M,F,F,F, F,F,M,T, T,T,T,T],
    [T,T,T,T, M,F,F,F, F,F,M,T, T,T,T,T],
    [T,T,T,T, M,M,M,M, M,M,M,T, T,T,T,T],
    [T,T,T,T, T,T,M,M, M,T,T,T, T,T,T,T],
  ];
}

// Creating: carrying a box (moving in)
function creatingGrid(shirt: string): string[][] {
  const B = '#c4a882'; // box color (cardboard)
  const BK = '#a08060'; // box darker
  return [
    // Row 0-5: Head
    [T,T,T,T, T,H,H,H, H,H,T,T, T,T,T,T],
    [T,T,T,T, H,H,H,H, H,H,H,T, T,T,T,T],
    [T,T,T,T, H,S,S,S, S,S,H,T, T,T,T,T],
    [T,T,T,T, T,S,E,S, E,S,T,T, T,T,T,T],
    [T,T,T,T, T,S,S,S, S,S,T,T, T,T,T,T],
    [T,T,T,T, T,T,S,S, S,T,T,T, T,T,T,T],
    // Row 6-8: Body holding box
    [T,T,S,B, B,B,B,shirt, shirt,shirt,shirt,S, T,T,T,T],
    [T,T,S,B, BK,BK,B,shirt, shirt,shirt,shirt,T, T,T,T,T],
    [T,T,T,B, B,B,B,shirt, shirt,shirt,T,T, T,T,T,T],
    // Row 9-10: Legs walking
    [T,T,T,T, T,shirt,shirt,shirt, shirt,shirt,T,T, T,T,T,T],
    [T,T,T,T, T,S,S,T, T,S,S,T, T,T,T,T],
    [T,T,T,T, T,S,T,T, T,T,S,T, T,T,T,T],
    [T,T,T,T, S,S,T,T, T,T,S,S, T,T,T,T],
    // Empty rows to match height
    [T,T,T,T, T,T,T,T, T,T,T,T, T,T,T,T],
    [T,T,T,T, T,T,T,T, T,T,T,T, T,T,T,T],
    [T,T,T,T, T,T,T,T, T,T,T,T, T,T,T,T],
  ];
}

function getGrid(state: CharacterState): string[][] {
  const shirt = shirtColors[state];
  switch (state) {
    case 'running':  return runningGrid(shirt);
    case 'stopped':  return stoppedGrid(shirt);
    case 'error':    return errorGrid(shirt);
    case 'creating': return creatingGrid(shirt);
  }
}

export default function PixelCharacter({
  status,
  size = 3,
}: {
  status: string;
  size?: number;
}) {
  const state = (['running', 'stopped', 'error', 'creating'].includes(status)
    ? status
    : 'stopped') as CharacterState;

  const grid = getGrid(state);
  const shadow = buildBoxShadow(grid, size);
  const width = 16 * size;
  const height = 16 * size;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        imageRendering: 'pixelated',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          boxShadow: shadow,
          background: 'transparent',
        }}
      />
    </div>
  );
}

// Smaller building icon for the sidebar logo (Pixel theme)
export function PixelBuilding({ size = 2 }: { size?: number }) {
  const B = '#5b4a3f';
  const W = '#fff8ef';
  const Y = '#ffd93d';
  const R = '#c4a882';
  const grid: string[][] = [
    [T,T,T,T, T,B,B,T, T,T,T,T],
    [T,T,T,B, B,B,B,B, B,T,T,T],
    [T,T,T,B, W,B,W,B, B,T,T,T],
    [T,T,T,B, B,B,B,B, B,T,T,T],
    [T,B,B,B, W,B,W,B, B,B,B,T],
    [T,B,B,B, B,B,B,B, B,B,B,T],
    [T,B,Y,B, W,B,W,B, Y,B,B,T],
    [T,B,B,B, B,B,B,B, B,B,B,T],
    [T,B,Y,B, W,B,W,B, Y,B,B,T],
    [T,B,B,B, B,R,R,B, B,B,B,T],
    [T,R,R,R, R,R,R,R, R,R,R,T],
  ];

  const shadow = buildBoxShadow(grid, size);
  return (
    <div style={{ width: 12 * size, height: 11 * size, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          boxShadow: shadow,
          background: 'transparent',
        }}
      />
    </div>
  );
}

// Corporate Avatar for Severance theme
const corporateStatusColors: Record<string, string> = {
  running: '#40916c',
  stopped: '#8d99ae',
  error: '#d62828',
  creating: '#457b9d',
};

export function CorporateAvatar({
  status,
  size = 48,
}: {
  status: string;
  size?: number;
}) {
  const statusColor = corporateStatusColors[status] || corporateStatusColors.stopped;
  const initials = status === 'running' ? 'ON'
    : status === 'error' ? '!!'
    : status === 'creating' ? 'NEW'
    : '--';

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#344e41',
      border: `2px solid ${statusColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flexShrink: 0,
    }}>
      <span style={{
        color: '#dad7cd',
        fontSize: size * 0.28,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        letterSpacing: '0.05em',
      }}>
        {initials}
      </span>
      {/* Status dot */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: size * 0.25,
        height: size * 0.25,
        borderRadius: '50%',
        background: statusColor,
        border: '2px solid #f1f5f1',
      }} />
    </div>
  );
}

// Lumon Logo for Severance sidebar
export function LumonLogo({ size = 3 }: { size?: number }) {
  const dim = 10 * size;
  return (
    <div style={{
      width: dim,
      height: dim,
      borderRadius: 2,
      background: '#2d6a4f',
      border: '1px solid #a3b18a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        color: '#dad7cd',
        fontSize: dim * 0.35,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 700,
        letterSpacing: '0.1em',
      }}>
        L
      </span>
    </div>
  );
}
