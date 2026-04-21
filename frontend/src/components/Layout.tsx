import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../theme';
import { PixelBuilding, LumonLogo } from './PixelCharacter';
import LumonOfficeBackground from './LumonOfficeBackground';

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { colors, labels } = theme;
  const location = useLocation();
  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  const isSeverance = theme.name === 'severance';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220,
        background: colors.sidebar,
        color: colors.textOnDark,
        padding: '0',
        flexShrink: 0,
        borderRight: `4px solid ${colors.borderDark}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo area */}
        <div style={{
          padding: '20px 16px',
          borderBottom: `3px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {isSeverance ? <LumonLogo size={3} /> : <PixelBuilding size={3} />}
          <div>
            <div style={{
              ...theme.pixelHeading(),
              fontSize: 11,
              color: colors.textOnDark,
              lineHeight: 1.6,
            }}>
              {labels.appTitle}
            </div>
            <div style={{ fontSize: 10, color: colors.border, marginTop: 2 }}>
              {labels.appSubtitle}
            </div>
          </div>
        </div>

        {/* Floor directory label */}
        <div style={{
          padding: '12px 16px 6px',
          fontSize: 8,
          fontFamily: theme.fonts.heading,
          color: colors.border,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          {labels.navDirectory}
        </div>

        {/* Nav items */}
        {labels.navItems.map((item) => {
          const active = isActive(item.path);
          const activeColor = isSeverance ? colors.accent : colors.creating;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                color: active ? activeColor : colors.textOnDark,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 13,
                background: active ? `${activeColor}22` : 'transparent',
                borderLeft: active ? `4px solid ${activeColor}` : '4px solid transparent',
                borderBottom: `1px solid rgba(196,168,130,0.2)`,
                transition: 'background 0.15s',
              }}
            >
              {item.icon && <span style={{ fontSize: 18 }}>{item.icon}</span>}
              <span style={{
                fontFamily: theme.fonts.heading,
                fontSize: 9,
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Theme toggle */}
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleTheme}
          style={{
            margin: '0 16px 8px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            color: colors.textOnDark,
            border: `1px solid rgba(255,255,255,0.2)`,
            borderRadius: 0,
            cursor: 'pointer',
            fontFamily: theme.fonts.heading,
            fontSize: 8,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'background 0.15s',
          }}
        >
          {isSeverance ? 'Pixel Mode' : 'Severance Mode'}
        </button>

        {/* Bottom decoration */}
        <div style={{
          padding: '16px',
          borderTop: `2px solid ${colors.border}`,
          fontSize: 9,
          color: colors.border,
          fontFamily: theme.fonts.heading,
          textAlign: 'center',
          lineHeight: 1.8,
        }}>
          {labels.footer}
        </div>
      </nav>

      {/* Main content */}
      <main style={{
        flex: 1,
        position: 'relative',
        background: colors.background,
        overflow: 'hidden',
      }}>
        {isSeverance && <LumonOfficeBackground />}
        <div style={{ position: 'relative', zIndex: 1, padding: 24, height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
