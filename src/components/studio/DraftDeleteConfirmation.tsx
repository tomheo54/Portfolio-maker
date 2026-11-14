'use client';

import { useEffect, useRef } from 'react';

interface DraftDeleteConfirmationProps {
  draftName: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DraftDeleteConfirmation({
  draftName,
  busy = false,
  onCancel,
  onConfirm,
}: DraftDeleteConfirmationProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-draft-title"
        aria-describedby="delete-draft-description"
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl"
      >
        <h2 id="delete-draft-title" className="text-lg font-bold text-stone-900">Xóa dự án này?</h2>
        <p id="delete-draft-description" className="mt-2 text-sm leading-relaxed text-stone-600">
          Bản nháp “{draftName}” và lịch sử chỉnh sửa sẽ bị xóa khỏi thiết bị này. Không thể hoàn tác.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? 'Đang xóa…' : 'Xóa dự án'}
          </button>
        </div>
      </section>
    </div>
  );
}
