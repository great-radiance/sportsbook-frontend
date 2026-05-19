# Frontend Integration Guide

**Base URL:** `https://your-platform-domain.com/api/v1`  
**WebSocket:** `wss://your-platform-domain.com/ws`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Player Headers](#player-headers)
2. [Public Data](#public-data)
   - [Event Search](#event-search)
3. [Real-Time Odds (WebSocket)](#real-time-odds-websocket)
4. [Player Session](#player-session)
5. [Betting](#betting)
6. [My Bets](#my-bets)
7. [Cashout](#cashout)
8. [Bet Builder](#bet-builder)
9. [Home Widgets](#home-widgets)
   - [Star Players Widget](#star-players-widget)
   - [Trending Accas Widget](#trending-accas-widget)
   - [Mapping to Bet Placement](#mapping-to-bet-placement)
   - [Refresh & Caching Strategy](#refresh--caching-strategy)
   - [Odds Staleness Handling](#odds-staleness-handling)
10. [Player Analytics](#player-analytics)
11. [Errors](#errors)
12. [Quick Reference](#quick-reference)

---

## Player Headers

All player endpoints require these three headers. No login, no token.

```
x-user-id:     player_001
x-operator-id: a1b2c3d4e5f6g7h8
x-currency:    USD
```

| Header          | Required | Notes                                   |
| --------------- | -------- | --------------------------------------- |
| `x-user-id`     | YES      | Your internal player ID                 |
| `x-operator-id` | YES      | Your operator ID issued by the platform |
| `x-currency`    | NO       | Defaults to `USD`                       |

Missing a required header returns:

```
HTTP 400  { "error": "Missing x-user-id header" }
HTTP 400  { "error": "Missing x-operator-id header" }
```

> **Balance** is not served by the platform. Fetch it directly from your operator backend.

---

## Public Data

No headers needed for any of these.

### Sidebar

```
GET /sidebar
GET /sidebar?lang=en&status=1
```

Returns a compact navigation tree.

### Sports / Leagues / Regions / Markets

```
GET /sports
GET /sports/:id
GET /leagues?sportId=1&regionId=10
GET /leagues/:id
GET /regions
GET /regions/:id
GET /markets
```

### Events

```
GET /events?sportId=1&leagueId=101
GET /events/:eventId
```

| Param      | Description                   |
| ---------- | ----------------------------- |
| `sportId`  | Filter by sport               |
| `leagueId` | Filter by league              |
| `regionId` | Filter by region              |
| `status`   | Event status code             |
| `lang`     | Language for translated names |

**Response:**

```json
{
  "data": [
    {
      "eventId": 5001,
      "eventInfo": {
        "id":        5001,
        "name":      "Arsenal vs Chelsea",
        "status":    1,
        "startTime": "2026-05-18T15:00:00.000Z",
        "sport":       { "id": 1,   "name": "Soccer" },
        "competition": { "id": 101, "name": "Premier League" },
        "competitors": [
          { "id": 201, "name": "Arsenal", "type": "home" },
          { "id": 202, "name": "Chelsea", "type": "away" }
        ]
      },
      "markets": [...]
    }
  ]
}
```

### Event Search

Full-text search across events, teams, sports, leagues, and regions. Use this to power a search box or typeahead.

```
GET /events/search?q=arsenal
GET /events/search?q=manchester&from=2026-05-17T00:00:00Z&to=2026-05-18T23:59:59Z
GET /events/search?from=2026-05-18T00:00:00Z&to=2026-05-18T23:59:59Z
```

| Param  | Required | Description                                                                                            |
| ------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `q`    | NO       | Case-insensitive text — matched against event name, market name, sport, region, league, and team names |
| `from` | NO       | ISO 8601 — filter `eventInfo.startTime >=`                                                             |
| `to`   | NO       | ISO 8601 — filter `eventInfo.startTime <=`                                                             |

Omit `q` to use as a date-range-only filter. Omit both to return all events (same as `GET /events`).

Results are cached for **30 seconds**.

**Response (200):**

```json
{
  "source": "cache",
  "total": 2,
  "data": [
    {
      "eventId": 5001,
      "eventInfo": {
        "id":        5001,
        "name":      "Arsenal vs Chelsea",
        "status":    1,
        "startTime": "2026-05-18T15:00:00.000Z",
        "sport":       { "id": 1,   "name": "Soccer" },
        "competition": { "id": 101, "name": "Premier League" },
        "competitors": [
          { "id": 201, "name": "Arsenal", "type": "home" },
          { "id": 202, "name": "Chelsea", "type": "away" }
        ]
      },
      "markets": [...]
    }
  ]
}
```

**Typical usage — search box:**

```js
async function searchEvents(query) {
  if (query.length < 2) return [];
  const res = await fetch(
    `/api/v1/events/search?q=${encodeURIComponent(query)}`,
  );
  const { data } = await res.json();
  return data;
}
```

**Typical usage — today's events:**

```js
const today = new Date();
const from = new Date(today.setHours(0, 0, 0, 0)).toISOString();
const to = new Date(today.setHours(23, 59, 59, 999)).toISOString();

const { data } = await fetch(
  `/api/v1/events/search?from=${from}&to=${to}`,
).then((r) => r.json());
```

**Empty results:** Returns `data: []` and `total: 0` — never an error. Always render a "No events found" state.

---

### Odds (REST)

Use as a fallback when WebSocket is unavailable.

```
GET /odds?eventId=5001
GET /odds/:eventId
GET /odds88/events/array?sportId=1&leagueId=101&lang=en
```

---

## Real-Time Odds (WebSocket)

Connect once on page load. The platform sends a full snapshot immediately, then pushes deltas as odds change.

```
wss://your-platform-domain.com/ws/odds88/events
wss://your-platform-domain.com/ws/odds88/events?sportId=1
wss://your-platform-domain.com/ws/odds88/events?leagueId=204
```

### Message types

#### `snapshot` — full state, sent on connect

```json
{ "type": "snapshot", "data": [...] }
```

Render your entire odds board from this.

#### `delta` — incremental updates

```json
{ "type": "delta", "data": [ ...changes ] }
```

Each change in `data` has a `type` field:

| `type`               | What changed                             |
| -------------------- | ---------------------------------------- |
| `EventSnapshot`      | Full event replaced                      |
| `EventStatusChanged` | Event started, finished, suspended, etc. |
| `EventChanged`       | Name, start time, or score changed       |
| `ScoreboardChanged`  | Live score updated                       |
| `MarketsChanged`     | Odds changed on one or more markets      |
| `BetCancel`          | A selection was cancelled                |

#### `error` — feed failure

```json
{ "type": "error", "message": "Failed to load snapshot" }
```

Close the connection and reconnect with exponential back-off (start at 1s, max 30s). A fresh snapshot is sent automatically on every reconnect.

---

## Player Session

### On App Load

Call these in parallel when the player opens the sportsbook:

```
GET /users/me          → check who the player is and whether they can bet
GET /users/me/limits   → load stake limits for the bet slip
GET <your-balance-url> → fetch balance from YOUR operator backend directly
```

### Player Profile

```
GET /users/me
Headers: x-user-id, x-operator-id
```

**Success (200):**

```json
{
  "data": {
    "playerId": "player_001",
    "operatorId": "a1b2c3d4e5f6g7h8",
    "username": "john_doe",
    "email": "john@example.com",
    "status": "active",
    "currency": "USD",
    "language": "en",
    "lastActiveAt": "2026-05-18T10:00:00.000Z"
  }
}
```

**Failed (404):** Player not registered on the platform.

```json
{ "error": "User not found" }
```

#### Player status

Check `status` on every session start and after any bet rejection.

| Status                 | Bet slip | What to show                                             |
| ---------------------- | -------- | -------------------------------------------------------- |
| `active`               | Enabled  | —                                                        |
| `suspended`            | Disabled | "Your account is temporarily suspended"                  |
| `blocked`              | Disabled | "Your account has been blocked. Please contact support"  |
| `self_excluded`        | Disabled | "You have self-excluded from betting"                    |
| `pending_verification` | Disabled | "Please verify your identity to continue betting"        |
| `limited`              | Enabled  | "Responsible gambling limits are active on your account" |

### Betting Limits

```
GET /users/me/limits
Headers: x-user-id, x-operator-id, x-currency
```

**Success (200):**

```json
{
  "data": {
    "single": {
      "minStake": 1.0,
      "maxStake": 10000.0,
      "maxPayout": 500000.0,
      "maxDailyStake": 100000.0,
      "maxDailyPayout": 1000000.0,
      "currency": "USD"
    },
    "parlay": {
      "minStake": 1.0,
      "maxStake": 500.0,
      "maxPayout": 250000.0,
      "maxParlayLegs": 12,
      "maxDailyStake": 50000.0,
      "maxDailyPayout": 500000.0,
      "currency": "USD"
    }
  }
}
```

| Field                   | Use it for                                          |
| ----------------------- | --------------------------------------------------- |
| `minStake` / `maxStake` | Min/max on the stake input                          |
| `maxParlayLegs`         | Cap on selections in a parlay                       |
| `maxPayout`             | Show "Max payout" label on bet slip                 |
| `maxDailyStake`         | RG progress bar (compare with `/users/me/exposure`) |

### Player Exposure

Today's staking totals. Use with limits for responsible gambling progress bars.

```
GET /users/me/exposure
Headers: x-user-id, x-operator-id, x-currency
```

**Success (200):**

```json
{
  "data": {
    "dailyStakeTotal": 500.0,
    "unsettledLiability": 125.0,
    "dailyPayoutLiability": 1250.0,
    "periodDate": "2026-05-18",
    "currency": "USD"
  }
}
```

| Field                  | What it means                                     |
| ---------------------- | ------------------------------------------------- |
| `dailyStakeTotal`      | Total staked today — compare with `maxDailyStake` |
| `unsettledLiability`   | Potential payout of all open bets                 |
| `dailyPayoutLiability` | Max possible payout across today's open bets      |

All values are `0` if the player hasn't bet today. That is normal.

---

## Betting

### Place a Bet

```
POST /bets/place
Headers: x-user-id, x-operator-id, x-currency
```

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
  "betType": "single",
  "stake": 50.0,
  "currency": "USD",
  "selections": [
    {
      "eventId": 5001,
      "marketId": 1,
      "selectionId": 10234,
      "odds": 2.5
    }
  ]
}
```

| Field            | Required | Notes                                                                                        |
| ---------------- | -------- | -------------------------------------------------------------------------------------------- |
| `idempotencyKey` | YES      | Fresh UUID per bet. Reuse the same key on network-failure retry to prevent double placement. |
| `betType`        | YES      | `single` or `parlay`                                                                         |
| `stake`          | YES      | Amount in the player's currency                                                              |
| `currency`       | NO       | Defaults to the player's currency                                                            |
| `selections`     | YES      | 1 item for single, 2+ for parlay                                                             |

The platform validates that the `odds` you send still match the live value. If they moved, the bet is rejected with `ODDS_CHANGED`.

**Accepted (201):**

```json
{
  "betId": "6645abc123def111",
  "status": "accepted",
  "betType": "single",
  "stakeAmount": 50.0,
  "potentialPayout": 125.0,
  "combinedOdds": 2.5,
  "currency": "USD",
  "createdAt": "2026-05-18T10:01:00.000Z",
  "selections": [
    {
      "selectionId": 10234,
      "eventId": 5001,
      "marketId": 1,
      "oddsAtPlacement": 2.5,
      "status": "pending"
    }
  ]
}
```

**Rejected (200):**

```json
{
  "betId": "6645abc123def112",
  "status": "rejected",
  "rejectionReason": "ODDS_CHANGED",
  "stakeAmount": 50.0,
  "currency": "USD",
  "createdAt": "2026-05-18T10:01:01.000Z"
}
```

### Rejection Reasons

| Code                    | Show to player                                             |
| ----------------------- | ---------------------------------------------------------- |
| `USER_SUSPENDED`        | Your account is currently suspended                        |
| `SELECTION_CLOSED`      | This market is no longer available                         |
| `ODDS_CHANGED`          | Odds have changed — please review and resubmit             |
| `STAKE_BELOW_MIN`       | Minimum stake is {minStake} {currency}                     |
| `STAKE_ABOVE_MAX`       | Maximum stake is {maxStake} {currency}                     |
| `PAYOUT_ABOVE_MAX`      | Potential payout exceeds the maximum allowed               |
| `DAILY_STAKE_EXCEEDED`  | You have reached your daily stake limit                    |
| `DAILY_PAYOUT_EXCEEDED` | Daily payout limit reached                                 |
| `MAX_EXPOSURE_EXCEEDED` | Betting temporarily unavailable — please try again shortly |
| `WALLET_RESERVE_FAILED` | Payment failed — check your balance and try again          |
| `DUPLICATE_BET`         | This bet was already submitted                             |

**On `ODDS_CHANGED`:** re-fetch the latest odds, show the new value to the player, and generate a **new** `idempotencyKey` before resubmitting.

---

## My Bets

### Bet History

```
GET /bets/history
Headers: x-user-id, x-operator-id
```

| Param         | Default  | Options                                                                        |
| ------------- | -------- | ------------------------------------------------------------------------------ |
| `status`      | —        | `pending` `accepted` `rejected` `won` `lost` `voided` `cashed_out` `cancelled` |
| `betType`     | —        | `single` `parlay`                                                              |
| `from` / `to` | —        | ISO date range                                                                 |
| `sort`        | `newest` | `newest` `oldest`                                                              |
| `page`        | `1`      | —                                                                              |
| `limit`       | `20`     | max `100`                                                                      |

**Response (200):**

```json
{
  "total": 142,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "betId": "6645abc123def111",
      "betType": "single",
      "stakeAmount": 50.0,
      "potentialPayout": 125.0,
      "actualPayout": 125.0,
      "status": "won",
      "currency": "USD",
      "combinedOdds": 2.5,
      "createdAt": "2026-05-18T10:01:00.000Z",
      "settledAt": "2026-05-18T17:05:00.000Z",
      "selectionCount": 1,
      "firstEventName": "Arsenal vs Chelsea",
      "sportName": "Soccer",
      "leagueName": "Premier League",
      "shortResult": "Won USD 125.00"
    }
  ]
}
```

`shortResult` is pre-formatted for display: `"Pending"`, `"Won USD 125.00"`, `"Lost"`, `"Voided"`, `"Cashed Out USD 37.50"`, `"Cancelled"`.

### Bet Detail

```
GET /bets/:betId
Headers: x-user-id, x-operator-id
```

**Success (200):**

```json
{
  "data": {
    "betId": "6645abc123def111",
    "betType": "parlay",
    "status": "accepted",
    "stakeAmount": 25.0,
    "potentialPayout": 625.0,
    "actualPayout": null,
    "combinedOdds": 25.0,
    "currency": "USD",
    "createdAt": "2026-05-18T10:01:00.000Z",
    "acceptedAt": "2026-05-18T10:01:00.100Z",
    "settledAt": null,
    "cashoutAmount": null,
    "selections": [
      {
        "selectionId": 10234,
        "eventId": 5001,
        "marketId": 1,
        "status": "pending",
        "oddsAtPlacement": 2.5,
        "eventSnapshot": {
          "id": 5001,
          "name": "Arsenal vs Chelsea",
          "...": "..."
        },
        "marketSnapshot": { "id": 1, "name": "Match Result" },
        "selectionSnapshot": { "id": 10234, "name": "Arsenal", "odds": 2.5 }
      }
    ]
  }
}
```

`eventSnapshot`, `marketSnapshot`, and `selectionSnapshot` are frozen at placement time. Use them to render the bet receipt — they won't change even after the event ends.

**Bet status flow:**

```
pending → accepted → won / lost / voided
pending → rejected
accepted → cashed_out
accepted → cancelled
```

### Bet Status Poll

For open bets, poll this instead of fetching full detail every time.

```
GET /bets/:betId/status
Headers: x-user-id, x-operator-id
```

**Response (200):**

```json
{
  "betId": "6645abc123def111",
  "status": "won",
  "updatedAt": "2026-05-18T17:05:00.000Z"
}
```

Poll every 5–10 seconds. Once `status` is terminal (`won`, `lost`, `voided`, `cashed_out`, `cancelled`), stop polling and fetch full detail.

---

## Cashout

### Subscribe

Call this as soon as a bet is accepted. The platform starts monitoring the cashout feed.

```
POST /odds88/cashout/subscribe
Headers: x-user-id, x-operator-id
```

```json
{ "betSlipId": "6645abc123def111", "playerId": "player_001" }
```

### Execute Cashout

```
POST /bets/:betId/cashout
Headers: x-user-id, x-operator-id
```

```json
{
  "cashoutAmount": 37.5,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440099"
}
```

**Success (200):**

```json
{
  "success": true,
  "betId": "6645abc123def111",
  "cashoutAmount": 37.5,
  "status": "cashed_out"
}
```

**Failed (502):** Operator wallet declined. Bet stays `accepted` — let the player retry.

After cashout: refresh balance from your operator backend and update the bet in My Bets.

### Unsubscribe

```
POST /odds88/cashout/unsubscribe
Headers: x-user-id, x-operator-id
```

```json
{ "betSlipId": "6645abc123def111" }
```

---

## Bet Builder

Combines multiple selections from the **same event** into one leg with a single price.

Only show the Bet Builder UI if the event has `isBetBuilderSupported: true`.

### Get Price

```
POST /odds88/bet-builder/price
Headers: x-user-id, x-operator-id
```

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440001",
  "segmentId": 1,
  "eventId": 5001,
  "bets": [
    { "marketId": 1, "selectionId": 10234 },
    { "marketId": 14, "selectionId": 10891 }
  ]
}
```

Minimum 2 selections. Generate a fresh `requestId` (`crypto.randomUUID()`) per request.

**Price available (200):**

```json
{
  "data": {
    "requestId": "550e8400-e29b-41d4-a716-446655440001",
    "price": 4.75,
    "timeStamp": "2026-05-18T10:00:00.000Z",
    "rejectInfo": null
  }
}
```

**Rejected by odds88 (200):** `price` is absent, `rejectInfo` is set.

```json
{
  "data": {
    "requestId": "550e8400-e29b-41d4-a716-446655440001",
    "timeStamp": "2026-05-18T10:00:00.000Z",
    "rejectInfo": {
      "reason": 3,
      "message": "Selections are correlated"
    }
  }
}
```

| `reason` | Meaning                                              |
| -------- | ---------------------------------------------------- |
| `1`      | Selection unavailable                                |
| `2`      | Stake above maximum (`maxBet` field has the limit)   |
| `3`      | Selections cannot be combined                        |
| `4`      | Alternative odds available (`alternativeOdds` field) |

---

## Home Widgets

The home page exposes two curated widgets generated and cached on the server. Both endpoints are **public** — no headers required.

| Widget             | Endpoint                   | Default size        |
| ------------------ | -------------------------- | ------------------- |
| **Star Players**   | `GET /home/star-players`   | Up to 20 cards      |
| **Trending Accas** | `GET /home/trending-accas` | 3 coupons of 5 legs |

Both return placement-ready `eventId`, `marketId`, `selectionId`, and `odds` values that map directly into `POST /bets/place`.

---

### Star Players Widget

#### Fetch Star Players

```
GET /api/v1/home/star-players
```

| Param     | Default | Description                                     |
| --------- | ------- | ----------------------------------------------- |
| `lang`    | `en`    | Language code for sport / league / region names |
| `limit`   | `20`    | Max cards to return (server cap: 50)            |
| `sportId` | —       | Restrict cards to a specific sport              |

#### Response Shape

```json
{
  "data": [
    {
      "cardId": "sp_5001_10234",
      "eventId": 5001,
      "playerName": "Erling Haaland",
      "matchName": "Manchester City vs Arsenal",
      "sport": { "id": 1, "name": "Soccer" },
      "league": { "id": 101, "name": "Premier League" },
      "region": { "id": 10, "name": "England" },
      "startTime": "2026-05-17T14:00:00.000Z",
      "picks": [
        {
          "role": "player_prop",
          "eventId": 5001,
          "marketId": 88001,
          "selectionId": 10234,
          "marketName": "Anytime Goalscorer",
          "outcomeName": "Erling Haaland",
          "odds": 2.1
        },
        {
          "role": "match_result",
          "eventId": 5001,
          "marketId": 1,
          "selectionId": 10001,
          "marketName": "Match Result",
          "outcomeName": "Manchester City",
          "odds": 1.85
        },
        {
          "role": "total_goals",
          "eventId": 5001,
          "marketId": 90012,
          "selectionId": 10099,
          "marketName": "Total Goals",
          "outcomeName": "Over 2.5",
          "odds": 1.72
        }
      ],
      "combinedOdds": 6.68,
      "displayOrder": 1
    }
  ],
  "meta": {
    "count": 12,
    "generatedAt": "2026-05-15T12:00:00.000Z"
  }
}
```

| Field          | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `cardId`       | Stable identifier — use as React / template key            |
| `playerName`   | Hero player display name                                   |
| `picks[].role` | `player_prop` \| `match_result` \| `total_goals`           |
| `picks[].odds` | Decimal price **at response time** — validate at placement |
| `combinedOdds` | Product of all three leg odds — show as bundle price       |
| `displayOrder` | Already sorted server-side                                 |

#### Rendering a Card

```js
function StarPlayerCard({ card }) {
  const playerPick = card.picks.find((p) => p.role === "player_prop");
  const matchPick = card.picks.find((p) => p.role === "match_result");
  const totalsPick = card.picks.find((p) => p.role === "total_goals");

  return (
    <div className="star-player-card">
      <div className="card-header">
        <span className="player-name">{card.playerName}</span>
        <span className="league">{card.league.name}</span>
        <span className="kick-off">
          {new Date(card.startTime).toLocaleTimeString()}
        </span>
      </div>
      <div className="match-name">{card.matchName}</div>
      <div className="picks">
        <PickRow pick={playerPick} />
        <PickRow pick={matchPick} />
        <PickRow pick={totalsPick} />
      </div>
      <div className="footer">
        <span className="combined-odds">{card.combinedOdds.toFixed(2)}</span>
        <button onClick={() => addBundleToSlip(card)}>Add All</button>
      </div>
    </div>
  );
}
```

#### Placing the Bundle as a Parlay

```js
function addBundleToSlip(card) {
  openBetSlip({
    betType: "parlay",
    selections: card.picks.map((pick) => ({
      eventId: pick.eventId,
      marketId: pick.marketId,
      selectionId: pick.selectionId,
      odds: pick.odds,
    })),
    combinedOdds: card.combinedOdds,
  });
}
```

#### Placing a Single Leg

```js
function addSinglePickToSlip(pick) {
  openBetSlip({
    betType: "single",
    selections: [
      {
        eventId: pick.eventId,
        marketId: pick.marketId,
        selectionId: pick.selectionId,
        odds: pick.odds,
      },
    ],
  });
}
```

---

### Trending Accas Widget

#### Fetch Trending Accas

```
GET /api/v1/home/trending-accas
```

| Param     | Default | Description                  |
| --------- | ------- | ---------------------------- |
| `lang`    | `en`    | Language code                |
| `limit`   | `3`     | Max coupons (server cap: 10) |
| `sportId` | —       | Filter to a single sport     |

#### Response Shape

```json
{
  "data": [
    {
      "couponId": "ta_1747300000000_a1b2c3",
      "foldCount": 5,
      "combinedOdds": 24.5,
      "socialProof": { "betCount": 187 },
      "legs": [
        {
          "eventId": 5001,
          "matchName": "Man City vs Arsenal",
          "sport": { "id": 1, "name": "Soccer" },
          "region": { "id": 10, "name": "England" },
          "league": { "id": 101, "name": "Premier League" },
          "startTime": "2026-05-17T14:00:00.000Z",
          "marketId": 1,
          "selectionId": 10001,
          "marketName": "Match Result",
          "outcomeName": "Man City",
          "odds": 1.85
        }
      ],
      "displayOrder": 1
    }
  ],
  "meta": {
    "couponCount": 3,
    "generatedAt": "2026-05-15T12:00:00.000Z"
  }
}
```

| Field                  | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `couponId`             | Stable identifier — use as React / template key                   |
| `foldCount`            | Number of legs (always equals `legs.length`)                      |
| `combinedOdds`         | Server-computed product of all leg odds                           |
| `socialProof.betCount` | Only present when enough bets exist — show as "187+ bets on this" |
| `displayOrder`         | Already sorted server-side                                        |

#### Rendering a Coupon

```js
function TrendingAccaCard({ coupon }) {
  return (
    <div className="acca-card">
      <div className="card-header">
        <span>{coupon.foldCount}-Fold Acca</span>
        <span>{coupon.combinedOdds.toFixed(2)}</span>
        {coupon.socialProof && (
          <span>{coupon.socialProof.betCount}+ bets on this</span>
        )}
      </div>
      <ul className="legs">
        {coupon.legs.map((leg, i) => (
          <li key={i}>
            <span>{leg.matchName}</span>
            <span>{leg.outcomeName}</span>
            <span>{leg.odds.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <button onClick={() => addAccaToSlip(coupon)}>
        Add {coupon.foldCount}-Fold — {coupon.combinedOdds.toFixed(2)}
      </button>
    </div>
  );
}
```

#### Placing the Acca

```js
function addAccaToSlip(coupon) {
  openBetSlip({
    betType: "parlay",
    selections: coupon.legs.map((leg) => ({
      eventId: leg.eventId,
      marketId: leg.marketId,
      selectionId: leg.selectionId,
      odds: leg.odds,
    })),
    combinedOdds: coupon.combinedOdds,
  });
}
```

---

### Mapping to Bet Placement

```js
// Star Players — all three picks as a parlay
const payload = {
  idempotencyKey: crypto.randomUUID(),
  betType: "parlay",
  stake: 5.0,
  selections: card.picks.map((pick) => ({
    eventId: pick.eventId,
    marketId: pick.marketId,
    selectionId: pick.selectionId,
    odds: pick.odds,
  })),
};

// Trending Acca — full coupon as a parlay
const payload = {
  idempotencyKey: crypto.randomUUID(),
  betType: "parlay",
  stake: 2.0,
  selections: coupon.legs.map((leg) => ({
    eventId: leg.eventId,
    marketId: leg.marketId,
    selectionId: leg.selectionId,
    odds: leg.odds,
  })),
};

const res = await fetch("/api/v1/bets/place", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...playerHeaders },
  body: JSON.stringify(payload),
});

const result = await res.json();
if (result.status === "accepted") {
  showBetConfirmation(result);
} else if (result.rejectionReason === "ODDS_CHANGED") {
  await refreshWidgets();
  showOddsChangedDialog();
} else {
  showRejectionMessage(result.rejectionReason);
}
```

---

### Refresh & Caching Strategy

The platform caches widget responses in Redis (default 60s TTL). You do not need your own server-side cache.

```js
const WIDGET_REFRESH_MS = 60_000;

async function loadHomeWidgets() {
  const [starPlayers, trendingAccas] = await Promise.all([
    fetch("/api/v1/home/star-players?lang=en").then((r) => r.json()),
    fetch("/api/v1/home/trending-accas?lang=en").then((r) => r.json()),
  ]);
  renderStarPlayers(starPlayers.data);
  renderTrendingAccas(trendingAccas.data);
}

// Pause refresh when the bet slip is open — resume on close
function openBetSlip(data) {
  stopWidgetRefresh(); /* render slip */
}
function closeBetSlip() {
  loadHomeWidgets();
  startWidgetRefresh();
}

// Pause when tab is hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopWidgetRefresh();
  else {
    loadHomeWidgets();
    startWidgetRefresh();
  }
});
```

---

### Odds Staleness Handling

Widget odds are cached for up to 60 seconds. The platform validates odds at placement time.

| Scenario                           | Recommended behaviour                                      |
| ---------------------------------- | ---------------------------------------------------------- |
| Odds moved up (better for player)  | Highlight in green, auto-accept                            |
| Odds moved down (worse for player) | Show dialog, require player confirmation                   |
| Market closed                      | Remove from slip with "This market is no longer available" |

**On `ODDS_CHANGED` rejection:**

```js
async function placeBet(payload) {
  const result = await submitBet(payload);
  if (result.rejectionReason !== "ODDS_CHANGED") return result;

  const fresh = await fetch("/api/v1/home/star-players?lang=en").then((r) =>
    r.json(),
  );
  const updatedCard = fresh.data.find(
    (c) => c.eventId === payload.selections[0].eventId,
  );

  if (updatedCard)
    showOddsMovedDialog({
      old: payload.selections.map((s) => s.odds),
      updated: updatedCard.picks.map((p) => p.odds),
    });
  else showEventClosedDialog();

  return result;
}
```

**Empty states:** Both endpoints return `data: []` (not an error) when no qualifying content exists. Always handle gracefully.

---

## Player Analytics

Personal betting statistics. All endpoints require `x-user-id` and `x-operator-id` headers.

### Common Parameters

| `period` | Range                 |
| -------- | --------------------- |
| `today`  | Midnight today → now  |
| `7d`     | Last 7 days (default) |
| `30d`    | Last 30 days          |
| `90d`    | Last 90 days          |
| `1y`     | Last 365 days         |

Custom range: `?from=2026-05-01T00:00:00Z&to=2026-05-31T23:59:59Z`

Granularity (time-series): `day` (default) | `week` | `month`

---

### Player Overview

Personal betting summary — all-time stats, period stats, and current streak.

```
GET /users/me/analytics/overview
Headers: x-user-id, x-operator-id
```

**Query params:** `period`, `from`, `to`

**Response (200):**

```json
{
  "data": {
    "period": { "from": "...", "to": "..." },
    "currency": "USD",
    "allTime": {
      "totalBets": 1247,
      "wonBets": 421,
      "lostBets": 789,
      "parlayBets": 184,
      "totalStaked": 28420.0,
      "totalWon": 24180.0,
      "netPnl": -4240.0,
      "winRate": 34.79,
      "biggestWin": 1240.0,
      "biggestStake": 500.0,
      "avgOdds": 2.841,
      "avgStake": 22.79
    },
    "periodStats": {
      "periodBets": 87,
      "wonBets": 31,
      "lostBets": 52,
      "periodStaked": 1924.0,
      "periodWon": 1648.0,
      "periodPnl": -276.0,
      "winRate": 37.35
    },
    "streak": {
      "current": 3,
      "type": "win"
    }
  }
}
```

`netPnl` = `totalWon` − `totalStaked` (negative = player is net down).  
`streak.current` is the length of the current run of wins or losses, based on the last 20 settled bets.

---

### Favourite Sports & Leagues

Which sports and leagues the player bets on most.

```
GET /users/me/analytics/sports
Headers: x-user-id, x-operator-id
```

**Query params:** `period`, `from`, `to`

**Response (200):**

```json
{
  "data": {
    "bySport": [
      {
        "id": 1,
        "name": "Soccer",
        "selectionCount": 724,
        "betCount": 512,
        "totalStaked": 11240.0,
        "totalWon": 9840.0,
        "pnl": -1400.0,
        "winRate": 35.21,
        "avgOdds": 2.341
      }
    ],
    "byLeague": [
      {
        "id": 101,
        "name": "Premier League",
        "selectionCount": 284,
        "betCount": 201,
        "totalStaked": 4240.0,
        "totalWon": 3840.0,
        "pnl": -400.0,
        "winRate": 37.41,
        "avgOdds": 2.141
      }
    ]
  },
  "period": { "from": "...", "to": "..." },
  "currency": "USD"
}
```

Top 10 sports and top 10 leagues, sorted by `selectionCount` descending.

---

### Betting Timeline

Day-by-day betting activity history.

```
GET /users/me/analytics/timeline
Headers: x-user-id, x-operator-id
```

**Query params:** `period`, `from`, `to`, `granularity`

**Response (200):**

```json
{
  "data": [
    {
      "date": "2026-05-01",
      "betsPlaced": 7,
      "totalStaked": 142.5,
      "totalWon": 124.0,
      "pnl": -18.5,
      "wonBets": 2,
      "lostBets": 4,
      "pendingBets": 1,
      "avgStake": 20.36
    }
  ],
  "granularity": "day",
  "period": { "from": "...", "to": "..." },
  "currency": "USD"
}
```

Cumulate `pnl` over the timeline to render a running P&L line chart.

---

## Errors

All error responses:

```json
{ "error": "Human-readable message" }
```

| Code  | Meaning                     | What to do                               |
| ----- | --------------------------- | ---------------------------------------- |
| `400` | Missing or invalid field    | Show near the relevant field             |
| `403` | Action not allowed          | Show "not permitted"                     |
| `404` | Not found                   | Show "not found" state                   |
| `409` | Duplicate idempotency key   | Fetch and show the existing result       |
| `422` | Bet rejected                | Map `rejectionReason` to a user message  |
| `502` | Operator wallet unreachable | Show graceful fallback, allow retry      |
| `503` | Odds feed disconnected      | Show "live odds temporarily unavailable" |

---

## Quick Reference

All endpoints are prefixed with `/api/v1`. No `Authorization` header needed.

### Public (no headers)

| Method | Endpoint                      | Description                                      |
| ------ | ----------------------------- | ------------------------------------------------ |
| `GET`  | `/sidebar`                    | Navigation tree                                  |
| `GET`  | `/sports`                     | All sports                                       |
| `GET`  | `/leagues`                    | Leagues (filter: `sportId`, `regionId`)          |
| `GET`  | `/regions`                    | All regions                                      |
| `GET`  | `/markets`                    | All market types                                 |
| `GET`  | `/events`                     | Events (filter: `sportId`, `leagueId`, `status`) |
| `GET`  | `/events/search`              | Full-text search (params: `q`, `from`, `to`)     |
| `GET`  | `/events/:eventId`            | Single event with markets                        |
| `GET`  | `/odds/:eventId`              | Odds for one event                               |
| `GET`  | `/odds88/events/array`        | Full live event tree (compact)                   |
| `GET`  | `/home/star-players`          | Star Players widget                              |
| `GET`  | `/home/trending-accas`        | Trending Accas widget                            |
| `GET`  | `/health/odds88/feeds/status` | Feed connectivity                                |
| `WS`   | `/ws/odds88/events`           | Live odds stream                                 |

### Player (requires `x-user-id`, `x-operator-id`)

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| `GET`  | `/users/me`                    | Player profile + status        |
| `GET`  | `/users/me/limits`             | Effective betting limits       |
| `GET`  | `/users/me/exposure`           | Today's stake totals           |
| `GET`  | `/users/me/analytics/overview` | Personal stats + streak        |
| `GET`  | `/users/me/analytics/sports`   | Favourite sports & leagues     |
| `GET`  | `/users/me/analytics/timeline` | Betting timeline               |
| `POST` | `/bets/place`                  | Place a bet                    |
| `GET`  | `/bets/history`                | Paginated bet list             |
| `GET`  | `/bets/:betId`                 | Full bet detail                |
| `GET`  | `/bets/:betId/status`          | Lightweight status poll        |
| `POST` | `/bets/:betId/cashout`         | Execute cashout                |
| `POST` | `/odds88/cashout/subscribe`    | Subscribe bet to cashout feed  |
| `POST` | `/odds88/cashout/unsubscribe`  | Unsubscribe from cashout feed  |
| `POST` | `/odds88/bet-builder/price`    | Get Bet Builder combined price |

### Integration Checklist

**Session**

- [ ] `GET /users/me`, `GET /users/me/limits`, and balance from operator backend called in parallel on load
- [ ] Player `status` checked — bet slip disabled for non-`active` statuses
- [ ] Balance refreshed after each bet placement and cashout

**Betting**

- [ ] `idempotencyKey` is a fresh `crypto.randomUUID()` per bet submission
- [ ] Same key reused on network-failure retry — new key after any slip change
- [ ] `ODDS_CHANGED` rejection re-fetches odds and shows new prices before resubmit

**WebSocket**

- [ ] Snapshot rendered on first message (`type: "snapshot"`)
- [ ] Deltas applied on subsequent messages (`type: "delta"`)
- [ ] Reconnect with exponential back-off on disconnect

**Home Widgets**

- [ ] Both widgets fetched in parallel on home page mount (`Promise.all`)
- [ ] `lang` param passed to match the player's active language
- [ ] Empty `data: []` handled gracefully — no errors thrown
- [ ] Widget refresh paused while bet slip is open
- [ ] `ODDS_CHANGED` on widget bet re-fetches widgets and shows new prices
- [ ] Widgets refreshed every 60 seconds; paused when browser tab is hidden

**Analytics**

- [ ] `GET /users/me/analytics/overview` used for "My Stats" summary
- [ ] `netPnl` shown from player's perspective (negative = player is down)
- [ ] `streak` shown only when `current` > 1
