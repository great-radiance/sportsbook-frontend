/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useMemo } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { formatStartDate, formatStartTime } from "@/helpers/formatEventTime";
import type {
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import { RacingOddsCell, selectionCompetitorId } from "./RacingOddsCell";
import { buildEventViewPath } from "@/helpers/buildPrematchPath";

type BoardColumn = {
  key: number;
  label: string;
  market: tMarketModel;
};

const BOARD_MARKET_DEFS: { label: string; test: (name: string) => boolean }[] =
  [
    { label: "Win", test: (n) => /fixed\s*win|winner\s*market/i.test(n) },
    {
      label: "Place",
      test: (n) => /fixed\s*place/i.test(n) && !/top\s*\d/i.test(n),
    },
    { label: "Top 2", test: (n) => /fixed\s*top\s*2|top\s*2/i.test(n) },
  ];

function pickBoardColumns(markets: tMarketModel[]): BoardColumn[] {
  const used = new Set<number>();
  const cols: BoardColumn[] = [];

  for (const def of BOARD_MARKET_DEFS) {
    const market = markets.find(
      (m) => !used.has(m.id) && def.test(m.name.toLowerCase()),
    );
    if (!market) continue;
    used.add(market.id);
    cols.push({
      key: market.id,
      label: def.label,
      market,
    });
  }

  if (cols.length > 0) return cols;

  return markets.slice(0, 3).map((m) => ({
    key: m.id,
    label: m.name.replace(/^fixed\s*/i, "").trim() || m.name,
    market: m,
  }));
}

function parseScratchedPositions(raw: string | undefined): Set<number> {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(
      arr.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n >= 0),
    );
  } catch {
    return new Set();
  }
}

function selectionByCompetitor(
  market: tMarketModel,
): Map<number, tSelectionValue> {
  const map = new Map<number, tSelectionValue>();
  for (const sig of market.selections ?? []) {
    const cid = selectionCompetitorId(sig.value);
    if (cid != null) map.set(cid, sig.value);
  }
  return map;
}

interface RacingMatchProps {
  eventId: number;
  allowRounded?: boolean;
}

export const RacingMatch: FunctionComponent<RacingMatchProps> = ({
  eventId,
  allowRounded = false,
}) => {
  const { storeState } = useSportsbookStore();
  const [, setLocation] = useLocation();
  const event = storeState.value[eventId]?.value;
  if (!event) return null;

  const markets = Object.values(event.markets ?? {}).map((sig) => sig.value);
  const columns = useMemo(() => pickBoardColumns(markets), [markets]);

  const scratched = useMemo(() => {
    const win = columns.find((c) => c.label === "Win")?.market;
    return parseScratchedPositions(win?.extraParameters?.scratchedPositions);
  }, [columns]);

  const runners = useMemo(() => {
    const list = (event.competitors ?? []).map((c, index) => ({
      id: c.id,
      name: c.name,
      index,
    }));
    if (list.length > 0) return list;
    const primary = columns[0]?.market;
    if (!primary) return [];
    return (primary.selections ?? []).map((sig, index) => ({
      id: selectionCompetitorId(sig.value) ?? index,
      name: sig.value.name,
      index,
    }));
  }, [event.competitors, columns]);

  const isLive = event.status === 3;
  const startMs = new Date(event.startTime || "").getTime();
  const custom = event.customdisplayData as Record<string, string> | undefined;
  const raceTitle =
    custom?.customEventName || custom?.customBetEventName || event.name;
  const venue = event.league?.name ?? "";
  const regionLabel = event.region?.name ?? "";

  const eventPath = buildEventViewPath(
    isLive ? "live" : "pre-match",
    event.sport.name,
    event.sport.id,
    event.region.name,
    event.region.id,
    event.league.name,
    event.league.id,
    event.id,
  );

  return (
    <div
      className={`flex flex-col w-full border border-[var(--border-color)] bg-[var(--sub-element-color)] text-[var(--text-basic-color)] overflow-hidden ${allowRounded ? "rounded-[8px]" : ""}`}
      style={{ order: event.league?.id ?? 999 }}
    >
      <button
        type="button"
        className="flex w-full gap-3 px-3 py-2.5 text-left border-b border-[var(--border-color)] hover:bg-white/5 transition-colors"
        onClick={(e) => linkButtonOnClick(e, eventPath, setLocation)}
      >
        <div className="flex flex-col shrink-0 w-[52px] text-[11px] text-[var(--text-sub-color)] tabular-nums">
          {!isLive && Number.isFinite(startMs) && (
            <>
              <span>{formatStartDate(startMs)}</span>
              <span>{formatStartTime(startMs)}</span>
            </>
          )}
          {isLive && (
            <span className="text-[var(--primary-color)] font-semibold">
              Live
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
          <span className="text-[14px] font-bold truncate">{raceTitle}</span>
          <span className="text-[11px] text-[var(--text-sub-color)] truncate">
            {[venue, event.sport?.name, regionLabel]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-[var(--text-sub-color)] self-center">
          {runners.length} runners
        </span>
      </button>
      {columns.length === 0 ? (
        <div
          className={`flex w-full py-4 px-3 text-[12px] text-[var(--text-sub-color)] justify-center bg-[var(--sub-element-color)] border border-[var(--border-color)] ${allowRounded ? "rounded-[8px]" : ""}`}
        >
          No markets available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--background-element)] text-[var(--text-sub-color)] uppercase tracking-wide text-[10px]">
                <th className="w-8 py-2 pl-3 text-left font-semibold">#</th>
                <th className="py-2 pl-1 text-left font-semibold min-w-[120px]">
                  Runner
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="py-2 px-1 text-center font-semibold min-w-[72px]"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runners.map((runner, rowIndex) => {
                const isScratched = scratched.has(rowIndex);
                return (
                  <tr
                    key={runner.id}
                    className={`border-t border-[var(--border-color)] ${isScratched ? "opacity-55" : ""}`}
                  >
                    <td className="py-1.5 pl-3 text-[var(--text-sub-color)] tabular-nums">
                      {rowIndex + 1}
                    </td>
                    <td className="py-1.5 pl-1 pr-2 font-medium max-w-[200px]">
                      <span className="block truncate">{runner.name}</span>
                      {isScratched && (
                        <span className="text-[10px] text-[var(--text-sub-color)] uppercase">
                          Scratched
                        </span>
                      )}
                    </td>
                    {columns.map((col) => {
                      const selMap = selectionByCompetitor(col.market);
                      const selection = selMap.get(runner.id);
                      const showSp =
                        col.market.extraParameters?.isSp === "true";
                      return (
                        <td key={col.key} className="py-1.5 px-1 text-center">
                          <RacingOddsCell
                            eventId={eventId}
                            marketId={col.key}
                            market={col.market}
                            selection={selection}
                            scratched={isScratched}
                            showSp={showSp}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
