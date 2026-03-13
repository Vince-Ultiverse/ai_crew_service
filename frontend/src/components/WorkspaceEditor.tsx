import { useState } from 'react';
import { useTheme } from '../theme';

interface WorkspaceFile {
  key: string;
  label: string;
  placeholder: string;
}

const WORKSPACE_FILES: WorkspaceFile[] = [
  { key: 'system_prompt', label: 'IDENTITY.md', placeholder: "Define the AI employee's personality and behavior..." },
  { key: 'soul_prompt', label: 'SOUL.md', placeholder: 'Define the agent\'s core values and personality traits...' },
  { key: 'agents_prompt', label: 'AGENTS.md', placeholder: 'Define guidelines for how the agent should operate...' },
  { key: 'user_prompt', label: 'USER.md', placeholder: 'Provide context about the user or audience...' },
  { key: 'tools_prompt', label: 'TOOLS.md', placeholder: 'Define tools and capabilities available to the agent...' },
];

export default function WorkspaceEditor({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const { theme } = useTheme();
  const { colors, pixelInput, pixelFieldset, pixelLegend } = theme;
  const [activeTab, setActiveTab] = useState(0);

  const active = WORKSPACE_FILES[activeTab];

  const hasContent = (key: string) => !!(values[key] && values[key].trim());

  return (
    <fieldset style={pixelFieldset()}>
      <legend style={pixelLegend()}>Workspace Files</legend>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: `2px solid ${colors.border}`,
        marginBottom: 0,
      }}>
        {WORKSPACE_FILES.map((file, i) => {
          const isActive = i === activeTab;
          const filled = hasContent(file.key);
          return (
            <button
              key={file.key}
              type="button"
              onClick={() => setActiveTab(i)}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: theme.fonts.mono,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? colors.accent : filled ? colors.text : colors.textLight,
                background: isActive ? colors.card : 'transparent',
                border: isActive
                  ? `2px solid ${colors.border}`
                  : '2px solid transparent',
                borderBottom: isActive
                  ? `2px solid ${colors.card}`
                  : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                borderRadius: 0,
                position: 'relative',
              }}
            >
              {file.label}
              {filled && !isActive && (
                <span style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: colors.accent,
                  marginLeft: 4,
                  verticalAlign: 'middle',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Editor area */}
      <textarea
        value={values[active.key] || ''}
        onChange={(e) => onChange(active.key, e.target.value)}
        placeholder={active.placeholder}
        style={{
          ...pixelInput(),
          minHeight: 180,
          resize: 'vertical',
          fontFamily: theme.fonts.mono,
          fontSize: 13,
          lineHeight: 1.5,
          borderTop: 'none',
          borderRadius: 0,
          tabSize: 2,
        }}
        spellCheck={false}
      />
    </fieldset>
  );
}
