import type { Settings, ThemeSetting } from '../lib/storage';
import { Modal } from './Modal';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (settings: Settings) => void;
}

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsModal({ open, onClose, settings, onChange }: SettingsModalProps) {
  return (
    <Modal title="Settings" open={open} onClose={onClose}>
      <fieldset className="setting">
        <legend className="setting-name">Theme</legend>
        <div className="segmented">
          {THEMES.map((t) => (
            <label key={t.value} className="segment">
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={settings.theme === t.value}
                onChange={() => onChange({ ...settings, theme: t.value })}
              />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="setting setting-row">
        <label htmlFor="high-contrast" className="setting-text">
          <span className="setting-name">High contrast mode</span>
          <span className="setting-hint">Bolder, more distinct colours on the zoom scale and guesses</span>
        </label>
        <input
          id="high-contrast"
          type="checkbox"
          role="switch"
          className="switch"
          checked={settings.highContrast}
          onChange={(e) => onChange({ ...settings, highContrast: e.target.checked })}
        />
      </div>
      <p className="setting-footer">Close Call v{__APP_VERSION__} · Works offline once loaded</p>
    </Modal>
  );
}
