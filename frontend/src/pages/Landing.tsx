import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CharacterListItem } from '../types';

// ─── Design tokens ──────────────────────────────────────────────
const C = {
  bg: '#0D0D0D',
  bgCard: '#1A1A1A',
  bgCardHover: '#222222',
  accent: '#F97316',
  accentDim: 'rgba(249,115,22,0.15)',
  accentGlow: 'rgba(249,115,22,0.4)',
  text: '#E5E5E5',
  textDim: '#888888',
  textMuted: '#555555',
  border: '#2A2A2A',
  borderHover: '#444444',
};

const FONT = {
  mono: "'IBM Plex Mono', 'Courier New', monospace",
  sans: "'IBM Plex Sans', -apple-system, sans-serif",
};

const AVATARS: Record<string, string> = {
  'steve-jobs': 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg',
  'elon-musk': 'https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg',
  'charlie-munger': 'https://upload.wikimedia.org/wikipedia/commons/5/56/Charlie_Munger_%28cropped%29.jpg',
  'richard-feynman': 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg',
  'naval-ravikant': 'https://upload.wikimedia.org/wikipedia/commons/5/55/Naval_Ravikant_%28cropped%29.jpg',
  'paul-graham': 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Paulgraham_240x320.jpg',
  'zhang-yiming': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/The_CEO_Magazine_Cover.jpg',
  'andrej-karpathy': 'https://avatars.githubusercontent.com/u/241138?v=4',
  'ilya-sutskever': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Democratizing_Deep_Learning_with_Nervana_and_Google_Brain_%2815105407149%29_%28cropped%29.jpg',
  'mrbeast': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/MrBeast_2023_%28cropped%29.jpg',
  'donald-trump': 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
  'nassim-taleb': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Nassim_Nicholas_Taleb_2013.jpg',
  'zhang-xuefeng': 'https://upload.wikimedia.org/wikipedia/en/6/6d/Zhang_Xuefeng.jpg',
};

const QUOTES: Record<string, string> = {
  'steve-jobs': '"Stay hungry, stay foolish."',
  'elon-musk': '"When something is important enough, you do it even if the odds are not in your favor."',
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

// ─── Typewriter hook ────────────────────────────────────────────
function useTypewriter(text: string, speed = 60, startDelay = 300) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplay('');
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplay(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { display, done };
}

// ─── Fade-in on scroll hook ─────────────────────────────────────
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, style: {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(30px)',
    transition: 'opacity 0.7s ease, transform 0.7s ease',
  }};
}

