# Bet History API — Backend Spec for `BetComponent`

**Endpoint:** `GET /bets/history`  
**Headers:** `x-user-id`, `x-operator-id`, `x-currency`  
**Goal:** Each item in `data[]` must be enough to render the full bet card (`BetComponent`) and cashout button/dialog **without** calling `GET /bets/:betId` per bet.

---

## Current response (what we receive today)

```json
{
  "betId": "6a0b1c25b97e716459e55a55",
  "betType": "single",
  "stakeAmount": 1,
  "potentialPayout": 7.8,
  "actualPayout": null,
  "status": "accepted",
  "currency": "TRY",
  "combinedOdds": 7.8,
  "createdAt": "2026-05-18T14:03:17.184Z",
  "settledAt": null,
  "selectionCount": 1,
  "firstEventName": "",
  "sportName": "",
  "leagueName": "",
  "shortResult": "Pending"
}
```

**Problem:** Empty `firstEventName` / `sportName` / `leagueName`, no selections, no cashout. Frontend currently calls **`GET /bets/:betId` once per row** to show stake, odds, legs, and cashout amount (N+1 requests).

---

## What is missing (delta)

| Field | Why |
|-------|-----|
| `selections[]` | Match, league, market, pick, start/current odds in expandable **Bet details** |
| `selections[].eventSnapshot` | Event name (`"Home vs Away"`), sport, competition — snapshots frozen at placement |
| `selections[].marketSnapshot` | Market name |
| `selections[].selectionSnapshot` | Selection / pick name |
| `selections[].oddsAtPlacement` | Start odds per leg |
| `selections[].currentOdds` | Live odds per leg (use placement odds if unchanged) |
| `cashout.availableAmount` | Amount on cashout button |
| `cashout.canCashout` | Enable/disable cashout (`accepted` + amount > 0) |
| `remainingStake` | Stake left after partial cashout (default = `stakeAmount`) |

Optional but useful: `acceptedAt`, `cashoutAt`, `totalCashedOutAmount`, `cashout.updatedAt`.

Keep `shortResult` / `firstEventName` / `sportName` / `leagueName` only as **optional summary** fields — they must **not** replace `selections[]`.

---

## Target TypeScript shape (each `data[]` item)

```typescript
type BetHistoryItem = {
  betId: string;
  betType: "single" | "parlay";
  stakeAmount: number;
  potentialPayout: number;
  actualPayout: number | null;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "won"
    | "lost"
    | "voided"
    | "cashed_out"
    | "partially_cashed_out"
    | "cancelled";
  currency: string;
  combinedOdds: number;
  createdAt: string;
  settledAt: string | null;

  remainingStake: number;
  acceptedAt?: string | null;
  cashoutAt?: string | null;
  totalCashedOutAmount?: number | null;

  selections: {
    selectionId: number;
    eventId: number;
    marketId: number;
    status: string;
    oddsAtPlacement: number;
    currentOdds: number;
    eventSnapshot: {
      id: number;
      name: string;
      sport: { id: number; name: string };
      competition: { id: number; name: string };
    };
    marketSnapshot: { id: number; name: string };
    selectionSnapshot: { id: number; name: string; odds?: number };
  }[];

  cashout: {
    availableAmount: number;
    canCashout: boolean;
    updatedAt?: string;
  };

  /** Optional summary — not sufficient alone */
  selectionCount?: number;
  firstEventName?: string;
  sportName?: string;
  leagueName?: string;
  shortResult?: string;
};
```

**List envelope (unchanged):**

```typescript
{
  total: number;
  page: number;
  limit: number;
  data: BetHistoryItem[];
}
```

Align `selections` + snapshots with existing **`GET /bets/:betId`** detail (integration guide). History row = same bet object + `cashout` block.

---

## Status → UI

