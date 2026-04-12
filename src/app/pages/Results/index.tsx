import { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { isMobile } from "@/state/isMobile";
import DatePicker, { DatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { ComponentType } from "preact";
import { Select, SelectItem } from "@/app/components/Select";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { ResultMatch } from "@/app/pages/Results/components/ResultMatch";
import { useLocation } from "wouter-preact";
import { ResultMarketComponent } from "@/app/pages/Results/components/ResultMarketComponent";
import {
  ResultMatchesLoader,
  ResultMarketComponentLoader,
} from "@/app/components/Loading/ComponentLoader";
import { useTranslate } from "@/shared/i18n/i18n";
import { apiGetLeagues, tLeague } from "@/api/entities/apiGetLeagues";
import { apiGetSports, tSport } from "@/api/entities/apiGetSports";
import { apiGetUpcomingMatches } from "@/api/special-matches/apiGetUpcomingMatches";
import { apiGetResults } from "@/api/apiGetResults";
// react-datepicker is React-based; in Preact we cast it
const DatePickerComponent =
  DatePicker as unknown as ComponentType<DatePickerProps>;

const datePickerStyles = `
  .dp-wrapper {
    width: 100% !important;
  }
  .react-datepicker-wrapper {
    width: 100% !important;
  }
  .react-datepicker__input-container {
    width: 100% !important;
  }
`;

function CalendarIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Custom input that looks like your second image:
 * label, value, icon button on the right.
 *
 * NOTE: react-datepicker passes `onClick`, `value`, etc. to customInput.
 */
const DateField = (props: any) => {
  const {
    value,
    onClick,
    placeholder,
    disabled,
    label = "Start Date",
    required = true,
  } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left"
    >
      <div className="flex items-center justify-between w-full rounded-[6px] bg-[#4a4a4a] px-[12px] py-[10px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="flex flex-col">
          <div className="text-[11px] leading-[12px]">
            {label}
            {required ? " *" : ""}
          </div>
          <div className="mt-[6px] flex items-center justify-between">
            <div className="text-[14px] leading-[16px]">
              {value || placeholder || " "}
            </div>
          </div>
        </div>
        <span className="ml-[10px] inline-flex h-[28px] w-[28px] items-center justify-center rounded-[4px] bg-white/10">
          <CalendarIcon className="opacity-90" />
        </span>
      </div>
    </button>
  );
};

export const Results: FunctionComponent = () => {
  const { t } = useTranslate("results");
  const tabs = ["Live", "Finished"] as const;
  const [selectedTab, setSelectedTab] = useState<string>("Finished");
  const [, setLocation] = useLocation();
  const [matchesData, setMatchesData] = useState<any>(null);
  // Match your screenshot value: dd.MM.yyyy
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  // Sport and Competition selection
  const [selectedSport, setSelectedSport] = useState<string>("soccer");
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(
    null,
  );
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [resultsloading, setResultsLoading] = useState<boolean>(false);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(true);
  const [isExpandedFilter, setIsExpandedFilter] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(!isMobile.value);
  const [availableSports, setAvailableSports] = useState<tSport[]>([]);
  const [availableCompetitions, setAvailableCompetitions] = useState<tLeague[]>(
    [],
  );
  const { lang } = getAppConfig();
  useEffect(() => {
    (async () => {
      const res = await apiGetSports();
      setAvailableSports(res);
    })();
  }, []);

  const getStatus = (tab: string) => {
    if (tab === "Live") return "In progress";
    if (tab === "Finished") return "Finished";
    return tab;
  };

  const fetchMatchData = async () => {
    try {
      setMatchesLoading(true);
      const isToday = (date: Date): boolean => {
        const today = new Date();
        return (
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        );
      };

      let from: number | 0 = 0;
      let to: number | 0 = 0;

      if (startDate) {
        if (isToday(startDate)) {
          // Set to 00:00:00 of today
          const startOfToday = new Date(startDate);
          startOfToday.setHours(0, 0, 0, 0);
          from = startOfToday.getTime();
        } else {
          from = startDate.getTime();
        }
      }

      if (endDate) {
        if (isToday(endDate)) {
          // Set to 23:59:59.999 of today (or 24:00:00 which is start of next day)
          const endOfToday = new Date(endDate);
          endOfToday.setHours(23, 59, 59, 999);
          to = endOfToday.getTime();
        } else {
          to = endDate.getTime();
        }
      }
      const res = await apiGetUpcomingMatches(
        {
          from: from,
          to: to,
        },
        {
          sport: [selectedSport],
          includeLive: 1,
          // competition: selectedCompetition || "",
        },
      );
      const newMatches: any[] = [];
      // res?.forEach((sport) =>
      //   sport?.regions?.forEach((region) =>
      //     region?.leagues?.forEach((league) =>
      //       league?.matches?.forEach((match) => {
      //         if (
      //           region.regionSlug === "esoccer" ||
      //           region.regionSlug === "ebasketball"
      //         )
      //           return;
      //         newMatches.push({
      //           sport: sport.sport,
      //           sportSlug: sport.sportSlug,
      //           region: region.region,
      //           regionSlug: region.regionSlug,
      //           league: league.league,
      //           leagueSlug: league.leagueSlug,
      //           ...match,
      //         });
      //       }),
      //     ),
      //   ),
      // );
      setMatchesData(newMatches);
      newMatches.sort((a: any, b: any) => a.sport.id - b.sport.id);

      if (isMobile.value) {
        setSelectedMatch(null);
      } else {
        setSelectedMatch(newMatches[0]);
      }

      setResultsLoading(true);

      const fetchResult = async () => {
        if (newMatches?.[0]?.eventId) {
          const res2 = await apiGetResults(newMatches?.[0]?.eventId);
          if (isMobile.value) {
            setSelectedMatch(null);
          } else {
            setSelectedMatch(res2);
          }
        }
      };
      await fetchResult();
      setResultsLoading(false);
      if (isMobile.value) return;
      setLocation(`/results/${newMatches?.[0]?.eventId}`);
    } catch (error) {
      console.error("Error fetching match data:", error);
    } finally {
      setMatchesLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchData();
  }, [selectedTab]);

  useEffect(() => {
    if (!selectedSport) return;
    (async () => {
      const res = await apiGetLeagues(selectedSport[0]);
      setAvailableCompetitions(res);
    })();
  }, [selectedSport]);

  // Reset handler
  const handleReset = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setSelectedSport("soccer");
    setSelectedCompetition(null);
  };

  const handleClick = async (eventId: number) => {
    if (selectedMatch?.eventId === eventId || eventId === null) return;
    try {
      setShowResult(true);
      setResultsLoading(true);
      const res: any = await apiGetResults(eventId);
      setSelectedMatch(res);
      setLocation(`/results/${eventId}`);
    } catch (error) {
      console.error("Error fetching result:", error);
    } finally {
      setResultsLoading(false);
    }
  };

  return (
    <>
      <style>{datePickerStyles}</style>
      <div className="relative flex min-h-0 w-full flex-col px-[10px] pt-[15px] pb-[10px] max-h-[100vh]">
        {/* Tabs */}
        <div className="flex min-h-[34px] h-[34px] w-full rounded-[4px] overflow-hidden">
          {tabs.map((tab) => (
            <div
              key={`${tab}-tab`}
              onClick={() => {
                if (selectedTab === tab) return;
                setSelectedTab(tab);
              }}
              className={[
                "flex h-full w-full cursor-pointer items-center justify-center px-[5px] py-[2px] text-[12px]",
                selectedTab === tab
                  ? "bg-white/20  border-b-[1px] border-[var(--primary-color)]"
                  : "bg-white/10 ",
              ].join(" ")}
            >
              {tab === "Live" ? t("live") : t("finished")}
            </div>
          ))}
        </div>

        {/* Filter container */}
        {isMobile.value ? (
          <>
            <div className="mt-[10px] rounded-[4px] flex flex-col w-full bg-white/10">
              <button
                onClick={() => setIsExpandedFilter(!isExpandedFilter)}
                className="flex items-center justify-between px-4 py-[10px] rounded-[6px] transition-colors text-[14px] whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/filter.png`}
                    className="w-[20px] h-[20px]"
                  />
                  <span className="text-[14px]">{t("filter")}</span>
                </div>
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                  className={`w-[20px] h-[20px] transition-transform ${isExpandedFilter ? "-rotate-90" : "rotate-90"}`}
                />
              </button>
              <div className="flex w-[calc(100%-20px)] h-[1px] bg-[var(--background-color)] mx-auto" />
              {isExpandedFilter && (
                <div className="flex w-full flex-col p-[10px]">
                  {/* First Row: Date Pickers, Selectors, Reset Button */}
                  <div className="flex flex-col gap-[8px] items-center">
                    <div className="flex w-full gap-[10px]">
                      <DatePickerComponent
                        selected={startDate}
                        onChange={(d: Date | null) => setStartDate(d)}
                        dateFormat="dd.MM.yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        shouldCloseOnSelect
                        showPopperArrow={false}
                        customInput={
                          (<DateField label={t("startDate")} required />) as any
                        }
                        calendarClassName="dp-dark"
                        popperClassName="dp-popper"
                        wrapperClassName="dp-wrapper"
                        className="w-full"
                      />
                      <DatePickerComponent
                        selected={endDate}
                        onChange={(d: Date | null) => setEndDate(d)}
                        dateFormat="dd.MM.yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        shouldCloseOnSelect
                        showPopperArrow={false}
                        customInput={
                          (<DateField label={t("endDate")} required />) as any
                        }
                        calendarClassName="dp-dark"
                        popperClassName="dp-popper"
                        wrapperClassName="dp-wrapper"
                        className="w-full"
                      />
                    </div>

                    {/* Sport Selector */}
                    <Select
                      label={t("sport")}
                      value={selectedSport}
                      onSelect={(value: any) => {
                        setSelectedSport(value);
                        setSelectedCompetition(null);
                      }}
                      placeholder={t("selectSport")}
                      defaultSelected={null}
                      className="w-full"
                      classNames={{
                        trigger:
                          "bg-[#4a4a4a] px-[12px] rounded-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                        panel: "bg-[#4a4a4a] max-h-[300px] overflow-y-auto",
                        item: `px-3 py-2 ${!isMobile.value ? "hover:bg-white/10" : ""}`,
                      }}
                    >
                      {availableSports.map((sport) => (
                        <SelectItem key={sport.slug} value={sport.slug}>
                          {sport.translations[lang]}
                        </SelectItem>
                      ))}
                    </Select>

                    {/* Competition Selector */}
                    <Select
                      label={t("competition")}
                      value={selectedCompetition}
                      onSelect={(value: string | null) => {
                        setSelectedCompetition(value === null ? null : value);
                      }}
                      placeholder={t("all")}
                      defaultSelected={null}
                      className="w-full"
                      classNames={{
                        trigger:
                          "bg-[#4a4a4a] px-[12px] rounded-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                        panel: "bg-[#4a4a4a] max-h-[300px] overflow-y-auto",
                        item: `px-3 py-2 ${!isMobile.value ? "hover:bg-white/10" : ""}`,
                      }}
                    >
                      <SelectItem value={null}>{t("all")}</SelectItem>
                      {availableCompetitions.map((competition: tLeague) => (
                        <SelectItem
                          key={competition.slug}
                          value={competition.slug}
                        >
                          {competition.translations[lang]}
                        </SelectItem>
                      ))}
                    </Select>

                    {/* Reset Button */}
                    <button
                      onClick={handleReset}
                      className="flex w-full items-center justify-center px-4 py-[10px] rounded-[6px] border-[1px] border-white/60 transition-colors text-[14px] font-medium whitespace-nowrap h-full"
                    >
                      {t("reset")}
                    </button>
                  </div>

                  {/* Second Row: SHOW Button */}
                  <div className="flex justify-end mt-[10px]">
                    <button
                      className={`px-6 w-full py-[10px] rounded-[4px] bg-[var(--primary-color)] transition-colors  text-[14px] font-medium ${!isMobile.value ? "hover:bg-[var(--primary-color)]/90" : ""}`}
                      onClick={() => {
                        fetchMatchData();
                      }}
                    >
                      {t("show")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-[10px] flex w-full flex-col rounded-[4px] bg-white/15 p-[10px]">
            {/* First Row: Date Pickers, Selectors, Reset Button */}
            <div className="flex w-full gap-[5px] items-center">
              <DatePickerComponent
                selected={startDate}
                onChange={(d: Date | null) => setStartDate(d)}
                dateFormat="dd.MM.yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                shouldCloseOnSelect
                showPopperArrow={false}
                customInput={
                  (<DateField label={t("startDate")} required />) as any
                }
                calendarClassName="dp-dark"
                popperClassName="dp-popper"
                wrapperClassName="dp-wrapper"
                className="w-full"
              />
              <DatePickerComponent
                selected={endDate}
                onChange={(d: Date | null) => setEndDate(d)}
                dateFormat="dd.MM.yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                shouldCloseOnSelect
                showPopperArrow={false}
                customInput={
                  (<DateField label={t("endDate")} required />) as any
                }
                calendarClassName="dp-dark"
                popperClassName="dp-popper"
                wrapperClassName="dp-wrapper"
                className="w-full"
              />

              {/* Sport Selector */}
              <Select
                label={t("sport")}
                value={selectedSport}
                onSelect={(value: any) => {
                  setSelectedSport(value);
                  setSelectedCompetition(null);
                }}
                placeholder={t("selectSport")}
                defaultSelected={null}
                className="w-full"
                classNames={{
                  trigger:
                    "bg-[#4a4a4a] px-[12px] rounded-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                  panel: "bg-[#4a4a4a] max-h-[300px] overflow-y-auto",
                  item: "px-3 py-2 hover:bg-white/10",
                }}
              >
                {availableSports.map((sport) => (
                  <SelectItem key={sport.slug} value={sport.slug}>
                    {sport.translations[lang]}
                  </SelectItem>
                ))}
              </Select>

              {/* Competition Selector */}
              <Select
                label={t("competition")}
                value={selectedCompetition}
                onSelect={(value: string | null) => {
                  // value will be null when "All" is selected, or the competition ID when a specific competition is selected
                  setSelectedCompetition(value === null ? null : value);
                }}
                placeholder={t("all")}
                defaultSelected={null}
                className="w-full"
                classNames={{
                  trigger:
                    "bg-[#4a4a4a] px-[12px] rounded-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                  panel: "bg-[#4a4a4a] max-h-[300px] overflow-y-auto",
                  item: "px-3 py-2 hover:bg-white/10",
                }}
              >
                <SelectItem value={null}>{t("all")}</SelectItem>
                {availableCompetitions.map((competition: tLeague) => (
                  <SelectItem key={competition.slug} value={competition.slug}>
                    {competition.translations[lang]}
                  </SelectItem>
                ))}
              </Select>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="flex items-center justify-center px-4 py-[10px] rounded-[6px] border-[1px] border-white/60 transition-colors text-[14px] font-medium whitespace-nowrap h-full"
              >
                {t("reset")}
              </button>
            </div>

            {/* Second Row: SHOW Button */}
            <div className="flex justify-end mt-[10px]">
              <button
                className={`px-[200px] h-[36px] rounded-[4px] bg-[var(--primary-color)] transition-colors  text-[14px] font-medium ${!isMobile.value ? "hover:bg-[var(--primary-color)]/90" : ""}`}
                onClick={() => {
                  fetchMatchData();
                }}
              >
                {t("show")}
              </button>
            </div>
          </div>
        )}

        <div
          className={`flex  min-h-0 ${isMobile.value ? "flex-col w-full" : "w-[clac(50%)]"}`}
        >
          {matchesLoading ? (
            <>
              <ResultMatchesLoader matchesCount={5} />
              {!isMobile.value && (
                <ResultMarketComponentLoader marketsCount={6} />
              )}
            </>
          ) : matchesData?.length > 0 ? (
            <>
              <div className="flex flex-col w-full min-h-0 gap-[5px] py-2 overflow-y-auto scrollbar-none">
                {matchesData.map((match: any) => (
                  <ResultMatch
                    key={match.eventId}
                    matchData={match}
                    onClick={() => handleClick(match.eventId)}
                  />
                ))}
              </div>
              {showResult && (
                <div
                  className={`flex flex-col bg-[var(--background-color)] w-full min-h-full overflow-hidden overflow-y-auto scrollbar-none ${isMobile.value ? "absolute top-0 bottom-0 left-0 right-0 z-10" : ""}`}
                >
                  {resultsloading ? (
                    <ResultMarketComponentLoader marketsCount={6} />
                  ) : (
                    <ResultMarketComponent
                      match={selectedMatch}
                      onClick={() => setShowResult(false)}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex w-full h-[300px] items-center justify-center">
              <span className="text-[14px]">{t("noResults")}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
