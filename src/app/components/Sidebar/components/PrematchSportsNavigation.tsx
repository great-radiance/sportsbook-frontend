import { orderConfigState } from "@/state/orderConfigState";
import { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useTranslate } from "@/shared/i18n/i18n";
import { translationState } from "@/state/translationState";
import { baseColorTheme } from "@/state/baseColorTheme";
import { stoiximanSidebarState } from "@/state/stoiximanSidebarState";
import { summarySports } from "@/state/summarySports";
import { tStoiximanSidebarItem } from "@/api/sidebar/apiGetStoiximanSidebar";

function buildPrematchPath(...parts: string[]): string {
  const cleaned = parts.map((p) => p.trim()).filter(Boolean);
  if (cleaned.length === 0) return "/event-view/pre-match";
  return `/event-view/pre-match/${cleaned.join("/")}`;
}

function sortChildren(items: tStoiximanSidebarItem[] | undefined) {
  if (!items?.length) return [];
  return [...items].sort((a, b) => a.order - b.order);
}

function parseOriginTriple(origin: string): {
  sport: string;
  region: string;
  league: string;
} | null {
  const i1 = origin.indexOf(":");
  if (i1 === -1) return null;
  const i2 = origin.indexOf(":", i1 + 1);
  if (i2 === -1) return null;
  return {
    sport: origin.slice(0, i1).trim(),
    region: origin.slice(i1 + 1, i2).trim(),
    league: origin.slice(i2 + 1).trim(),
  };
}

function sportHasSummaryData(item: tStoiximanSidebarItem): boolean {
  if (item.type !== "sport") return true;
  const key = item.name.trim();
  const data = summarySports.value.data?.[key];
  if (data && Object.keys(data).length > 0) return true;
  const total = summarySports.value.counts?.[key]?.total;
  return typeof total === "number" && total > 0;
}

function regionHasSummaryData(
  item: tStoiximanSidebarItem,
  sportCtx: string | null,
): boolean {
  if (item.type !== "region") return true;
  if (!sportCtx) return false;
  const regionKey = (item.origin?.trim() || item.name).trim();
  const regionData = summarySports.value.data?.[sportCtx]?.[regionKey];
  if (regionData && Object.keys(regionData).length > 0) return true;
  const total =
    summarySports.value.counts?.[sportCtx]?.regions?.[regionKey]?.total;
  return typeof total === "number" && total > 0;
}

function leagueHasSummaryData(
  item: tStoiximanSidebarItem,
  sportCtx: string | null,
): boolean {
  if (item.type !== "league") return true;

  const triple = item.origin ? parseOriginTriple(item.origin) : null;
  if (triple) {
    const { sport, region, league } = triple;
    const leagueData = summarySports.value.data?.[sport]?.[region]?.[league];
    if (leagueData && Object.keys(leagueData).length > 0) return true;
    const count =
      summarySports.value.counts?.[sport]?.regions?.[region]?.leagues?.[league];
    return typeof count === "number" && count > 0;
  }

  if (sportCtx && item.name) {
    const sportData = summarySports.value.data?.[sportCtx];
    if (!sportData) return false;
    for (const region of Object.keys(sportData)) {
      const leagueObj = sportData[region]?.[item.name];
      if (leagueObj && Object.keys(leagueObj).length > 0) return true;
    }
  }
  return false;
}

function itemHasSummaryData(
  item: tStoiximanSidebarItem,
  sportCtx: string | null,
): boolean {
  if (!sportHasSummaryData(item)) return false;
  if (!regionHasSummaryData(item, sportCtx)) return false;
  if (!leagueHasSummaryData(item, sportCtx)) return false;
  return true;
}

