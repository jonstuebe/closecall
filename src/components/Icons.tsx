import type { TryResult } from '../lib/types';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Viewfinder corners around a focus point. */
export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.4} strokeLinecap="square">
      <path d="M3 8.5V3h5.5M15.5 3H21v5.5M21 15.5V21h-5.5M8.5 21H3v-5.5" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A Try's outcome by shape as well as colour: dot for a hit, cross for a miss, dash for a zoom-out. */
export function ResultMark({ result }: { result: TryResult }) {
  return (
    <svg className={`mark mark-${result}`} viewBox="0 0 12 12" aria-hidden="true" {...stroke} strokeWidth={2.2}>
      {result === 'hit' ? <circle cx="6" cy="6" r="4.6" fill="currentColor" stroke="none" /> : null}
      {result === 'miss' ? <path d="M2.6 2.6l6.8 6.8M9.4 2.6 2.6 9.4" /> : null}
      {result === 'skip' ? <path d="M2 6h8" /> : null}
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <circle cx="12" cy="17.5" r=".6" fill="currentColor" />
    </svg>
  );
}

export function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M5 20V12M12 20V5M19 20v-9" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function ZoomOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21M7.5 10.5h6" />
    </svg>
  );
}
