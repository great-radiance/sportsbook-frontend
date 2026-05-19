import { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import {
  closeOddsChangedDialog,
  oddsChangedDialogLines,
  oddsChangedDialogMessage,
  oddsChangedDialogOpen,
} from "@/state/oddsChangedDialogState";
import { formatOdds } from "@/shared/utils/formatters";

export const OddsChangedDialog: FunctionComponent = () => {
  const dialogRef = useRef<HTMLElement & { show: () => void; hide: () => void }>(
    null,
  );

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (oddsChangedDialogOpen.value) el.show();
    else el.hide();
  }, [oddsChangedDialogOpen.value]);

  if (!oddsChangedDialogOpen.value && !oddsChangedDialogLines.value.length) {
    return null;
  }

  return (
    <sl-dialog
      ref={dialogRef}
      label="Odds updated"
      className="mx-auto my-auto text-[var(--text-basic-color)]"
      onSlRequestClose={() => closeOddsChangedDialog()}
      onSlAfterHide={() => closeOddsChangedDialog()}
    >
      <p className="text-[13px] mb-3">{oddsChangedDialogMessage.value}</p>
      <ul className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
        {oddsChangedDialogLines.value.map((line, idx) => {
          const improved = line.newOdds > line.oldOdds;
          const worse = line.newOdds < line.oldOdds;
          return (
            <li
              key={`${line.label}-${idx}`}
              className="flex flex-col gap-1 p-2 rounded border border-[var(--border-color)] bg-[var(--sub-element-secondary)]"
            >
              <span className="text-[12px] font-medium truncate">{line.label}</span>
              <span className="text-[12px] flex items-center gap-2">
                <span className="line-through opacity-60">
                  {formatOdds(line.oldOdds)}
                </span>
                <span>→</span>
                <span
                  className={
                    improved
                      ? "text-[var(--text-green)]"
                      : worse
                        ? "text-[var(--text-red)]"
                        : ""
                  }
                >
                  {formatOdds(line.newOdds)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        slot="footer"
        className="mt-4 w-full py-2 rounded bg-[var(--primary-color)] text-[12px] uppercase"
        onClick={() => closeOddsChangedDialog()}
      >
        Review bet slip
      </button>
    </sl-dialog>
  );
};