function getItemHref(
  item: tStoiximanSidebarItem,
  sportCtx: string | null,
): string | null {
  if (item.type === "sport" && item.name) {
    return `/event-view/sport/${encodeURIComponent(item.name.trim())}`;
  }

  if (item.origin) {
    const triple = parseOriginTriple(item.origin);
    if (triple) {
      return buildPrematchPath(triple.sport, triple.region, triple.league);
    }
    const one = item.origin.trim();
    if (item.type === "region" && sportCtx) {
      return buildPrematchPath(sportCtx, one);
    }
    return buildPrematchPath(one);
  }
  if (!item.children?.length && item.name) {
    if (sportCtx) {
      return buildPrematchPath(sportCtx, item.name);
    }
    return buildPrematchPath(item.name);
  }
  return null;
}

function hrefMatchesRoute(
  href: string,
  sportName: string,
  regionName: string,
  leagueName: string,
): boolean {
  const prefix = "/event-view/pre-match/";
  if (!href.startsWith(prefix)) return false;
  const rest = href.slice(prefix.length);
  if (!rest) return false;
  const parts = rest.split("/");
  const [sp, rg, lg] = parts;
  if (sportName !== sp) return false;
  if (regionName && regionName !== rg) return false;
  if (leagueName && leagueName !== lg) return false;
  return true;
}

function collectExpandedIdsForRoute(
  nodes: tStoiximanSidebarItem[],
  sportName: string,
  regionName: string,
  leagueName: string,
): Set<string> {
  const ids = new Set<string>();
  const walk = (
    items: tStoiximanSidebarItem[],
    ctx: string | null,
  ): boolean => {
    let found = false;
    for (const item of sortChildren(items)) {
      const childCtx = item.parent === 0 ? item.name.trim() : ctx;
      const href = getItemHref(item, ctx);
      const selfMatch =
        !!sportName &&
        !!href &&
        hrefMatchesRoute(href, sportName, regionName, leagueName);
      let childFound = false;
      if (item.children?.length) {
        childFound = walk(item.children, childCtx);
      }
      if (selfMatch || childFound) {
        ids.add(`n-${item.id}`);
        found = true;
      }
    }
    return found;
  };
  walk(nodes, null);
  return ids;
}

interface TreeRowsProps {
  items: tStoiximanSidebarItem[];
  depth: number;
  sportCtx: string | null;
  expandedIds: Set<string>;
  toggleNode: (id: string) => void;
  sportName: string;
  regionName: string;
  leagueName: string;
  setLocation: (path: string) => void;
  baseTheme: string;
}

