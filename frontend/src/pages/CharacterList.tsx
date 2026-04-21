import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { api } from '../api/client';
import type { CharacterListItem } from '../types';

const STATUS_COLORS: Record<string, string> = {
  running: '#4caf50',
  stopped: '#ff9800',
  error: '#f44336',
  available: '#90a4ae',
  creating: '#2196f3',
  starting: '#2196f3',
};

const CHARACTER_INITIALS: Record<string, string> = {
  'steve-jobs': 'SJ',
  'elon-musk': 'EM',
  'charlie-munger': 'CM',
  'richard-feynman': 'RF',
  'naval-ravikant': 'NR',
  'paul-graham': 'PG',
  'zhang-yiming': 'ZY',
  'andrej-karpathy': 'AK',
  'ilya-sutskever': 'IS',
  'mrbeast': 'MB',
  'donald-trump': 'DT',
  'nassim-taleb': 'NT',
  'zhang-xuefeng': 'ZX',
};

export default function CharacterList() {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCharacters()
      .then(setCharacters)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: colors.textLight }}>
        Loading characters...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          ...theme.pixelHeading(),
          fontSize: 18,
          color: colors.text,
          margin: 0,
        }}>
          {theme.name === 'severance' ? 'Persona Archive' : 'Character Personas'}
        </h1>
        <p style={{
          color: colors.textLight,
          fontSize: 12,
          margin: '8px 0 0',
          fontFamily: theme.fonts.mono,
        }}>
          {theme.name === 'severance'
            ? 'Select a persona to initiate consultation protocol.'
            : 'Click a character to start a conversation. Agent will be auto-created on first chat.'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {characters.map((char) => (
          <div
            key={char.slug}
            onClick={() => navigate(`/characters/${char.slug}`)}
            style={{
              ...theme.pixelCard(),
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px rgba(0,0,0,0.15)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'none';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {/* Status dot */}
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: STATUS_COLORS[char.status] || STATUS_COLORS.available,
            }} />

            {/* Avatar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 0,
                border: `2px solid ${colors.border}`,
                background: colors.accent + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: theme.fonts.heading,
                fontSize: 16,
                fontWeight: 700,
                color: colors.accent,
              }}>
                {CHARACTER_INITIALS[char.slug] || char.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.text,
                }}>
                  {char.name}
                </div>
                {char.name_zh && char.name_zh !== char.name && (
                  <div style={{
                    fontSize: 11,
                    color: colors.textLight,
                  }}>
                    {char.name_zh}
                  </div>
                )}
              </div>
            </div>

            {/* Tagline */}
            <div style={{
              fontSize: 12,
              color: colors.textLight,
              fontFamily: theme.fonts.mono,
              marginBottom: 8,
            }}>
              {char.tagline}
            </div>

            {/* Role badge */}
            <div style={{
              display: 'inline-block',
              padding: '2px 8px',
              border: `1px solid ${colors.border}`,
              fontSize: 10,
              fontFamily: theme.fonts.heading,
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {char.role}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
