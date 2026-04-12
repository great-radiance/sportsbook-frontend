import { useMemo } from "preact/hooks";
import { ID_TO_NAME } from "@/shared/utils/RegionCompetition";
import { ID_TO_REGION_NAME } from "@/shared/utils/Resion";

export const useRegionCompetition = () => {
  const getCompetitionNameById = useMemo(() => {
    return (id: number | string): string | undefined => {
      return ID_TO_NAME[String(id)];
    };
  }, []);

  const getRegionNameById = useMemo(() => {
    return (id: number | string): string | undefined => {
      return ID_TO_REGION_NAME[String(id)];
    };
  }, []);

  return { getCompetitionNameById, getRegionNameById };
};