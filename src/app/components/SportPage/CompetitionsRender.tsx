import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { baseColorTheme } from "@/state/baseColorTheme";
import React, { useEffect, useState } from "preact/hooks";

type Node = {
  id: number;
  name: string;
  type: "sport" | "league" | "region" | "custom";
  children?: Node[];
};

interface League {
  key: string;
  region: string;
  league: string;
  eventIds: number[];
  outrightIds: number[];
  matchCount: number;
}

type Props = {
  data: Node;
  sportName?: string;
  leagueEntries?: League[];
};

const CompetitionsRender = ({ data, sportName, leagueEntries }: Props) => {
  const [openRegions, setOpenRegions] = useState<Record<number, boolean>>({});
  const baseTheme = baseColorTheme.value;

  const toggleRegion = (id: number) => {
    setOpenRegions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    console.log(leagueEntries);
  }, [leagueEntries]);

  const popularLeagues =
    data.children?.filter((child) => child.type === "league") || [];

  const continents =
    data.children?.filter((child) => child.type === "custom") || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="columns-1 md:columns-2 sm:columns-2 gap-4">
        <div className="mb-4 w-full rounded-lg">
          <p className="font-semibold uppercase text-sm mb-3">Popular</p>

          <div className="grid w-full grid-cols-2  gap-2">
            {popularLeagues.map((league) => (
              <div
                key={league.id}
                className="p-2 rounded w-full bg-[var(--sub-element-secondary)] text-[13px]"
              >
                {league.name}
              </div>
            ))}
          </div>
        </div>
        {continents.map((continent) => (
          <div
            key={continent.id}
            className="mb-4 break-inside-avoid p-4 rounded-lg bg-[var(--sub-element-secondary)]"
          >
            {/* Title */}
            <p className="font-semibold text-sm border-b pb-2 mb-3">
              {continent.name}
            </p>

            {/* Countries */}
            <div className="flex flex-col gap-2">
              {continent.children?.map((region) => {
                const isOpen = openRegions[region.id];
                const filteredLeagues =
                  leagueEntries?.filter(
                    (league) => league.region === region.name,
                  ) ?? [];
                return (
                  <div key={region.id}>
                    <div className="flex justify-between w-full p-2 rounded text-sm">
                      <div className="flex items-center gap-2 cursor-pointer hover:font-bold">
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(
                            sportName || "",
                          )}/${encodeURIComponent(region.name || "")}.webp`}
                          className={`w-5 h-5 object-contain`}
                          onError={(e) => {
                            e.currentTarget.src = `${getFlagIconFromregionName(
                              region.name || "",
                            )}`;
                            e.currentTarget.className = "rounded-full w-4 h-4";
                          }}
                          alt={region.name}
                        />
                        <a
                          href={`http://localhost:3000/#sportsbook=/event-view/pre-match/${sportName}/${region.name}`}
                        >
                          {region.name}
                        </a>
                      </div>
                      <img
                        onClick={() => toggleRegion(region.id)}
                        className={`w-[24px] cursor-pointer rounded-[4px] h-[24px] transition-all shrink-0 ${
                          isOpen ? "-rotate-90" : "rotate-90"
                        } ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                        src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                        alt=""
                      />
                    </div>

                    {isOpen && filteredLeagues.length > 0 && (
                      <div className="ml-4 mt-1 flex flex-col gap-1">
                        {filteredLeagues.map((league) => (
                          <a
                            href={`http://localhost:3000/#sportsbook=/event-view/pre-match/${sportName}/${region.name}`}
                            className="p-2 cursor-pointer hover:font-bold rounded text-[12px]"
                            key={league.key}
                          >
                            {league.league}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompetitionsRender;
