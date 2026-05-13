import { getTeamlogo } from "@/helpers/getTeamlogos";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { storeState } from "@/state/storeState";
import { FunctionComponent } from "preact";

export type StarPlayerCardData = {
  eventId: number;
  playerName: string;
  matchName: string;
  picks: Array<{
    oddsId: string;
    marketId: string;
    marketName: string;
    outcomeName: string;
    odds: number;
  }>;
};

type TopPlayerCardProps = {
  data: StarPlayerCardData;
  onAddToBetSlip: (picks: { oddsId: string; marketId: string }[]) => void;
};

export const TopPlayerCard: FunctionComponent<TopPlayerCardProps> = ({
  data,
  onAddToBetSlip,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-end gap-2 w-[238px] h-[290px]">
      <div className="flex flex-col relative w-full h-[270px] rounded-[12px] overflow-hidden bg-[#840E2E]">
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
      <div className="flex flex-col z-2 absolute bottom-0 w-full h-[230px] overflow-hidden">
        <div className="flex items-center flex-col flex-1 justify-start">
          {(() => {
            // The new `tEventModel` keeps `sport` as an object and team
            // names live under `competitors[]` (was `participants[]`).
            const event = storeState.value[data.eventId]?.value;
            const sportName = event?.sport?.name ?? "";
            const homeName = event?.competitors?.[0]?.name ?? "";
            const awayName = event?.competitors?.[1]?.name ?? "";
            return (
              <div className="flex items-center p-1 justify-center rounded-full bg-[#840e2e] w-[60px] h-[26px] mx-auto">
                <img
                  src={getTeamlogo(sportName, homeName)}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`;
                  }}
                  alt="Home"
                  className="w-4 h-4"
                />
                <div className="w-[2px] h-full my-[4px] bg-black/30 mx-2" />
                <img
                  src={getTeamlogo(sportName, awayName)}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;
                  }}
                  alt="Away"
                  className="w-4 h-4"
                />
              </div>
            );
          })()}
        </div>
        <div className="flex flex-col w-full h-full justify-between items-center p-2">
          <div className="flex flex-col text-white w-full items-center justify-center">
            <span className="text-[14px] font-bold text-center px-2">
              {data.playerName}
            </span>
            <span className="text-[12px] text-center px-2">
              {data.matchName}
            </span>
          </div>
          <div className="flex flex-col w-full">
            {data.picks.map((pick) => (
              <div key={pick.oddsId} className="flex w-full flex-col gap-2">
                <div className="flex flex-col px-[6px] py-[6px]">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col justify-between items-center gap-[2px]">
                      <div className="w-2 h-2 rounded-full border-[2px] border-white" />
                      <div className="w-px h-1 bg-[#A5B3CF]" />
                    </div>
                    <div className="flex-1 items-center justify-center">
                      <span className="text-[12px] text-white starplayers-two-line-clamp">
                        {pick.marketName} -{" "}
                        <span className="font-bold">{pick.outcomeName}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              className="flex w-full text-[14px] bg-[var(--sub-element-secondary)] items-center justify-center rounded-[8px] text-[var(--text-primary-color)] font-bold h-[36px]"
              onClick={() =>
                onAddToBetSlip(
                  data.picks.map((p) => ({
                    oddsId: p.oddsId,
                    marketId: p.marketId,
                  })),
                )
              }
            >
              {data.picks.reduce((acc, pick) => acc * pick.odds, 1).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
