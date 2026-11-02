import type { editor } from 'monaco-editor';

export function glassEditorTheme(): editor.IStandaloneThemeData {
  const style = getComputedStyle(document.documentElement);
  const color = (token: string) => style.getPropertyValue(`--${token}`).trim();
  return {
    base: document.documentElement.dataset.theme === 'light' ? 'vs' : 'vs-dark',
    inherit: true,
    rules: [
      ...['comment', 'keyword', 'string', 'number', 'predefined', 'operator', 'annotation'].map(
        (token) => ({ token, foreground: color(`code-${token}`).slice(1) }),
      ),
      { token: 'type.identifier', foreground: color('code-type').slice(1) },
    ],
    colors: {
      'editor.background': '#00000000',
      'editor.foreground': color('code-foreground'),
      'editorGutter.background': '#00000000',
      'minimap.background': '#00000000',
      'editorStickyScroll.background': '#00000000',
      'editorStickyScrollHover.background': color('code-line-highlight'),
      'editorLineNumber.foreground': color('code-comment'),
      'editorLineNumber.activeForeground': color('code-foreground'),
      'editor.lineHighlightBackground': color('code-line-highlight'),
      'editor.selectionBackground': color('code-selection'),
      'editor.inactiveSelectionBackground': color('code-selection'),
      'editorCursor.foreground': color('code-cursor'),
      'editorIndentGuide.background1': color('code-indent'),
      'editorBracketMatch.background': color('code-bracket-fill'),
      'editorBracketMatch.border': color('code-bracket-border'),
      'editorBracketHighlight.foreground1': color('code-keyword'),
      'editorBracketHighlight.foreground2': color('code-type'),
      'editorBracketHighlight.foreground3': color('code-annotation'),
      'editorSuggestWidget.background': color('widget-background'),
      'editorSuggestWidget.border': color('widget-border'),
      'editorSuggestWidget.foreground': color('code-foreground'),
      'editorSuggestWidget.selectedBackground': color('raised'),
      'editorHoverWidget.background': color('widget-background'),
      'editorHoverWidget.border': color('widget-border'),
      'editorHoverWidget.foreground': color('code-foreground'),
      'editorWidget.background': color('widget-background'),
      'editorWidget.foreground': color('code-foreground'),
    },
  };
}
