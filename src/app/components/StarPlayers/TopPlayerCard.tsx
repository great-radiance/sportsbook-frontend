import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { FunctionComponent } from "preact";

export const TopPlayerCard: FunctionComponent = () => {
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
          <div className="flex items-center p-1 justify-center rounded-full bg-[#840e2e] w-[60px] h-[26px] mx-auto">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/8e198a4ec4b9_2562136_x3.webp`}
              alt="Star"
              className="w-4 h-4"
            />
            <div className="w-[2px] h-full my-[4px] bg-black/30 mx-2" />
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/c1369d385d66_2424654_x3.webp`}
              alt="Star"
              className="w-4 h-4"
            />
          </div>
          <div className="flex flex-col text-white w-full items-center justify-center pt-3 pb-2">
            <span className="text-[14px] font-bold">Ollie Watkins</span>
            <span className="text-[12px]">Aston Villa - Nottingham Forest</span>
          </div>
        </div>
        <div className="flex flex-col w-full justify-center items-center p-2">
          <div className="flex flex-col px-[6px] py-[6px]">
            <div className="flex items-center gap-2">
              <div className="flex flex-col justify-between items-center gap-[2px]">
                <div className="w-2 h-2 rounded-full border-[2px] border-white" />
                <div className="w-px h-1 bg-[#A5B3CF]" />
              </div>
              <div className="flex-1 items-center justify-center">
                <span className="text-[12px] text-white">
                  Match Result - <span className="font-bold">Aston Villa</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col justify-between items-center h-full gap-[2px]">
                <div className="w-2 h-2 rounded-full border-[2px] border-white" />
                <div className="w-px h-1 bg-[#A5B3CF]" />
              </div>
              <div className="flex-1">
                <span className="text-[12px] text-white">
                  Over/Under Total Goals -{" "}
                  <span className="font-bold">Over 1.5</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col justify-start h-full items-center gap-[2px]">
                <div className="w-2 h-2 rounded-full border-[2px] border-white" />
              </div>
              <div className="flex-1">
                <span className="text-[12px] text-white">
                  Ollie Watkins Shots On Target -{" "}
                  <span className="font-bold">1+</span>
                </span>
              </div>
            </div>
          </div>
          <button className="flex w-full text-[14px] bg-[var(--sub-element-secondary)] items-center justify-center rounded-[8px] text-[var(--text-primary-color)] font-bold h-[36px]">
            2.80
          </button>
        </div>
      </div>
    </div>
  );
};
