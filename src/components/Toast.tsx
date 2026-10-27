import type { ReactNode } from 'react';

export interface ToastMessage {
  id: number;
  content: ReactNode;
  persistent?: boolean;
}

export function ToastList({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.content}
        </div>
      ))}
    </div>
  );
}
