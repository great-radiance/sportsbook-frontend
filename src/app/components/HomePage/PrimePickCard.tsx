/** @jsxImportSource preact */

import type { BetBuilderHighlightCardResponse } from "@/api/home/apiGetHomeWidget";

import {
  betBuilderHighlightOdds,
  betBuilderHighlightPickLine,
} from "@/helpers/widgetDisplayNames";

import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";

import { useSportsbookStore } from "@/state/sportsbookStoreContext";

import { cachedTeamLogoUrl } from "@/state/sportsbookStoreHelpers";

type Props = {
  card: BetBuilderHighlightCardResponse;

  onAdd: () => void;

  compact?: boolean;
};

const formatKickoff = (iso: string) => {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const mm = String(d.getMonth() + 1).padStart(2, "0");

  const dd = String(d.getDate()).padStart(2, "0");

  const hh = String(d.getHours()).padStart(2, "0");

  const min = String(d.getMinutes()).padStart(2, "0");

  return `${days[d.getDay()]} ${dd}/${mm} ${hh}:${min}`;
};

export function PrimePickCard({ card, onAdd, compact }: Props) {
  const { baseColorTheme } = useSportsbookStore();
  const sportId = card.sport?.id ?? card.sportId;

  const sportName = card.sport?.name ?? "";

  const picks = [...card.picks].sort((a, b) => a.slotIndex - b.slotIndex);

  const odds = betBuilderHighlightOdds(card);

  const isDark = baseColorTheme.value === "dark";

  const home = card.competitors[0];

  const away = card.competitors[1];

  const homeLogo =
    home?.logo || `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`;

  const awayLogo =
    away?.logo || `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;

  return (
    <article class={`prime-card ${compact ? "prime-card--compact" : ""}`}>
      <header class="prime-card__header">
        <span class="prime-card__badge">Bet Builder</span>

        <div class="prime-card__meta">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sportId}.svg`}
            alt=""
            class={`prime-card__sport ${isDark ? "prime-card__sport--invert" : ""}`}
            onError={(e) => {
              e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
            }}
          />

          <time class="prime-card__time">{formatKickoff(card.startTime)}</time>
        </div>
      </header>

      <div class="prime-card__body">
        <p class="prime-card__league">{card.league.name}</p>

        {home && away ? (
          <div class="prime-card__teams">
            <span class="text-[12px] font-bold leading-tight text-end text-[var(--text-basic-color)]">
              {home.name}
            </span>

            <div class="prime-card__logos">
              {homeLogo ? (
                <img
                  src={homeLogo || ""}
                  alt=""
                  class="prime-card__logo"
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`;
                  }}
                />
              ) : null}

              {awayLogo ? (
                <img
                  src={awayLogo || ""}
                  alt=""
                  class="prime-card__logo"
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`;
                  }}
                />
              ) : null}
            </div>

            <span class="text-[12px] font-bold leading-tight text-start text-[var(--text-basic-color)]">
              {away.name}
            </span>
          </div>
        ) : (
          <p class="prime-card__match">{card.matchName}</p>
        )}

        <ul class="prime-card__picks">
          {picks.map((pick, idx) => (
            <li
              class="prime-card__pick"
              key={`${card.cardId}-${pick.selectionId}-${idx}`}
            >
              <span class="prime-card__pick-dot" aria-hidden="true" />

              <span class="prime-card__pick-text">
                {betBuilderHighlightPickLine(pick, card)}
              </span>
            </li>
          ))}
        </ul>

        <button type="button" class="prime-card__odds" onClick={onAdd}>
          Add to betslip · <strong>{odds.toFixed(2)}</strong>
        </button>
      </div>
    </article>
  );
}
