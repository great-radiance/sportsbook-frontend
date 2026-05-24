import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import type { StarPlayerCardResponse } from "@/api/home/homeWidgets";
import { FunctionComponent } from "preact";
import {
  addSingleWidgetPickToSlip,
  type WidgetSelectionInput,
} from "@/helpers/homeWidgetBetslip";
import {
  starPlayerBundleOdds,
  starPlayerDisplayName,
  widgetMarketDisplayName,
  widgetOutcomeDisplayName,
} from "@/helpers/widgetDisplayNames";

type TopPlayerCardProps = {
  data: StarPlayerCardResponse;
  onAddToBetSlip: () => void;
};

function pickToInput(
  pick: StarPlayerCardResponse["picks"][0],
  card: StarPlayerCardResponse,
): WidgetSelectionInput {
  const nameFields = { ...pick, competitors: card.competitors };
  return {
    eventId: pick.eventId,
    marketId: pick.marketId,
    selectionId: pick.selectionId,
    marketName: widgetMarketDisplayName(nameFields),
    outcomeName: widgetOutcomeDisplayName(nameFields),
    odds: pick.odds,
    sport: card.sport,
    region: card.region,
    league: card.league,
    startTime: card.startTime,
    matchName: card.matchName,
  };
}

function pickDisplayLine(
  pick: StarPlayerCardResponse["picks"][0],
  card: StarPlayerCardResponse,
): string {
  const nameFields = { ...pick, competitors: card.competitors };
  const market = widgetMarketDisplayName(nameFields);
  const outcome = widgetOutcomeDisplayName(nameFields);
  return `${market} — ${outcome}`;
}

export const TopPlayerCard: FunctionComponent<TopPlayerCardProps> = ({
  data,
  onAddToBetSlip,
}) => {
  const bundleOdds = starPlayerBundleOdds(data);

  return (
    <div className="relative flex flex-col items-center justify-end gap-2 w-[250px] h-[300px]">
      <div className="flex flex-col relative w-full h-[280px] rounded-[12px] overflow-hidden bg-[#840E2E]">
        <div
          className="absolute z-2 top-0 left-0 w-full h-full"
          style={{
            background:
              "linear-gradient(180deg, #840E2E 0%, rgba(9,13,21,0.2) 20%, #090D15 100%)",
            boxShadow: "inset 0 -30px 40px rgba(0,0,0,0.6)",
          }}
        />
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/mask-group.png`}
          alt="mask"
          className="absolute z-3 top-0 left-0 w-full h-full object-cover"
        />
      </div>
      <img
        src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/player-11.png`}
        alt="Player"
        className="absolute z-1 top-0 mx-auto object-cover"
      />
      <div className="flex flex-col z-2 absolute bottom-0 w-full h-[240px] overflow-hidden">
        <div className="flex items-center flex-col flex-1 justify-start pt-1">
          <div className="flex items-center p-1 justify-center rounded-full bg-[#840e2e] min-h-[26px] mx-auto px-2">
            <span className="text-[9px] leading-tight text-center text-white/90 line-clamp-2">
              {data.matchName}
            </span>
          </div>
        </div>
        <div className="flex flex-col w-full h-full justify-between items-center p-2">
          <div className="flex flex-col text-white w-full items-center justify-center">
            <span className="text-[14px] font-bold text-center px-2">
              {starPlayerDisplayName(data)}
            </span>
            <span className="text-[11px] text-center px-2 text-white/70">
              {data.league.name}
            </span>
          </div>
          <div className="flex flex-col w-full">
            {data.picks.map((pick, idx) => (
              <div
                key={`${data.cardId}-${pick.role}-${pick.selectionId}-${idx}`}
                className="flex w-full flex-col gap-2"
              >
                <button
                  type="button"
                  className="flex flex-col px-[6px] py-[6px] text-left w-full rounded hover:bg-white/5"
                  onClick={() =>
                    void addSingleWidgetPickToSlip(pickToInput(pick, data))
                  }
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col justify-between items-center gap-[2px]">
                      <div className="w-2 h-2 rounded-full border-[2px] border-white" />
                      <div className="w-px h-1 bg-[#A5B3CF]" />
                    </div>
                    <div className="flex-1 items-center justify-center">
                      <span className="text-[12px] text-white starplayers-two-line-clamp">
                        {pickDisplayLine(pick, data)}{" "}
                        <span className="ml-1 opacity-80">
                          {pick.odds.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
            <button
              type="button"
              className="flex w-full text-[14px] bg-[var(--sub-element-secondary)] items-center justify-center rounded-[8px] text-[var(--text-primary-color)] font-bold h-[36px]"
              onClick={onAddToBetSlip}
            >
              {bundleOdds.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
