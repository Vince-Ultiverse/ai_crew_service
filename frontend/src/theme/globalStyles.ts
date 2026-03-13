import type { Theme } from './types';

let styleEl: HTMLStyleElement | null = null;

export function applyGlobalStyles(theme: Theme) {
  const css = theme.globalCSS;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-theme-global', '');
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    body {
      font-family: ${css.bodyFont};
      background: ${css.bodyBackground};
      color: ${css.bodyColor};
      image-rendering: ${css.imageRendering};
    }
    ::-webkit-scrollbar { width: 12px; }
    ::-webkit-scrollbar-track { background: ${css.scrollbarTrack}; }
    ::-webkit-scrollbar-thumb {
      background: ${css.scrollbarThumb};
      border: 2px solid ${css.scrollbarBorder};
    }
    ::-webkit-scrollbar-thumb:hover { background: ${css.scrollbarThumbHover}; }
    ::selection {
      background: ${css.selectionBg};
      color: ${css.selectionColor};
    }
  `;
}
