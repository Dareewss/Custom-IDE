import { describe, expect, it } from 'vitest';
import { parseTraceback } from './traceback';

describe('traceback parser', () => {
  it('finds project frames with caret columns', () => {
    const text =
      'Traceback (most recent call last):\n  File "/project/lib/math.py", line 12, in divide\n    x = a / b\n        ~~^~~\nZeroDivisionError: division by zero';
    const [frame] = parseTraceback(text);
    expect(frame).toMatchObject({
      path: 'lib/math.py',
      line: 12,
      column: 7,
      functionName: 'divide',
    });
    expect(text.slice(frame.start, frame.end)).toBe(frame.text);
  });
  it('supports SyntaxError traces without a function name', () =>
    expect(parseTraceback('  File "main.py", line 3\n    def (\n        ^')[0]).toMatchObject({
      path: 'main.py',
      line: 3,
      column: 5,
    }));
  it('preserves chained exceptions', () =>
    expect(
      parseTraceback(
        '  File "/project/a.py", line 1\nValueError\nDuring handling of the above exception:\n  File "/project/b.py", line 2\nTypeError',
      ),
    ).toHaveLength(2));
  it('ignores internal, system and traversal paths', () =>
    expect(
      parseTraceback(
        '  File "<exec>", line 1\n  File "/lib/python.py", line 5\n  File "../private.py", line 1',
      ),
    ).toEqual([]));
});
