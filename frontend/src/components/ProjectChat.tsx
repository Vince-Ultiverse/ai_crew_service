import { useState, useRef, useEffect, useCallback } from 'react';
import type { ProjectMessage } from '../types';
import { api } from '../api/client';
import { useTheme } from '../theme';

const AGENT_COLORS = [
  '#7c6fea', '#e06c75', '#98c379', '#e5c07b', '#61afef',
  '#c678dd', '#56b6c2', '#d19a66', '#be5046', '#4ec9b0',
];

export default function ProjectChat({ projectId, projectStatus }: {
  projectId: string;
  projectStatus: string;
}) {
  const { theme } = useTheme();
  const { colors, pixelInput, pixelButtonSmall } = theme;
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentColorMap = useRef<Map<string, string>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);

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
          // Avoid duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {}
    };

    es.onerror = () => {
      // SSE will auto-reconnect
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [projectId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      await api.sendProjectMessage(projectId, text);
    } catch (e: any) {
      alert(`Failed to send: ${e.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Find current speaking agent for thinking indicator
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

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        background: colors.card,
        borderTop: `2px solid ${colors.border}`,
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to the team..."
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
  );
}
