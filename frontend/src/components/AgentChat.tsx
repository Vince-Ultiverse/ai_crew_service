import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../theme';
import { api } from '../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AgentChat({ agentId, agentName }: {
  agentId: string;
  agentName: string;
}) {
  const { theme } = useTheme();
  const { colors, pixelInput, pixelButtonSmall } = theme;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Load chat history on mount
  useEffect(() => {
    setLoading(true);
    api.getChatHistory(agentId)
      .then((history) => {
        setMessages(history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      })
      .catch(() => {
        // History not available, start fresh
      })
      .finally(() => setLoading(false));
  }, [agentId]);

  const clearHistory = async () => {
    if (!confirm('Clear all chat history?')) return;
    try {
      await api.clearChatHistory(agentId);
      setMessages([]);
    } catch {
      // ignore
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Error: ${res.status} ${err}` };
          return updated;
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
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                return updated;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Error: ${err.message}` };
          return updated;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', padding: '4px 8px',
        background: colors.card, borderBottom: `1px solid ${colors.border}`,
        gap: 6,
      }}>
        {messages.length > 0 && (
          <button onClick={clearHistory} style={{ ...pixelButtonSmall('#c94040'), fontSize: 9 }}>
            Clear History
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        background: colors.logBg,
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center', color: colors.textLight, fontSize: 12, paddingTop: 60,
          }}>
            Loading history...
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: colors.textLight,
            fontSize: 12,
            paddingTop: 60,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {theme.characterMode === 'corporate' ? '\uD83D\uDCAC' : '\uD83D\uDCE8'}
            </div>
            Start a conversation with {agentName}
          </div>
        ) : null}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 8,
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '8px 12px',
              borderRadius: 0,
              border: `2px solid ${msg.role === 'user' ? colors.accent : colors.border}`,
              background: msg.role === 'user' ? colors.accent : colors.card,
              color: msg.role === 'user' ? '#fff' : colors.text,
              fontSize: 13,
              fontFamily: theme.fonts.mono,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.5,
            }}>
              {msg.content || (streaming && i === messages.length - 1 ? '\u2588' : '')}
            </div>
          </div>
        ))}
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
          placeholder={`Message ${agentName}...`}
          disabled={streaming}
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
        {streaming ? (
          <button onClick={stopStreaming} style={pixelButtonSmall('#c94040')}>
            Stop
          </button>
        ) : (
          <button onClick={sendMessage} disabled={!input.trim()} style={{
            ...pixelButtonSmall(colors.accent),
            opacity: input.trim() ? 1 : 0.5,
          }}>
            Send
          </button>
        )}
      </div>
    </div>
  );
}
