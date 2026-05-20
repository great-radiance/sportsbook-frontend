/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { setBetBuilderMode } from "@/helpers/setBetBuilderMode";
import { isBuilding, selectedOdds } from "@/state/betState";
import { useTranslate } from "@/shared/i18n/i18n";
import { isMobile } from "@/state/isMobile";

type BetBuilderSidebarToggleProps = {
  variant?: "prematch" | "live";
};

function BetBuilderIcon({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors ${
        active
          ? "bg-[var(--primary-color)]/15 ring-1 ring-[var(--primary-color)]/40"
          : "bg-black/10 ring-1 ring-black/10"
      }`}
      aria-hidden
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4L12 2.5z"
          fill="var(--primary-color)"
          fill-opacity="0.2"
          stroke="var(--primary-color)"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          d="M12 7.5l5.2 3v5l-5.2 3-5.2-3v-5l5.2-3z"
          fill="var(--primary-color)"
          fill-opacity="0.45"
          stroke="var(--primary-color)"
          stroke-width="1.25"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  );
}

function BetBuilderSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[48px] shrink-0 rounded-full border-2 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]/40 ${
        checked
          ? "border-[var(--primary-color)] bg-[var(--primary-color)]"
          : "border-[#9aa8bc] bg-[#c5d0de]"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.28)] transition-all duration-300 ${
          checked ? "left-[24px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

export const BetBuilderSidebarToggle: FunctionComponent<
  BetBuilderSidebarToggleProps
> = ({ variant = "prematch" }) => {
  const { t: tMarkets } = useTranslate("markets");
  const { t: tSidebar } = useTranslate("sidebar");
  const [active, setActive] = useState(isBuilding.value);
  const [pickCount, setPickCount] = useState(0);

  useSignalEffect(() => {
    setActive(isBuilding.value);
    setPickCount(selectedOdds.value.filter((o) => o.isBuilding).length);
  });

  const isLive = variant === "live";

  return (
    <div
      className={`mx-0.5 mb-2 overflow-hidden rounded-[10px] border transition-all duration-300 ${
        active
          ? "border-[var(--primary-color)]/50 bg-[var(--highlight-background)]"
          : isLive
            ? "border-white/12 bg-white/[0.06]"
            : "border-[var(--primary-border-color)]/50 bg-white/[0.06]"
      }`}
    >
      <div className="flex items-center gap-3 px-2.5 py-2.5">
        <BetBuilderIcon active={active} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div
            className={`flex items-center gap-1.5 ${
              isMobile.value ? "" : "flex-wrap"
            }`}
          >
            <span
              className={`text-[13px] font-semibold leading-tight ${
                active
                  ? "text-[var(--text-primary-color)]"
                  : "text-[var(--text-basic-color)]"
              }`}
            >
              {tMarkets("betBuilderShort")}
            </span>
            {active && pickCount > 0 ? (
              <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--primary-color)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {pickCount}
              </span>
            ) : null}
          </div>
          {!isMobile.value ? (
            <span className="text-[10px] leading-snug text-[var(--text-sub-color)] line-clamp-2">
              {tSidebar("betBuilderModeHint")}
            </span>
          ) : null}
        </div>
        <BetBuilderSwitch checked={active} onChange={setBetBuilderMode} />
      </div>
    </div>
  );
};