| Backend `status` | UI label | Cashout button |
|------------------|----------|----------------|
| `accepted` | Pending | Show if `cashout.canCashout` |
| `pending` | Pending | Usually hidden until accepted |
| `won` / `lost` / `voided` / `cancelled` | Same | Hidden |
| `cashed_out` | Cashed out | Hidden |
| `partially_cashed_out` | Partially cashed out | Show if `canCashout` |

Frontend maps `accepted` → display **Pending** for open bets.

---

## Example — complete row for the sample bet

Replace empty summary fields with real `selections` + `cashout`:

```json
{
  "betId": "6a0b1c25b97e716459e55a55",
  "betType": "single",
  "stakeAmount": 1,
  "potentialPayout": 7.8,
  "actualPayout": null,
  "status": "accepted",
  "currency": "TRY",
  "combinedOdds": 7.8,
  "createdAt": "2026-05-18T14:03:17.184Z",
  "settledAt": null,
  "remainingStake": 1,
  "acceptedAt": "2026-05-18T14:03:17.200Z",
  "cashoutAt": null,
  "totalCashedOutAmount": null,
  "selectionCount": 1,
  "firstEventName": "Galatasaray vs Fenerbahce",
  "sportName": "soccer",
  "leagueName": "Super Lig",
  "shortResult": "Pending",
  "selections": [
    {
      "selectionId": 10234,
      "eventId": 5001,
      "marketId": 1,
      "status": "pending",
      "oddsAtPlacement": 7.8,
      "currentOdds": 7.5,
      "eventSnapshot": {
        "id": 5001,
        "name": "Galatasaray vs Fenerbahce",
        "sport": { "id": 1, "name": "soccer" },
        "competition": { "id": 100, "name": "Super Lig" }
      },
      "marketSnapshot": { "id": 1, "name": "Match Result" },
      "selectionSnapshot": { "id": 10234, "name": "Galatasaray", "odds": 7.8 }
    }
  ],
  "cashout": {
    "availableAmount": 0.95,
    "canCashout": true,
    "updatedAt": "2026-05-18T14:10:00.000Z"
  }
}
```

**Parlay:** `betType: "parlay"`, multiple `selections`, `combinedOdds` = combined price.

**Settled / no cashout:**

```json
"cashout": { "availableAmount": 0, "canCashout": false }
```

---

## UI field mapping (frontend)

| API | `BetComponent` usage |
|-----|----------------------|
| `createdAt` | Placed date/time |
| `combinedOdds` | Decimal odds |
| `stakeAmount` | Stake |
| `stakeAmount * combinedOdds` or `potentialPayout` | Possible win |
| `parlay` | Shown as “Multiple” |
| `selections[]` | Expandable legs |
| `oddsAtPlacement` | Start odds |
| `currentOdds` | Current odds |
| `cashout.availableAmount` | Cashout button value |
| `cashout.canCashout` | Button enabled |
| `actualPayout` / `totalCashedOutAmount` | Outcome when settled |

---

## Acceptance criteria

1. `GET /bets/history?limit=10&status=accepted` returns items that render full bet cards with **zero** `GET /bets/:betId` calls.
2. Every open bet has non-empty `selections` with snapshots (no empty `firstEventName` only).
3. Open bets include `cashout` with live `availableAmount` (or `0` + `canCashout: false`).
4. `eventSnapshot` / `marketSnapshot` / `selectionSnapshot` are frozen at placement time.
5. `GET /bets/:betId` may remain for drill-down; history must use the **same** bet + selections shape.

---

## Query params (unchanged)

| Param | Notes |
|-------|--------|
| `page`, `limit`, `sort` | `newest` \| `oldest` |
| `status` | Comma-separated, e.g. `accepted,pending` (open), `won,lost,voided,cashed_out,cancelled` (settled) |
| `betType`, `from`, `to`, `sportId`, `leagueId` | Optional filters |

---

## Live cashout updates (optional)

History can snapshot cashout at request time. For changing amounts on open bets:

- Refresh history periodically, or
- Push updates via Odds88 cashout feed after `POST /odds88/cashout/subscribe`.

Include `cashout.updatedAt` when the offer was last calculated.
