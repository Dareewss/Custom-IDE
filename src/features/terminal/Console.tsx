import { useRunner } from '../runner/store';

export function Console() {
  const output = useRunner((s) => s.output);
  return (
    <div className="console-output" role="log" aria-label="Program output">
      {output.length ? (
        output.map((line) => (
          <div key={line.id} className={`output-${line.stream}`}>
            {line.text}
          </div>
        ))
      ) : (
        <p className="muted">Run a file to see what happens.</p>
      )}
    </div>
  );
}
