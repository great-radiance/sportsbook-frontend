import { tMarket, tOdd, tParticipant } from "@/types/tEvent";
import { storeEvent } from "./storeEvent";
import {
  Clock,
  LiveStatus,
  Live,
  ScoreBoard,
  JerseyColors,
} from "@/shared/utils/types";
import { MatchDataResponse } from "@/api/matches/apiGetMatchData";

// export const convertAndStoreEvent = (res: MatchDataResponse[] | null) => {
//   const participantNames: Record<string, string[]> = {};
//   for (const [
//     id,
//     sport,
//     region,
//     league,
//     participants,
//     outright,
//     sportRadarId,
//     markets,
//     status,
//     startDate,
//     scoreBoard = null,
//     clock = null,
//     liveStatus = null,
//   ] of res ?? []) {
//     const participantsTemp: tParticipant[] = [];
//     for (const [name, home] of participants ?? []) {
//       participantsTemp.push({ name, home });
//     }

//     const marketsTemp: tMarket[] = [];
//     for (const [
//       marketId,
//       name,
//       odds,
//       status,
//       sort,
//       column,
//       groups,
//     ] of markets ?? []) {
//       const oddsTemp: tOdd[] = [];
//       for (const [
//         oddId,
//         value,
//         impliedOdd,
//         mv,
//         column,
//         status,
//         name,
//         sort,
//       ] of odds ?? []) {
//         oddsTemp.push({
//           id: oddId ?? "",
//           value: value ?? 0,
//           status: status ?? "",
//           mv: mv ?? 0,
//           impliedOdd: impliedOdd ?? null,
//           name: name ?? "",
//           column: column ?? 0,
//           sort: sort ?? 0,
//         });
//       }
//       marketsTemp.push({
//         id: marketId ?? "",
//         name: name ?? "",
//         status: status ?? "",
//         sort: sort ?? 0,
//         column: column ?? 0,
//         groups: groups ?? [],
//         odds: oddsTemp ?? [],
//       });
//     }
//     const liveTemp: Live | undefined = {
//       scoreBoard: scoreBoard as ScoreBoard,
//       clock: clock as Clock,
//       status: liveStatus as LiveStatus,
//       stats: null,
//       timeline: [],
//       jerseyColors: {} as JerseyColors,
//       incidents: [],
//     } as Live;

//     storeEvent({
//       id: id ?? 0,
//       sport: sport ?? "",
//       region: region ?? "",
//       league: league ?? "",
//       participants: participantsTemp ?? [],
//       outright: outright ?? false,
//       sportRadarId: sportRadarId ?? 0,
//       markets: marketsTemp ?? [],
//       status: status ?? "",
//       startDate: startDate ?? 0,
//       live: liveTemp ? liveTemp : undefined,
//     });
//     (participantsTemp ?? []).forEach((p) => {
//       if (p?.name) {
//         if (!participantNames[sport]) {
//           participantNames[sport] = [];
//         }
//         participantNames[sport].push(p.name);
//       }
//     });
//   }

//   if (
//     getAppConfig().lang !== "en" &&
//     Object.values(participantNames).flat().length > 0
//   ) {
//     getTranslate(Object.values(participantNames).flat());
//   }
//   for (const sport of Object.keys(participantNames)) {
//     if (participantNames[sport].length > 0) {
//       void getTeamlogosByArray(sport, participantNames[sport]);
//     }
//   }
// };
