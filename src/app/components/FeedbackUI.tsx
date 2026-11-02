"use client";

import { useEffect } from "react";

export type FeedbackTone = "success" | "error" | "info";

const toneCopy: Record<FeedbackTone, { label: string; mark: string }> = {
  success: { label: "Listo", mark: "✓" },
  error: { label: "No se pudo completar", mark: "!" },
  info: { label: "Información", mark: "i" },
};

export function Toast({
  message,
  tone = "success",
  onClose,
}: {
  message: string;
  tone?: FeedbackTone;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!onClose) return;
    const timer = window.setTimeout(onClose, tone === "error" ? 6500 : 4200);
    return () => window.clearTimeout(timer);
  }, [message, onClose, tone]);

  const copy = toneCopy[tone];

  return (
    <div className={`toast toast-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="toast-mark" aria-hidden="true">{copy.mark}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-bold">{copy.label}</strong>
        <span className="mt-0.5 block text-sm text-slate-300">{message}</span>
      </span>
      {onClose ? (
        <button type="button" className="toast-close" onClick={onClose} aria-label="Cerrar mensaje">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: FeedbackTone;
}) {
  const copy = toneCopy[tone];
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="notice-mark" aria-hidden="true">{copy.mark}</span>
      <span>{children}</span>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) onCancel();
    }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-icon" aria-hidden="true">!</div>
        <div className="min-w-0 flex-1">
          <p id="confirm-title" className="text-lg font-bold text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="feedback-button feedback-button-secondary">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="feedback-button feedback-button-danger">
            {loading ? "Eliminando…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