// ─── Component ──────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const hero = useTypewriter('Talk to the greatest minds.', 55, 500);
  const heroZh = useTypewriter('// \u4e0E\u4E16\u754C\u9876\u7EA7\u601D\u60F3\u5BB6\u5BF9\u8BDD', 50, 2500);
  const sec2 = useFadeIn();
  const sec3 = useFadeIn();
  const sec4 = useFadeIn();

  useEffect(() => {
    api.getCharacters().then(setCharacters).catch(() => {});
  }, []);

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      fontFamily: FONT.sans,
      minHeight: '100vh',
      overflowX: 'hidden',
    }}>
      {/* ── Inject scoped styles ── */}
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .landing-card:hover {
          border-color: ${C.accent} !important;
          box-shadow: 0 0 20px ${C.accentGlow}, 0 4px 24px rgba(0,0,0,0.4) !important;
          transform: translateY(-4px) !important;
        }
        .landing-card:hover .card-quote {
          color: ${C.textDim} !important;
        }
        .landing-cta:hover {
          background: #ea6c10 !important;
          box-shadow: 0 0 24px ${C.accentGlow} !important;
        }
        .landing-feature:hover {
          border-color: ${C.borderHover} !important;
          background: ${C.bgCardHover} !important;
        }
        .landing-nav-link:hover {
          color: ${C.text} !important;
        }
      `}</style>

      {/* ══════════ NAV BAR ══════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px',
        background: 'rgba(13,13,13,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: FONT.mono, fontWeight: 700, fontSize: 16,
            color: C.accent,
          }}>
            &gt;_
          </span>
          <span style={{
            fontFamily: FONT.mono, fontWeight: 600, fontSize: 14,
            color: C.text, letterSpacing: '-0.3px',
          }}>
            MindOS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a
            href="#characters"
            className="landing-nav-link"
            style={{
              fontFamily: FONT.mono, fontSize: 13, color: C.textDim,
              textDecoration: 'none', transition: 'color 0.2s',
            }}
          >
            Personas
          </a>
          <a
            href="#features"
            className="landing-nav-link"
            style={{
              fontFamily: FONT.mono, fontSize: 13, color: C.textDim,
              textDecoration: 'none', transition: 'color 0.2s',
            }}
          >
            Features
          </a>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
      }}>
        {/* Glow background */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.accentDim} 0%, transparent 70%)`,
          animation: 'glow-pulse 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Terminal prompt */}
        <div style={{
          fontFamily: FONT.mono, fontSize: 13, color: C.textMuted,
          marginBottom: 24, letterSpacing: '0.5px',
        }}>
          $ mindos --start
        </div>

        {/* Main title */}
        <h1 style={{
          fontFamily: FONT.sans, fontWeight: 700,
          fontSize: 'clamp(32px, 5vw, 56px)',
          lineHeight: 1.15, margin: 0,
          color: C.text, position: 'relative',
        }}>
          {hero.display}
          {!hero.done && (
            <span style={{
              animation: 'cursor-blink 1s step-end infinite',
              color: C.accent,
            }}>|</span>
          )}
        </h1>

        {/* Chinese subtitle */}
        <div style={{
          fontFamily: FONT.mono, fontSize: 'clamp(14px, 2vw, 18px)',
          color: C.textMuted, marginTop: 16, minHeight: 28,
        }}>
          {heroZh.display}
          {!heroZh.done && heroZh.display.length > 0 && (
            <span style={{
              animation: 'cursor-blink 1s step-end infinite',
              color: C.accent,
            }}>|</span>
          )}
        </div>

        {/* Description */}
        <p style={{
          fontFamily: FONT.sans, fontSize: 16, color: C.textDim,
          maxWidth: 520, lineHeight: 1.7, margin: '32px 0 40px',
        }}>
          13 distilled cognitive frameworks from Steve Jobs, Feynman, Munger and more.
          Not role-playing. Real thinking models.
        </p>

        {/* CTA */}
        <button
          className="landing-cta"
          onClick={() => navigate('/characters')}
          style={{
            fontFamily: FONT.mono, fontSize: 15, fontWeight: 600,
            color: '#fff', background: C.accent,
            border: 'none', padding: '14px 36px',
            cursor: 'pointer', letterSpacing: '0.3px',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        >
          Start a conversation &rarr;
        </button>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 40,
          fontFamily: FONT.mono, fontSize: 11, color: C.textMuted,
          animation: 'glow-pulse 2s ease-in-out infinite',
        }}>
          scroll
        </div>
      </section>

      {/* ══════════ CHARACTERS GRID ══════════ */}
      <section
        id="characters"
        ref={sec2.ref}
        style={{
          ...sec2.style,
          padding: '80px 40px 100px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <div style={{
          fontFamily: FONT.mono, fontSize: 12, color: C.accent,
          marginBottom: 8, letterSpacing: '1px',
        }}>
          // PERSONAS
        </div>
        <h2 style={{
          fontFamily: FONT.sans, fontSize: 28, fontWeight: 700,
          color: C.text, margin: '0 0 12px',
        }}>
          Choose a mind
        </h2>
        <p style={{
          fontFamily: FONT.sans, fontSize: 15, color: C.textDim,
          margin: '0 0 40px', maxWidth: 500,
        }}>
          Each persona is distilled from 30+ primary sources into mental models,
          decision heuristics, and expression DNA.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {characters.map((char) => (
            <div
              key={char.slug}
              className="landing-card"
              onClick={() => navigate(`/characters/${char.slug}`)}
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                padding: 20,
                cursor: 'pointer',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                {AVATARS[char.slug] ? (
                  <img
                    src={AVATARS[char.slug]}
                    alt={char.name}
                    style={{
                      width: 44, height: 44, objectFit: 'cover',
                      borderRadius: '50%',
                      border: `2px solid ${C.border}`,
                      filter: 'grayscale(30%)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: `2px solid ${C.border}`,
                    background: C.accentDim,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, color: C.accent,
                  }}>
                    {char.name.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div style={{
                    fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: C.text,
                  }}>
                    {char.name}
                  </div>
                  <div style={{
                    fontFamily: FONT.mono, fontSize: 11, color: C.textMuted,
                    marginTop: 2,
                  }}>
                    {char.tagline}
                  </div>
                </div>
              </div>
              <div
                className="card-quote"
                style={{
                  fontFamily: FONT.mono, fontSize: 11, color: C.textMuted,
                  lineHeight: 1.5, fontStyle: 'italic',
                  transition: 'color 0.2s',
                }}
              >
                {QUOTES[char.slug] || ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section
        id="features"
        ref={sec3.ref}
        style={{
          ...sec3.style,
          padding: '80px 40px 100px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <div style={{
          fontFamily: FONT.mono, fontSize: 12, color: C.accent,
          marginBottom: 8, letterSpacing: '1px',
        }}>
          // HOW IT WORKS
        </div>
        <h2 style={{
          fontFamily: FONT.sans, fontSize: 28, fontWeight: 700,
          color: C.text, margin: '0 0 40px',
        }}>
          Not role-playing. Cognitive frameworks.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {[
            {
              icon: '\u{1F9E0}',
              title: 'Distilled Mental Models',
              desc: 'Each persona is built from 30+ primary sources: books, interviews, speeches, and peer evaluations. We extract core mental models, not surface-level quotes.',
            },
            {
              icon: '\u{1F512}',
              title: 'Self-Hosted & Private',
              desc: 'Every persona runs in its own Docker container. Your conversations stay on your infrastructure. No data leaves your network.',
            },
            {
              icon: '\u{1F91D}',
              title: 'Multi-Agent Collaboration',
              desc: 'Assemble a team of minds. Let Munger review your investment thesis, then have Feynman simplify the explanation, and Jobs design the pitch.',
            },
          ].map((f, i) => (
            <div
              key={i}
              className="landing-feature"
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                padding: 28,
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
              <div style={{
                fontFamily: FONT.sans, fontSize: 16, fontWeight: 600,
                color: C.text, marginBottom: 10,
              }}>
                {f.title}
              </div>
              <div style={{
                fontFamily: FONT.sans, fontSize: 14, color: C.textDim,
                lineHeight: 1.7,
              }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ BOTTOM CTA ══════════ */}
      <section
        ref={sec4.ref}
        style={{
          ...sec4.style,
          padding: '80px 40px 60px',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontFamily: FONT.mono, fontSize: 13, color: C.textMuted,
          marginBottom: 16,
        }}>
          $ mindos --connect
        </div>
        <h2 style={{
          fontFamily: FONT.sans, fontSize: 'clamp(24px, 3.5vw, 36px)',
          fontWeight: 700, color: C.text, margin: '0 0 24px',
        }}>
          Ready to think differently?
        </h2>
        <button
          className="landing-cta"
          onClick={() => navigate('/characters')}
          style={{
            fontFamily: FONT.mono, fontSize: 15, fontWeight: 600,
            color: '#fff', background: C.accent,
            border: 'none', padding: '14px 36px',
            cursor: 'pointer', letterSpacing: '0.3px',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        >
          Start a conversation &rarr;
        </button>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{
        padding: '40px 40px 32px',
        borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 12, color: C.textMuted,
        }}>
          MindOS &mdash; distilled minds, real conversations.
        </div>
      </footer>
    </div>
  );
}
