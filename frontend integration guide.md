# Frontend Integration Guide

**Base URL:** `https://your-platform-domain.com/api/v1`  
**WebSocket:** `wss://your-platform-domain.com/ws`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [How Requests Flow](#how-requests-flow)
2. [Authentication](#authentication)
   - [Getting the Player JWT](#getting-the-player-jwt)
   - [Attaching the JWT](#attaching-the-jwt)
   - [Token Expiry](#token-expiry)
3. [Public Data — No Auth Required](#public-data--no-auth-required)
   - [Sidebar Navigation](#sidebar-navigation)
   - [Sports, Leagues, Regions](#sports-leagues-regions)
   - [Events](#events)
   - [Odds (REST)](#odds-rest)
4. [Real-Time Odds (WebSocket)](#real-time-odds-websocket)
   - [Connecting](#connecting)
   - [Message Types](#message-types)
   - [Applying Delta Updates](#applying-delta-updates)
   - [Reconnection](#reconnection)
5. [Player Session — JWT Required](#player-session--jwt-required)
   - [Player Profile](#player-profile)
   - [Balance](#balance)
   - [Betting Limits](#betting-limits)
   - [Player Exposure](#player-exposure)
6. [Bet Placement](#bet-placement)
   - [Place a Bet](#place-a-bet)
   - [Rejection Reasons](#rejection-reasons)
   - [Idempotency](#idempotency)
7. [My Bets](#my-bets)
   - [Bet History](#bet-history)
   - [Full Bet Detail](#full-bet-detail)
   - [Lightweight Status Poll](#lightweight-status-poll)
8. [Cashout](#cashout)
9. [Error Handling](#error-handling)
10. [Quick Reference](#quick-reference)
11. [Integration Checklist](#integration-checklist)

---

## How Requests Flow

The frontend **never calls the operator backend directly**. The sportsbook platform is the single point of contact for all player-facing operations.

```
                    ┌──────────────────────────────────────────────────────┐
                    │              SPORTSBOOK PLATFORM                     │
                    │                                                      │
  FRONTEND ─────── │──► public odds / events / sidebar (no auth)          │
                    │                                                      │
  FRONTEND ─────── │──► player routes (Authorization: Bearer <jwt>)       │
             JWT    │         │                                             │
                    │         ▼                                             │
                    │   wallet callback ────────────────────► OPERATOR     │
                    │   (balance, debit, credit, rollback)    WALLET       │
                    └──────────────────────────────────────────────────────┘

  OPERATOR BACKEND ────► POST /operators/auth/login ──────► returns JWT
                │
                └──────────────────────────────────────► FRONTEND (receives JWT)
```

**What the frontend does:**
- Receives the JWT from your **operator backend** (never calls login itself)
- Calls public endpoints for odds and navigation
- Calls player endpoints with the JWT for balance, placing bets, and history

**What the platform does on your behalf:**
- Fetches balance from your wallet via `getBalance` callback
- Debits and credits your wallet on every bet action
- Receives live odds from odds88 and pushes them over WebSocket

---

## Authentication

### Getting the Player JWT

Your **operator backend** calls this — not the frontend. When a player opens the sportsbook, your backend issues the login request and passes the resulting JWT to the frontend.

```
POST /api/v1/operators/auth/login
Headers:
  X-API-ID:  <operatorId>
  X-API-Key: <operatorKey>
```

```json
{
  "playerId":   "player_001",
  "languageId": "en"
}
```

What happens internally:
1. Platform verifies operator credentials
2. Platform calls your `webhookUrl` with the player's ID
3. Your webhook returns the player's profile (name, email, currency, etc.)
4. Platform upserts the player and issues a JWT

**Response:**
```json
{
  "data": {
    "playerId":     "player_001",
    "operatorId":   "a1b2c3d4e5f6g7h8",
    "username":     "john_doe",
    "email":        "john@example.com",
    "status":       "active",
    "currency":     "USD",
    "language":     "en",
    "lastActiveAt": "2026-05-14T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Pass `token` to the frontend. The player uses it for all protected endpoints.

---

### Attaching the JWT

```js
// Store in memory — do not use localStorage (XSS risk for financial apps)
let sbToken = null;

function setToken(token) {
  sbToken = token;
}

function authHeaders() {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${sbToken}`,
  };
}
```

---

### Token Expiry

JWTs expire after **24 hours**. On any `401` response, ask the operator backend to re-issue the token (call login again), then retry the original request.

```js
async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: authHeaders() });

  if (res.status === 401) {
    // Ask your operator backend to refresh the token
    const newToken = await requestTokenRefresh();
    setToken(newToken);
    // Retry once
    return fetch(url, { ...options, headers: authHeaders() });
  }

  return res;
}
```

---

## Public Data — No Auth Required

Odds, events, sports, leagues, and sidebar data are fully public — no token needed.

---

### Sidebar Navigation

The sidebar is a pre-built compact navigation tree. Use it to drive the left-side sports menu.

```
GET /api/v1/sidebar
GET /api/v1/sidebar?lang=en&status=1
```

**Query parameters:**

| Param | Description |
|-------|-------------|
| `lang` | Language code for translated names (`en`, `tr`, etc.) — default: `en` |
| `status` | Filter by event status numeric code |
| `tradingStatus` | Filter by trading status |

**Response — compact array format:**

```
[
  FeaturedMatchesEntry,
  FeaturedLeaguesEntry,
  ...SportEntries
]

FeaturedMatchesEntry  = [eventCount, eventIds[]]
FeaturedLeaguesEntry  = [[leagueId, leagueName, eventCount, eventIds[]], ...]
SportEntry            = [sportId, sportName, eventCount, famousLeagues[], regions[]]
famousLeagues         = [leagueId, leagueName, eventCount, eventIds[]]
regions               = [regionId, regionName, eventCount, leagues[]]
leagues               = [leagueId, leagueName, eventCount, eventIds[]]
```

**Example response:**
```json
[
  [3, [5001, 5002, 5003]],
  [
    [101, "Premier League", 4, [5001, 5002, 5010, 5011]],
    [204, "La Liga",        2, [5020, 5021]]
  ],
  [1, "Soccer", 47,
    [[101, "Premier League", 4, [5001, 5002, 5010, 5011]]],
    [
      [10, "England", 12,
        [
          [101, "Premier League", 4, [5001, 5002, 5010, 5011]],
          [102, "Championship",   2, [5030, 5031]]
        ]
      ],
      [5, "Spain", 8,
        [
          [204, "La Liga", 2, [5020, 5021]]
        ]
      ]
    ]
  ],
  [3, "Basketball", 18,
    [],
    [
      [15, "USA", 10,
        [[501, "NBA", 10, [6001, 6002]]]
      ]
    ]
  ]
]
```

**Parsing the array:**
```js
function parseSidebar(data) {
  const [featuredMatches, featuredLeagues, ...sports] = data;

  return {
    featuredMatchEventIds: featuredMatches[1],           // number[]
    featuredLeagues: featuredLeagues.map(([id, name, count, eventIds]) =>
      ({ id, name, count, eventIds })
    ),
    sports: sports.map(([id, name, count, famousLeagues, regions]) => ({
      id, name, count,
      famousLeagues: famousLeagues.map(([lid, lname, lcount, leventIds]) =>
        ({ id: lid, name: lname, count: lcount, eventIds: leventIds })
      ),
      regions: regions.map(([rid, rname, rcount, leagues]) => ({
        id: rid, name: rname, count: rcount,
        leagues: leagues.map(([lid, lname, lcount, leventIds]) =>
          ({ id: lid, name: lname, count: lcount, eventIds: leventIds })
        ),
      })),
    })),
  };
}
```

---

### Sports, Leagues, Regions

```
GET /api/v1/sports
GET /api/v1/sports/:id
GET /api/v1/leagues?sportId=1&regionId=10
GET /api/v1/leagues/:id
GET /api/v1/regions
GET /api/v1/regions/:id
GET /api/v1/markets
```

**Sports response:**
```json
{
  "data": [
    { "id": 1, "name": "Soccer",     "active": true },
    { "id": 3, "name": "Basketball", "active": true }
  ]
}
```

**Leagues response:**
```json
{
  "data": [
    { "id": 101, "name": "Premier League", "sportId": 1, "regionId": 10, "active": true }
  ]
}
```

---

### Events

```
GET /api/v1/events?sportId=1&leagueId=101&status=live
GET /api/v1/events/:eventId
```

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `sportId` | number | Filter by sport |
| `leagueId` | number | Filter by league |
| `regionId` | number | Filter by region |
| `status` | string | Event status filter |

**Response:**
```json
{
  "source": "cache",
  "data": [
    {
      "eventId": 5001,
      "eventInfo": {
        "id":        5001,
        "name":      "Arsenal vs Chelsea",
        "status":    1,
        "startTime": "2026-05-14T15:00:00.000Z",
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

---

### Odds (REST)

Use for server-side rendering or as a fallback when WebSocket is unavailable.

```
GET /api/v1/odds?eventId=5001
GET /api/v1/odds?sportId=1
GET /api/v1/odds?leagueId=101
GET /api/v1/odds/:eventId
```

For the full live event tree in compact array format (good for initial hydration):

```
GET /api/v1/odds88/events/array?sportId=1&leagueId=204&lang=en
```

---

## Real-Time Odds (WebSocket)

WebSocket is the recommended method for live odds. The platform sends a full snapshot on connect and pushes incremental deltas as odds change.

### Connecting

```
wss://your-platform-domain.com/ws/odds88/events
wss://your-platform-domain.com/ws/odds88/events?sportId=1
wss://your-platform-domain.com/ws/odds88/events?leagueId=204
wss://your-platform-domain.com/ws/odds88/events?sportId=1&leagueId=204
```

**Query parameters (all optional):**

| Param | Description |
|-------|-------------|
| `sportId` | Receive updates for this sport only |
| `regionId` | Receive updates for this region only |
| `leagueId` | Receive updates for this league only |

No auth header needed — the odds feed is public.

```js
function connectOddsFeed({ sportId, leagueId } = {}) {
  const params = new URLSearchParams();
  if (sportId)  params.set('sportId',  sportId);
  if (leagueId) params.set('leagueId', leagueId);

  const url = `wss://your-platform-domain.com/ws/odds88/events?${params}`;
  const ws  = new WebSocket(url);

  ws.onopen    = ()    => console.log('[odds] connected');
  ws.onclose   = ()    => scheduleReconnect();
  ws.onerror   = (err) => console.error('[odds] error', err);
  ws.onmessage = (e)   => handleOddsMessage(JSON.parse(e.data));

  return ws;
}
```

---

### Message Types

Every message has a `type` field.

#### `snapshot` — sent immediately on connect

Full current state for your filter. Render this as the initial odds board.

```json
{
  "type": "snapshot",
  "data": [
    [1, "Soccer", 47,
      [...famousLeagues],
      [[10, "England", 12, [[101, "Premier League", 4, [...events]]]]]
    ]
  ]
}
```

#### `delta` — pushed continuously as odds change

An array of change messages. Each message has a `type` property identifying the change kind.

```json
{
  "type":  "delta",
  "data":  [ ...deltaMessages ]
}
```

**Delta message types:**

| `type` value | What changed | Key fields |
|---|---|---|
| `EventSnapshot` | Full event data updated | `eventId`, `eventInfo`, `markets[]` |
| `EventStatusChanged` | Event status changed (e.g. started, finished) | `eventId`, `status`, `tradingStatus` |
| `EventChanged` | Event metadata changed (name, time, score) | `eventId`, modified fields |
| `ScoreboardChanged` | Live score updated | `eventId`, `scoreboard` |
| `MarketsChanged` | Odds changed on one or more markets | `eventId`, `markets[]` |
| `BetCancel` | A selection was cancelled | `eventId`, `marketId`, `selectionId` |

#### `error` — fatal feed error

```json
{
  "type":    "error",
  "message": "Failed to load snapshot"
}
```

Close and reconnect on receiving this.

---

### Applying Delta Updates

```js
// Minimal odds store
const oddsStore = new Map(); // eventId → event object

function handleOddsMessage(msg) {
  switch (msg.type) {
    case 'snapshot':
      buildStoreFromSnapshot(msg.data);
      renderFullBoard();
      break;

    case 'delta':
      for (const change of msg.data) {
        applyDelta(change);
      }
      break;

    case 'error':
      console.error('[odds] feed error — reconnecting');
      ws.close();
      break;
  }
}

function applyDelta(change) {
  switch (change.type) {
    case 'EventSnapshot':
      oddsStore.set(change.eventId, change);
      renderEvent(change.eventId);
      break;

    case 'MarketsChanged':
      const event = oddsStore.get(change.eventId);
      if (!event) break;
      for (const updatedMarket of change.markets) {
        const idx = event.markets.findIndex(m => m.id === updatedMarket.id);
        if (idx >= 0) {
          highlightOddsChange(event.markets[idx], updatedMarket);
          event.markets[idx] = updatedMarket;
        }
      }
      renderEvent(change.eventId);
      break;

    case 'EventStatusChanged':
      const ev = oddsStore.get(change.eventId);
      if (ev) {
        ev.eventInfo.status        = change.status;
        ev.eventInfo.tradingStatus = change.tradingStatus;
        renderEvent(change.eventId);
      }
      break;

    case 'ScoreboardChanged':
      const e = oddsStore.get(change.eventId);
      if (e) {
        e.scoreboard = change.scoreboard;
        renderScoreboard(change.eventId);
      }
      break;

    case 'BetCancel':
      markSelectionCancelled(change.eventId, change.marketId, change.selectionId);
      break;
  }
}
```

---

### Reconnection

```js
let reconnectDelay = 1000;

function scheduleReconnect() {
  setTimeout(() => {
    ws = connectOddsFeed(currentFilter);
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
  }, reconnectDelay);
}

// Reset delay on successful connect
ws.onopen = () => {
  reconnectDelay = 1000;
  // snapshot arrives automatically — no manual resync needed
};
```

A fresh snapshot is sent automatically on every reconnect. You do not need to track or resume a revision manually.

---

## Player Session — JWT Required

All routes below require `Authorization: Bearer <player-jwt>`.

---

### Player Profile

```
GET /api/v1/users/me
```

```json
{
  "data": {
    "playerId":     "player_001",
    "operatorId":   "a1b2c3d4e5f6g7h8",
    "username":     "john_doe",
    "email":        "john@example.com",
    "status":       "active",
    "riskLevel":    1,
    "currency":     "USD",
    "language":     "en",
    "lastActiveAt": "2026-05-14T10:00:00.000Z"
  }
}
```

**Player status values and recommended UI behaviour:**

| Status | Behaviour |
|--------|-----------|
| `active` | Normal — all features available |
| `suspended` | Show banner, disable bet slip |
| `blocked` | Show permanent block message, disable all betting |
| `self_excluded` | Show self-exclusion message, disable all betting |
| `limited` | Show limits banner, betting allowed with restrictions |
| `pending_verification` | Show KYC prompt, disable betting until verified |

Check status on every session start and after any `422` bet rejection.

---

### Balance

The platform fetches the balance from your operator wallet on every call (cached for 10 seconds in Redis). The platform does not store balances.

```
GET /api/v1/users/me/balance
```

```json
{
  "balance":  250.00,
  "currency": "USD",
  "source":   "operator_wallet",
  "note":     "Approximate value — operator wallet is the source of truth"
}
```

`source` is `"cache"` when served from the 10-second Redis cache.

**When to refresh:**
- On session start
- After a bet is accepted
- After a cashout completes
- On user-triggered "refresh balance" action

**On `502`:** The operator wallet was unreachable. Show the last known balance with a "balance unavailable" indicator — do not block the UI.

---

### Betting Limits

Returns the effective limits for the player's next bet, resolved across the full hierarchy (platform → operator → sport → league → user).

```
GET /api/v1/users/me/limits
```

```json
{
  "data": {
    "single": {
      "minStake":      1.00,
      "maxStake":      10000.00,
      "maxPayout":     500000.00,
      "maxDailyStake": 100000.00,
      "maxDailyPayout": 1000000.00,
      "currency":      "USD"
    },
    "parlay": {
      "minStake":      1.00,
      "maxStake":      500.00,
      "maxPayout":     250000.00,
      "maxParlayLegs": 12,
      "maxDailyStake": 50000.00,
      "maxDailyPayout": 500000.00,
      "currency":      "USD"
    }
  }
}
```

**How to use these values:**
- `minStake` / `maxStake` → min/max on the stake input
- `maxParlayLegs` → cap the number of selections in a parlay bet slip
- `maxPayout` → show "max payout" below the potential payout display
- `maxDailyStake` + `GET /users/me/exposure` → responsible gambling progress bar

---

### Player Exposure

Today's staking activity for the logged-in player.

```
GET /api/v1/users/me/exposure
```

```json
{
  "data": {
    "unsettledLiability":   125.00,
    "dailyStakeTotal":      500.00,
    "dailyPayoutLiability": 1250.00,
    "periodDate":           "2026-05-14",
    "currency":             "USD"
  }
}
```

| Field | Description |
|-------|-------------|
| `dailyStakeTotal` | Total staked today — compare with `maxDailyStake` for RG bar |
| `unsettledLiability` | Potential payout of all open bets |
| `dailyPayoutLiability` | Maximum possible payout across all of today's open bets |

---

## Bet Placement

### Place a Bet

```
POST /api/v1/bets/place
Authorization: Bearer <player-jwt>
```

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
  "betType":        "single",
  "stake":          50.00,
  "currency":       "USD",
  "selections": [
    {
      "eventId":     5001,
      "marketId":    1,
      "selectionId": 10234,
      "odds":        2.50
    }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `idempotencyKey` | YES | UUID v4 — unique per bet attempt |
| `betType` | YES | `"single"` or `"parlay"` |
| `stake` | YES | Amount in the player's currency |
| `currency` | NO | Defaults to the player's account currency |
| `selections` | YES | One item for single; 2–N for parlay |

Each selection needs `eventId`, `marketId`, `selectionId`, and `odds`. The platform validates that the odds you send still match the live value — if they have moved, the bet is rejected with `ODDS_CHANGED`.

**Response — accepted (HTTP 201):**

The platform wraps the bet result in a `data` property (same pattern as history):

```json
{
  "data": {
    "betId":            "6645abc123def111",
    "status":           "accepted",
    "betType":          "single",
    "stakeAmount":      50.00,
    "potentialPayout":  125.00,
    "combinedOdds":     2.50,
    "currency":         "USD",
    "walletReserveRef": "wallet-txn-debit-abc123",
    "createdAt":        "2026-05-14T10:01:00.000Z",
    "selections": [
      {
        "selectionId":     10234,
        "eventId":         5001,
        "marketId":        1,
        "oddsAtPlacement": 2.50,
        "status":          "pending"
      }
    ]
  }
}
```

**Response — rejected (HTTP 200):**

```json
{
  "data": {
    "betId":           "6645abc123def112",
    "status":          "rejected",
    "rejectionReason": "ODDS_CHANGED",
    "stakeAmount":     50.00,
    "currency":        "USD",
    "createdAt":       "2026-05-14T10:01:01.000Z"
  }
}
```

Read `response.data.status` and `response.data.rejectionReason` in the client.

---

### Rejection Reasons

| Code | User-facing message |
|------|---------------------|
| `USER_SUSPENDED` | Your account is currently suspended |
| `SELECTION_CLOSED` | This market is no longer available |
| `ODDS_CHANGED` | Odds have changed — please review and resubmit |
| `STAKE_BELOW_MIN` | Minimum stake is {minStake} {currency} |
| `STAKE_ABOVE_MAX` | Maximum stake is {maxStake} {currency} |
| `PAYOUT_ABOVE_MAX` | Potential payout exceeds the maximum allowed |
| `DAILY_STAKE_EXCEEDED` | You have reached your daily stake limit |
| `DAILY_PAYOUT_EXCEEDED` | Daily payout limit reached |
| `MAX_EXPOSURE_EXCEEDED` | Betting temporarily unavailable — please try again shortly |
| `WALLET_RESERVE_FAILED` | Payment failed — check your balance and try again |
| `DUPLICATE_BET` | This bet was already submitted |

**Handling `ODDS_CHANGED`:**
```js
if (result.rejectionReason === 'ODDS_CHANGED') {
  // Re-fetch latest odds for the affected selections
  const latestOdds = await fetchLatestOdds(selections);
  // Show "odds have changed" callout with new values
  showOddsChangeDialog(latestOdds);
  // Generate a fresh idempotencyKey for the re-submission
}
```

---

### Idempotency

```js
function createBetSlip(selections, stake, betType) {
  return {
    idempotencyKey: crypto.randomUUID(),  // fresh UUID per attempt
    betType,
    stake,
    selections,
  };
}

async function placeBetWithRetry(betSlip) {
  // Use the SAME idempotencyKey on retry — prevents double placement
  try {
    return await apiFetch('/api/v1/bets/place', {
      method: 'POST',
      body:   JSON.stringify(betSlip),
    });
  } catch (networkError) {
    // On timeout/network failure: retry with the same key
    // The server returns the original result if already processed
    return await apiFetch('/api/v1/bets/place', {
      method: 'POST',
      body:   JSON.stringify(betSlip),
    });
  }
}
```

**Rules:**
- Generate a new `idempotencyKey` when the player initiates a new bet
- Keep the same key if retrying due to network failure or timeout
- Generate a new key when the player edits the bet slip and resubmits
- Generate a new key after an `ODDS_CHANGED` rejection and the player confirms new odds

**Supported `betType` values:** only `"single"` and `"parlay"`. There is no separate system-bet type on this endpoint — system combinations must be modelled as multiple singles or as a parlay with the correct leg set.

---

## My Bets

### Bet history (paginated)

```
GET /api/v1/bets/history
Authorization: Bearer <player-jwt>
```

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page index |
| `limit` | number | `20` | Page size |
| `sort` | string | `newest` | `newest` or `oldest` |
| `status` | string | — | Comma-separated filter (see below) |
| `betType` | string | — | `single` or `parlay` |
| `from` / `to` | ISO date | — | Date range |
| `sportId` / `leagueId` | number | — | Optional filters |

**Status filter values:** `pending`, `accepted`, `won`, `lost`, `voided`, `cashed_out`, `cancelled`. For open bets, request `accepted,pending`.

**Response:**

```json
{
  "total": 42,
  "page": 1,
  "limit": 10,
  "data": [
    {
      "betId": "6645abc123def111",
      "betType": "single",
      "stakeAmount": 50.0,
      "potentialPayout": 125.0,
      "actualPayout": null,
      "status": "accepted",
      "currency": "USD",
      "combinedOdds": 2.5,
      "createdAt": "2026-05-14T10:01:00.000Z",
      "settledAt": null,
      "selectionCount": 1,
      "firstEventName": "Team A vs Team B",
      "sportName": "Soccer",
      "leagueName": "Premier League",
      "shortResult": "Team A"
    }
  ]
}
```

**UI mapping:** Treat API `accepted` as an open bet in the slip (`pending` in the local bet card). Settled rows use `won`, `lost`, `voided`, `cashed_out`, `cancelled` as returned.

### Full bet detail

```
GET /api/v1/bets/:betId
Authorization: Bearer <player-jwt>
```

Returns legs with frozen `eventSnapshot`, `marketSnapshot`, and `selectionSnapshot` at placement time — use these on the receipt, not live odds.

### Lightweight status poll

```
GET /api/v1/bets/:betId/status
Authorization: Bearer <player-jwt>
```

```json
{
  "betId": "6645abc123def111",
  "status": "accepted",
  "settledAt": null,
  "actualPayout": null,
  "cashoutAmount": null
}
```

Poll every 5–10 seconds for open bets instead of loading full detail repeatedly. After auto-cashout, `status` becomes `cashed_out` and `cashoutAmount` is set.

---

## Cashout

### Auto cashout

Handled entirely server-side. When settlement triggers a cashout, the platform credits the operator wallet and updates the bet. The frontend learns about it via history or `GET /bets/:betId/status` — no request required.

### Manual cashout (odds88)

The player initiates cashout from My Bets. Flow:

#### 1. Subscribe (start monitoring cashout value)

```
POST /api/v1/odds88/cashout/subscribe
Authorization: Bearer <player-jwt>
```

```json
{
  "betSlipId": "6645abc123def111"
}
```

#### 2. Execute cashout

```
POST /api/v1/odds88/cashout
Authorization: Bearer <player-jwt>
```

```json
{
  "betSlipId": "6645abc123def111",
  "cashoutValue": 37.5
}
```

**Response:**

```json
{
  "betId": "6645abc123def111",
  "cashoutAmount": 37.5,
  "status": "cashed_out"
}
```

After success, refresh balance: `GET /users/me/balance`.

#### 3. Unsubscribe (player leaves cashout UI)

```
POST /api/v1/odds88/cashout/unsubscribe
Authorization: Bearer <player-jwt>
```

```json
{
  "betSlipId": "6645abc123def111"
}
```

---

## Error Handling

| HTTP | Meaning | Frontend action |
|------|---------|-----------------|
| `401` | JWT missing or expired | Re-login via operator; clear slip actions |
| `403` | Player not allowed | Show account status message |
| `422` | Validation / business rule | Map `rejectionReason` or field errors |
| `502` | Operator wallet unreachable | Balance: show last value + warning; bet: retry with same idempotency key |
| `503` | Platform temporarily down | Retry with backoff |

---

## Quick Reference

| Action | Method | Path | Auth |
|--------|--------|------|------|
| Player profile | GET | `/users/me` | JWT |
| Balance | GET | `/users/me/balance` | JWT |
| Limits | GET | `/users/me/limits` | JWT |
| Exposure | GET | `/users/me/exposure` | JWT |
| Place bet | POST | `/bets/place` | JWT |
| Bet history | GET | `/bets/history` | JWT |
| Bet detail | GET | `/bets/:betId` | JWT |
| Bet status | GET | `/bets/:betId/status` | JWT |
| Cashout subscribe | POST | `/odds88/cashout/subscribe` | JWT |
| Cashout execute | POST | `/odds88/cashout` | JWT |
| Cashout unsubscribe | POST | `/odds88/cashout/unsubscribe` | JWT |
| Sidebar | GET | `/sidebar` | No |
| Selected events | GET | `/odds88/events/selected` | No |

---

## Integration Checklist

- [ ] Operator backend calls `POST /operators/auth/login` and passes JWT to the iframe/app
- [ ] Frontend sets `Authorization: Bearer` on player routes (`setSportsbookUserJwt`)
- [ ] Balance loaded on session start and after accepted bet / cashout
- [ ] `POST /bets/place` uses UUID `idempotencyKey`; same key on network retry
- [ ] Selection payload uses numeric `eventId`, `marketId`, `selectionId`, and current `odds`
- [ ] `ODDS_CHANGED` shows updated odds; new idempotency key on resubmit
- [ ] Open bets: `GET /bets/history?status=accepted,pending`
- [ ] Cashout: subscribe → execute with `cashoutValue` → unsubscribe; refresh balance
- [ ] Player `status !== active` disables bet slip

---

## Frontend implementation (this repo)

How the sportsbook UI maps to the guide today:

| Guide | Implementation | File |
|-------|----------------|------|
| `POST /bets/place` | `apiPlaceBet` / `apiPlaceBetWithRetry` | `src/api/bet/placeBet.ts` |
| Bet slip submit | Single → one request per leg; Multiple → `betType: "parlay"`; Bet builder → `parlay` on building legs | `src/app/components/BetSlip/index.tsx` |
| Selection ids | `apiMarketId`, `apiSelectionId` on each slip row; odds from `getOddsValue` | `src/helpers/betslipSelection.ts`, `BetSlip/index.tsx` |
| Idempotency | New UUID per tap; **same** key on one automatic network retry | `apiPlaceBetWithRetry` |
| Rejection toasts | Maps `rejectionReason` codes to user messages | `BetSlip/index.tsx` → `rejectionReasonMessage` |
| Balance | `GET /users/me/balance` after accepted bet | `src/api/bet/apiSportsbookBalance.ts` |
| Bet history | `GET /bets/history` with `status=accepted,pending` (open) or settled list | `src/api/bet/betHistory.ts`, `OpenBets.tsx` |
| Login JWT | `POST /operators/auth/login` (operator headers only) | `src/api/auth/apiOperatorsAuthLogin.ts`, `MainLayout.tsx` |

**Gaps / legacy (not yet on sportsbook API):**

| Feature | Current behaviour | Target (guide) |
|---------|-------------------|------------------|
| Cashout offer + execute | `GET/POST /cybet/cashout/:betId/*` | Migrate to `odds88/cashout` subscribe / execute / unsubscribe |
| System bet tab | Sends multiple `parlay` requests with full leg set (placeholder) | Not supported by API — needs product decision |
| `GET /users/me/limits` | Not wired to stake inputs | Use for min/max stake and `maxParlayLegs` |
| `GET /bets/:betId` detail | History list only; no detail route in UI | Receipt / leg snapshots from detail endpoint |
| Balance on login | Operator config `xUserBalance`; sportsbook balance fetch optional | Call `apiGetSportsbookBalance` after login |

**Legacy (do not use for new work):** `POST /cybet/bets` (`sendBetRequestCybet`), `GET /bets/get-balance` (`apiGetBalance`).