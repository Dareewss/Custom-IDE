import { useSettings } from '../settings/store';

export function OverviewSettings() {
  const settings = useSettings();
  return (
    <fieldset className="overview-settings">
      <legend>3D overview</legend>
      <label className="field">
        3D quality
        <select
          aria-label="3D quality"
          value={settings.overviewQuality}
          onChange={(event) => {
            const value = event.target.value;
            if (value === 'low' || value === 'medium' || value === 'high')
              settings.setSetting('overviewQuality', value);
          }}
        >
          <option value="low">Low · fewer details</option>
          <option value="medium">Medium · balanced</option>
          <option value="high">High · full detail</option>
        </select>
      </label>
      <label className="field">
        3D symbol size · {settings.overviewNodeSize}%
        <input
          type="range"
          min={75}
          max={125}
          step={5}
          value={settings.overviewNodeSize}
          aria-label="3D symbol size"
          aria-valuetext={`${settings.overviewNodeSize}%`}
          onChange={(event) => settings.setSetting('overviewNodeSize', Number(event.target.value))}
        />
      </label>
      <p className="muted">
        Adjust symbols inside the file containers. Source positions and layout stay stable.
      </p>
      <label className="setting-toggle">
        <span>3D labels</span>
        <input
          type="checkbox"
          checked={settings.overviewLabels}
          onChange={(event) => settings.setSetting('overviewLabels', event.target.checked)}
        />
      </label>
      <label className="setting-toggle">
        <span>3D connections</span>
        <input
          type="checkbox"
          checked={settings.overviewEdges}
          onChange={(event) => settings.setSetting('overviewEdges', event.target.checked)}
        />
      </label>
      <p className="muted">
        The code outline always includes object names. Camera, collapsed objects and isolation are
        saved per project.
      </p>
    </fieldset>
  );
}
