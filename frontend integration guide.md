# Frontend Integration Guide

**Base URL:** `https://your-platform-domain.com/api/v1`  
**WebSocket:** `wss://your-platform-domain.com/ws`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Player Headers](#player-headers)
2. [Public Data](#public-data)
3. [Real-Time Odds (WebSocket)](#real-time-odds-websocket)
4. [Player Session](#player-session)
5. [Betting](#betting)
6. [My Bets](#my-bets)
7. [Cashout](#cashout)
8. [Bet Builder](#bet-builder)
9. [Errors](#errors)
10. [Quick Reference](#quick-reference)

---

## Player Headers

All player endpoints require these three headers. No login, no token.

```
x-user-id:   player_001
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

Returns a compact navigation tree. See [Quick Reference](#quick-reference) for the array format.

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
    "betId":           "6645abc123def111",
    "betType":         "parlay",
    "status":          "accepted",
    "stakeAmount":     25.00,
    "potentialPayout": 625.00,
    "actualPayout":    null,
    "combinedOdds":    25.00,
    "currency":        "USD",
    "createdAt":       "2026-05-18T10:01:00.000Z",
    "acceptedAt":      "2026-05-18T10:01:00.100Z",
    "settledAt":       null,
    "cashoutAmount":   null,
    "selections": [
      {
        "selectionId":      10234,
        "eventId":          5001,
        "marketId":         1,
        "status":           "pending",
        "oddsAtPlacement":  2.50,
        "eventSnapshot":    { "id": 5001, "name": "Arsenal vs Chelsea", ... },
        "marketSnapshot":   { "id": 1,    "name": "Match Result" },
        "selectionSnapshot":{ "id": 10234,"name": "Arsenal", "odds": 2.50 }
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

**Failed (404):**

```json
{ "error": "Bet not found" }
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

**Errors:**

| HTTP  | When                                                              |
| ----- | ----------------------------------------------------------------- |
| `400` | Missing `requestId`, `eventId`, `segmentId`, or fewer than 2 bets |
| `502` | odds88 upstream error                                             |
| `503` | Odds feed not connected                                           |

---

## Errors

All error responses have the same shape:

```json
{ "error": "Human-readable message" }
```

| Code  | Meaning                     | What to do                                     |
| ----- | --------------------------- | ---------------------------------------------- |
| `400` | Missing or invalid field    | Show the error message near the relevant field |
| `403` | Action not allowed          | Show "not permitted"                           |
| `404` | Not found                   | Show "not found" state                         |
| `409` | Duplicate idempotency key   | Fetch and show the existing result             |
| `422` | Bet rejected                | Map `rejectionReason` to a user message        |
| `502` | Operator wallet unreachable | Show graceful fallback, allow retry            |
| `503` | Odds feed disconnected      | Show "live odds temporarily unavailable"       |

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
| `GET`  | `/events/:eventId`            | Single event with markets                        |
| `GET`  | `/odds/:eventId`              | Odds for one event                               |
| `GET`  | `/odds88/events/array`        | Full live event tree (compact)                   |
| `GET`  | `/health/odds88/feeds/status` | Feed connectivity                                |
| `WS`   | `/ws/odds88/events`           | Live odds stream                                 |

### Player (requires `x-user-id`, `x-operator-id`)

| Method | Endpoint                      | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| `GET`  | `/users/me`                   | Player profile + status        |
| `GET`  | `/users/me/limits`            | Effective betting limits       |
| `GET`  | `/users/me/exposure`          | Today's stake totals           |
| `POST` | `/bets/place`                 | Place a bet                    |
| `GET`  | `/bets/history`               | Paginated bet list             |
| `GET`  | `/bets/:betId`                | Full bet detail                |
| `GET`  | `/bets/:betId/status`         | Lightweight status poll        |
| `POST` | `/bets/:betId/cashout`        | Execute cashout                |
| `POST` | `/odds88/cashout/subscribe`   | Subscribe bet to cashout feed  |
| `POST` | `/odds88/cashout/unsubscribe` | Unsubscribe from cashout feed  |
| `POST` | `/odds88/bet-builder/price`   | Get Bet Builder combined price |
