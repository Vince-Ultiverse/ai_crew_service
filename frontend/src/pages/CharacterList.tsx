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

const CHARACTER_AVATARS: Record<string, string> = {
  'steve-jobs': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/220px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg',
  'elon-musk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/220px-Elon_Musk_Royal_Society_%28crop2%29.jpg',
  'charlie-munger': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Charlie_Munger_%28cropped%29.jpg/220px-Charlie_Munger_%28cropped%29.jpg',
  'richard-feynman': 'https://upload.wikimedia.org/wikipedia/en/thumb/4/42/Richard_Feynman_Nobel.jpg/220px-Richard_Feynman_Nobel.jpg',
  'naval-ravikant': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Naval_Ravikant_%28cropped%29.jpg/220px-Naval_Ravikant_%28cropped%29.jpg',
  'paul-graham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Paulgraham_240x320.jpg/220px-Paulgraham_240x320.jpg',
  'zhang-yiming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Zhang_Yiming_2020_%28cropped%29.png/220px-Zhang_Yiming_2020_%28cropped%29.png',
  'andrej-karpathy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Andrej_Karpathy_in_2024_%28cropped%29.jpg/220px-Andrej_Karpathy_in_2024_%28cropped%29.jpg',
  'ilya-sutskever': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Ilya_Sutskever_at_NeurIPS_2019_%28cropped%29.jpg/220px-Ilya_Sutskever_at_NeurIPS_2019_%28cropped%29.jpg',
  'mrbeast': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/MrBeast_2023_%28cropped%29.jpg/220px-MrBeast_2023_%28cropped%29.jpg',
  'donald-trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/220px-Donald_Trump_official_portrait.jpg',
  'nassim-taleb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Nassim_Nicholas_Taleb_2024_%28cropped%29.jpg/220px-Nassim_Nicholas_Taleb_2024_%28cropped%29.jpg',
  'zhang-xuefeng': '',
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
              {CHARACTER_AVATARS[char.slug] ? (
                <img
                  src={CHARACTER_AVATARS[char.slug]}
                  alt={char.name}
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: 'cover',
                    border: `2px solid ${colors.border}`,
                    borderRadius: 0,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 0,
                border: `2px solid ${colors.border}`,
                background: colors.accent + '22',
                display: CHARACTER_AVATARS[char.slug] ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: theme.fonts.heading,
                fontSize: 16,
                fontWeight: 700,
                color: colors.accent,
                flexShrink: 0,
              }}>
                {char.name.slice(0, 2).toUpperCase()}
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
