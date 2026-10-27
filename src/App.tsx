import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPuzzleDate, localDateKey } from './lib/puzzle';
import { cachedDaily, estimatedPuzzleNumber, loadDaily, type Daily } from './lib/daily';
import { MAX_TRIES } from './lib/guessing';
import { loadState, recordFor, recordResult, saveState, type GameState, type PuzzleRecord, type Settings } from './lib/storage';
import { applyUpdate, onUpdateAvailable } from './lib/pwa';
import { usePrefersReducedMotion } from './lib/usePrefersReducedMotion';
import { Header } from './components/Header';
import { Game } from './components/Game';
import { HelpModal } from './components/HelpModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastList, type ToastMessage } from './components/Toast';

type ModalName = 'help' | 'stats' | 'settings' | null;

/** How long the reveal is left alone before stats slide in over it. */
const STATS_DELAY_MS = 1400;

export function App() {
  const [now, setNow] = useState(() => new Date());
  const date = localDateKey(now);
  const [daily, setDaily] = useState<Daily>(() => cachedDaily(date) ?? { status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const [state, setState] = useState<GameState>(loadState);
  const [modal, setModal] = useState<ModalName>(() => (state.seenHelp ? null : 'help'));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [liveMessage, setLiveMessage] = useState('');
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => saveState(state), [state]);

  // Theme and contrast live on <html> so CSS tokens can switch.
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = state.settings.theme;
    if (state.settings.highContrast) root.dataset.contrast = 'high';
    else delete root.dataset.contrast;
  }, [state.settings]);

  const refreshDate = useCallback(() => setNow(new Date()), []);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // Roll over at local midnight, and whenever the app comes back from the background.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refreshDate();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshDate);
    window.addEventListener('online', retry);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshDate);
      window.removeEventListener('online', retry);
    };
  }, [refreshDate, retry]);

  // Fetch the Puzzle for the local date, unless it's already loaded.
  const dailyRef = useRef(daily);
  dailyRef.current = daily;
  useEffect(() => {
    const current = dailyRef.current;
    if (current.status === 'ready' && current.date === date) return;
    let cancelled = false;
    setDaily(cachedDaily(date) ?? { status: 'loading' });
    void loadDaily(date).then((next) => {
      if (!cancelled) setDaily(next);
    });
    return () => {
      cancelled = true;
    };
  }, [date, attempt]);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, content: message }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2400);
  }, []);

  // A new service worker is waiting: offer the reload rather than forcing it mid-game.
  useEffect(
    () =>
      onUpdateAvailable(() => {
        setToasts((list) =>
          list.some((t) => t.id === 0)
            ? list
            : [
                ...list,
                {
                  id: 0,
                  persistent: true,
                  content: (
                    <>
                      A new version is ready.{' '}
                      <button type="button" className="toast-action" onClick={applyUpdate}>
                        Reload
                      </button>
                    </>
                  ),
                },
              ],
        );
      }),
    [],
  );

  const puzzleNumber = daily.status === 'ready' ? daily.number : estimatedPuzzleNumber(date);
  const record = daily.status === 'ready' ? recordFor(state, daily.number) : null;

  // Show stats shortly after the reveal, once per finished Puzzle.
  const celebrated = useRef<number | null>(null);
  useEffect(() => {
    if (daily.status !== 'ready' || !record || record.status === 'playing') return;
    if (celebrated.current === daily.number) return;
    celebrated.current = daily.number;
    const id = window.setTimeout(() => setModal('stats'), STATS_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [daily, record]);

  const onRecord = useCallback(
    (next: PuzzleRecord) => {
      if (daily.status !== 'ready') return;
      setState((prev) => recordResult(prev, daily.number, next));
    },
    [daily],
  );

  const onSettings = useCallback((settings: Settings) => setState((prev) => ({ ...prev, settings })), []);

  const closeHelp = useCallback(() => {
    setModal(null);
    setState((prev) => (prev.seenHelp ? prev : { ...prev, seenHelp: true }));
  }, []);

  const highlight = record && record.status !== 'playing' ? (record.status === 'won' ? record.guesses.length - 1 : MAX_TRIES) : null;

  return (
    <div className="app">
      <Header onHelp={() => setModal('help')} onStats={() => setModal('stats')} onSettings={() => setModal('settings')} />

      <div className="meta">
        <span>
          {puzzleNumber === null ? 'Close Call' : <strong>No. {puzzleNumber}</strong>}
          {puzzleNumber === null ? null : `, ${formatPuzzleDate(now)}`}
        </span>
        <span>{record?.status === 'playing' ? `Try ${record.guesses.length + 1} of ${MAX_TRIES}` : ''}</span>
      </div>

      {daily.status === 'ready' ? (
        <Game
          key={daily.number}
          puzzle={daily.puzzle}
          puzzleNumber={daily.number}
          record={recordFor(state, daily.number)}
          onRecord={onRecord}
          onAnnounce={setLiveMessage}
          onToast={toast}
          onExpire={refreshDate}
          reducedMotion={reducedMotion}
        />
      ) : (
        <Placeholder status={daily.status} onRetry={retry} />
      )}

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>
      <ToastList toasts={toasts} />

      <HelpModal open={modal === 'help'} onClose={closeHelp} />
      <StatsModal open={modal === 'stats'} onClose={() => setModal(null)} stats={state.stats} today={puzzleNumber} highlight={highlight} />
      <SettingsModal open={modal === 'settings'} onClose={() => setModal(null)} settings={state.settings} onChange={onSettings} />
    </div>
  );
}

function Placeholder({ status, onRetry }: { status: 'loading' | 'none' | 'offline'; onRetry: () => void }) {
  if (status === 'loading') {
    return (
      <div className="placeholder" role="status">
        <div className="viewfinder is-loading" />
        <p>Focusing…</p>
      </div>
    );
  }
  if (status === 'none') {
    return (
      <div className="placeholder">
        <h2>Back tomorrow</h2>
        <p>There’s no close call for today. Check again after midnight.</p>
      </div>
    );
  }
  return (
    <div className="placeholder">
      <h2>No connection</h2>
      <p>Close Call needs the network once a day to collect today’s photo.</p>
      <button className="button button-primary" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
