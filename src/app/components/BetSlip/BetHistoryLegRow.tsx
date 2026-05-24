import { FunctionComponent } from "preact";
import { BetLegType } from "@/shared/utils/bet";
import { formatDate, formatTime } from "@/shared/utils/formatters";
import { getBetStatusLabel } from "@/helpers/betStatus";

interface BetHistoryLegRowProps {
  leg: BetLegType;
  legIndex: number;
  betStatusLabel: string;
  t: (key: string) => string;
}

function eventTitle(leg: BetLegType): string {
  if (leg.eventName) return leg.eventName;
  const home =
    leg.participants[0]?.name || leg.participants[0]?.providerName || "";
  const away =
    leg.participants[1]?.name || leg.participants[1]?.providerName || "";
  if (home && away) return `${home} - ${away}`;
  return home || away || "—";
}

function formatKickoff(iso?: string): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return `${formatDate(iso)} ${formatTime(ms)}`;
}

export const BetHistoryLegRow: FunctionComponent<BetHistoryLegRowProps> = ({
  leg,
  legIndex,
  betStatusLabel,
  t,
}) => {
  const selectedOdd = leg.odds.find((o) => o.selected) ?? leg.odds[0];
  const oddsValue = Number(selectedOdd?.value ?? 0);
  const kickoff = formatKickoff(leg.eventStartTime);
  const leagueName = leg.league?.name?.trim();
  const legStatus = leg.selectionStatus
    ? getBetStatusLabel(leg.selectionStatus, t)
    : betStatusLabel;

  return (
    <div className="flex w-full flex-col gap-2 border-[1px] border-[var(--border-color)] bg-[var(--sub-element-color)] p-2 rounded-[4px]">
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          <div className="text-[10px] text-[var(--text-sub-color)]">
            {t("leg")} {legIndex + 1}
            {leagueName ? ` · ${leagueName}` : ""}
          </div>
          <div className="break-words text-[11px] leading-snug font-medium">
            {eventTitle(leg)}
          </div>
          {kickoff && (
            <div className="text-[10px] text-[var(--text-sub-color)]">
              {kickoff}
            </div>
          )}
          {leg.isBetBuilder && (
            <div className="inline-flex w-fit rounded-full bg-[var(--primary-color)] px-2 py-0.5 text-[10px] font-bold text-black">
              {t("betBuilder")}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <div className="text-[10px] uppercase text-[var(--primary-color)]">
            {legStatus}
          </div>
          <div className="text-[11px] font-medium text-[var(--primary-color)]">
            {oddsValue.toFixed(2)}
          </div>
        </div>
      </div>

      {leg.isBetBuilder ? (
        <div className="flex flex-col gap-1 border-t border-[var(--border-color)] pt-2">
          {(leg.betBuilderBetItems ?? []).map((item, idx) => (
            <div
              key={`${item.marketId}-${item.selectionId}-${idx}`}
              className="text-[10px] leading-snug text-[var(--text-sub-color)]"
            >
              {item.marketName && item.selectionName
                ? `${item.marketName} · ${item.selectionName}`
                : item.marketName ||
                  item.selectionName ||
                  `${t("market")} ${item.marketId} · ${t("selection")} ${item.selectionId}`}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 border-t border-[var(--border-color)] pt-2 text-[10px]">
          {leg.market?.name && (
            <div className="text-[var(--text-sub-color)]">
              {leg.market.name}
            </div>
          )}
          <div className="font-medium">
            {leg.selectionDisplayName || selectedOdd?.name || "—"}
          </div>
        </div>
      )}
    </div>
  );
};
