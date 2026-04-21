import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { CharacterListItem } from '../types';

// ─── Shared dark theme tokens (same as Landing) ─────────────────
const C = {
  bg: '#0D0D0D',
  bgCard: '#1A1A1A',
  accent: '#F97316',
  accentDim: 'rgba(249,115,22,0.15)',
  accentGlow: 'rgba(249,115,22,0.4)',
  text: '#E5E5E5',
  textDim: '#888888',
  textMuted: '#555555',
  border: '#2A2A2A',
};

const FONT = {
  mono: "'IBM Plex Mono', 'Courier New', monospace",
  sans: "'IBM Plex Sans', -apple-system, sans-serif",
};

const AVATARS: Record<string, string> = {
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

const QUOTES: Record<string, string> = {
  'steve-jobs': '"Stay hungry, stay foolish."',
  'elon-musk': '"When something is important enough, you do it."',
  'charlie-munger': '"Invert, always invert."',
  'richard-feynman': '"The first principle is that you must not fool yourself."',
  'naval-ravikant': '"Seek wealth, not money or status."',
  'paul-graham': '"Make something people want."',
  'zhang-yiming': '"Delay satisfaction, think long-term."',
  'andrej-karpathy': '"The hottest new programming language is English."',
  'ilya-sutskever': '"Data is the new fuel for AI."',
  'mrbeast': '"I reinvest everything."',
  'donald-trump': '"Think big and kick ass."',
  'nassim-taleb': '"Wind extinguishes a candle and energizes fire."',
  'zhang-xuefeng': '"Choice is more important than effort."',
};

export default function CharacterList() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCharacters()
      .then(setCharacters)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      fontFamily: FONT.sans,
      minHeight: '100vh',
    }}>
      <style>{`
        .char-card:hover {
          border-color: ${C.accent} !important;
          box-shadow: 0 0 20px ${C.accentGlow}, 0 4px 24px rgba(0,0,0,0.4) !important;
          transform: translateY(-3px) !important;
        }
        .char-card:hover .char-quote {
          color: ${C.textDim} !important;
        }
        .char-nav-link:hover { color: ${C.text} !important; }
      `}</style>

      {/* Nav bar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px',
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(13,13,13,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none',
        }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 16, color: C.accent }}>&gt;_</span>
          <span style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 14, color: C.text }}>MindOS</span>
        </Link>
        <button
          onClick={() => navigate('/admin')}
          className="char-nav-link"
          style={{
            background: 'none', border: `1px solid ${C.border}`,
            color: C.textDim, fontFamily: FONT.mono, fontSize: 12,
            padding: '6px 14px', cursor: 'pointer', transition: 'color 0.2s',
          }}
        >
          Console
        </button>
      </nav>

      {/* Header */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '60px 40px 20px',
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 12, color: C.accent,
          marginBottom: 8, letterSpacing: '1px',
        }}>
          // SELECT A PERSONA
        </div>
        <h1 style={{
          fontFamily: FONT.sans, fontSize: 32, fontWeight: 700,
          color: C.text, margin: '0 0 8px',
        }}>
          Choose a mind
        </h1>
        <p style={{
          fontFamily: FONT.sans, fontSize: 15, color: C.textDim,
          margin: '0 0 40px', maxWidth: 520, lineHeight: 1.6,
        }}>
          Each persona is distilled from 30+ primary sources. Click to start a conversation.
        </p>
      </div>

      {/* Grid */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '0 40px 80px',
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center', color: C.textMuted,
            fontFamily: FONT.mono, fontSize: 13, padding: '80px 0',
          }}>
            Loading personas...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {characters.map((char) => (
              <div
                key={char.slug}
                className="char-card"
                onClick={() => navigate(`/characters/${char.slug}`)}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                  position: 'relative',
                }}
              >
                {/* Status dot */}
                {char.status !== 'available' && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    width: 7, height: 7, borderRadius: '50%',
                    background: char.status === 'running' ? '#4caf50'
                      : char.status === 'error' ? '#f44336' : '#ff9800',
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  {AVATARS[char.slug] ? (
                    <img
                      src={AVATARS[char.slug]}
                      alt={char.name}
                      style={{
                        width: 48, height: 48, objectFit: 'cover',
                        borderRadius: '50%',
                        border: `2px solid ${C.border}`,
                        filter: 'grayscale(20%)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      border: `2px solid ${C.border}`,
                      background: C.accentDim,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT.mono, fontSize: 15, fontWeight: 700, color: C.accent,
                      flexShrink: 0,
                    }}>
                      {char.name.slice(0, 2)}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: C.text,
                    }}>
                      {char.name}
                    </div>
                    {char.name_zh && char.name_zh !== char.name && (
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>
                        {char.name_zh}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tagline */}
                <div style={{
                  fontFamily: FONT.mono, fontSize: 11, color: C.textDim,
                  marginBottom: 8,
                }}>
                  {char.tagline}
                </div>

                {/* Quote */}
                <div
                  className="char-quote"
                  style={{
                    fontFamily: FONT.mono, fontSize: 11, color: C.textMuted,
                    fontStyle: 'italic', lineHeight: 1.5,
                    transition: 'color 0.2s',
                  }}
                >
                  {QUOTES[char.slug] || ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
