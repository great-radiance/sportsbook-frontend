import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import type { StarPlayerCardResponse } from "@/api/home/apiGetHomeWidget";
import { FunctionComponent } from "preact";
import { addSingleWidgetPickToSlip } from "@/helpers/homeWidgetBetslip";
import {
  starPlayerBundleOdds,
  starPlayerDisplayName,
  widgetMarketDisplayName,
  widgetOutcomeDisplayName,
  widgetPickToSlipInput,
} from "@/helpers/widgetDisplayNames";

type TopPlayerCardProps = {
  data: StarPlayerCardResponse;
  onAddToBetSlip: () => void;
};

export const TopPlayerCard: FunctionComponent<TopPlayerCardProps> = ({
  data,
  onAddToBetSlip,
}) => {
  const bundleOdds = starPlayerBundleOdds(data);

  return (
    <div className="relative flex flex-col items-center justify-end gap-2 w-[250px] h-[300px]">
      <div className="flex flex-col relative w-full h-[280px] rounded-[12px] overflow-hidden bg-[var(--highlight-background)]">
        <div
          className="absolute z-2 top-0 left-0 w-full h-full"
          style={{
            background:
              "linear-gradient(180deg, var(--highlight-background) 0%, rgba(9,13,21,0.2) 20%, var(--background-element) 100%)",
            boxShadow: "inset 0 -30px 40px rgba(0,0,0,0.6)",
          }}
        />
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/mask-group.png`}
          alt=""
          className="absolute z-1 top-0 left-0 w-full h-full object-cover"
        />
      </div>
      <img
        src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/player-11.png`}
        alt=""
        className="absolute z-2 top-0 mx-auto object-cover"
      />
      <div className="flex flex-col z-2 absolute bottom-0 w-full h-[240px] overflow-hidden">
        <div className="flex items-center flex-col flex-1 justify-start pt-1">
          <div className="flex items-center p-1 justify-center rounded-full bg-[var(--highlight-background)] min-h-[26px] mx-auto px-2">
            <div className="flex items-center px-2 gap-2 text-[9px] leading-tight text-center text-white/90 line-clamp-2">
              <img
                src={data.competitors[0].logo || `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.svg`}
                onError={(e) => {
                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.svg`;
                }}
                alt={data.competitors[0].name}
                className="w-4 h-4"
              />
              <span className="w-[1px] h-[12px] bg-[var(--text-basic-color)]" />
              <img
                src={data.competitors[1].logo || `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.svg`}
                onError={(e) => {
                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.svg`;
                }}
                alt={data.competitors[1].name}
                className="w-4 h-4"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col w-full h-full justify-between items-center p-2">
          <div className="flex flex-col text-white w-full items-center justify-center">
            <span className="text-[14px] font-bold text-center px-2">
              {starPlayerDisplayName(data)}
            </span>
            <span className="text-[11px] text-center px-2 text-white/70">
              {data.matchName}
            </span>
          </div>
          <div className="flex flex-col w-full">
            {data.picks.map((pick, idx) => {
              const fields = { ...pick, competitors: data.competitors };
              return (
                <button
                  key={`${data.cardId}-${pick.selectionId}-${idx}`}
                  type="button"
                  className="flex w-full flex-col gap-2 px-[6px] py-[6px] text-left rounded hover:bg-white/5"
                  onClick={() =>
                    void addSingleWidgetPickToSlip(
                      widgetPickToSlipInput(pick, data),
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col justify-between items-center gap-[2px]">
                      <div className="w-2 h-2 rounded-full border-2 border-white" />
                      <div className="w-px h-1 bg-[var(--border-color)]" />
                    </div>
                    <span className="text-[12px] text-white starplayers-two-line-clamp flex-1">
                      {widgetMarketDisplayName(fields)} —{" "}
                      {widgetOutcomeDisplayName(fields)}{" "}
                      <span className="ml-1 opacity-80">
                        {pick.odds.toFixed(2)}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              className="flex w-full text-[14px] bg-[var(--primary-strong-bg)] items-center justify-center rounded-[8px] text-[var(--text-primary-color)] font-bold h-[36px] mt-1"
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
