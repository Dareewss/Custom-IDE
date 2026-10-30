import { normalizePath } from '../fs/vfs';
import type { SourceLocation } from '../trace/events';
export interface TracebackFrame extends SourceLocation {
  start: number;
  end: number;
  text: string;
  functionName: string;
}

export function parseTraceback(text: string): TracebackFrame[] {
  const lines = text.split('\n');
  const frames: TracebackFrame[] = [];
  let offset = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = /^\s*File "([^"]+)", line (\d+)(?:, in (.*))?/.exec(line);
    if (match && !match[1].startsWith('<')) {
      const raw = match[1].startsWith('/project/') ? match[1].slice(9) : match[1];
      try {
        const path = normalizePath(raw);
        if (path) {
          const marker = lines[index + 2] ?? '';
          const caret = /^\s+[~^]+\s*$/.test(marker) ? marker.indexOf('^') : -1;
          frames.push({
            path,
            line: Number(match[2]),
            column: caret >= 0 ? Math.max(1, caret - 3) : 1,
            start: offset,
            end: offset + line.length,
            text: line,
            functionName: match[3] ?? '<module>',
          });
        }
      } catch {
        /* Interpreter and system paths are intentionally not navigable. */
      }
    }
    offset += line.length + 1;
  }
  return frames;
}
