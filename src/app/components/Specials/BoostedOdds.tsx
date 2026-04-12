import { FunctionComponent } from "preact";
import { useTranslate } from "@/shared/i18n/i18n";

export const BoostedOdds: FunctionComponent = () => {
  const { t } = useTranslate("specials");
  return (
    <div className="flex flex-col w-full p-2 h-[calc(50%)] overflow-y-auto gap-1 items-center justify-center">
      <h1>{t("comingSoon")}</h1>
    </div>
  );
};
