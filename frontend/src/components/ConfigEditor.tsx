import { useState } from 'react';
import { useTheme } from '../theme';

export default function ConfigEditor({
  value,
  onChange,
  label,
}: {
  value: Record<string, any>;
  onChange: (val: Record<string, any>) => void;
  label: string;
}) {
  const { theme } = useTheme();
  const { colors, pixelInput } = theme;
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      setError('');
      onChange(parsed);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: 12, color: colors.text }}>{label}</label>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          ...pixelInput(),
          minHeight: 120,
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 13,
          borderColor: error ? colors.error : colors.border,
          resize: 'vertical',
        }}
      />
      {error && <div style={{
        color: colors.error,
        fontSize: 9,
        marginTop: 4,
        fontFamily: theme.fonts.heading,
      }}>{error}</div>}
    </div>
  );
}
