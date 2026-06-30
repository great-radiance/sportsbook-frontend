/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useRef } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { useTranslate } from "@/shared/i18n/i18n";
import { useRouteParams } from "@/hooks/useRotueParams";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { getAppConfig, setAppConfig } from "@/shared/config/appConfig";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { openSportsbookSearchDialog } from "@/helpers/searchDialog";

export const TabList: FunctionComponent = () => {
  const {
    isMobile,
    isOpenedSidebar,
    isOpenedMyBet,
    showSearchState,
    baseColorTheme,
  } = useSportsbookStore();
  const [, setLocation] = useLocation();
  const baseTheme = baseColorTheme.value;
  const { t } = useTranslate("navigation");
  const { pageName } = useRouteParams();
  const settingsRef = useRef<HTMLDivElement>(null);

  const onClickLinkButton = (e: MouseEvent, path: string) => {
    e.stopPropagation();
    // Check if Control (Windows/Linux) or Cmd (Mac) is pressed
    if (e.ctrlKey || e.metaKey) {
      // Open in new tab with hash-based URL
      const fullUrl = `${window.location.origin}${window.location.pathname}#sportsbook=${path}`;
      window.open(fullUrl, "_blank");
    } else {
      // Normal navigation in same tab
      setLocation(path);
    }
  };

  const tabs = [
    { id: 1, label: t("sport"), key: "pre-match", route: "/event-view" },
    {
      id: 2,
      label: t("live-betting"),
      key: "live",
      route: "event-view/live",
    },
  ];

  const isActive = (key: string) => {
    if (isMobile.value && isOpenedMyBet.value) {
      return key === "my-bets";
    }
    if (isMobile.value && isOpenedSidebar.value) {
      return key === "menu";
    }
    if (pageName !== "live" && key === "pre-match") return true;
    return pageName === key;
  };

  const applyTheme = (nextTheme: "light" | "dark") => {
    const cfg = getAppConfig();
    setAppConfig({ ...cfg, baseTheme: nextTheme });
    baseColorTheme.value = nextTheme;

    const currentRoot = settingsRef.current?.getRootNode() as
      | ShadowRoot
      | Document;
    if (currentRoot instanceof ShadowRoot) {
      const mainLayout = currentRoot.querySelector("#sportsbook-main-layout");
      if (mainLayout) {
        mainLayout.setAttribute("data-theme", nextTheme);
      }
    } else {
      const mainLayout = document.querySelector("#sportsbook-main-layout");
      if (mainLayout) {
        mainLayout.setAttribute("data-theme", nextTheme);
      }
    }
  };

  return (
    <nav className="relative flex w-full min-h-[64px] items-center justify-around md:justify-center md:gap-10 px-4 bg-[var(--sub-element-secondary)]">
      {/* <img
          className="h-full items-center object-cover"
          src={`${BASE_ASSET_PUBLIC_URL}/logo/stoiximan-logo.png`}
          alt="Logo"
        /> */}
      {/* <span className="px-[54px]"/> */}
      <div className="flex flex-1 items-center md:gap-8 justify-around md:justify-center">
        {tabs.map((tab) => {
          const active = isActive(tab.key);
          return (
            <div
              key={tab.id}
              onClick={(e) => {
                onClickLinkButton(e, tab.route);
                if (isMobile.value) {
                  isOpenedSidebar.value = false;
                  isOpenedMyBet.value = false;
                }
              }}
              className={`relative h-full text-center text-[12px] text-[var(--text-basic-color)] uppercase font-medium transition-colors cursor-pointer
                ${active ? "font-bold" : ""}
              `}
            >
              {tab.label}
              {active && (
                <div className="absolute -bottom-[24px] left-0 right-0 h-[4px] rounded-t-[2px] bg-[var(--primary-color)]" />
              )}
            </div>
          );
        })}

        {/* </div> */}
        {/* <div className="flex items-center gap-4 justify-end"> */}
        <button
          className={`relative flex md:hidden h-full text-center text-[12px] text-[var(--text-basic-color)] uppercase ${isActive("my-bets") ? "font-bold" : ""} transition-colors cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            if (isMobile.value) {
              isOpenedSidebar.value = false;
              isOpenedMyBet.value = !isOpenedMyBet.value;
            }
          }}
        >
          {/* <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/column.png`}
              alt="menu"
              className="w-5 min-w-5 object-contain brightness-0 invert cursor-pointer"
            /> */}
          {t("my-bets")}
          {isActive("my-bets") && (
            <div className="absolute -bottom-[24px] left-0 right-0 h-[4px] rounded-t-[2px] bg-[var(--primary-color)]" />
          )}
        </button>
        <button
          className={`relative flex md:hidden h-full text-center text-[12px] text-[var(--text-basic-color)] uppercase ${isActive("menu") ? "font-bold" : ""} transition-colors cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            if (isMobile.value) {
              isOpenedMyBet.value = false;
              isOpenedSidebar.value = !isOpenedSidebar.value;
            }
          }}
        >
          {/* <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/menu.png`}
              alt="menu"
              className="w-5 min-w-5  object-contain invert cursor-pointer"
            /> */}
          {t("menu")}
          {isActive("menu") && (
            <div className="absolute -bottom-[24px] left-0 right-0 h-[4px] rounded-t-[2px] bg-[var(--primary-color)]" />
          )}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            aria-label="Toggle theme"
            title={
              baseTheme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            className="relative flex items-center w-[52px] h-[28px] rounded-full px-[3px] border border-[var(--border-color)] bg-[var(--sub-element-color)] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              applyTheme(baseTheme === "dark" ? "light" : "dark");
            }}
          >
            <span className="absolute left-[6px] text-[12px] leading-none">
              ☀️
            </span>
            <span className="absolute right-[6px] text-[12px] leading-none">
              🌙
            </span>
            <span
              className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-[var(--primary-color)] transition-all duration-200 ${baseTheme === "dark" ? "right-[3px]" : "left-[3px]"}`}
            />
          </button>
        </div>
        <button
          className={`flex items-center justify-end h-full pr-3 text-[12px] text-[var(--text-basic-color)] uppercase ${isActive("search") ? "font-bold" : ""} transition-colors cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            if (showSearchState.value) {
              showSearchState.value = false;
            } else {
              openSportsbookSearchDialog();
            }
          }}
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/search.png`}
            className={`min-w-5 search-icon min-h-5 w-5 h-5 brightness-0 ${baseTheme === "light" ? "" : "invert"} rounded-full`}
          />
        </button>
      </div>
    </nav>
  );
};
