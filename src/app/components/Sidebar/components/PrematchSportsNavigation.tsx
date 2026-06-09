import { Fragment, FunctionComponent } from "preact";
import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useTranslate } from "@/shared/i18n/i18n";
import { baseColorTheme } from "@/state/baseColorTheme";
import {
  summarySportsState,
  countsSummarySportsState,
} from "@/state/summarySports";
import { RACING_SPORT_IDS } from "@/helpers/isRacingSport";
import { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { buildPrematchPath } from "@/helpers/buildPrematchPath";

const k = (...parts: (string | number)[]): string => {
  return parts.map(String).join("-");
};

export const PrematchSportsNavigation: FunctionComponent = () => {
  const { t: tCommon } = useTranslate("common");
  const { t: tAlt } = useTranslate("alt");
  const baseTheme = baseColorTheme.value;
  const [, setLocation] = useLocation();
  const { sportIdParam, regionIdParam } = useRouteParams();

  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(true);
  const [expandedSports, setExpandedSports] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedCustomRegions, setExpandedCustomRegions] = useState<
    Set<string>
  >(() => new Set());
  const lang = getAppConfig().lang;

  useEffect(() => {
    const spId = Number(sportIdParam);
    if (Number.isFinite(spId) && spId > 0) {
      setExpandedSports((prev) => new Set([...prev, spId]));
    }
    const rgId = Number(regionIdParam);
    if (
      Number.isFinite(spId) &&
      spId > 0 &&
      Number.isFinite(rgId) &&
      rgId > 0
    ) {
      setExpandedRegions((prev) => new Set([...prev, k(spId, rgId)]));
    }
  }, [sportIdParam, regionIdParam]);

  const toggleSport = (sportId: number) => {
    setExpandedSports((prev) => {
      const next = new Set(prev);
      if (next.has(sportId)) next.delete(sportId);
      else next.add(sportId);
      return next;
    });
  };

  const toggleRegion = (sportId: number, regionId: number | string) => {
    const key = k(sportId, regionId);
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCustomRegion = (customRegionId: string) => {
    setExpandedCustomRegions((prev) => {
      const next = new Set(prev);
      if (next.has(customRegionId)) next.delete(customRegionId);
      else next.add(customRegionId);
      return next;
    });
  };

  const NodeComponent = (
    node: sidebarNode,
    sportName: string,
    sportId: number,
    isChild: boolean = false,
  ): JSX.Element | null => {
    if (node.type === "league" || node.type === "combined_league") {
      const leagueId =
        node.type === "league" ? node.leagueId : k(...(node.leagueIds ?? []));
      return (
        <button
          key={k("l", sportId, node?.region?.id ?? 0, leagueId || "")}
          type="button"
          onClick={(e) => {
            linkButtonOnClick(
              e,
              buildPrematchPath(
                sportName,
                sportId,
                node.region?.name,
                node.region?.id,
                node.name,
                leagueId || "",
              ),
              setLocation,
            );
          }}
          style={{ paddingLeft: isChild ? 30 : 18 }}
          className="flex justify-between gap-2 items-start py-[6px] pr-3 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)]"
        >
          <span className="flex flex-col text-left break-words whitespace-normal text-[11px]">
            {node.name}
            <span className="text-[10px]">{node.region?.name}</span>
          </span>
        </button>
      );
    } else if (
      node.type === "combined_region" ||
      node.type === "region" ||
      node.type === "sport"
    ) {
      const regionId =
        node.type === "combined_region"
          ? k(...(node.regionIds ?? []))
          : node.regionId || "";

      const path =
        node.type === "sport"
          ? `/event-view/pre-match/${sportName}/${sportId}/${node.name}/${node.sportId}`
          : node.children?.length && node.children?.length > 1
            ? buildPrematchPath(sportName, sportId, node.name, regionId || "")
            : buildPrematchPath(
                sportName,
                sportId,
                node.name,
                regionId || "",
                node.children?.[0]?.name,
                node.children?.[0]?.leagueId || "",
              );
      return (
        <button
          type="button"
          onClick={(e) => {
            linkButtonOnClick(e, path, setLocation);
          }}
          style={{ paddingLeft: isChild ? 30 : 18 }}
          className="flex justify-between gap-2 items-center py-[6px] pr-3 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)]"
        >
          <span className="flex flex-1 text-left break-words whitespace-normal text-[14px]">
            {node.name}
          </span>
        </button>
      );
    } else if (node.type === "custom_region") {
      const children = node.children;
      return (
        <Fragment key={node.id}>
          <button
            type="button"
            onClick={() => {
              toggleCustomRegion(node.id);
            }}
            style={{ paddingLeft: isChild ? 30 : 18 }}
            className="flex justify-between gap-2 items-center py-[6px]  pr-3 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)]"
          >
            <span className="flex flex-1 text-left break-words whitespace-normal text-[14px]">
              {node.name}
            </span>
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              className={`w-[26px] inline-block ml-1 transition-all duration-300 ${expandedCustomRegions.has(node.id) ? "-rotate-90" : "rotate-90"}`}
              alt={tAlt("arrowRight")}
            />
          </button>
          {expandedCustomRegions.has(node.id)
            ? children?.map((child) => (
                <Fragment key={child.id}>
                  {NodeComponent(child, sportName, sportId, true)}
                </Fragment>
              ))
            : null}
        </Fragment>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col w-full gap-2 md:gap-[2px] text-[var(--text-basic-color)] rounded-[4px]">
      <div className="w-full h-px bg-[var(--border-color)]" />
      <button
        type="button"
        className="flex text-[14px] uppercase font-bold py-2 pl-2 pr-1 rounded-[4px] md:hover:bg-white/10 items-center justify-between"
        onClick={() => setIsNavExpanded((prev) => !prev)}
        aria-expanded={isNavExpanded}
      >
        <span>{tCommon("sports")}</span>
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          className={`w-[26px] inline-block ml-1 transition-all duration-300 ${isNavExpanded ? "-rotate-90" : "rotate-90"}`}
          alt={tAlt("arrowRight")}
        />
      </button>

      {!isNavExpanded ? null : summarySportsState.value.length === 0 ? (
        <div className="py-2 pl-1">{tCommon("noDataAvailable")}</div>
      ) : (
        <div className="flex flex-col w-full gap-[2px] rounded-[4px]">
          {summarySportsState.value.map((sport) => {
            if (!sport) return null;
            if (sport.type === "featured_leagues") return null;
            const sportId =
              sport.type === "combined_sport" ? 0 : (sport.sportId ?? 0);

            const sportName = sport.name;
            const children = sport.children;

            const sportCount =
              countsSummarySportsState.value.preMatchCount.counts[sportId];

            // if (sportCount <= 0) return null;
            if (RACING_SPORT_IDS.has(sportId)) return null;

            const isSportExpanded = expandedSports.has(sportId);

            const path = `/event-view/pre-match/${sportName}/${sportId}`;

            return (
              <div
                key={k("s", sportId)}
                className="flex flex-col rounded-[4px]"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    // click = expand/collapse sport (and also navigate to sport level)
                    toggleSport(sportId);
                    linkButtonOnClick(e, path, setLocation);
                  }}
                  className="flex justify-between gap-2 items-center pl-1 py-2 px-1 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)]"
                >
                  <div className="flex gap-[10px] flex-1 min-w-0 items-center">
                    <div className="w-[24px] h-full shrink-0">
                      <img
                        className={`w-[24px] h-[24px] ${baseTheme === "dark" ? "invert" : ""}`}
                        alt=""
                        src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportId}.svg`}
                        onError={(ev) => {
                          ev.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                          ev.currentTarget.className = "w-[24px] h-[24px]";
                        }}
                      />
                    </div>
                    <span className="flex flex-1 text-left break-words whitespace-normal text-[14px]">
                      {sportName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] opacity-80">{sportCount}</span>
                    <img
                      className={`w-[24px] flex rounded-[4px] h-[24px] transition-all shrink-0 ${isSportExpanded ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                      src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                      alt=""
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleSport(sportId);
                      }}
                    />
                  </div>
                </button>

                {isSportExpanded ? (
                  <div className="flex flex-col rounded-md bg-white/5 gap-0 overflow-hidden">
                    {children?.map((node) => (
                      <Fragment key={node.id}>
                        {NodeComponent(node, sportName, sportId)}
                      </Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
