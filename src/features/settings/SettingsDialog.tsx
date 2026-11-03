import { useEffect, useRef } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
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
      className="glass glass--modal dialog settings-dialog"
      aria-label="Workspace settings"
      ref={ref}
      onCancel={close}
    >
      <div className="settings-scroll">
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
        <fieldset className="appearance-settings">
          <legend>Glass appearance</legend>
          <label className="setting-toggle">
            <span>
              <strong>Desktop blur</strong>
              <small>
                {window.codeAtlasDesktop?.supportsDesktopBlur
                  ? 'Windows Acrylic. Windows controls its blur and tint; turn off for a clear desktop view.'
                  : 'Available in the supported Windows desktop app. The CSS backing stays available here.'}
              </small>
            </span>
            <input
              type="checkbox"
              checked={settings.desktopBlur}
              disabled={!window.codeAtlasDesktop?.supportsDesktopBlur}
              onChange={(event) => settings.setSetting('desktopBlur', event.target.checked)}
            />
          </label>
          <label className="field">
            Background preset
            <select
              value={settings.backgroundPreset}
              onChange={(event) =>
                settings.setSetting(
                  'backgroundPreset',
                  event.target.value === 'ocean' || event.target.value === 'nebula'
                    ? event.target.value
                    : 'neon',
                )
              }
            >
              <option value="neon">Neon</option>
              <option value="ocean">Ocean</option>
              <option value="nebula">Nebula</option>
            </select>
          </label>
          <div className="transparency-heading">
            <label htmlFor="animation-speed">Animation speed</label>
            <output htmlFor="animation-speed">{settings.animationSpeed}x</output>
          </div>
          <input
            id="animation-speed"
            type="range"
            min={0.25}
            max={2}
            step={0.25}
            value={settings.animationSpeed}
            aria-valuetext={`${settings.animationSpeed} times speed`}
            onChange={(event) => settings.setSetting('animationSpeed', Number(event.target.value))}
          />
          <div className="transparency-heading">
            <label htmlFor="glass-blur">Blur strength</label>
            <output htmlFor="glass-blur">{settings.blurStrength}px</output>
          </div>
          <input
            id="glass-blur"
            type="range"
            min={0}
            max={48}
            value={settings.blurStrength}
            aria-valuetext={`${settings.blurStrength} pixels`}
            onChange={(event) => settings.setSetting('blurStrength', Number(event.target.value))}
          />
          {(['backgroundBlobs', 'backgroundAnimation', 'performanceMode'] as const).map((key) => (
            <label className="setting-toggle" key={key}>
              <span>
                <strong>
                  {
                    {
                      backgroundBlobs: 'Background blobs',
                      backgroundAnimation: 'Background animation',
                      performanceMode: 'Performance mode',
                    }[key]
                  }
                </strong>
                <small>
                  {
                    {
                      backgroundBlobs: 'Show the decorative shapes behind the glass.',
                      backgroundAnimation: 'Let the shapes drift slowly while this app is visible.',
                      performanceMode: 'Use plain translucent fills without blur or animation.',
                    }[key]
                  }
                </small>
              </span>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(event) => settings.setSetting(key, event.target.checked)}
              />
            </label>
          ))}
          <p className="transparency-platform-note">
            System preferences for reduced motion and transparency take priority over these effects.
          </p>
        </fieldset>
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
            <span>0% · Strong tint</span>
            <span>100% · Clear glass</span>
          </div>
          <p id="transparency-description">
            Only workspace backgrounds fade. Text, icons and controls stay fully visible.
          </p>
          <p className="transparency-platform-note">
            Subtle blur softens the blobs inside the app. Desktop blur is optional; use a little
            tint if your wallpaper makes text hard to read.
          </p>
        </div>
        {(['wordWrap', 'minimap', 'formatOnSave'] as const).map((key) => (
          <label className="setting-toggle" key={key}>
            <span>
              <strong>
                {
                  {
                    wordWrap: 'Word wrap',
                    minimap: 'Code minimap',
                    formatOnSave: 'Format on save',
                  }[key]
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
      </div>
    </dialog>
  );
}
