import { FunctionComponent } from "preact";
import { isMobile } from "@/state/isMobile";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useTranslate } from "@/shared/i18n/i18n";
import { favoriteMatches } from "@/state/Favorite";
import { useEffect } from "preact/hooks";
import { isOpenedFavoritesDialog } from "@/state/isOpenedFavoriteDialog";

export const FavoritesBox: FunctionComponent = () => {
  const { t } = useTranslate("favorites");

  useEffect(() => {
    const favoriteMatchesData = window.localStorage.getItem("favoriteMatches");
    if (favoriteMatchesData) {
      favoriteMatches.value = JSON.parse(favoriteMatchesData);
    }
  }, []);

  return (
    <div className="flex flex-col w-full bg-[var(--sub-element-color)]">
      <div className="flex flex-col items-center justify-center w-full p-3 mb-[5px] bg-white/5 border-white/20 rounded-lg border-[1px] gap-[10px]">
        <div
          className={`flex ${
            isMobile.value ? "w-full" : "w-[288px]"
          } items-center justify-center `}
        >
          <h1 className="text-[16px] w-full font-normal">{t("myTeams")}</h1>
        </div>
        <div className="flex w-full items-center justify-center">
          <button
            className="flex w-full items-center justify-center h-9 px-5 rounded-full bg-white/15 blur-30"
            onClick={() => {
              isOpenedFavoritesDialog.value = true;
            }}
          >
            <img
              className="w-[14px] h-[14px] flex items-center justify-center"
              src={`${BASE_ASSET_PUBLIC_URL}/icons/goldenstar.png`}
            />
            <span className="text-[14px] font-normal pl-[10px]">
              {t("addFavorites")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
