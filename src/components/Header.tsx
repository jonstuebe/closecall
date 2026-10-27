import { HelpIcon, LogoMark, SettingsIcon, StatsIcon } from './Icons';

interface HeaderProps {
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
}

export function Header({ onHelp, onStats, onSettings }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="title">
        <LogoMark />
        Close Call
      </h1>
      <div className="header-side">
        <button type="button" className="icon-button" onClick={onHelp} aria-label="How to play">
          <HelpIcon />
        </button>
        <button type="button" className="icon-button" onClick={onStats} aria-label="Statistics">
          <StatsIcon />
        </button>
        <button type="button" className="icon-button" onClick={onSettings} aria-label="Settings">
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}
