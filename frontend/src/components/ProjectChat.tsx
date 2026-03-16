import { useState, useRef, useEffect, useCallback } from 'react';
import type { ProjectMessage, ProjectMember } from '../types';
import { api } from '../api/client';
import { useTheme } from '../theme';

const AGENT_COLORS = [
  '#7c6fea', '#e06c75', '#98c379', '#e5c07b', '#61afef',
  '#c678dd', '#56b6c2', '#d19a66', '#be5046', '#4ec9b0',
];

export default function ProjectChat({ projectId, projectStatus, members }: {
  projectId: string;
  projectStatus: string;
  members?: ProjectMember[];
}) {
  const { theme } = useTheme();
  const { colors, pixelInput, pixelButtonSmall } = theme;
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentColorMap = useRef<Map<string, string>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const getAgentColor = (agentId: string | null): string => {
    if (!agentId) return colors.textLight;
    if (!agentColorMap.current.has(agentId)) {
      const idx = agentColorMap.current.size % AGENT_COLORS.length;
      agentColorMap.current.set(agentId, AGENT_COLORS[idx]);
    }
    return agentColorMap.current.get(agentId)!;
  };

  // Load messages
  useEffect(() => {
    setLoading(true);
    api.getProjectMessages(projectId, 200)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // SSE for real-time updates
  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/messages/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg: ProjectMessage = JSON.parse(event.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {}
    };

    es.onerror = () => {};

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [projectId]);

  // Compute @mention candidates
  const mentionCandidates = (() => {
    if (mentionQuery === null || !members?.length) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => m.agent?.name?.toLowerCase().includes(q))
      .slice(0, 6);
  })();

  const insertMention = (name: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = input.slice(0, pos);
    // Find the @ that triggered this mention
    const atIdx = before.lastIndexOf('@');
    if (atIdx < 0) return;
    const newInput = input.slice(0, atIdx) + `@${name} ` + input.slice(pos);
    setInput(newInput);
    setMentionQuery(null);
    // Restore focus
    setTimeout(() => {
      ta.focus();
      const cursor = atIdx + name.length + 2;
      ta.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Detect @mention trigger
    const pos = e.target.selectionStart;
    const before = val.slice(0, pos);
    const atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMentionQuery(null);
    try {
      await api.sendProjectMessage(projectId, text);
    } catch (e: any) {
      alert(`Failed to send: ${e.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // @mention navigation
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionCandidates[mentionIndex].agent?.name || '');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isRunning = projectStatus === 'running';
  const lastMsg = messages[messages.length - 1];
  const isThinking = isRunning && lastMsg && lastMsg.role !== 'system';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        background: colors.logBg,
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: colors.textLight, fontSize: 12, paddingTop: 60 }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.textLight, fontSize: 12, paddingTop: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{'\u{1F4AC}'}</div>
            No messages yet. Start the project to begin collaboration.
          </div>
        ) : null}

        {messages.map((msg) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} style={{
                textAlign: 'center',
                padding: '6px 12px',
                marginBottom: 8,
                fontSize: 11,
                color: colors.textLight,
                fontFamily: theme.fonts.mono,
                fontStyle: 'italic',
              }}>
                {msg.content}
              </div>
            );
          }

          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 8,
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '8px 12px',
                  border: `2px solid ${colors.accent}`,
                  background: colors.accent,
                  color: '#fff',
                  fontSize: 13,
                  fontFamily: theme.fonts.mono,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}>
                  {msg.content}
                </div>
              </div>
            );
          }

          // Assistant message
          const agentColor = getAgentColor(msg.agent_id);
          return (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: 8,
            }}>
              <div style={{ maxWidth: '75%' }}>
                <div style={{
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: theme.fonts.heading,
                  color: agentColor,
                  marginBottom: 2,
                }}>
                  {msg.agent_name || 'Agent'}
                </div>
                <div style={{
                  padding: '8px 12px',
                  border: `2px solid ${agentColor}40`,
                  background: colors.card,
                  color: colors.text,
                  fontSize: 13,
                  fontFamily: theme.fonts.mono,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                  borderLeft: `4px solid ${agentColor}`,
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Thinking indicator */}
        {isThinking && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 8,
          }}>
            <div style={{
              padding: '8px 12px',
              background: colors.card,
              border: `2px solid ${colors.border}`,
              fontSize: 12,
              color: colors.textLight,
              fontFamily: theme.fonts.mono,
            }}>
              Agent is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        position: 'relative',
        background: colors.card,
        borderTop: `2px solid ${colors.border}`,
      }}>
        {/* @mention dropdown */}
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 8,
            right: 8,
            background: colors.card,
            border: `2px solid ${colors.borderDark}`,
            boxShadow: `4px 4px 0px ${colors.borderDark}`,
            maxHeight: 200,
            overflow: 'auto',
            zIndex: 10,
          }}>
            {mentionCandidates.map((m, i) => (
              <div
                key={m.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m.agent?.name || '');
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: i === mentionIndex ? colors.accent : 'transparent',
                  color: i === mentionIndex ? '#fff' : colors.text,
                  fontSize: 13,
                  fontFamily: theme.fonts.mono,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <span style={{ fontWeight: 700 }}>@{m.agent?.name}</span>
                {m.agent?.role && (
                  <span style={{
                    fontSize: 10,
                    color: i === mentionIndex ? 'rgba(255,255,255,0.7)' : colors.textLight,
                  }}>
                    {m.agent.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message... (type @ to mention an agent)"
            rows={1}
            style={{
              ...pixelInput(),
              flex: 1,
              resize: 'none',
              minHeight: 36,
              maxHeight: 120,
              padding: '8px 12px',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              ...pixelButtonSmall(colors.accent),
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
