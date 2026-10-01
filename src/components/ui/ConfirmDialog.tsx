"use client";

import { Modal } from "./Modal";
import { btnDanger, btnGhost } from "./styles";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onClose} data-autofocus>
          Cancel
        </button>
        <button
          type="button"
          className={btnDanger}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