const TreeRows: FunctionComponent<TreeRowsProps> = ({
  items,
  depth,
  sportCtx,
  expandedIds,
  toggleNode,
  sportName,
  regionName,
  leagueName,
  setLocation,
  baseTheme,
}) => {
  return (
    <>
      {sortChildren(items).map((item) => {
        const childSportCtx = item.parent === 0 ? item.name.trim() : sportCtx;
        const href = getItemHref(item, sportCtx);
        const hasChildren = !!(item.children && item.children.length > 0);
        const idKey = `n-${item.id}`;
        const isExpanded = expandedIds.has(idKey);
        const label =
          translationState.value.translations[item.name] || item.name;
        const isActive =
          !!href && hrefMatchesRoute(href, sportName, regionName, leagueName);

        if (item.parent === 0) {
          if (orderConfigState.value[item.name]?.enabled === false) {
            return null;
          }
        }

        if (!itemHasSummaryData(item, sportCtx)) {
          return null;
        }

        const onRowClick = (e: MouseEvent) => {
          if (item.type === "sport" && href) {
            linkButtonOnClick(e, href, setLocation);
          } else if (hasChildren) {
            toggleNode(idKey);
          } else if (href) {
            linkButtonOnClick(e, href, setLocation);
          }
        };

        const showArrow = hasChildren;

        const labelTextClass =
          depth === 0
            ? "text-[14px]"
            : item.type === "league"
              ? "text-[12px]"
              : "text-[14px]";

        return (
          <div
            key={idKey}
            className="flex flex-col rounded-[4px]"
            style={
              item.parent === 0
                ? {
                    order:
                      orderConfigState.value[item.name]?.order ?? item.order,
                    display:
                      orderConfigState.value[item.name]?.enabled === false
                        ? "none"
                        : "flex",
                  }
                : { order: item.order }
            }
          >
            <button
              type="button"
              onClick={onRowClick}
              style={
                depth > 0
                  ? { paddingLeft: Math.min(10 + depth * 8, 36) }
                  : undefined
              }
              className={`flex justify-between gap-2 ${depth === 0 ? "items-center pl-1" : "items-start"} py-2 px-1 font-medium transition-colors md:hover:bg-white/10 md:hover:text-[var(--text-primary-color)] ${isActive ? "bg-[var(--selected-item-color)] text-[var(--text-primary-color)]" : ""}`}
            >
              <div
                className={`flex gap-[10px] flex-1 min-w-0 ${depth === 0 ? "items-center" : "items-start"}`}
              >
                {depth === 0 || item.type === "sport" ? (
                  <div className="w-[24px] h-full shrink-0">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${item.name}.png`}
                      onError={(e) => {
                        e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                      }}
                      className={`w-[24px] h-[24px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                      alt=""
                    />
                  </div>
                ) : depth === 0 ? (
                  <div className="w-[24px] shrink-0" aria-hidden />
                ) : null}
                <span
                  className={`hidden md:flex flex-1 text-left break-words whitespace-normal ${labelTextClass}`}
                >
                  {label}
                </span>
              </div>
              {showArrow ? (
                <img
                  className={`w-[24px] hidden md:flex rounded-[4px] h-[24px] transition-all shrink-0 ${depth === 0 ? "" : "mt-0.5"} ${
                    isExpanded ? "-rotate-90" : "rotate-90"
                  } ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                  alt=""
                  onClick={(e) => {
                    if (!hasChildren) return;
                    e.stopPropagation();
                    toggleNode(idKey);
                  }}
                />
              ) : null}
            </button>

            {hasChildren && isExpanded ? (
              <div className="hidden md:flex flex-col rounded-md bg-white/5 gap-0 md:gap-0 overflow-hidden">
                <TreeRows
                  items={item.children!}
                  depth={depth + 1}
                  sportCtx={childSportCtx}
                  expandedIds={expandedIds}
                  toggleNode={toggleNode}
                  sportName={sportName}
                  regionName={regionName}
                  leagueName={leagueName}
                  setLocation={setLocation}
                  baseTheme={baseTheme}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

export const PrematchSportsNavigation: FunctionComponent = () => {
  const { t: tCommon } = useTranslate("common");
  const { t: tAlt } = useTranslate("alt");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { sportName, regionName, leagueName } = useRouteParams();
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(true);
  const baseTheme = baseColorTheme.value;

  const toggleNode = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!sportName) return;
    const fromRoute = collectExpandedIdsForRoute(
      stoiximanSidebarState.value,
      sportName,
      regionName || "",
      leagueName || "",
    );
    setExpandedIds((prev) => new Set([...prev, ...fromRoute]));
  }, [sportName, regionName, leagueName]);

  return (
    <div className="flex flex-col w-full gap-2 md:gap-[2px] text-[var(--text-basic-color)] rounded-[4px]">
      <div className="w-full h-px bg-[var(--border-color)]" />
      <button
        type="button"
        className="hidden md:flex text-[14px] uppercase font-bold py-2 pl-2 pr-1 rounded-[4px] md:hover:bg-white/10 items-center justify-between"
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
      {isNavExpanded && stoiximanSidebarState.value.length === 0 ? (
        <div className="py-2 pl-1">{tCommon("noDataAvailable")}</div>
      ) : null}
      {isNavExpanded && stoiximanSidebarState.value.length > 0 ? (
        <TreeRows
          items={stoiximanSidebarState.value}
          depth={0}
          sportCtx={null}
          expandedIds={expandedIds}
          toggleNode={toggleNode}
          sportName={sportName || ""}
          regionName={regionName || ""}
          leagueName={leagueName || ""}
          setLocation={setLocation}
          baseTheme={baseTheme}
        />
      ) : null}
    </div>
  );
};
