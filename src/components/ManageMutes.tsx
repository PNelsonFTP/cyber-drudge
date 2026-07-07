import { useEffect, useRef } from "react";

/**
 * src/components/ManageMutes.tsx
 * -----------------------------
 * Modal listing every muted source and category with one-click "restore".
 * Triggered from the header (X N button). Escape closes; focus moves to the
 * close button on open so keyboard users aren't stranded behind the overlay.
 */
export function ManageMutes(props: {
  open: boolean;
  mutedSources: string[];
  mutedCategories: string[];
  categoryLabels: Record<string, string>;
  onClose: () => void;
  onRestoreSource: (s: string) => void;
  onRestoreCategory: (c: string) => void;
  onRestoreAll: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { open, onClose } = props;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!props.open) return null;
  const nothing = props.mutedSources.length === 0 && props.mutedCategories.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4"
      onClick={props.onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-mutes-title"
        className="bg-[var(--color-bg)] border border-[var(--color-line)] w-full max-w-lg p-4 mt-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-3">
          <h2 id="manage-mutes-title" className="font-bold uppercase mono text-[13px] tracking-wider">
            Manage mutes
          </h2>
          <button
            ref={closeRef}
            className="ml-auto mono text-[12px] text-[var(--color-muted)] hover:siren"
            onClick={props.onClose}
          >
            {"\u2715"} close
          </button>
        </div>

        {nothing ? (
          <p className="text-[13px] text-[var(--color-muted)]">
            Nothing muted. Hover a headline and click "mute" to hide a source.
          </p>
        ) : (
          <>
            {!nothing && (
              <div className="mb-3">
                <button
                  className="text-[11px] mono text-[var(--color-link)] hover:underline"
                  onClick={props.onRestoreAll}
                >
                  restore all
                </button>
              </div>
            )}

            {props.mutedCategories.length > 0 && (
              <>
                <div className="text-[10px] mono uppercase text-[var(--color-muted)] mb-1">
                  Categories
                </div>
                <ul className="mb-3 space-y-1">
                  {props.mutedCategories.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-[13px]">
                      <span className="flex-1">
                        {props.categoryLabels[c] ?? c}
                      </span>
                      <button
                        className="text-[11px] mono text-[var(--color-link)] hover:underline"
                        onClick={() => props.onRestoreCategory(c)}
                      >
                        restore
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {props.mutedSources.length > 0 && (
              <>
                <div className="text-[10px] mono uppercase text-[var(--color-muted)] mb-1">
                  Sources
                </div>
                <ul className="space-y-1">
                  {props.mutedSources.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-[13px]">
                      <span className="flex-1">{s}</span>
                      <button
                        className="text-[11px] mono text-[var(--color-link)] hover:underline"
                        onClick={() => props.onRestoreSource(s)}
                      >
                        restore
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
