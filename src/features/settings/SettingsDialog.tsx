import { useEffect, useRef } from 'react';
import { X, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useSettings } from './store';
import { useUI } from '../../shared/ui-store';
import { IconButton } from '../../shared/IconButton';
import './transparency.css';

export function SettingsDialog() {
  const open = useUI((s) => s.modal === 'settings');
  const settings = useSettings();
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => useUI.setState({ modal: null });
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      className="dialog settings-dialog"
      aria-label="Workspace settings"
      ref={ref}
      onCancel={close}
    >
      <div className="dialog-heading">
        <h2>
          <SlidersHorizontal size={18} />
          Workspace settings
        </h2>
        <IconButton label="Close settings" onClick={close}>
          <X size={16} />
        </IconButton>
      </div>
      <p className="muted settings-intro">
        A workspace that feels like yours. Changes apply as you go.
      </p>
      <div className="settings-fields">
        <label className="field">
          Color theme
          <select
            value={settings.theme}
            onChange={(e) =>
              settings.setSetting('theme', e.target.value === 'light' ? 'light' : 'dark')
            }
          >
            <option value="dark">Atlas Dark</option>
            <option value="light">Atlas Light</option>
          </select>
        </label>
        <label className="field">
          Editor font size
          <input
            type="number"
            min={10}
            max={32}
            value={settings.fontSize}
            onChange={(e) => settings.setSetting('fontSize', Number(e.target.value))}
          />
        </label>
        <label className="field">
          Tab size
          <select
            value={settings.tabSize}
            onChange={(e) => settings.setSetting('tabSize', Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
              <option key={size} value={size}>
                {size} spaces
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Autosave delay (ms)
          <input
            type="number"
            min={100}
            max={10000}
            step={100}
            value={settings.autosaveDelay}
            onChange={(e) => settings.setSetting('autosaveDelay', Number(e.target.value))}
          />
        </label>
      </div>
      <div className="transparency-control">
        <div className="transparency-heading">
          <label htmlFor="background-transparency">Background transparency</label>
          <output htmlFor="background-transparency">{settings.backgroundTransparency}%</output>
        </div>
        <input
          id="background-transparency"
          type="range"
          min={0}
          max={100}
          step={1}
          value={settings.backgroundTransparency}
          aria-valuetext={`${settings.backgroundTransparency}% transparent`}
          aria-describedby="transparency-description"
          onChange={(event) =>
            settings.setSetting('backgroundTransparency', Number(event.target.value))
          }
        />
        <div className="transparency-scale">
          <span>0% · Opaque</span>
          <span>100% · Transparent</span>
        </div>
        <p id="transparency-description">
          Only workspace backgrounds fade. Text, icons and controls stay fully visible.
        </p>
        <p className="transparency-platform-note">
          {window.codeAtlasDesktop
            ? 'Desktop window: 100% reveals your desktop or the windows behind this app. 0% hides them completely.'
            : 'To see your desktop through the background, open the Code Atlas desktop app. Browser windows only change their in-page backgrounds.'}
        </p>
      </div>
      <label className="glass-setting" htmlFor="glass-effect">
        <span className="glass-setting-copy">
          <strong id="glass-effect-label">
            <Sparkles size={15} />
            Liquid glass
          </strong>
          <small>
            {window.codeAtlasDesktop?.nativeGlass
              ? 'Live desktop refraction, processed locally. Use 50–85% for the lens effect; 100% is clear. Windows captures omit this window while live glass runs—use the camera button to copy it with the effect.'
              : 'Reflective glass finish. Live desktop refraction is available in the Windows 11 desktop app.'}
          </small>
        </span>
        <input
          id="glass-effect"
          type="checkbox"
          role="switch"
          aria-labelledby="glass-effect-label"
          checked={settings.glassEffect}
          onChange={(event) => settings.setSetting('glassEffect', event.target.checked)}
        />
        <span className="glass-switch-track" aria-hidden="true">
          <span />
        </span>
      </label>
      {(['wordWrap', 'minimap', 'formatOnSave'] as const).map((key) => (
        <label className="setting-toggle" key={key}>
          <span>
            <strong>
              {
                { wordWrap: 'Word wrap', minimap: 'Code minimap', formatOnSave: 'Format on save' }[
                  key
                ]
              }
            </strong>
            <small>
              {
                {
                  wordWrap: 'Keep long lines within the editor.',
                  minimap: 'See a compact overview of your file.',
                  formatOnSave: 'Let Ruff tidy your Python before saving.',
                }[key]
              }
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings[key]}
            onChange={(e) => settings.setSetting(key, e.target.checked)}
          />
        </label>
      ))}
      <div className="dialog-actions">
        <button className="primary-button" onClick={close}>
          Done
        </button>
      </div>
    </dialog>
  );
}
