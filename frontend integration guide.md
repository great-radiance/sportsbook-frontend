# Frontend Integration Guide

**Base URL:** `https://your-platform-domain.com/api/v1`  
**WebSocket:** `wss://your-platform-domain.com/ws`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Player Headers](#player-headers)
2. [Public Data](#public-data)
   - [Events](#events)
     - [List Events](#list-events)
     - [Get Single Event](#get-single-event)
   - [Event Search](#event-search)
   - [Live Events (odds88)](#live-events-odds88)
     - [List Live Events](#list-live-events)
     - [Get Single Live Event](#get-single-live-event)
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
GET /sidebar?lang=en&status=1&tradingStatus=1&isOutright=false
```

| Param                   | Type      | Description                                                    |
| ----------------------- | --------- | -------------------------------------------------------------- |
| `status`                | `number`  | Filter to events with this status code (e.g. `1` = live)       |
| `tradingStatus`         | `number`  | Filter by trading status                                       |
| `isOutright`            | `boolean` | `true` for outright events only, `false` for match events only |
| `isBetBuilderSupported` | `boolean` | Filter to bet-builder-eligible events                          |
| `lang`                  | `string`  | Language for translated sport / region / league names          |

Returns a compact navigation tree **plus** `marketsRef` — the full market type reference data for every market type pre-configured by the admin for each sport.

**Response:**

```json
{
  "data": [
    [2, [5001, 5002]],
    [[101, "Premier League", 3, [5001, 5002, 5003], 10, 1]],
    [
      1,
      "Soccer",
      12,
      [[204, "Premier League", 3, [5001, 5002, 5003], 10, 1]],
      [
        [
          10,
          "England",
          3,
          [[204, "Premier League", 3, [5001, 5002, 5003], 10, 1]]
        ]
      ]
    ]
  ],
  "marketsRef": {
    "1": [
      {
        "id": 1,
        "name": "Match Winner",
        "groups": [{ "id": 10, "name": "Main", "order": 1, "sportId": 1 }],
        "isMultilineMarket": false,
        "isFreeText": false
      },
      {
        "id": 2,
        "name": "Over/Under 2.5",
        "groups": [{ "id": 10, "name": "Main", "order": 2, "sportId": 1 }],
        "isMultilineMarket": false,
        "isFreeText": false
      }
    ],
    "3": [
      {
        "id": 5,
        "name": "Moneyline",
        "groups": [{ "id": 20, "name": "Main", "order": 1, "sportId": 3 }],
        "isMultilineMarket": false,
        "isFreeText": false
      }
    ]
  },
  "cached": false,
  "ms": 18
}
```

**`data` array format:**

```
data[0]  = FeaturedMatchesArr  → [eventCount, eventIds[]]
data[1]  = FeaturedLeaguesArr  → [[leagueId, name, eventCount, eventIds[], regionId, sportId], ...]
data[2+] = SportArr            → [sportId, name, eventCount, famousLeagues: LeagueArr[], regions: RegionArr[]]

RegionArr = [regionId, name, eventCount, leagues: LeagueArr[]]
LeagueArr = [leagueId, name, eventCount, eventIds[], regionId, sportId]
```

**`marketsRef` — keyed by `sportId`:**

Each key is a sport ID (as a string). The value is an array of market type reference objects for the market types the admin has configured for that sport. Use it to render market tabs or filter buttons when displaying events.

```js
const { data, marketsRef } = await fetch(
  "/api/v1/sidebar?lang=en&status=1",
).then((r) => r.json());

// data[2+] are sport entries
for (const sport of data.slice(2)) {
  const [sportId, sportName, eventCount, famousLeagues, regions] = sport;
  const markets = marketsRef[sportId] ?? [];
  // render market tab strip: markets.map(m => m.name)

  for (const region of regions) {
    const [regionId, regionName, regionEventCount, leagues] = region;
    for (const league of leagues) {
      const [
        leagueId,
        leagueName,
        leagueEventCount,
        eventIds,
        leagueRegionId,
        leagueSportId,
      ] = league;
      // leagueRegionId === regionId, leagueSportId === sportId
    }
  }
}
```

> `marketsRef` is `{}` when no market types have been configured for any sport yet (run admin sidebar market setup first).

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

#### List Events

```
GET /events
GET /events?sportId=1&leagueId=101&status=1
```

| Param      | Type     | Description                         |
| ---------- | -------- | ----------------------------------- |
| `sportId`  | `number` | Filter by sport ID                  |
| `leagueId` | `number` | Filter by league ID                 |
| `regionId` | `number` | Filter by region ID                 |
| `status`   | `number` | Event status code (e.g. `1` = live) |

**Response (200):**

```json
{
  "source": "db",
  "total": 1,
  "data": [
    {
      "eventId": 5001,
      "sportId": 1,
      "leagueId": 101,
      "eventInfo": {
        "id": 5001,
        "name": "Arsenal vs Chelsea",
        "status": 1,
        "tradingStatus": 1,
        "startTime": "2026-05-18T15:00:00.000Z",
        "sport": { "id": 1, "name": "Soccer" },
        "competition": { "id": 101, "name": "Premier League" },
        "competitors": [
          { "id": 201, "name": "Arsenal" },
          { "id": 202, "name": "Chelsea" }
        ]
      },
      "markets": [
        {
          "id": 9001,
          "name": "Match Winner",
          "tradingStatus": 1,
          "type": 1,
          "isBestLine": true,
          "selections": [
            {
              "id": 501,
              "name": "Arsenal",
              "price": 2.2,
              "probability": 0.45,
              "status": 1
            },
            {
              "id": 502,
              "name": "Draw",
              "price": 3.5,
              "probability": 0.28,
              "status": 1
            },
            {
              "id": 503,
              "name": "Chelsea",
              "price": 2.8,
              "probability": 0.27,
              "status": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### Get Single Event

Returns one event from the database, with a `marketsRef` array attached. `marketsRef` contains the static market type metadata for every market on the event, matched by `marketsRef[n].id === market.type`.

```
GET /events/:eventId
```

**Response (200):**

```json
{
  "source": "db",
  "data": {
    "eventId": 5001,
    "sportId": 1,
    "leagueId": 101,
    "eventInfo": {
      "id": 5001,
      "name": "Arsenal vs Chelsea",
      "status": 1,
      "tradingStatus": 1,
      "startTime": "2026-05-18T15:00:00.000Z",
      "sport": { "id": 1, "name": "Soccer" },
      "competition": { "id": 101, "name": "Premier League" },
      "competitors": [
        { "id": 201, "name": "Arsenal" },
        { "id": 202, "name": "Chelsea" }
      ]
    },
    "markets": [
      {
        "id": 9001,
        "name": "Match Winner",
        "tradingStatus": 1,
        "type": 1,
        "isBestLine": true,
        "selections": [
          {
            "id": 501,
            "name": "Arsenal",
            "price": 2.2,
            "probability": 0.45,
            "status": 1
          },
          {
            "id": 502,
            "name": "Draw",
            "price": 3.5,
            "probability": 0.28,
            "status": 1
          },
          {
            "id": 503,
            "name": "Chelsea",
            "price": 2.8,
            "probability": 0.27,
            "status": 1
          }
        ]
      }
    ],
    "marketsRef": [
      {
        "id": 1,
        "name": "Match Winner",
        "groups": [{ "id": 10, "name": "Main", "order": 1, "sportId": 1 }],
        "isMultilineMarket": false,
        "isFreeText": false
      }
    ]
  }
}
```

**Error (404):**

```json
{ "error": "Event not found" }
```

**Using `marketsRef`:**

```js
// Build a lookup map so you can enrich each market with its type metadata
const refMap = new Map(data.marketsRef.map((r) => [r.id, r]));

for (const market of data.markets) {
  const ref = refMap.get(market.type);
  if (ref) {
    market.groupName = ref.groups[0]?.name;
    market.isMultiline = ref.isMultilineMarket;
  }
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

### Live Events (odds88)

These endpoints serve data straight from the Redis delta feed — always fresh, no database round-trip.

#### List Live Events

The main endpoint for powering your odds board. Returns events filtered and translated, with markets limited to the types configured per sport in the admin sidebar.

```
GET /odds88/events/selected
GET /odds88/events/selected?sportId=1&status=1&tradingStatus=1&lang=en
GET /odds88/events/selected?sportId=1&marketIds=1,2&sort=ASC&lang=en
```

| Param                   | Type                 | Description                                                                                                                            |
| ----------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `sportId`               | `number \| number[]` | Filter by sport. Comma-separated or repeated param                                                                                     |
| `regionId`              | `number \| number[]` | Filter by region/country                                                                                                               |
| `leagueId`              | `number \| number[]` | Filter by league                                                                                                                       |
| `status`                | `number \| number[]` | Event status code(s)                                                                                                                   |
| `tradingStatus`         | `number \| number[]` | Trading status code(s)                                                                                                                 |
| `isOutright`            | `boolean`            | `true` for outrights only, `false` for match events only                                                                               |
| `isBetBuilderSupported` | `boolean`            | Bet-builder-eligible events only                                                                                                       |
| `eventIds`              | `number \| number[]` | Fetch specific event IDs                                                                                                               |
| `marketIds`             | `number \| number[]` | Return only these market type IDs per event; keeps `isBestLine` market, falls back to first. Omit or pass empty to return all markets. |
| `sort`                  | `"ASC" \| "DESC"`    | Sort by start time. Default: `ASC`                                                                                                     |
| `lang`                  | `string`             | Language code for translated names (`en`, `zh`, `th`, …)                                                                               |

**Response format:**

Each element in `data` is a 3-item tuple `[eventInfo, markets, scoreboard]` — compact arrays instead of objects to minimise payload.

```
eventInfo:
  [id, name, status, tradingStatus, [sportId, sportName], [countryId, countryName],
   [leagueId, leagueName], season, [[competitorId, competitorName], ...],
   startTime, isOutright, isBetBuilderSupported]

market:
  [id, name, tradingStatus, type, isBestLine, parameters, extraParameters,
   isBetBuilderSupported, [selections]]

selection:
  [id, name, probability, price, originalPrice, status, settlement,
   deadHeatFactor, extraParameters, isBetBuilderSupported, competitorId, startingPrice]
```

**Example:**

```json
{
  "data": [
    [
      [
        5001,
        "Arsenal vs Chelsea",
        1,
        1,
        [1, "Soccer"],
        [41, "England"],
        [101, "Premier League"],
        null,
        [
          [201, "Arsenal"],
          [202, "Chelsea"]
        ],
        "2026-05-18T15:00:00.000Z",
        false,
        true
      ],
      [
        [
          9001,
          "Match Winner",
          1,
          1,
          true,
          null,
          null,
          false,
          [
            [
              501,
              "Arsenal",
              0.45,
              2.2,
              2.2,
              1,
              null,
              null,
              null,
              false,
              201,
              null
            ],
            [
              502,
              "Draw",
              0.28,
              3.5,
              3.5,
              1,
              null,
              null,
              null,
              false,
              null,
              null
            ],
            [
              503,
              "Chelsea",
              0.27,
              2.8,
              2.8,
              1,
              null,
              null,
              null,
              false,
              202,
              null
            ]
          ]
        ]
      ],
      null
    ]
  ],
  "ms": 9
}
```

**Decoding the tuple:**

```js
const [eventInfo, markets, scoreboard] = event;
const [
  id,
  name,
  status,
  tradingStatus,
  sport,
  country,
  competition,
  season,
  competitors,
  startTime,
  isOutright,
  isBetBuilderSupported,
] = eventInfo;

for (const market of markets) {
  const [
    mId,
    mName,
    mTradingStatus,
    mType,
    isBestLine,
    params,
    extraParams,
    isBetBuilder,
    selections,
  ] = market;

  for (const sel of selections) {
    const [
      sId,
      sName,
      probability,
      price,
      originalPrice,
      sStatus,
      settlement,
      deadHeat,
      sExtraParams,
      sBetBuilder,
      competitorId,
      sp,
    ] = sel;
  }
}
```

---

#### Get Single Live Event

Returns a single event from the Redis delta feed, fully translated, with competitor logos and `marketsRef` (static market type metadata matched by `marketsRef[n].id === market.type`).

```
GET /odds88/events/:eventId
GET /odds88/events/:eventId?lang=zh
```

| Param     | Type     | Description                        |
| --------- | -------- | ---------------------------------- |
| `eventId` | `number` | The event ID                       |
| `lang`    | `string` | Language code for translated names |

**Response (200):**

```json
{
  "data": {
    "eventId": 5001,
    "sportId": 1,
    "leagueId": 101,
    "version": 882,
    "eventInfo": {
      "id": 5001,
      "name": "Arsenal vs Chelsea",
      "status": 1,
      "tradingStatus": 1,
      "sport": { "id": 1, "name": "Soccer" },
      "country": { "id": 41, "name": "England" },
      "competition": { "id": 101, "name": "Premier League" },
      "competitors": [
        {
          "id": 201,
          "name": "Arsenal",
          "logo": "https://cdn.example.com/arsenal.png"
        },
        {
          "id": 202,
          "name": "Chelsea",
          "logo": "https://cdn.example.com/chelsea.png"
        }
      ],
      "startTime": "2026-05-18T15:00:00.000Z",
      "isOutright": false,
      "isBetBuilderSupported": true
    },
    "markets": [
      {
        "id": 9001,
        "name": "Match Winner",
        "tradingStatus": 1,
        "type": 1,
        "isBestLine": true,
        "selections": [
          {
            "id": 501,
            "name": "Arsenal",
            "price": 2.2,
            "probability": 0.45,
            "status": 1
          },
          {
            "id": 502,
            "name": "Draw",
            "price": 3.5,
            "probability": 0.28,
            "status": 1
          },
          {
            "id": 503,
            "name": "Chelsea",
            "price": 2.8,
            "probability": 0.27,
            "status": 1
          }
        ]
      }
    ],
    "marketsRef": [
      {
        "id": 1,
        "name": "Match Winner",
        "groups": [{ "id": 10, "name": "Main", "order": 1, "sportId": 1 }],
        "isMultilineMarket": false,
        "isFreeText": false
      }
    ],
    "scoreboard": null
  },
  "ms": 7
}
```

**Error (404):**

```json
{ "error": "Event not found" }
```

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

This section walks through the complete flow from a player clicking an odds button to a confirmed bet receipt. Follow the steps in order — each step gates the next.

```
[1] Pre-flight checks  →  [2] Build bet slip  →  [3] Validate stake
        ↓
[4] Generate idempotency key  →  [5] Submit bet
        ↓
[6] Handle response
   ├─ accepted  →  [7] Post-placement actions
   ├─ ODDS_CHANGED  →  [8] Refresh odds & resubmit
   ├─ other rejection  →  show rejection message
   └─ network failure  →  [9] Retry with same key
```

---

### Step 1 — Pre-flight checks

Before the player can interact with the bet slip, verify three things in parallel on session start:

```js
const [profile, limits, balance] = await Promise.all([
  fetch("/api/v1/users/me", { headers: playerHeaders }).then((r) => r.json()),
  fetch("/api/v1/users/me/limits", { headers: playerHeaders }).then((r) =>
    r.json(),
  ),
  fetchBalanceFromYourOperatorBackend(), // your own backend
]);
```

**1a — Check player status**

If `profile.data.status` is anything other than `active` or `limited`, disable the bet slip entirely.

| Status                 | Bet slip | What to show                                             |
| ---------------------- | -------- | -------------------------------------------------------- |
| `active`               | Enabled  | —                                                        |
| `limited`              | Enabled  | "Responsible gambling limits are active on your account" |
| `suspended`            | Disabled | "Your account is temporarily suspended"                  |
| `blocked`              | Disabled | "Your account has been blocked. Please contact support"  |
| `self_excluded`        | Disabled | "You have self-excluded from betting"                    |
| `pending_verification` | Disabled | "Please verify your identity to continue betting"        |

```js
const canBet = ["active", "limited"].includes(profile.data.status);
setBetSlipEnabled(canBet);
if (!canBet) showStatusBanner(profile.data.status);
```

**1b — Store limits for stake validation (Step 3)**

```js
const { single, parlay } = limits.data;
// single.minStake, single.maxStake, single.maxPayout
// parlay.minStake, parlay.maxStake, parlay.maxPayout, parlay.maxParlayLegs
```

**1c — Check sufficient balance**

Do not block the bet slip for low balance — only surface this at submission time via `WALLET_RESERVE_FAILED`. However, you can disable the "Place Bet" button client-side if the entered stake already exceeds the known balance.

---

### Step 2 — Build the Bet Slip

The bet slip holds a list of **legs**. There are two leg types:

| Leg type        | Source                                                                             | `betBuilderBetItems` in payload                   |
| --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Regular**     | Player clicks an odds button anywhere in the UI                                    | Not included                                      |
| **Bet Builder** | Player picks 2+ selections from one event in the BB UI, then gets a combined price | Required — lists all component markets/selections |

A BB leg counts as **one leg** toward `parlay.maxParlayLegs` regardless of how many components it has.

**Regular leg — internal UI state:**

```js
{
  type:          'selection',
  eventId:       5001,
  marketId:      1,
  selectionId:   10234,
  odds:          2.20,
  eventName:     'Arsenal vs Chelsea',
  marketName:    'Match Winner',
  selectionName: 'Arsenal',
}
```

**Bet Builder leg — internal UI state:**

```js
{
  type:      'betbuilder',
  eventId:   5001,
  eventName: 'Arsenal vs Chelsea',
  odds:      4.75,           // combined price from POST /odds88/bet-builder/price
  components: [
    { marketId: 1,  selectionId: 10234, marketName: 'Match Winner',      selectionName: 'Arsenal' },
    { marketId: 14, selectionId: 10891, marketName: 'Anytime Goalscorer', selectionName: 'Bukayo Saka' },
  ],
}
```

See the [Bet Builder](#bet-builder) section for the full flow on getting the combined price.

**Determine bet type:**

| Legs in slip      | `betType`  |
| ----------------- | ---------- |
| 1 (regular or BB) | `"single"` |
| 2 or more         | `"parlay"` |

**Parlay combinations supported:**

| Combination                                       | Allowed                                 |
| ------------------------------------------------- | --------------------------------------- |
| Regular + Regular (different events)              | YES                                     |
| BB leg + Regular (different events)               | YES                                     |
| BB leg + BB leg (different events)                | YES                                     |
| Regular + Regular (same event, different markets) | NO — odds provider rejects              |
| BB components from different events               | NO — a single BB leg must use one event |

**Adding a leg to the slip:**

```js
function addLeg(leg) {
  if (slip.length >= limits.parlay.maxParlayLegs) {
    showError(`Maximum ${limits.parlay.maxParlayLegs} legs per parlay`);
    return;
  }
  // Prevent two legs from the same event (unless combining inside a BB leg)
  const sameEvent = slip.some((s) => s.eventId === leg.eventId);
  if (sameEvent && leg.type !== "betbuilder") {
    removeMatchingLeg(leg.eventId); // toggle off
    return;
  }
  setSlip([...slip, leg]);
  idempotencyKey = crypto.randomUUID(); // new key whenever slip changes
}
```

**Combined odds (all leg types):**

```js
const combinedOdds = slip.reduce((acc, leg) => acc * leg.odds, 1);
const potentialPayout = stake * combinedOdds;
```

Both regular legs and BB legs contribute their `.odds` value to the product — the BB leg already has the combined price baked in.

---

### Step 3 — Validate Stake Input

Validate before enabling the "Place Bet" button. All limits come from `GET /users/me/limits` (Step 1).

```js
function validateStake(stake, betType) {
  const lim = betType === "single" ? limits.single : limits.parlay;
  const combinedOdds = slip.reduce((acc, s) => acc * s.odds, 1);
  const potentialPayout = stake * combinedOdds;

  if (stake < lim.minStake)
    return `Minimum stake is ${lim.minStake} ${currency}`;
  if (stake > lim.maxStake)
    return `Maximum stake is ${lim.maxStake} ${currency}`;
  if (potentialPayout > lim.maxPayout)
    return `Potential payout exceeds maximum of ${lim.maxPayout} ${currency}`;

  return null; // valid
}
```

Show limits inline on the stake input:

```
Stake: [_______]   Min: $1.00 · Max: $10,000.00
Potential payout: $125.00   Max payout: $500,000.00
```

---

### Step 4 — Generate the Idempotency Key

Generate one key per bet attempt. The key prevents double-placement on network retries.

```js
// Generate once when the player opens the slip or makes any change to it
let idempotencyKey = crypto.randomUUID();
```

**Key lifecycle rules:**

| Event                               | Action                           |
| ----------------------------------- | -------------------------------- |
| Player opens bet slip               | Generate new key                 |
| Player changes selection or stake   | Generate new key                 |
| Network failure on submission       | **Reuse the same key**           |
| Bet rejected (`ODDS_CHANGED`, etc.) | Generate new key before resubmit |
| Bet accepted                        | Discard — do not reuse           |

```js
// Good: generate once, hold it, reuse only on network failure
const betPayload = { idempotencyKey, betType, stake, currency, selections };

// On ODDS_CHANGED rejection: generate a new key
idempotencyKey = crypto.randomUUID();
```

---

### Step 5 — Submit the Bet

```
POST /bets/place
Headers: x-user-id, x-operator-id, x-currency
Content-Type: application/json
```

#### Payload field reference

| Field                             | Required     | Notes                                                                                      |
| --------------------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `idempotencyKey`                  | YES          | Fresh UUID per bet attempt. Reuse only on network-failure retry — never after a rejection. |
| `betType`                         | YES          | `"single"` (1 leg) or `"parlay"` (2+ legs)                                                 |
| `stake`                           | YES          | Amount in the player's currency                                                            |
| `currency`                        | NO           | Defaults to the player's currency from headers                                             |
| `selections`                      | YES          | Array of legs — one entry per leg, regardless of type                                      |
| `selections[].eventId`            | YES          | The event this leg belongs to                                                              |
| `selections[].marketId`           | YES          | Regular leg: the market ID. BB leg: always **`-1`**                                        |
| `selections[].selectionId`        | YES          | Regular leg: the selection ID. BB leg: always **`-1`**                                     |
| `selections[].odds`               | YES          | Regular leg: live price. BB leg: **combined price** from `POST /odds88/bet-builder/price`  |
| `selections[].betBuilderBetItems` | BB legs only | Array of `{ marketId, selectionId }` for every component that makes up this BB leg         |

---

#### Payload A — Regular single

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
      "odds": 2.2
    }
  ]
}
```

#### Payload B — Regular parlay (no bet builder)

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440002",
  "betType": "parlay",
  "stake": 10.0,
  "currency": "USD",
  "selections": [
    { "eventId": 5001, "marketId": 1, "selectionId": 10234, "odds": 2.2 },
    { "eventId": 5002, "marketId": 14, "selectionId": 10891, "odds": 1.85 },
    { "eventId": 5003, "marketId": 1, "selectionId": 11002, "odds": 3.1 }
  ]
}
```

Combined odds: 2.20 × 1.85 × 3.10 = **12.62**. Potential payout: **$126.20**

#### Payload C — Bet Builder single

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440010",
  "betType": "single",
  "stake": 10.0,
  "currency": "USD",
  "selections": [
    {
      "eventId": 5001,
      "marketId": -1,
      "selectionId": -1,
      "odds": 4.75,
      "betBuilderBetItems": [
        { "marketId": 1, "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    }
  ]
}
```

`marketId: -1` and `selectionId: -1` are the sentinel values that tell the platform and odds provider this is a Bet Builder leg. `betType` is still `"single"` because there is **one leg**. Potential payout: 10.00 × 4.75 = **$47.50**

#### Payload D — Bet Builder leg + regular leg (2-fold parlay)

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440011",
  "betType": "parlay",
  "stake": 10.0,
  "currency": "USD",
  "selections": [
    {
      "eventId": 5001,
      "marketId": -1,
      "selectionId": -1,
      "odds": 4.75,
      "betBuilderBetItems": [
        { "marketId": 1, "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    },
    {
      "eventId": 5002,
      "marketId": 5,
      "selectionId": 20100,
      "odds": 1.85
    }
  ]
}
```

Combined odds: 4.75 × 1.85 = **8.79**. Potential payout: **$87.90**

#### Payload E — Bet Builder leg + regular leg + regular leg (3-fold parlay)

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440012",
  "betType": "parlay",
  "stake": 5.0,
  "currency": "USD",
  "selections": [
    {
      "eventId": 5001,
      "marketId": -1,
      "selectionId": -1,
      "odds": 4.75,
      "betBuilderBetItems": [
        { "marketId": 1, "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    },
    {
      "eventId": 5002,
      "marketId": 1,
      "selectionId": 11002,
      "odds": 1.85
    },
    {
      "eventId": 5003,
      "marketId": 2,
      "selectionId": 30088,
      "odds": 1.6
    }
  ]
}
```

Combined odds: 4.75 × 1.85 × 1.60 = **14.06**. Potential payout: **$70.30**

#### Payload F — Bet Builder leg + Bet Builder leg (2-fold parlay, different events)

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440013",
  "betType": "parlay",
  "stake": 10.0,
  "currency": "USD",
  "selections": [
    {
      "eventId": 5001,
      "marketId": -1,
      "selectionId": -1,
      "odds": 4.75,
      "betBuilderBetItems": [
        { "marketId": 1, "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    },
    {
      "eventId": 5002,
      "marketId": -1,
      "selectionId": -1,
      "odds": 3.2,
      "betBuilderBetItems": [
        { "marketId": 5, "selectionId": 20100 },
        { "marketId": 8, "selectionId": 20505 }
      ]
    }
  ]
}
```

Each BB leg is from a different event. Combined odds: 4.75 × 3.20 = **15.20**. Potential payout: **$152.00**

---

**JavaScript — universal submit function (handles all leg types):**

```js
async function submitBet() {
  setSubmitting(true);
  try {
    const res = await fetch("/api/v1/bets/place", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...playerHeaders },
      body: JSON.stringify({
        idempotencyKey,
        betType: slip.length === 1 ? "single" : "parlay",
        stake,
        currency,
        selections: slip.map((leg) => {
          if (leg.type === "betbuilder") {
            return {
              eventId: leg.eventId,
              marketId: -1,
              selectionId: -1,
              odds: leg.odds,
              betBuilderBetItems: leg.components.map((c) => ({
                marketId: c.marketId,
                selectionId: c.selectionId,
              })),
            };
          }
          return {
            eventId: leg.eventId,
            marketId: leg.marketId,
            selectionId: leg.selectionId,
            odds: leg.odds,
          };
        }),
      }),
    });
    const result = await res.json();
    await handleBetResponse(result, res.status);
  } catch (err) {
    // Network failure — see Step 9
    handleNetworkFailure();
  } finally {
    setSubmitting(false);
  }
}
```

---

### Step 6 — Handle the Response

The platform returns two distinct shapes depending on whether the bet was accepted or rejected.

**Accepted (HTTP 201):**

```json
{
  "betId": "6645abc123def111",
  "status": "accepted",
  "betType": "single",
  "stakeAmount": 50.0,
  "potentialPayout": 110.0,
  "combinedOdds": 2.2,
  "currency": "USD",
  "createdAt": "2026-05-18T10:01:00.000Z",
  "selections": [
    {
      "selectionId": 10234,
      "eventId": 5001,
      "marketId": 1,
      "eventName": "Arsenal vs Chelsea",
      "marketName": "Match Winner",
      "selectionName": "Arsenal",
      "odds": 2.2
    }
  ]
}
```

Show the bet receipt using `betId`, `potentialPayout`, and `combinedOdds`. Then proceed to Step 7.

**Rejected (HTTP 200):**

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

Map `rejectionReason` to a player-facing message:

| Code                    | Show to player                                             | What to do next                           |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `ODDS_CHANGED`          | Odds have changed — please review and resubmit             | Go to Step 8                              |
| `SELECTION_CLOSED`      | This market is no longer available                         | Remove the selection from slip            |
| `USER_SUSPENDED`        | Your account is temporarily suspended                      | Disable slip, re-check `GET /users/me`    |
| `STAKE_BELOW_MIN`       | Minimum stake is {minStake} {currency}                     | Highlight stake input                     |
| `STAKE_ABOVE_MAX`       | Maximum stake is {maxStake} {currency}                     | Highlight stake input                     |
| `PAYOUT_ABOVE_MAX`      | Potential payout exceeds the maximum allowed               | Reduce stake                              |
| `DAILY_STAKE_EXCEEDED`  | You have reached your daily stake limit                    | Disable slip                              |
| `DAILY_PAYOUT_EXCEEDED` | Daily payout limit reached                                 | Disable slip                              |
| `MAX_EXPOSURE_EXCEEDED` | Betting temporarily unavailable — please try again shortly | Retry after 30 s                          |
| `WALLET_RESERVE_FAILED` | Payment failed — check your balance and try again          | Re-fetch balance                          |
| `DUPLICATE_BET`         | This bet was already submitted                             | Fetch existing bet via `GET /bets/:betId` |

**Provider registration failure (HTTP 502):**

The bet was accepted and the player's balance was reserved, but the platform failed to register it with the odds provider. Cashout will not be available for this bet.

```json
{ "error": "Bet was accepted but failed to register with odds provider" }
```

Show the bet as placed. Advise the player to contact support if cashout is not visible.

```js
async function handleBetResponse(result, httpStatus) {
  if (httpStatus === 502) {
    showPartialAcceptanceBanner(); // "Bet placed — cashout may be unavailable"
    clearSlip();
    return;
  }
  if (result.status === "accepted") {
    showBetReceipt(result);
    clearSlip();
    await postPlacementActions(result.betId);
  } else if (result.rejectionReason === "ODDS_CHANGED") {
    await handleOddsChanged(); // Step 8
  } else if (result.rejectionReason === "DUPLICATE_BET") {
    const existing = await fetch(`/api/v1/bets/${result.betId}`, {
      headers: playerHeaders,
    }).then((r) => r.json());
    showBetReceipt(existing.data);
  } else {
    showRejectionMessage(result.rejectionReason);
    if (
      [
        "USER_SUSPENDED",
        "DAILY_STAKE_EXCEEDED",
        "DAILY_PAYOUT_EXCEEDED",
      ].includes(result.rejectionReason)
    ) {
      setBetSlipEnabled(false);
    }
  }
}
```

---

### Step 7 — Post-placement Actions

After every accepted bet, run these three actions:

**7a — Refresh balance**

The player's balance has changed. Fetch fresh balance from your operator backend immediately.

```js
const newBalance = await fetchBalanceFromYourOperatorBackend();
updateBalanceDisplay(newBalance);
```

**7b — Subscribe to cashout**

Start monitoring cashout eligibility so the "Cash Out" button can appear in My Bets.

```js
await fetch("/api/v1/odds88/cashout/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...playerHeaders },
  body: JSON.stringify({ betSlipId: betId, playerId: userId }),
});
```

**7c — Begin status polling (for open bets)**

Poll the lightweight status endpoint every 5–10 seconds. Stop when the status is terminal.

```js
const TERMINAL = new Set(["won", "lost", "voided", "cashed_out", "cancelled"]);

async function pollBetStatus(betId) {
  const res = await fetch(`/api/v1/bets/${betId}/status`, {
    headers: playerHeaders,
  });
  const data = await res.json();

  updateBetStatusInUI(betId, data.status);

  if (!TERMINAL.has(data.status)) {
    setTimeout(() => pollBetStatus(betId), 7_000);
  } else {
    // Terminal — fetch full detail and stop polling
    const detail = await fetch(`/api/v1/bets/${betId}`, {
      headers: playerHeaders,
    }).then((r) => r.json());
    showFinalBetResult(detail.data);
    await fetch("/api/v1/odds88/cashout/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...playerHeaders },
      body: JSON.stringify({ betSlipId: betId }),
    });
  }
}

pollBetStatus(betId);
```

---

### Step 8 — Handle ODDS_CHANGED

The platform validates submitted odds against the live feed. If the odds moved between the player clicking and submitting, the bet is rejected with `ODDS_CHANGED`.

**Do not silently resubmit.** Always show the player the new price and require confirmation before resubmitting.

```js
async function handleOddsChanged() {
  // 1. Re-fetch current odds for each selection in the slip
  const updatedSelections = await Promise.all(
    slip.map(async (sel) => {
      const event = await fetch(`/api/v1/odds88/events/${sel.eventId}`).then(
        (r) => r.json(),
      );
      const market = event.data.markets.find((m) => m.id === sel.marketId);
      const selection = market?.selections.find(
        (s) => s.id === sel.selectionId,
      );
      return { ...sel, newOdds: selection?.price ?? null };
    }),
  );

  // 2. Separate moved and closed selections
  const closed = updatedSelections.filter((s) => s.newOdds === null);
  const moved = updatedSelections.filter(
    (s) => s.newOdds !== null && s.newOdds !== s.odds,
  );

  // 3. Remove closed selections
  closed.forEach((s) => removeFromSlip(s.selectionId));

  // 4. Show dialog for moved odds — require player confirmation
  if (moved.length > 0) {
    const accepted = await showOddsMovedDialog(
      moved.map((s) => ({
        name: s.selectionName,
        oldOdds: s.odds,
        newOdds: s.newOdds,
      })),
    );

    if (!accepted) return; // player declined — leave slip as-is with new prices displayed

    // 5. Update slip with new odds
    moved.forEach((s) => updateSlipOdds(s.selectionId, s.newOdds));
  }

  // 6. Generate a NEW idempotency key — never reuse the rejected key
  idempotencyKey = crypto.randomUUID();

  // 7. Resubmit
  await submitBet();
}
```

**Odds moved UI:**

```
⚠ Odds have changed

  Match Winner · Arsenal    2.20 → 2.05  ↓
  Total Goals  · Over 2.5   1.85 → 1.90  ↑

  [Cancel]   [Accept new odds & place bet]
```

Highlight price decreases in red and price increases in green. Let the player choose to accept or cancel.

---

### Step 9 — Network Failure Retry

If the `fetch` throws (timeout, connection dropped, etc.) before you receive any response, you do not know whether the bet was placed server-side.

**Reuse the same `idempotencyKey`.** The platform de-duplicates on this key — submitting twice with the same key is safe.

```js
let retryCount = 0;
const MAX_RETRIES = 3;

async function handleNetworkFailure() {
  if (retryCount >= MAX_RETRIES) {
    showError("Unable to confirm your bet. Please check My Bets or try again.");
    return;
  }
  retryCount++;
  const delay = Math.min(1000 * 2 ** retryCount, 10_000); // 2 s, 4 s, 8 s
  showRetryingBanner(retryCount, delay);
  await new Promise((r) => setTimeout(r, delay));
  await submitBet(); // same idempotencyKey — intentional
}
```

If `GET /bets/history?status=pending` shows the bet already exists, stop retrying and display it.

A **409 Conflict** response means the key was already used successfully — fetch the existing bet:

```js
if (httpStatus === 409) {
  // idempotencyKey already accepted — find and show the existing bet
  const history = await fetch("/api/v1/bets/history?status=accepted&limit=1", {
    headers: playerHeaders,
  }).then((r) => r.json());
  showBetReceipt(history.data[0]);
}
```

---

### Complete Flow — Code Skeleton

```js
// Session init (run in parallel on app load)
const [profile, limits] = await Promise.all([
  fetch("/api/v1/users/me", { headers: playerHeaders }).then((r) => r.json()),
  fetch("/api/v1/users/me/limits", { headers: playerHeaders }).then((r) =>
    r.json(),
  ),
]);
const canBet = ["active", "limited"].includes(profile.data.status);

// Bet slip state
// Each entry is either a regular leg ({ type:'selection', ... })
// or a BB leg ({ type:'betbuilder', components:[...], odds: <combined>, ... })
let slip = [];
let stake = 0;
let idempotencyKey = crypto.randomUUID();
let retryCount = 0;

// When player clicks an odds button (regular leg)
function onOddsClick(leg) {
  if (!canBet) return;
  addLeg({ type: "selection", ...leg }); // Step 2
  idempotencyKey = crypto.randomUUID();
  retryCount = 0;
}

// When player adds a BB leg (after getting price from /odds88/bet-builder/price)
function onBBLegConfirmed(eventId, eventName, components, combinedPrice) {
  if (!canBet) return;
  addLeg({
    type: "betbuilder",
    eventId,
    eventName,
    odds: combinedPrice,
    components,
  });
  idempotencyKey = crypto.randomUUID();
  retryCount = 0;
}

// When player changes stake
function onStakeChange(value) {
  stake = value;
  const betType = slip.length === 1 ? "single" : "parlay";
  const error = validateStake(stake, betType); // Step 3
  setStakeError(error);
  idempotencyKey = crypto.randomUUID();
  retryCount = 0;
}

// When player taps "Place Bet"
async function onPlaceBet() {
  const betType = slip.length === 1 ? "single" : "parlay";
  if (!canBet || validateStake(stake, betType)) return;
  await submitBet(); // Steps 5 → 6 → 7 / 8 / 9
}
```

---

### API Reference

```
POST /bets/place
Headers: x-user-id, x-operator-id, x-currency
```

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
| `sportId`     | —        | Filter by sport ID                                                             |
| `leagueId`    | —        | Filter by league ID                                                            |
| `page`        | `1`      | —                                                                              |
| `limit`       | `20`     | max `100`                                                                      |

**Response (200) — regular single bet:**

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
      "shortResult": "Won USD 125.00",
      "selections": [
        {
          "selectionId": 10234,
          "eventId": 5001,
          "marketId": 1,
          "isBetBuilder": false,
          "betBuilderBetItems": [],
          "eventName": "Arsenal vs Chelsea",
          "marketName": "Match Winner",
          "selectionName": "Arsenal",
          "oddsAtPlacement": 2.5,
          "status": "won"
        }
      ]
    }
  ]
}
```

**Response (200) — Bet Builder single:**

```json
{
  "total": 12,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "betId": "6645abc123def222",
      "betType": "single",
      "stakeAmount": 10.0,
      "potentialPayout": 47.5,
      "actualPayout": null,
      "status": "accepted",
      "currency": "USD",
      "combinedOdds": 4.75,
      "createdAt": "2026-05-18T10:05:00.000Z",
      "settledAt": null,
      "selectionCount": 1,
      "shortResult": "Pending",
      "selections": [
        {
          "selectionId": -1,
          "eventId": 5001,
          "marketId": -1,
          "isBetBuilder": true,
          "betBuilderBetItems": [
            {
              "marketId": 1,
              "selectionId": 10234,
              "marketName": "Match Winner",
              "selectionName": "Arsenal"
            },
            {
              "marketId": 14,
              "selectionId": 10891,
              "marketName": "Anytime Goalscorer",
              "selectionName": "Bukayo Saka"
            }
          ],
          "eventName": "Arsenal vs Chelsea",
          "marketName": "Bet Builder",
          "selectionName": "Bet Builder (2 selections)",
          "oddsAtPlacement": 4.75,
          "status": "pending"
        }
      ]
    }
  ]
}
```

**Response (200) — mixed parlay (BB leg + regular leg):**

```json
{
  "total": 5,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "betId": "6645abc123def333",
      "betType": "parlay",
      "stakeAmount": 10.0,
      "potentialPayout": 87.9,
      "actualPayout": null,
      "status": "accepted",
      "currency": "USD",
      "combinedOdds": 8.79,
      "createdAt": "2026-05-18T10:10:00.000Z",
      "settledAt": null,
      "selectionCount": 2,
      "shortResult": "Pending",
      "selections": [
        {
          "selectionId": -1,
          "eventId": 5001,
          "marketId": -1,
          "isBetBuilder": true,
          "betBuilderBetItems": [
            {
              "marketId": 1,
              "selectionId": 10234,
              "marketName": "Match Winner",
              "selectionName": "Arsenal"
            },
            {
              "marketId": 14,
              "selectionId": 10891,
              "marketName": "Anytime Goalscorer",
              "selectionName": "Bukayo Saka"
            }
          ],
          "eventName": "Arsenal vs Chelsea",
          "marketName": "Bet Builder",
          "selectionName": "Bet Builder (2 selections)",
          "oddsAtPlacement": 4.75,
          "status": "pending"
        },
        {
          "selectionId": 20100,
          "eventId": 5002,
          "marketId": 5,
          "isBetBuilder": false,
          "betBuilderBetItems": [],
          "eventName": "Man City vs Liverpool",
          "marketName": "Match Winner",
          "selectionName": "Man City",
          "oddsAtPlacement": 1.85,
          "status": "pending"
        }
      ]
    }
  ]
}
```

**Rendering BB legs in the history list:**

Check `isBetBuilder` on each selection to decide how to render it:

```js
function renderHistorySelection(sel) {
  if (sel.isBetBuilder) {
    return (
      <div className="bb-history-leg">
        <span className="event">{sel.eventName}</span>
        <span className="badge">Bet Builder</span>
        <span className="odds">{sel.oddsAtPlacement.toFixed(2)}</span>
        <ul className="components">
          {sel.betBuilderBetItems.map((item, i) => (
            <li key={i}>
              {item.marketName} · {item.selectionName}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="regular-leg">
      <span className="event">{sel.eventName}</span>
      <span className="market">{sel.marketName}</span>
      <span className="selection">{sel.selectionName}</span>
      <span className="odds">{sel.oddsAtPlacement.toFixed(2)}</span>
    </div>
  );
}
```

> Each item in `betBuilderBetItems` includes `marketName` and `selectionName` resolved at placement time — use them directly for display without any extra API calls.

`shortResult` is pre-formatted for display: `"Pending"`, `"Won USD 125.00"`, `"Lost"`, `"Voided"`, `"Cashed Out USD 37.50"`, `"Cancelled"`.

---

### Bet Detail

```
GET /bets/:betId
Headers: x-user-id, x-operator-id
```

**Success (200) — regular parlay:**

```json
{
  "data": {
    "betId": "6645abc123def111",
    "betType": "parlay",
    "status": "accepted",
    "shortResult": "Pending",
    "stakeAmount": 25.0,
    "potentialPayout": 625.0,
    "actualPayout": null,
    "combinedOdds": 25.0,
    "selectionCount": 2,
    "currency": "USD",
    "walletReserveRef": "txn_abc123",
    "rejectionReason": null,
    "createdAt": "2026-05-18T10:01:00.000Z",
    "acceptedAt": "2026-05-18T10:01:00.100Z",
    "settledAt": null,
    "cashoutAmount": null,
    "cashoutAt": null,
    "selections": [
      {
        "selectionId": 10234,
        "eventId": 5001,
        "marketId": 1,
        "isBetBuilder": false,
        "betBuilderBetItems": [],
        "eventName": "Arsenal vs Chelsea",
        "marketName": "Match Winner",
        "selectionName": "Arsenal",
        "status": "pending",
        "settlementResult": null,
        "oddsAtPlacement": 2.5,
        "stakePortion": 25.0,
        "potentialPayout": 62.5,
        "actualPayout": null,
        "settledAt": null,
        "eventSnapshot": { "id": 5001, "name": "Arsenal vs Chelsea" },
        "marketSnapshot": { "id": 1, "name": "Match Winner" },
        "selectionSnapshot": { "id": 10234, "name": "Arsenal", "price": 2.5 }
      }
    ],
    "statusTimeline": [
      {
        "fromStatus": "pending",
        "toStatus": "accepted",
        "reason": null,
        "createdBy": "system",
        "createdAt": "2026-05-18T10:01:00.100Z"
      }
    ],
    "walletTransactions": [
      {
        "operation": "debit",
        "status": "success",
        "externalRef": "txn_abc123",
        "amount": 25.0,
        "currency": "USD",
        "createdAt": "2026-05-18T10:01:00.000Z"
      }
    ]
  }
}
```

**Success (200) — BB leg + regular leg parlay:**

```json
{
  "data": {
    "betId": "6645abc123def333",
    "betType": "parlay",
    "status": "accepted",
    "shortResult": "Pending",
    "stakeAmount": 10.0,
    "potentialPayout": 87.9,
    "actualPayout": null,
    "combinedOdds": 8.79,
    "selectionCount": 2,
    "currency": "USD",
    "walletReserveRef": "txn_def456",
    "rejectionReason": null,
    "createdAt": "2026-05-18T10:10:00.000Z",
    "acceptedAt": "2026-05-18T10:10:00.120Z",
    "settledAt": null,
    "cashoutAmount": null,
    "cashoutAt": null,
    "selections": [
      {
        "selectionId": -1,
        "eventId": 5001,
        "marketId": -1,
        "isBetBuilder": true,
        "betBuilderBetItems": [
          {
            "marketId": 1,
            "selectionId": 10234,
            "marketName": "Match Winner",
            "selectionName": "Arsenal"
          },
          {
            "marketId": 14,
            "selectionId": 10891,
            "marketName": "Anytime Goalscorer",
            "selectionName": "Bukayo Saka"
          }
        ],
        "eventName": "Arsenal vs Chelsea",
        "marketName": "Bet Builder",
        "selectionName": "Bet Builder (2 selections)",
        "status": "pending",
        "settlementResult": null,
        "oddsAtPlacement": 4.75,
        "stakePortion": 10.0,
        "potentialPayout": 47.5,
        "actualPayout": null,
        "settledAt": null,
        "eventSnapshot": { "id": 5001, "name": "Arsenal vs Chelsea" },
        "marketSnapshot": { "id": -1, "name": "Bet Builder" },
        "selectionSnapshot": { "id": -1, "name": "Bet Builder", "price": 4.75 }
      },
      {
        "selectionId": 20100,
        "eventId": 5002,
        "marketId": 5,
        "isBetBuilder": false,
        "betBuilderBetItems": [],
        "eventName": "Man City vs Liverpool",
        "marketName": "Match Winner",
        "selectionName": "Man City",
        "status": "pending",
        "settlementResult": null,
        "oddsAtPlacement": 1.85,
        "stakePortion": 10.0,
        "potentialPayout": 18.5,
        "actualPayout": null,
        "settledAt": null,
        "eventSnapshot": { "id": 5002, "name": "Man City vs Liverpool" },
        "marketSnapshot": { "id": 5, "name": "Match Winner" },
        "selectionSnapshot": { "id": 20100, "name": "Man City", "price": 1.85 }
      }
    ],
    "statusTimeline": [
      {
        "fromStatus": "pending",
        "toStatus": "accepted",
        "reason": null,
        "createdBy": "system",
        "createdAt": "2026-05-18T10:10:00.120Z"
      }
    ],
    "walletTransactions": [
      {
        "operation": "debit",
        "status": "success",
        "externalRef": "txn_def456",
        "amount": 10.0,
        "currency": "USD",
        "createdAt": "2026-05-18T10:10:00.000Z"
      }
    ]
  }
}
```

**Selection field reference:**

| Field                | Regular leg           | Bet Builder leg                                                                    |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `selectionId`        | Selection ID          | `-1`                                                                               |
| `marketId`           | Market ID             | `-1`                                                                               |
| `isBetBuilder`       | `false`               | `true`                                                                             |
| `betBuilderBetItems` | `[]`                  | Array of `{ marketId, selectionId, marketName, selectionName }` for each component |
| `marketName`         | e.g. `"Match Winner"` | `"Bet Builder"`                                                                    |
| `selectionName`      | e.g. `"Arsenal"`      | `"Bet Builder (N selections)"`                                                     |
| `eventSnapshot`      | Full event data       | Full event data                                                                    |
| `marketSnapshot`     | Market data           | `{ id: -1, name: "Bet Builder" }`                                                  |
| `selectionSnapshot`  | Selection data        | `{ id: -1, name: "Bet Builder", price: <combinedOdds> }`                           |

**Other field notes:**

| Field                | Notes                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| `shortResult`        | Pre-formatted result string — present on both history and detail              |
| `selectionCount`     | Number of **legs** (a BB leg with 3 components counts as 1)                   |
| `walletReserveRef`   | External reference from the operator wallet debit — useful for reconciliation |
| `rejectionReason`    | Populated for `rejected` bets; `null` otherwise                               |
| `cashoutAt`          | Timestamp of cashout; `null` if not cashed out                                |
| `settlementResult`   | Per-selection outcome once settled; `null` while pending                      |
| `statusTimeline`     | Ordered list of every status transition                                       |
| `walletTransactions` | Debit / credit records including cashout credit if cashed out                 |

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

> The returned `cashoutAmount` is the **odds88-confirmed** value. It may differ slightly from the amount you requested if the market moved between your request and odds88's confirmation — always display the confirmed figure.

**Rejected by odds provider (422):** Cashout refused (market moved too far, selection settled, etc.). Bet stays `accepted`.

```json
{ "error": "Cashout rejected by odds provider" }
```

**Failed (502):** Odds provider accepted but the operator wallet credit failed. Bet stays `accepted` — let the player retry.

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

Combines **2 or more selections from the same event** into one single "super-leg" at a combined price. The entire combo is settled as one outcome — all components must win for the leg to win.

Only show the Bet Builder UI if the event has `isBetBuilderSupported: true`.

---

### Bet Builder flow overview

```
[1] Player picks 2+ selections from one event
        ↓
[2] POST /odds88/bet-builder/price  →  get combined price + requestId
        ↓
[3] Add the BB "super-leg" to the bet slip
        ↓
[4] POST /bets/place  →  send betBuilderBetItems in the selection
        ↓
[5] Follow the same post-placement actions as a regular bet
```

---

### Step 1 — Check event eligibility

Only call the BB price endpoint if the event supports it:

```js
// From GET /odds88/events/:eventId or the live event data
if (!event.eventInfo.isBetBuilderSupported) {
  hideBetBuilderUI();
  return;
}
```

---

### Step 2 — Get the combined price

Call this every time the player adds or removes a component selection. Debounce by ~300 ms to avoid hammering the endpoint.

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

| Field       | Notes                                                            |
| ----------- | ---------------------------------------------------------------- |
| `requestId` | Fresh `crypto.randomUUID()` per request                          |
| `segmentId` | Always `1` unless instructed otherwise by your platform operator |
| `eventId`   | All components must belong to this event                         |
| `bets`      | Minimum 2 items; no maximum enforced but keep under 10 for UX    |

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

**Rejected by odds provider (200):** `price` is absent, `rejectInfo` is populated.

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

| `reason` | Meaning                                                        | What to show                     |
| -------- | -------------------------------------------------------------- | -------------------------------- |
| `1`      | A component selection is no longer available                   | Remove the unavailable selection |
| `2`      | Stake would exceed max bet (`maxBet` in response)              | Show max-bet warning             |
| `3`      | These selections cannot be combined (correlated)               | "These picks can't be combined"  |
| `4`      | Alternative odds are available (`alternativeOdds` in response) | Offer the alternative price      |

```js
const BB_REQUEST_DEBOUNCE = 300;
let bbTimer = null;

function onBBSelectionChange(eventId, components) {
  if (components.length < 2) {
    clearBBPrice();
    return;
  }

  clearTimeout(bbTimer);
  bbTimer = setTimeout(async () => {
    const res = await fetch("/api/v1/odds88/bet-builder/price", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...playerHeaders },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        segmentId: 1,
        eventId,
        bets: components.map((c) => ({
          marketId: c.marketId,
          selectionId: c.selectionId,
        })),
      }),
    });
    const { data } = await res.json();

    if (data.rejectInfo) {
      showBBRejectReason(data.rejectInfo.reason, data.rejectInfo.message);
      clearBBPrice();
    } else {
      setBBPrice(data.price); // show the combined odds, enable "Add to slip"
    }
  }, BB_REQUEST_DEBOUNCE);
}
```

---

### Step 3 — Store the BB leg in the slip

A BB leg is stored differently from a regular leg because it holds a list of component selections, all from one event, with the combined price.

```js
// Internal slip state for a Bet Builder leg
const bbLeg = {
  type: "betbuilder", // distinguish from regular 'selection'
  eventId: 5001,
  eventName: "Arsenal vs Chelsea",
  odds: 4.75, // combined BB price from Step 2
  components: [
    {
      marketId: 1,
      selectionId: 10234,
      marketName: "Match Winner",
      selectionName: "Arsenal",
    },
    {
      marketId: 14,
      selectionId: 10891,
      marketName: "Anytime Goalscorer",
      selectionName: "Bukayo Saka",
    },
  ],
};
```

Rules:

- All components must belong to the **same `eventId`**
- You cannot have two selections from the same market within one BB leg
- A BB leg counts as **one leg** toward `parlay.maxParlayLegs`
- A BB leg from event A can be combined as a parlay leg with regular selections from events B, C, etc.

---

### Step 4 — Display the BB leg in the slip

```js
function renderBBLeg(leg) {
  return (
    <div className="bb-leg">
      <div className="bb-header">
        <span className="event-name">{leg.eventName}</span>
        <span className="bb-badge">Bet Builder</span>
        <span className="bb-odds">{leg.odds.toFixed(2)}</span>
      </div>
      <ul className="bb-components">
        {leg.components.map((c, i) => (
          <li key={i}>
            <span className="market-name">{c.marketName}</span>
            <span className="separator">·</span>
            <span className="selection-name">{c.selectionName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Step 5 — Convert slip state to placement payload

A BB leg maps to a single entry in `selections` with `marketId: -1` and `selectionId: -1`. These sentinel values tell both the platform and the odds provider that this is a Bet Builder leg — skip standard market/selection lookup and use the combined price from `betBuilderBetItems` instead.

```js
function toPlacementSelection(leg) {
  if (leg.type === "betbuilder") {
    return {
      eventId: leg.eventId,
      marketId: -1, // sentinel — identifies this as a BB leg
      selectionId: -1, // sentinel — identifies this as a BB leg
      odds: leg.odds, // combined BB price from /odds88/bet-builder/price
      betBuilderBetItems: leg.components.map((c) => ({
        marketId: c.marketId,
        selectionId: c.selectionId,
      })),
    };
  }
  // Regular leg — no betBuilderBetItems needed
  return {
    eventId: leg.eventId,
    marketId: leg.marketId,
    selectionId: leg.selectionId,
    odds: leg.odds,
  };
}
```

---

### Payload examples

#### A — Standalone BB single bet (one super-leg)

```json
POST /bets/place

{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440010",
  "betType":        "single",
  "stake":          10.00,
  "currency":       "USD",
  "selections": [
    {
      "eventId":     5001,
      "marketId":    -1,
      "selectionId": -1,
      "odds":        4.75,
      "betBuilderBetItems": [
        { "marketId": 1,  "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    }
  ]
}
```

- `marketId: -1` and `selectionId: -1` are the sentinel values for any BB leg
- `betType` is `"single"` because there is **one leg** (the BB leg itself has two components, but they are one combined outcome)
- `odds` is the **combined** price from `POST /odds88/bet-builder/price` — not the individual odds of any component
- `betBuilderBetItems` lists all component market/selection pairs

#### B — BB leg + regular leg (2-fold parlay)

```json
POST /bets/place

{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440011",
  "betType":        "parlay",
  "stake":          10.00,
  "currency":       "USD",
  "selections": [
    {
      "eventId":     5001,
      "marketId":    -1,
      "selectionId": -1,
      "odds":        4.75,
      "betBuilderBetItems": [
        { "marketId": 1,  "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    },
    {
      "eventId":     5002,
      "marketId":    5,
      "selectionId": 20100,
      "odds":        1.85
    }
  ]
}
```

- Leg #1: BB leg from event 5001 (`marketId: -1, selectionId: -1`)
- Leg #2: Regular selection from event 5002
- Combined parlay odds: 4.75 × 1.85 = **8.79**
- Potential payout: 10.00 × 8.79 = **$87.90**

#### C — BB leg + BB leg (2-fold parlay, different events)

```json
POST /bets/place

{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440012",
  "betType":        "parlay",
  "stake":          10.00,
  "currency":       "USD",
  "selections": [
    {
      "eventId":     5001,
      "marketId":    -1,
      "selectionId": -1,
      "odds":        4.75,
      "betBuilderBetItems": [
        { "marketId": 1,  "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    },
    {
      "eventId":     5002,
      "marketId":    -1,
      "selectionId": -1,
      "odds":        3.20,
      "betBuilderBetItems": [
        { "marketId": 5, "selectionId": 20100 },
        { "marketId": 8, "selectionId": 20505 }
      ]
    }
  ]
}
```

- Each BB leg is from a **different event** — event 5001 and 5002
- Both legs must win for the parlay to win
- Combined odds: 4.75 × 3.20 = **15.20**

#### D — BB leg + regular leg + regular leg (3-fold parlay)

```json
POST /bets/place

{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440013",
  "betType":        "parlay",
  "stake":          5.00,
  "currency":       "USD",
  "selections": [
    {
      "eventId":     5001,
      "marketId":    -1,
      "selectionId": -1,
      "odds":        4.75,
      "betBuilderBetItems": [
        { "marketId": 1,  "selectionId": 10234 },
        { "marketId": 14, "selectionId": 10891 }
      ]
    },
    {
      "eventId":     5002,
      "marketId":    1,
      "selectionId": 11002,
      "odds":        1.85
    },
    {
      "eventId":     5003,
      "marketId":    2,
      "selectionId": 30088,
      "odds":        1.60
    }
  ]
}
```

- 3 legs total: 1 BB leg + 2 regular legs from 3 different events
- Combined odds: 4.75 × 1.85 × 1.60 = **14.06**
- Potential payout: 5.00 × 14.06 = **$70.30**

---

### Complete JS function — build placement payload

```js
function buildPlaceBetPayload({ slip, stake, currency }) {
  const betType = slip.length === 1 ? "single" : "parlay";

  return {
    idempotencyKey: crypto.randomUUID(),
    betType,
    stake,
    currency,
    selections: slip.map((leg) => {
      if (leg.type === "betbuilder") {
        return {
          eventId: leg.eventId,
          marketId: -1,
          selectionId: -1,
          odds: leg.odds,
          betBuilderBetItems: leg.components.map((c) => ({
            marketId: c.marketId,
            selectionId: c.selectionId,
          })),
        };
      }
      return {
        eventId: leg.eventId,
        marketId: leg.marketId,
        selectionId: leg.selectionId,
        odds: leg.odds,
      };
    }),
  };
}
```

---

### Combined odds display (all leg types)

```js
function getDisplayOdds(leg) {
  return leg.type === "betbuilder" ? leg.odds : leg.odds;
}

function getCombinedOdds(slip) {
  return slip.reduce((acc, leg) => acc * getDisplayOdds(leg), 1);
}

function getPotentialPayout(slip, stake) {
  return stake * getCombinedOdds(slip);
}

// Slip with 1 BB leg (4.75) + 1 regular leg (1.85)
// combinedOdds = 4.75 × 1.85 = 8.7875  → display as 8.79
// potentialPayout = 10.00 × 8.7875 = 87.875  → display as $87.88
```

---

### Constraints summary

| Rule                             | Detail                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Min components per BB leg        | 2                                                                                         |
| All components same event        | YES — cannot mix events in one BB leg                                                     |
| BB leg counts as one parlay leg  | YES                                                                                       |
| BB + regular legs in same parlay | YES — from different events                                                               |
| BB + BB legs in same parlay      | YES — each from a different event                                                         |
| Same event twice in parlay       | NO — unless one is a BB leg and the other is a regular selection, which odds88 may reject |
| `betBuilderBetItems` required    | YES for any BB leg in `/bets/place`                                                       |

---

### ODDS_CHANGED on a BB leg

If the placement is rejected with `ODDS_CHANGED`, re-fetch the BB price before showing the player the new value. Do not re-use the old combined price.

```js
async function refreshBBLeg(leg) {
  const res = await fetch("/api/v1/odds88/bet-builder/price", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...playerHeaders },
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      segmentId: 1,
      eventId: leg.eventId,
      bets: leg.components.map((c) => ({
        marketId: c.marketId,
        selectionId: c.selectionId,
      })),
    }),
  });
  const { data } = await res.json();

  if (data.rejectInfo) {
    removeLegFromSlip(leg); // component is gone or correlated
    showBBUnavailableMessage(data.rejectInfo.message);
    return null;
  }

  return { ...leg, odds: data.price }; // updated BB leg
}
```

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
      "competitors": [
        { "id": 301, "name": "Manchester City" },
        { "id": 302, "name": "Arsenal" }
      ],
      "picks": [
        {
          "role": "player_prop",
          "eventId": 5001,
          "marketId": 88001,
          "selectionId": 10234,
          "marketName": "Anytime Goalscorer",
          "outcomeName": "Erling Haaland",
          "odds": 2.1,
          "parameters": null,
          "extraParameters": null,
          "selectionExtraParameters": null
        },
        {
          "role": "match_result",
          "eventId": 5001,
          "marketId": 1,
          "selectionId": 10001,
          "marketName": "Match Result",
          "outcomeName": "Manchester City",
          "odds": 1.85,
          "parameters": null,
          "extraParameters": null,
          "selectionExtraParameters": null
        },
        {
          "role": "total_goals",
          "eventId": 5001,
          "marketId": 90012,
          "selectionId": 10099,
          "marketName": "Total Goals",
          "outcomeName": "Over 2.5",
          "odds": 1.72,
          "parameters": { "totalValue": 2.5 },
          "extraParameters": null,
          "selectionExtraParameters": null
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

| Field                              | Description                                                                                                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cardId`                           | Stable identifier — use as React / template key                                                                                                                             |
| `playerName`                       | Hero player display name                                                                                                                                                    |
| `competitors`                      | Home/away competitor objects — use for team name display                                                                                                                    |
| `picks[].role`                     | `player_prop` \| `match_result` \| `total_goals`                                                                                                                            |
| `picks[].odds`                     | Decimal price **at response time** — validate at placement                                                                                                                  |
| `picks[].parameters`               | Market parameters (e.g. `{ "totalValue": 2.5 }` for Over/Under) — use to build display labels                                                                               |
| `picks[].extraParameters`          | Additional market parameters from the odds provider                                                                                                                         |
| `picks[].selectionExtraParameters` | Selection-level extra parameters from the odds provider                                                                                                                     |
| `combinedOdds`                     | Product of all three leg odds — computed locally                                                                                                                            |
| `bbCombinedOdds`                   | Confirmed combined Bet Builder price from the odds provider, or `null` if BB is unavailable for this combo. Use this when placing as a BB single instead of `combinedOdds`. |
| `displayOrder`                     | Already sorted server-side                                                                                                                                                  |

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
          "competitors": [
            { "id": 301, "name": "Man City" },
            { "id": 302, "name": "Arsenal" }
          ],
          "marketId": 1,
          "selectionId": 10001,
          "marketName": "Match Result",
          "outcomeName": "Man City",
          "odds": 1.85,
          "parameters": null,
          "extraParameters": null,
          "selectionExtraParameters": null
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

| Field                             | Description                                                            |
| --------------------------------- | ---------------------------------------------------------------------- |
| `couponId`                        | Stable identifier — use as React / template key                        |
| `foldCount`                       | Number of legs (always equals `legs.length`)                           |
| `combinedOdds`                    | Server-computed product of all leg odds                                |
| `socialProof.betCount`            | Only present when enough bets exist — show as "187+ bets on this"      |
| `legs[].competitors`              | Home/away competitor objects for the event — use for team name display |
| `legs[].parameters`               | Market parameters (e.g. `{ "totalValue": 2.5 }` for Over/Under)        |
| `legs[].extraParameters`          | Additional market parameters from the odds provider                    |
| `legs[].selectionExtraParameters` | Selection-level extra parameters from the odds provider                |
| `displayOrder`                    | Already sorted server-side                                             |

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

The platform caches widget responses in Redis. The TTL is admin-configurable (`autoRefreshInterval`, default 60 s). You do not need your own server-side cache — mirror the same interval on the frontend so your refresh aligns with when the server will have fresh data.

```js
const WIDGET_REFRESH_MS = 60_000; // match the server's autoRefreshInterval (default 60 s)

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
- [ ] Widgets refreshed on the server's `autoRefreshInterval` cadence (default 60 s); paused when browser tab is hidden

**Analytics**

- [ ] `GET /users/me/analytics/overview` used for "My Stats" summary
- [ ] `netPnl` shown from player's perspective (negative = player is down)
- [ ] `streak` shown only when `current` > 1
