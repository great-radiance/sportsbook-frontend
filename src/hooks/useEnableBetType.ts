import { groupSelectedOddsIntoLegs, slipLegCount } from "@/helpers/betslipLegs";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

const { selectedOdds } = sportsbookStore;

export const useEnableBetType = () => {
  const legs = groupSelectedOddsIntoLegs(selectedOdds.value);
  const legCount = slipLegCount(selectedOdds.value);

  const regularLegs = legs.filter((leg) => leg.type === "regular");
  const systemOdds = regularLegs
    .map((leg) => (leg.type === "regular" ? leg.selection : null))
    .filter((sel): sel is NonNullable<typeof sel> => !!sel && !sel.selectedBank);

  const systemOddsBySport = systemOdds.reduce(
    (acc, odd) => {
      if (!acc[odd.sportSlug]) acc[odd.sportSlug] = [];
      acc[odd.sportSlug].push(odd);
      return acc;
    },
    {} as Record<string, typeof systemOdds>,
  );

  let multiBetEnabled = legCount > 1;
  let systemBetEnabled = legCount > 2 && legs.every((leg) => leg.type === "regular");

  if (systemOdds.length > 2) {
    for (const sportSlug in systemOddsBySport) {
      if (systemOddsBySport[sportSlug].length > 2) {
        systemBetEnabled = false;
        break;
      }
    }
  } else {
    systemBetEnabled = false;
  }

  return {
    multiBetEnabled,
    systemBetEnabled,
  };
};
