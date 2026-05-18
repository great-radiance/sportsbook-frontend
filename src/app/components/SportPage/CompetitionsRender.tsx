import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import {
  buildPrematchPath,
  sportsbookHashHref,
} from "@/helpers/buildPrematchPath";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { baseColorTheme } from "@/state/baseColorTheme";
import { useMemo, useState } from "preact/hooks";
import type { LeagueLabel } from "@/helpers/resolveSummaryLabels";

type Node = {
  id: number;
  name: string;
  type: "sport" | "league" | "region" | "custom";
  children?: Node[];
};

interface League {
  key: string;
  regionId: number;
  leagueId: number;
  eventIds: number[];
  outrightIds: number[];
  matchCount: number;
}

type Props = {
  data?: Node | null;
  sportName?: string;
  sportId?: number;
  leagueEntries?: League[];
  leagueLabelMap?: Map<string, LeagueLabel>;
};

const CompetitionsRender = ({
  data,
  sportName,
  sportId = 0,
  leagueEntries = [],
  leagueLabelMap,
}: Props) => {
  const [openRegions, setOpenRegions] = useState<Record<number, boolean>>({});
  const baseTheme = baseColorTheme.value;
  const sport = sportName ?? "";

  const toggleRegion = (id: number) => {
    setOpenRegions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const popularWithEvents = useMemo(() => {
    const popularNodes =
      data?.children?.filter((child) => child.type === "league") ?? [];
    return popularNodes
      .map((node) => {
        const leagueEntry = leagueEntries.find((entry) => {
          const label = leagueLabelMap?.get(
            `${entry.regionId}:${entry.leagueId}`,
          );
          return label?.leagueName === node.name;
        });
        if (!leagueEntry || leagueEntry.matchCount === 0) return null;
        const label = leagueLabelMap?.get(
          `${leagueEntry.regionId}:${leagueEntry.leagueId}`,
        );
        return {
          leagueEntry,
          regionName: label?.regionName ?? "International",
          leagueName: label?.leagueName ?? node.name,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [data, leagueEntries, leagueLabelMap]);

  const regionsWithEvents = useMemo(() => {
    const continents =
      data?.children?.filter((child) => child.type === "custom") ?? [];
    return continents
      .map((continent) => {
        const regions = (continent.children ?? [])
          .map((region) => {
            const leagues = leagueEntries.filter(
              (league) => league.regionId === region.id,
            );
            if (leagues.length === 0) return null;
            return { region, leagues };
          })
          .filter((item): item is NonNullable<typeof item> => item != null);
        if (regions.length === 0) return null;
        return { continent, regions };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [data, leagueEntries]);

  if (!data) {
    return (
      <div className="flex items-center justify-center w-full py-6 text-[12px] text-[var(--text-sub-color)]">
        No competitions available
      </div>
    );
  }

  if (popularWithEvents.length === 0 && regionsWithEvents.length === 0) {
    return (
      <div className="flex items-center justify-center w-full py-6 text-[12px] text-[var(--text-sub-color)]">
        No competitions available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="columns-1 md:columns-2 sm:columns-2 gap-4">
        {popularWithEvents.length > 0 && (
          <div className="mb-4 w-full rounded-lg">
            <p className="font-semibold uppercase text-sm mb-3">Popular</p>
            <div className="grid w-full grid-cols-2 gap-2">
              {popularWithEvents.map(
                ({ regionName, leagueName, leagueEntry }) => (
                  <a
                    href={sportsbookHashHref(
                      buildPrematchPath(
                        sport,
                        sportId,
                        regionName,
                        leagueEntry.regionId,
                        leagueName,
                        leagueEntry.leagueId,
                      ),
                    )}
                    key={leagueEntry.key}
                    className="p-2 rounded w-full bg-[var(--sub-element-secondary)] text-[13px]"
                  >
                    {leagueName}
                  </a>
                ),
              )}
            </div>
          </div>
        )}

        {regionsWithEvents.map(({ continent, regions }) => (
          <div
            key={continent.id}
            className="mb-4 break-inside-avoid p-4 rounded-lg bg-[var(--sub-element-secondary)]"
          >
            <p className="font-semibold text-sm border-b pb-2 mb-3">
              {continent.name}
            </p>
            <div className="flex flex-col gap-2">
              {regions.map(({ region, leagues }) => {
                const isOpen = openRegions[region.id];
                return (
                  <div key={region.id}>
                    <div className="flex justify-between w-full p-2 rounded text-sm">
                      <div className="flex items-center gap-2 cursor-pointer hover:font-bold">
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(
                            sport,
                          )}/${encodeURIComponent(region.name || "")}.webp`}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = `${getFlagIconFromregionName(
                              region.name || "",
                            )}`;
                            e.currentTarget.className = "rounded-full w-4 h-4";
                          }}
                          alt={region.name}
                        />
                        <a
                          href={sportsbookHashHref(
                            buildPrematchPath(
                              sport,
                              sportId,
                              region.name,
                              region.id,
                            ),
                          )}
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
                    {isOpen && (
                      <div className="ml-4 mt-1 flex flex-col gap-1">
                        {leagues.map((league) => {
                          const label =
                            leagueLabelMap?.get(
                              `${league.regionId}:${league.leagueId}`,
                            ) ?? null;
                          const leagueName =
                            label?.leagueName ?? String(league.leagueId);
                          const regionName = label?.regionName ?? region.name;
                          return (
                            <a
                              href={sportsbookHashHref(
                                buildPrematchPath(
                                  sport,
                                  sportId,
                                  regionName,
                                  league.regionId,
                                  leagueName,
                                  league.leagueId,
                                ),
                              )}
                              className="p-2 cursor-pointer hover:font-bold rounded text-[12px]"
                              key={league.key}
                            >
                              {leagueName}
                            </a>
                          );
                        })}
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
