import { useRunner } from '../runner/store';
import { submitInput } from '../runner/store';
import { useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Trash2 } from 'lucide-react';
import { IconButton } from '../../shared/IconButton';

export function Console() {
  const output = useRunner((s) => s.output);
  const awaitingInput = useRunner((s) => s.awaitingInput);
  const [input, setInput] = useState('');
  const [follow, setFollow] = useState(true);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (follow) end.current?.scrollIntoView?.({ block: 'nearest' });
  }, [output, awaitingInput, follow]);
  useEffect(() => {
    if (awaitingInput) field.current?.focus();
  }, [awaitingInput]);
  return (
    <>
      <div className="console-tools">
        <span>PYTHON</span>
        <label>
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
          Follow output
        </label>
        <IconButton label="Clear console" onClick={() => useRunner.setState({ output: [] })}>
          <Trash2 size={13} />
        </IconButton>
      </div>
      <div className="console-output" role="log" aria-label="Program output">
        {output.length ? (
          output.map((line) => (
            <span key={line.id} className={`output-${line.stream}`}>
              {line.text}
            </span>
          ))
        ) : (
          <p className="muted">Run a file to see what happens.</p>
        )}
        {awaitingInput && (
          <form
            className="stdin-form"
            onSubmit={(e) => {
              e.preventDefault();
              submitInput(input);
              setInput('');
            }}
          >
            <span className="input-prompt">›</span>
            <input
              ref={field}
              aria-label="Program input"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a response and press Enter"
            />
            <button aria-label="Send input" title="Send input">
              <CornerDownLeft size={14} />
            </button>
          </form>
        )}
        <div ref={end} />
      </div>
    </>
  );
}
