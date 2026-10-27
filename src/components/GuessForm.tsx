import { useCallback, useEffect, useRef, useState } from 'react';
import { suggest } from '../lib/suggest';
import { ZoomOutIcon } from './Icons';

interface GuessFormProps {
  /** Returns a message when the guess doesn't count as a try, or null when it does. */
  onGuess: (raw: string) => string | null;
  onSkip: () => void;
  tried: (string | null)[];
  disabled: boolean;
}

export function GuessForm({ onGuess, onSkip, tried, disabled }: GuessFormProps) {
  const [value, setValue] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState('');
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = items.length > 0;

  const close = useCallback(() => {
    setItems([]);
    setActive(-1);
  }, []);

  // Clear suggestions once a try is spent, so the next guess starts fresh.
  useEffect(() => close(), [tried.length, close]);

  const change = (next: string) => {
    setValue(next);
    setHint('');
    setItems(suggest(next, tried));
    setActive(-1);
  };

  const pick = (index: number) => {
    setValue(items[index]);
    close();
    inputRef.current?.focus();
  };

  const submit = () => {
    close();
    const message = onGuess(value);
    if (message) {
      setHint(message);
      setShake((n) => n + 1);
      return;
    }
    setValue('');
  };

  return (
    <section className="play">
      <form
        key={shake}
        className={shake ? 'guess-row shake' : 'guess-row'}
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="guess">
          Your guess
        </label>
        <div className="combobox">
          <input
            id="guess"
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="guess-suggestions"
            aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
            placeholder="Which animal is it?"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            disabled={disabled}
            value={value}
            onChange={(e) => change(e.target.value)}
            onBlur={() => window.setTimeout(close, 120)}
            onKeyDown={(e) => {
              if (!open) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => (a + 1) % items.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
              } else if (e.key === 'Enter' && active >= 0) {
                e.preventDefault();
                pick(active);
              } else if (e.key === 'Escape') {
                close();
              }
            }}
          />
          <ul className="suggestions" id="guess-suggestions" role="listbox" aria-label="Suggestions" hidden={!open}>
            {items.map((item, i) => (
              <li
                key={item}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerDown={(e) => {
                  e.preventDefault();
                  pick(i);
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
        <button className="button button-primary" type="submit" disabled={disabled}>
          Guess
        </button>
      </form>
      <p className="hint" role="status">
        {hint}
      </p>
      <button className="button button-ghost" type="button" onClick={onSkip} disabled={disabled}>
        <ZoomOutIcon />
        Zoom out without guessing
      </button>
    </section>
  );
}
