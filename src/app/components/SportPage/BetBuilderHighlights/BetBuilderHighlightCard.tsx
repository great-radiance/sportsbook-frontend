/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import type { BetBuilderHighlightCardResponse } from "@/api/home/homeWidgets";
import {
  betBuilderHighlightOdds,
  betBuilderHighlightPickLine,
} from "@/helpers/widgetDisplayNames";
import { cachedTeamLogoUrl } from "@/state/teamlogosState";

type Props = {
  card: BetBuilderHighlightCardResponse;
  onAddToSlip: () => void;
};

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${days[d.getDay()]} ${mm}/${dd} ${hh}:${min}`;
}

function teamNames(card: BetBuilderHighlightCardResponse): [string, string] {
  const list = card.competitors ?? [];
  if (list.length >= 2) {
    return [list[0].name, list[1].name];
  }
  const parts = card.matchName.split(/\s*[-–]\s*/);
  if (parts.length >= 2) return [parts[0].trim(), parts[1].trim()];
  return [card.matchName, ""];
}

export const BetBuilderHighlightCard: FunctionComponent<Props> = ({
  card,
  onAddToSlip,
}) => {
  const odds = betBuilderHighlightOdds(card);
  const [home, away] = teamNames(card);
  const sportName = card.sport?.name ?? "";
  const picks = [...card.picks].sort((a, b) => a.slotIndex - b.slotIndex);
  const homeLogo = home ? cachedTeamLogoUrl(sportName, home) : null;
  const awayLogo = away ? cachedTeamLogoUrl(sportName, away) : null;

  return (
    <article class="bbh-card">
      <header class="bbh-card__header">
        <div class="bbh-card__brand">
          <span>BET+</span>
        </div>
        <time class="bbh-card__time">{formatKickoff(card.startTime)}</time>
      </header>

      <div class="bbh-card__body">
        <div class="bbh-card__league">{card.league.name}</div>

        {homeLogo && awayLogo ? (
          <div class="bbh-card__teams">
            <span class="bbh-card__team">{home}</span>
            {homeLogo ? (
              <img class="bbh-card__team-logo" src={homeLogo} alt="" />
            ) : null}
            {awayLogo ? (
              <img class="bbh-card__team-logo" src={awayLogo} alt="" />
            ) : null}
            <span class="bbh-card__team">{away}</span>
          </div>
        ) : (
          <div class="bbh-card__teams--text">{card.matchName}</div>
        )}

        <div class="bbh-card__picks">
          {picks.map((pick, idx) => (
            <div
              class="bbh-card__pick"
              key={`${card.cardId}-${pick.slotIndex}-${pick.selectionId}-${idx}`}
            >
              <div class="bbh-card__pick-rail">
                <span class="bbh-card__pick-dot" />
                <span class="bbh-card__pick-line" />
              </div>
              <span class="bbh-card__pick-text bbh-pick-clamp">
                {betBuilderHighlightPickLine(pick, card)}
              </span>
            </div>
          ))}
        </div>

        <button type="button" class="bbh-card__odds" onClick={onAddToSlip}>
          {odds.toFixed(2)}
        </button>
      </div>
    </article>
  );
};
