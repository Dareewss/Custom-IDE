import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export function FormDialog({
  title,
  label,
  initial = '',
  submitLabel = 'Save',
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  label: string;
  initial?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog className="glass glass--modal dialog" ref={ref} onCancel={onClose} aria-label={title}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await onSubmit(value.trim());
            onClose();
          } catch (reason) {
            setError(String(reason));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        {children}
        <label className="field">
          {label}
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? 'Working…' : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
