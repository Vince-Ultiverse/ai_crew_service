import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Agent } from '../types';

// ─── Shared dark theme tokens ───────────────────────────────────
const C = {
  bg: '#0D0D0D',
  bgChat: '#111111',
  bgCard: '#1A1A1A',
  bgInput: '#1A1A1A',
  accent: '#F97316',
  accentDim: 'rgba(249,115,22,0.15)',
  text: '#E5E5E5',
  textDim: '#888888',
  textMuted: '#555555',
  border: '#2A2A2A',
  userBubble: '#F97316',
  assistantBubble: '#1E1E1E',
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function CharacterChat() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [provisioning, setProvisioning] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Provision on mount
  useEffect(() => {
    if (!slug) return;
    setProvisioning(true);
    setError('');
    api.provisionCharacter(slug)
      .then(setAgent)
      .catch((e) => setError(e.message))
      .finally(() => setProvisioning(false));
  }, [slug]);

  // Poll until running
  useEffect(() => {
    if (!agent || agent.status === 'running' || agent.status === 'error') return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.getAgentStatus(agent.id);
        if (s.status === 'running' || s.status === 'error') {
          setAgent((prev) => prev ? { ...prev, status: s.status as Agent['status'] } : prev);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [agent?.id, agent?.status]);

  // Load chat history when agent becomes ready
  useEffect(() => {
    if (!agent || agent.status !== 'running') return;
    setLoadingHistory(true);
    api.getChatHistory(agent.id)
      .then((history) => {
        setMessages(history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [agent?.id, agent?.status]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming || !agent) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMsg]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`/api/agents/${agent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: 'assistant', content: `Error: ${res.status} ${err}` };
          return u;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setMessages((prev) => {
                const u = [...prev];
                u[u.length - 1] = { role: 'assistant', content: fullContent };
                return u;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: 'assistant', content: `Error: ${err.message}` };
          return u;
        });
      }
    }
    abortRef.current = null;
    setStreaming(false);
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    if (!agent || !confirm('Clear all chat history?')) return;
    try {
      await api.clearChatHistory(agent.id);
      setMessages([]);
    } catch { /* ignore */ }
  };

  const isReady = agent?.status === 'running';
  const avatarUrl = slug ? AVATARS[slug] : '';

  return (
    <div style={{
      background: C.bg, color: C.text, fontFamily: FONT.sans,
      height: '100vh', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse-dot { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .chat-send:hover:not(:disabled) { background: #ea6c10 !important; }
        .chat-stop:hover { background: #dc2626 !important; }
        .chat-clear:hover { color: ${C.text} !important; }
      `}</style>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 24px',
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(13,13,13,0.95)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <Link
          to="/characters"
          style={{
            color: C.textDim, textDecoration: 'none', fontSize: 20,
            lineHeight: 1, padding: '0 4px',
          }}
        >
          &larr;
        </Link>

        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{
            width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
            border: `2px solid ${C.border}`, filter: 'grayscale(20%)',
          }} />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: C.accentDim, border: `2px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: C.accent,
          }}>
            {agent?.name?.slice(0, 2) || '??'}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: C.text }}>
            {agent?.name || slug}
          </div>
          {agent?.tagline && (
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.textMuted, marginTop: 1 }}>
              {agent.tagline}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="chat-clear"
              style={{
                background: 'none', border: 'none', color: C.textMuted,
                fontFamily: FONT.mono, fontSize: 11, cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              Clear
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isReady ? '#4caf50' : agent?.status === 'error' ? '#f44336' : '#ff9800',
              animation: !isReady && agent ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.textMuted, textTransform: 'uppercase' }}>
              {agent?.status || 'loading'}
            </span>
          </div>
        </div>
      </header>

      {/* Chat body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: C.bgChat }}>
        {provisioning ? (
          <CenterMessage>
            <Spinner />
            <div style={{ fontFamily: FONT.mono, fontSize: 13, color: C.textDim, marginTop: 16 }}>
              Initializing {slug}...
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.textMuted, marginTop: 6 }}>
              First launch may take a moment
            </div>
          </CenterMessage>
        ) : error ? (
          <CenterMessage>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>&#9888;</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, color: '#f44336', marginBottom: 8 }}>
              Failed to provision
            </div>
            <div style={{
              fontFamily: FONT.mono, fontSize: 12, color: C.textMuted,
              maxWidth: 400, textAlign: 'center', marginBottom: 16,
            }}>
              {error}
            </div>
            <button
              onClick={() => navigate('/characters')}
              style={{
                fontFamily: FONT.mono, fontSize: 12, color: C.text,
                background: C.accent, border: 'none', padding: '8px 20px', cursor: 'pointer',
              }}
            >
              Back
            </button>
          </CenterMessage>
        ) : !isReady ? (
          <CenterMessage>
            <Spinner />
            <div style={{ fontFamily: FONT.mono, fontSize: 13, color: C.textDim, marginTop: 16 }}>
              {agent?.name} is starting up...
            </div>
          </CenterMessage>
        ) : loadingHistory ? (
          <CenterMessage>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.textMuted }}>
              Loading history...
            </div>
          </CenterMessage>
        ) : messages.length === 0 ? (
          <CenterMessage>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>&#128172;</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, color: C.textMuted }}>
              Start a conversation with {agent?.name}
            </div>
          </CenterMessage>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                  border: `1px solid ${msg.role === 'user' ? C.accent : C.border}`,
                  color: msg.role === 'user' ? '#fff' : C.text,
                  fontFamily: FONT.mono,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  borderRadius: 2,
                }}>
                  {msg.content || (streaming && i === messages.length - 1 ? (
                    <span style={{ animation: 'cursor-blink 1s step-end infinite', color: C.accent }}>|</span>
                  ) : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      {isReady && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 24px',
          background: C.bg, borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent?.name || ''}...`}
            disabled={streaming}
            rows={1}
            style={{
              flex: 1, resize: 'none',
              minHeight: 40, maxHeight: 120,
              padding: '10px 14px',
              background: C.bgInput,
              color: C.text,
              border: `1px solid ${C.border}`,
              fontFamily: FONT.mono, fontSize: 13,
              outline: 'none',
              borderRadius: 2,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
          />
          {streaming ? (
            <button
              onClick={stopStreaming}
              className="chat-stop"
              style={{
                fontFamily: FONT.mono, fontSize: 12, fontWeight: 600,
                color: '#fff', background: '#ef4444',
                border: 'none', padding: '0 20px',
                cursor: 'pointer', transition: 'background 0.2s',
                borderRadius: 2,
              }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="chat-send"
              style={{
                fontFamily: FONT.mono, fontSize: 12, fontWeight: 600,
                color: '#fff', background: C.accent,
                border: 'none', padding: '0 20px',
                cursor: input.trim() ? 'pointer' : 'default',
                opacity: input.trim() ? 1 : 0.4,
                transition: 'background 0.2s, opacity 0.2s',
                borderRadius: 2,
              }}
            >
              Send
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 300,
    }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: '3px solid #2A2A2A',
      borderTop: '3px solid #F97316',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
