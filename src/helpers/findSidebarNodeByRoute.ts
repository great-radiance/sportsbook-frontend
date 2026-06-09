import type { MarketInfoType, sidebarNode } from "@/api/sidebar/apiGetSidebar";

const k = (...parts: (string | number)[]): string => {
  return parts.map(String).join("-");
};

const nodeLabel = (node: sidebarNode, lang: string): string =>
  (node.name || "").trim();

export const getRegionId = (node: sidebarNode): string => {
  if (node.type === "region") return String(node.regionId ?? "");
  if (node.type === "combined_region") return k(...(node.regionIds ?? []));
  return "";
};

export const getLeagueId = (node: sidebarNode): string => {
  if (node.type === "league") return String(node.leagueId ?? "");
  if (node.type === "combined_league") return k(...(node.leagueIds ?? []));
  return "";
};

export const isWorldCupNode = (node: sidebarNode, lang: string): boolean =>
  nodeLabel(node, lang).toLowerCase() === "world cup";

export const buildLeagueSelectValue = (
  regionName: string,
  regionId: string,
  leagueName: string,
  leagueId: string,
): string =>
  [regionName, regionId, leagueName, leagueId]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");

export type LeagueSelectLeague = {
  key: string;
  label: string;
  value: string;
  icon?: string;
};

export type LeagueSelectEntry =
  | {
      kind: "standalone";
      key: string;
      label: string;
      value: string;
      icon?: string;
    }
  | {
      kind: "region";
      key: string;
      regionLabel: string;
      regionValue: string;
      icon?: string;
      leagues: LeagueSelectLeague[];
    };

const findLeagueNodeInTree = (
  nodes: sidebarNode[] | undefined,
  predicate: (node: sidebarNode) => boolean,
): sidebarNode | undefined => {
  if (!nodes?.length) return undefined;

  for (const node of nodes) {
    if (node.type === "custom_region") {
      const found = findLeagueNodeInTree(node.children, predicate);
      if (found) return found;
      continue;
    }

    if (predicate(node)) return node;

    if (node.type === "region" || node.type === "combined_region") {
      const found = findLeagueNodeInTree(node.children, predicate);
      if (found) return found;
    }
  }

  return undefined;
};

const isLeagueNode = (node: sidebarNode): boolean =>
  node.type === "league" || node.type === "combined_league";

const toStandaloneEntry = (
  node: sidebarNode,
  lang: string,
): LeagueSelectEntry => {
  const leagueName = nodeLabel(node, lang);
  const leagueId = getLeagueId(node);
  const regionName = node.region?.name?.trim() || "";
  const regionId = node.region?.id != null ? String(node.region.id) : "";

  return {
    kind: "standalone",
    key: node.id,
    label: leagueName,
    value: buildLeagueSelectValue(regionName, regionId, leagueName, leagueId),
  };
};

const buildRegionValue = (regionLabel: string, regionId: string): string =>
  buildLeagueSelectValue(regionLabel, regionId, "", "");

export const collectLeagueSelectEntries = (
  sportNode: sidebarNode | undefined,
  lang: string,
  getRegionIcon?: (regionName: string) => string,
): LeagueSelectEntry[] => {
  if (!sportNode?.children?.length) return [];

  const entries: LeagueSelectEntry[] = [];

  const walk = (nodes: sidebarNode[]) => {
    for (const node of nodes) {
      if (node.type === "custom_region") {
        walk(node.children ?? []);
        continue;
      }

      if (isLeagueNode(node)) {
        if (isWorldCupNode(node, lang)) {
          const standalone = toStandaloneEntry(node, lang);
          entries.push({
            ...standalone,
            icon: getRegionIcon?.("International"),
          });
        }
        continue;
      }

      if (node.type === "region" || node.type === "combined_region") {
        const regionLabel = nodeLabel(node, lang);
        const regionId = getRegionId(node);
        const regionIcon = getRegionIcon?.(regionLabel);
        const leagues = (node.children ?? [])
          .filter(isLeagueNode)
          .map((league) => {
            const leagueName = nodeLabel(league, lang);
            const leagueId = getLeagueId(league);
            return {
              key: league.id,
              label: leagueName,
              value: buildLeagueSelectValue(
                regionLabel,
                regionId,
                leagueName,
                leagueId,
              ),
              icon: regionIcon,
            };
          })
          .filter((league) => league.label && league.value);

        if (leagues.length > 0) {
          entries.push({
            kind: "region",
            key: node.id,
            regionLabel,
            regionValue: buildRegionValue(regionLabel, regionId),
            icon: regionIcon,
            leagues,
          });
        }
      }
    }
  };

  walk(sportNode.children);
  return entries;
};

