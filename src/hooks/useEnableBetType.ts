import { SelectedOddType } from "@/shared/utils/bet";
import { selectedOdds } from "@/state/betState";

export const useEnableBetType = () => {
  let multiBetEnabled = false;
  let systemBetEnabled = false;

  const nonBuildingOdds = selectedOdds.value.filter((bet) => !bet.isBuilding);
  const systemOdds = nonBuildingOdds.filter((bet) => !bet.selectedBank);
  const systemOddsBySport = systemOdds.reduce((acc, odd) => {
    if (!acc[odd.sportSlug]) {
      acc[odd.sportSlug] = [];
    }
    acc[odd.sportSlug].push(odd);
    return acc;
  }, {} as Record<string, SelectedOddType[]>);

  // Enable multiBet if there are more than one non-building odds
  if (nonBuildingOdds.length > 1) {
    multiBetEnabled = true;
  }

  // Enable systemBet if there are more than two system odds
  if (systemOdds.length > 2) {
    systemBetEnabled = true;
  }

  // Group non-building odds by eventId
  const groupedMultiOdds = nonBuildingOdds.reduce(
    (acc, odd) => {
      if (!acc[odd.eventId]) {
        acc[odd.eventId] = [];
      }
      acc[odd.eventId].push(odd);
      return acc;
    },
    {} as Record<string, SelectedOddType[]>,
  );

  // Group system odds by eventId
  const groupedSystemOdds = systemOdds.reduce(
    (acc, odd) => {
      if (!acc[odd.eventId]) {
        acc[odd.eventId] = [];
      }
      acc[odd.eventId].push(odd);
      return acc;
    },
    {} as Record<string, SelectedOddType[]>,
  );

  // Disable multiBet if any event has more than one odd
  for (const eventId in groupedMultiOdds) {
    if (groupedMultiOdds[eventId].length > 1) {
      multiBetEnabled = false;
      break; // Exit early if any event breaks the rule
    }
  }

  // Disable systemBet if any event has more than one odd
  for (const eventId in groupedSystemOdds) {
    if (groupedSystemOdds[eventId].length > 1) {
      systemBetEnabled = false;
      break; // Exit early if any event breaks the rule
    }
  }
  for (const sportSlug in systemOddsBySport) {
    if (systemOddsBySport[sportSlug].length > 2) {
      systemBetEnabled = false;
      break; // Exit early if any sport breaks the rule
    }
  }

  return {
    multiBetEnabled,
    systemBetEnabled,
  };
};