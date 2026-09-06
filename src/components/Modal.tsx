import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const exitDuration = 240;

export function Modal({
  children,
  open,
  titleId,
  onClose,
}: {
  children: ReactNode;
  open: boolean;
  titleId: string;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setRendered(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const focusFrame = requestAnimationFrame(() =>
      returnFocusRef.current?.focus(),
    );
    const timer = window.setTimeout(() => setRendered(false), exitDuration);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!rendered || !visible) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = ref.current;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ) ?? [],
      );
    dialog?.scrollTo({ top: 0 });
    dialog?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        const active =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        if (!first || !last) {
          event.preventDefault();
          dialog?.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !active ||
            !elements.includes(active) ||
            !dialog?.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !active ||
            !elements.includes(active) ||
            !dialog?.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [rendered, visible, onClose]);

  if (!rendered) return null;

  return (
    <div className={`modal-backdrop ${visible ? "is-visible" : ""}`}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