const matchesRegion = (node: sidebarNode, regionIdParam: string): boolean => {
  if (node.type === "region") {
    return node.regionId === Number(regionIdParam);
  }
  if (node.type === "combined_region") {
    return k(...(node.regionIds ?? [])) === regionIdParam;
  }
  return false;
};

const matchesLeague = (node: sidebarNode, leagueIdParam: string): boolean => {
  if (node.type === "league") {
    return node.leagueId === Number(leagueIdParam);
  }
  if (node.type === "combined_league") {
    return k(...(node.leagueIds ?? [])) === leagueIdParam;
  }
  return false;
};

export const findRegionNode = (
  nodes: sidebarNode[] | undefined,
  regionIdParam: string,
): sidebarNode | undefined => {
  if (!nodes?.length || !regionIdParam) return undefined;

  for (const node of nodes) {
    if (node.type === "custom_region") {
      const found = findRegionNode(node.children, regionIdParam);
      if (found) return found;
      continue;
    }

    if (matchesRegion(node, regionIdParam)) {
      return node;
    }
  }

  return undefined;
};

export const findLeagueInRegion = (
  regionNode: sidebarNode,
  leagueIdParam: string,
): sidebarNode | undefined => {
  if (!leagueIdParam) return undefined;

  return regionNode.children?.find(
    (child) =>
      (child.type === "league" || child.type === "combined_league") &&
      matchesLeague(child, leagueIdParam),
  );
};

export const findSportNode = (
  nodes: sidebarNode[],
  sportIdParam: string,
): sidebarNode | undefined => {
  const sportId = Number(sportIdParam);
  return nodes.find((node) => {
    if (node.type === "combined_sport") return sportId === 0;
    return node.sportId === sportId;
  });
};

export const getSportMarkets = (
  nodes: sidebarNode[],
  sportId: number,
): MarketInfoType[] => findSportNode(nodes, String(sportId))?.markets ?? [];

export const findLeagueNodeByRoute = (
  sports: sidebarNode[],
  sportIdParam: string,
  regionName: string | undefined,
  regionIdParam: string,
  leagueName: string | undefined,
  leagueIdParam: string,
  lang: string,
): sidebarNode | undefined => {
  const sportNode = findSportNode(sports, sportIdParam);
  if (!sportNode) return undefined;

  if (leagueIdParam && regionIdParam) {
    const regionNode = findRegionNode(sportNode.children, regionIdParam);
    if (regionNode) {
      return findLeagueInRegion(regionNode, leagueIdParam);
    }
  }

  if (regionName && regionIdParam && !leagueIdParam) {
    const leagueNameKey = regionName.trim().toLowerCase();
    return findLeagueNodeInTree(
      sportNode.children,
      (node) =>
        isLeagueNode(node) &&
        nodeLabel(node, lang).toLowerCase() === leagueNameKey &&
        getLeagueId(node) === regionIdParam,
    );
  }

  if (leagueName && leagueIdParam && !regionIdParam) {
    const leagueNameKey = leagueName.trim().toLowerCase();
    return findLeagueNodeInTree(
      sportNode.children,
      (node) =>
        isLeagueNode(node) &&
        nodeLabel(node, lang).toLowerCase() === leagueNameKey &&
        getLeagueId(node) === leagueIdParam,
    );
  }

  return undefined;
};
