# Sportsbook API Integration Guide

> **Base URL:** `https://<your-host>/v2`
> All endpoints require API versioning header or are accessed via the `/v2` prefix.

---

## Authentication

Most endpoints require operator credentials passed as HTTP headers:

| Header | Description |
|--------|-------------|
| `x-api-key` | Operator API key |
| `x-api-code` | Operator API code |
| `x-user-id` | End-user identifier (bet/balance endpoints) |

---

## Table of Contents

1. [Matches & Events](#1-matches--events)
2. [Sidebar Navigation](#2-sidebar-navigation)
3. [Outright Events](#3-outright-events)
4. [Batch Odds](#4-batch-odds)
5. [Sports & Leagues](#5-sports--leagues)
6. [Upcoming Fixtures](#6-upcoming-fixtures)
7. [Event Results](#7-event-results)
8. [Team Logos](#8-team-logos)
9. [Market Groups](#9-market-groups)
10. [BFF — Event View](#10-bff--event-view)
11. [Bets](#11-bets)
12. [Cashout](#12-cashout)
13. [Admin — UI Configuration](#13-admin--ui-configuration)
14. [Sidebar Tree](#14-sidebar-tree)
15. [Translations](#15-translations)
16. [Search](#16-search)
17. [Virtual Court / Access Token](#17-virtual-court--access-token)

---

## 1. Matches & Events

### GET `/cybet/matches/PING-EVENT/:eventId`

Fetch full event data (markets + odds) for a single event from Redis.

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | integer | Unique event ID |

**Example Request**

```
GET /v2/cybet/matches/PING-EVENT/1234567
```

**Example Response**

```json
{
  "data": {
    "eventId": 1234567,
    "sport": "football",
    "region": "England",
    "competition": "Premier League",
    "home": "Arsenal",
    "away": "Chelsea",
    "startDate": 1713000000000,
    "status": "PreMatch",
    "markets": [
      {
        "marketId": 88001,
        "name": "1X2",
        "slug": "1x2",
        "odds": [
          { "id": 1, "name": "1", "value": 2.10 },
          { "id": 2, "name": "X", "value": 3.40 },
          { "id": 3, "name": "2", "value": 3.20 }
        ]
      }
    ]
  },
  "duration": 12
}
```

---

### POST `/cybet/matches/PING-EVENTS`

Fetch a list of events for a given sport and event type (with basic market data).

**Request Body**

```json
{
  "type": "PreMatch",
  "sport": "football",
  "eventIds": [1234567, 1234568, 1234569]
}
```

| Field | Type | Values |
|-------|------|--------|
| `type` | string | `"InPlay"` \| `"PreMatch"` |
| `sport` | string | Sport slug e.g. `"football"` |
| `eventIds` | number[] | Array of event IDs |

**Example Response**

```json
{
  "data": [
    {
      "eventId": 1234567,
      "home": "Arsenal",
      "away": "Chelsea",
      "startDate": 1713000000000,
      "markets": [
        {
          "slug": "1x2",
          "odds": [
            { "id": 1, "name": "1", "value": 2.10 },
            { "id": 2, "name": "X", "value": 3.40 },
            { "id": 3, "name": "2", "value": 3.20 }
          ]
        }
      ]
    }
  ],
  "duration": 18
}
```

---

### POST `/cybet/matches/PING-EVENTS-AUTO-SELECT`

Same as `PING-EVENTS` but automatically selects the best/primary market per event (operator-configured market order).

**Request Body**

```json
{
  "type": "InPlay",
  "sport": "basketball",
  "eventIds": [2000001, 2000002]
}
```

**Example Response**

```json
{
  "data": [
    {
      "eventId": 2000001,
      "home": "LA Lakers",
      "away": "Golden State Warriors",
      "startDate": 1713050000000,
      "autoSelectedMarket": {
        "slug": "match-winner",
        "odds": [
          { "id": 1, "name": "1", "value": 1.85 },
          { "id": 2, "name": "2", "value": 1.95 }
        ]
      }
    }
  ],
  "duration": 15
}
```

---

## 2. Sidebar Navigation

### GET `/cybet/matches/PING-SIDEBAR?type=1`

Returns sidebar navigation data including sports, regions, leagues, and live event counts.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `type` | integer | `1` = InPlay, `2` = PreMatch |

**Example Request**

```
GET /v2/cybet/matches/PING-SIDEBAR?type=1
```

**Example Response**

```json
{
  "data": [
    {
      "sport": "football",
      "sportName": "Football",
      "count": 42,
      "regions": [
        {
          "region": "England",
          "count": 10,
          "leagues": [
            { "league": "Premier League", "count": 5 },
            { "league": "Championship", "count": 5 }
          ]
        }
      ]
    }
  ],
  "duration": 8
}
```

---

### GET `/cybet/matches/PING-SIDEBAR-NO-OUTRIGHT?type=2`

Same as `PING-SIDEBAR` but excludes outright/futures events from counts and listings.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `type` | integer | `2` = PreMatch (typically used for pre-match sidebar) |

**Example Request**

```
GET /v2/cybet/matches/PING-SIDEBAR-NO-OUTRIGHT?type=2
```

**Example Response**

```json
{
  "data": [
    {
      "sport": "tennis",
      "sportName": "Tennis",
      "count": 15,
      "regions": [
        {
          "region": "ATP",
          "count": 8,
          "leagues": [
            { "league": "Roland Garros", "count": 4 },
            { "league": "Wimbledon", "count": 4 }
          ]
        }
      ]
    }
  ],
  "duration": 6
}
```

---

## 3. Outright Events

### GET `/cybet/matches/PING-OUTRIGHT`

Returns outright (futures/tournament winner) events grouped by sport and competition.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `type` | integer | Optional filter — `1` = InPlay, `2` = PreMatch |

**Example Request**

```
GET /v2/cybet/matches/PING-OUTRIGHT
```

**Example Response**

```json
{
  "data": [
    {
      "sport": "football",
      "competition": "Champions League Winner",
      "eventId": 9990001,
      "participants": [
        { "name": "Real Madrid", "odd": 3.50 },
        { "name": "Manchester City", "odd": 4.00 },
        { "name": "Bayern Munich", "odd": 5.00 }
      ]
    }
  ],
  "duration": 10
}
```

---

### POST `/cybet/matches/PING-OUTRIGHT-EVENTS`

Fetch full outright event details for specific event IDs.

**Request Body**

```json
{
  "eventIds": [9990001, 9990002]
}
```

**Example Response**

```json
{
  "data": [
    {
      "eventId": 9990001,
      "sport": "football",
      "competition": "Champions League Winner",
      "markets": [
        {
          "marketId": 70001,
          "name": "Outright Winner",
          "odds": [
            { "id": 1, "name": "Real Madrid", "value": 3.50 },
            { "id": 2, "name": "Manchester City", "value": 4.00 }
          ]
        }
      ]
    }
  ],
  "duration": 14
}
```

---

## 4. Batch Odds

### GET `/cybet/matches/batch-odds?ids=`

Fetch event data for multiple event IDs in one request. Ideal for populating match lists where you already know the event IDs.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `ids` | string | Comma-separated event IDs |

**Example Request**

```
GET /v2/cybet/matches/batch-odds?ids=1234567,1234568,1234569
```

**Example Response**

```json
[
  {
    "eventId": 1234567,
    "home": "Arsenal",
    "away": "Chelsea",
    "startDate": 1713000000000,
    "sport": "football",
    "status": "PreMatch",
    "markets": [ ... ]
  },
  {
    "eventId": 1234568,
    "home": "Liverpool",
    "away": "Manchester United",
    "startDate": 1713003600000,
    "sport": "football",
    "status": "PreMatch",
    "markets": [ ... ]
  }
]
```

---

### GET `/cybet/matches/MatchesMarkets?ids=`

Fetch events with operator-filtered markets applied (disabled markets are excluded). Use this when displaying markets to end users.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `ids` | string | Comma-separated event IDs |

**Example Request**

```
GET /v2/cybet/matches/MatchesMarkets?ids=1234567,1234568
```

**Example Response**

```json
[
  {
    "eventId": 1234567,
    "home": "Arsenal",
    "away": "Chelsea",
    "markets": [
      {
        "marketId": 88001,
        "slug": "1x2",
        "name": "Match Result",
        "odds": [
          { "id": 1, "name": "1", "value": 2.10 },
          { "id": 2, "name": "X", "value": 3.40 },
          { "id": 3, "name": "2", "value": 3.20 }
        ]
      }
    ]
  }
]
```

> **Difference from `batch-odds`:** `MatchesMarkets` applies operator-level market filtering. Use it for public-facing event pages. Use `batch-odds` for internal or admin tools.

---

## 5. Sports & Leagues

### GET `/cybet/matches/sports`

Returns a distinct list of sports that have active events in the system.

**Example Request**

```
GET /v2/cybet/matches/sports
```

**Example Response**

```json
[
  { "slug": "football", "name": "Football", "id": 1 },
  { "slug": "basketball", "name": "Basketball", "id": 2 },
  { "slug": "tennis", "name": "Tennis", "id": 5 }
]
```

---

### GET `/cybet/matches/leagues`

Returns leagues filtered by sport (and optionally by region).

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `sport` | string | Sport slug e.g. `"football"` |
| `region` | string | Optional region slug |

**Example Request**

```
GET /v2/cybet/matches/leagues?sport=football&region=England
```

**Example Response**

```json
[
  { "slug": "premier-league", "name": "Premier League", "region": "England" },
  { "slug": "championship", "name": "Championship", "region": "England" }
]
```

---

## 6. Upcoming Fixtures

### GET `/cybet/matches/upcoming-fixtures`

Returns upcoming (not-yet-started) fixtures with optional date range and pagination filters. Useful for building a fixtures calendar.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `from` | integer | Start timestamp (ms) — optional |
| `to` | integer | End timestamp (ms) — optional |
| `limit` | integer | Number of results (default varies) |
| `offset` | integer | Pagination offset |
| `sport` | string | Filter by sport slug |
| `region` | string | Filter by region slug |
| `competition` | string | Filter by competition slug |

**Example Request — Next 24 hours of football fixtures**

```
GET /v2/cybet/matches/upcoming-fixtures?sport=football&from=1713000000000&to=1713086400000&limit=20&offset=0
```

**Example Response**

```json
{
  "data": [
    {
      "eventId": 1234570,
      "home": "Tottenham",
      "away": "Everton",
      "startDate": 1713010000000,
      "competition": "Premier League",
      "region": "England"
    },
    {
      "eventId": 1234571,
      "home": "Aston Villa",
      "away": "Newcastle",
      "startDate": 1713014000000,
      "competition": "Premier League",
      "region": "England"
    }
  ],
  "duration": 22
}
```

---

### GET `/cybet/fixtures/access-token`

Returns a virtual court access token for live stream integrations.

**Example Request**

```
GET /v2/cybet/fixtures/access-token
```

**Example Response**

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "responseTime": 145,
  "status": "success"
}
```

---

## 7. Event Results

### GET `/cybet/matches/result/:eventId`

Returns the settlement result for a finished event (scores, market outcomes).

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | integer | Event ID of a finished match |

**Example Request**

```
GET /v2/cybet/matches/result/1234500
```

**Example Response**

```json
{
  "eventId": 1234500,
  "home": "Arsenal",
  "away": "Chelsea",
  "score": {
    "home": 2,
    "away": 1
  },
  "status": "Finished",
  "markets": [
    {
      "slug": "1x2",
      "result": "1",
      "settledOdds": [
        { "id": 1, "name": "1", "result": "win" },
        { "id": 2, "name": "X", "result": "lose" },
        { "id": 3, "name": "2", "result": "lose" }
      ]
    }
  ]
}
```

---

## 8. Team Logos

### GET `/cybet/matches/redis-logo/:sport/:teamName`

Returns the logo URL for a given participant (URL-encode the sport and team name).

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `sport` | string | URL-encoded sport slug |
| `teamName` | string | URL-encoded team/participant name |

**Example Request**

```
GET /v2/cybet/matches/redis-logo/football/Arsenal%20FC
```

**Example Response**

```json
"https://cdn.example.com/logos/football/arsenal-fc.png"
```

Returns `null` if no logo is found.

---

### POST `/cybet/matches/redis-logos`

Batch-fetch logos for multiple participants in one request.

**Request Body**

```json
{
  "sport": "football",
  "participants": ["Arsenal FC", "Chelsea FC", "Liverpool FC"]
}
```

**Example Response**

```json
{
  "Arsenal FC": "https://cdn.example.com/logos/football/arsenal-fc.png",
  "Chelsea FC": "https://cdn.example.com/logos/football/chelsea-fc.png",
  "Liverpool FC": "https://cdn.example.com/logos/football/liverpool-fc.png"
}
```

---

## 9. Market Groups

### GET `/cybet/markets/groups?sport=:sportSlug`

Returns market group configuration for a sport (used to build the market tabs UI on event detail pages).

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `sport` | string | Sport slug e.g. `"football"` |

**Example Request**

```
GET /v2/cybet/markets/groups?sport=football
```

**Example Response**

```json
[
  {
    "id": 1,
    "name": "Main Markets",
    "slug": "main-markets",
    "order": 1,
    "markets": [
      { "slug": "1x2", "name": "Match Result" },
      { "slug": "both-teams-to-score", "name": "Both Teams to Score" },
      { "slug": "over-under-2-5", "name": "Over/Under 2.5" }
    ]
  },
  {
    "id": 2,
    "name": "Goals",
    "slug": "goals",
    "order": 2,
    "markets": [
      { "slug": "total-goals", "name": "Total Goals" },
      { "slug": "first-goalscorer", "name": "First Goalscorer" }
    ]
  }
]
```

---

## 10. BFF — Event View

These endpoints serve the event view page for both In-Play and Pre-Match contexts and are optimised for the frontend BFF (Backend for Frontend) pattern.

### POST `/bff/event-view/in-play/sidebar/matches/market-details`
### POST `/bff/event-view/pre-match/sidebar/matches/market-details`

Returns market metadata and selections for a given event type. Used to render the market detail panel on the event view page.

**Headers**

| Header | Required |
|--------|----------|
| `x-api-key` | Yes |
| `x-api-code` | Yes |

**Request Body**

```json
{
  "eventType": "InPlay",
  "marketSlugs": ["1x2", "both-teams-to-score", "over-under-2-5"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | `"InPlay"` or `"PreMatch"` |
| `marketSlugs` | string[] | Market slugs to retrieve details for |

**Example — In-Play request**

```
POST /v2/bff/event-view/in-play/sidebar/matches/market-details
```

**Example Response**

```json
[
  {
    "slug": "1x2",
    "name": "Match Result",
    "columns": 3,
    "specifiers": [],
    "selections": ["1", "X", "2"]
  },
  {
    "slug": "both-teams-to-score",
    "name": "Both Teams to Score",
    "columns": 2,
    "specifiers": [],
    "selections": ["Yes", "No"]
  }
]
```

**Use case — dynamic market tab rendering**

```javascript
// Determine which BFF endpoint to call based on current page context
const endpoint = eventType === 'inPlay'
  ? '/bff/event-view/in-play/sidebar/matches/market-details'
  : '/bff/event-view/pre-match/sidebar/matches/market-details';

const details = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'x-api-code': apiCode,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ eventType, marketSlugs }),
});
```

---

## 11. Bets

### POST `/cybet/bets`

Place a new bet on behalf of a user.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | Operator API key |
| `x-user-id` | Yes | End-user ID |

**Request Body (Single / Accumulator)**

```json
{
  "stakeAmount": 10.00,
  "betKind": "single",
  "selections": [
    {
      "eventId": 1234567,
      "marketId": 88001,
      "oddId": 1,
      "oddValue": 2.10
    }
  ],
  "currency": "USD"
}
```

**Request Body (System Bet)**

```json
{
  "stakeAmount": 5.00,
  "betKind": "system",
  "systemSpecifier": "2/3",
  "selections": [
    { "eventId": 1234567, "marketId": 88001, "oddId": 1, "oddValue": 2.10 },
    { "eventId": 1234568, "marketId": 88010, "oddId": 2, "oddValue": 1.75 },
    { "eventId": 1234569, "marketId": 88020, "oddId": 3, "oddValue": 3.00 }
  ],
  "currency": "USD"
}
```

**Example Response**

```json
{
  "betId": "bet_abc123xyz",
  "status": "accepted",
  "stakeAmount": 10.00,
  "potentialWin": 21.00,
  "placedAt": 1713000500000
}
```

---

### GET `/cybet/bets/history`

Returns paginated bet history for a user.

**Headers**

| Header | Required |
|--------|----------|
| `x-api-key` | Yes |
| `x-user-id` | Yes |

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter: `"open"`, `"settled"`, `"cancelled"` |
| `from` | integer | Start timestamp |
| `to` | integer | End timestamp |
| `limit` | integer | Results per page |
| `offset` | integer | Pagination offset |

**Example Request**

```
GET /v2/cybet/bets/history?status=settled&limit=10&offset=0
Headers: x-api-key: sk_xxx, x-user-id: user_001
```

**Example Response**

```json
{
  "total": 47,
  "bets": [
    {
      "betId": "bet_abc123xyz",
      "status": "won",
      "stakeAmount": 10.00,
      "winAmount": 21.00,
      "placedAt": 1713000500000,
      "settledAt": 1713090000000,
      "selections": [
        {
          "eventId": 1234567,
          "home": "Arsenal",
          "away": "Chelsea",
          "market": "1X2",
          "selection": "1",
          "oddValue": 2.10,
          "result": "win"
        }
      ]
    }
  ]
}
```

---

### GET `v1/cybet/bets/get-balance`

Returns the current wallet balance for a user.

**Headers**

| Header | Required |
|--------|----------|
| `x-api-key` | Yes |
| `x-user-id` | Yes |

**Example Request**

```
GET /v1/cybet/bets/get-balance
Headers: x-api-key: sk_xxx, x-user-id: user_001
```

**Example Response**

```json
{
  "userId": "user_001",
  "balance": 245.50,
  "currency": "USD",
  "bonus": 10.00
}
```

---

## 12. Cashout

### GET `/cybet/cashout/:betId/cashout-offer`

Returns a real-time cashout offer for an open bet. The offer value reflects the current market state.

**Headers**

| Header | Required |
|--------|----------|
| `x-api-key` | Yes |
| `x-user-id` | Yes |

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `betId` | string | The open bet ID |

**Example Request**

```
GET /v2/cybet/cashout/bet_abc123xyz/cashout-offer
Headers: x-api-key: sk_xxx, x-user-id: user_001
```

**Example Response — Offer available**

```json
{
  "betId": "bet_abc123xyz",
  "cashoutValue": 14.50,
  "available": true,
  "expiresAt": 1713001000000
}
```

**Example Response — Offer unavailable (market suspended)**

```json
{
  "betId": "bet_abc123xyz",
  "available": false,
  "reason": "market_suspended"
}
```

---

## 13. Admin — UI Configuration

All admin endpoints require `x-api-code` and `x-api-key` headers.

### GET `/cybet/admin/ui-configuration/order-config`

Returns the sport/region/league ordering configuration for the operator's frontend.

**Example Request**

```
GET /v2/cybet/admin/ui-configuration/order-config
Headers: x-api-code: my_operator, x-api-key: sk_xxx
```

**Example Response**

```json
{
  "sports": [
    {
      "sport": "football",
      "order": 1,
      "enabled": true,
      "regions": [
        { "region": "England", "order": 1, "enabled": true },
        { "region": "Spain", "order": 2, "enabled": true }
      ]
    },
    {
      "sport": "basketball",
      "order": 2,
      "enabled": true,
      "regions": []
    }
  ]
}
```

---

### GET `/cybet/admin/ui-configuration/Featured/Leagues`

Returns the featured leagues list configured by the operator.

**Example Request**

```
GET /v2/cybet/admin/ui-configuration/Featured/Leagues
Headers: x-api-code: my_operator, x-api-key: sk_xxx
```

**Example Response**

```json
[
  { "sport": "football", "region": "England", "league": "Premier League" },
  { "sport": "football", "region": "Spain", "league": "La Liga" },
  { "sport": "basketball", "region": "USA", "league": "NBA" }
]
```

---

### POST `/cybet/admin/ui-configuration/Featured/Leagues`

Add a league to the operator's featured leagues list.

**Request Body**

```json
{
  "sport": "football",
  "region": "Italy",
  "league": "Serie A"
}
```

---

### GET `/cybet/admin/ui-configuration/Featured/Matches`

Returns featured (highlighted) matches configured by the operator.

**Example Request**

```
GET /v2/cybet/admin/ui-configuration/Featured/Matches
Headers: x-api-code: my_operator, x-api-key: sk_xxx
```

**Example Response**

```json
[
  {
    "sport": "football",
    "region": "England",
    "league": "Premier League",
    "match": 1234567,
    "eventDetails": {
      "home": "Arsenal",
      "away": "Chelsea",
      "startDate": 1713000000000
    }
  }
]
```

---

### POST `/cybet/admin/ui-configuration/Featured/Matches`

Pin a specific match to the featured section.

**Request Body**

```json
{
  "sport": "football",
  "region": "England",
  "league": "Premier League",
  "match": 1234567
}
```

---

## 14. Sidebar Tree

### GET `/cybet/sidebar/tree`

Returns the operator's custom sidebar navigation tree (manually configured nodes for custom layouts).

**Example Request**

```
GET /v2/cybet/sidebar/tree
```

**Example Response**

```json
[
  {
    "id": 1,
    "label": "Live",
    "type": "section",
    "order": 1,
    "children": [
      {
        "id": 2,
        "label": "Football",
        "type": "sport",
        "slug": "football",
        "order": 1,
        "children": []
      }
    ]
  },
  {
    "id": 3,
    "label": "Pre-Match",
    "type": "section",
    "order": 2,
    "children": []
  }
]
```

---

## 15. Translations

### GET `/cybet/translation/translate?text=:text&lang=:lang`

Translate a single text string into the target language.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `text` | string | Source text (in English) |
| `lang` | string | Target language code e.g. `"tr"`, `"de"`, `"fr"` |

**Example Request**

```
GET /v2/cybet/translation/translate?text=Match%20Result&lang=tr
```

**Example Response**

```json
{
  "text": "Match Result",
  "lang": "tr",
  "translation": "Maç Sonucu"
}
```

---

### POST `/cybet/translation/translate-map`

Batch-translate multiple strings in one request. Returns a map of `sourceText → translatedText`. Preferred over individual calls for performance.

**Request Body**

```json
{
  "lang": "tr",
  "sourceTexts": [
    "Match Result",
    "Both Teams to Score",
    "Over/Under",
    "Half Time",
    "Full Time"
  ]
}
```

**Example Response**

```json
{
  "lang": "tr",
  "translations": {
    "Match Result": "Maç Sonucu",
    "Both Teams to Score": "Her İki Takım da Gol Atar",
    "Over/Under": "Üst/Alt",
    "Half Time": "Devre Arası",
    "Full Time": "Tam Süre"
  }
}
```

> **Tip:** Pass `sourceTexts: []` (empty array) to retrieve the full translation map for a language in one shot.

---

## 16. Search

### GET `/cybet/matches/search-keyword`

Full-text search across fixtures, markets, and odds. Returns paginated results across multiple entity types.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search keyword (minimum 2 characters) |
| `limit` | integer | Results per page (default: 50) |
| `offset` | integer | Pagination offset (default: 0) |

**Example Request**

```
GET /v2/cybet/matches/search-keyword?q=Arsenal&limit=10&offset=0
```

**Example Response**

```json
{
  "totalCount": 12,
  "page": 1,
  "limit": 10,
  "data": {
    "fixture": [
      {
        "eventId": 1234567,
        "home": "Arsenal",
        "away": "Chelsea",
        "startDate": 1713000000000,
        "sport": "football",
        "competition": "Premier League"
      }
    ],
    "market": [],
    "odd": [],
    "map": [],
    "marketsMeta": []
  }
}
```

**Example — Empty / too-short query**

```
GET /v2/cybet/matches/search-keyword?q=A
```

```json
{
  "totalCount": 0,
  "page": 1,
  "limit": 50,
  "data": { "map": [], "fixture": [], "market": [], "odd": [], "marketsMeta": [] }
}
```

---

## 17. Virtual Court / Access Token

### GET `/cybet/fixtures/access-token`

Fetches a short-lived JWT access token for authenticating the embedded virtual court (live stream) player.

**Example Request**

```
GET /v2/cybet/fixtures/access-token
```

**Example Response — Success**

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ2aXJ0dWFsX2NvdXJ0IiwiaWF0IjoxNzEzMDAwMDAwfQ.abc123"
  },
  "responseTime": 145,
  "status": "success"
}
```

**Example Response — Error**

```json
{
  "message": "Failed to fetch access token",
  "responseTime": 80,
  "status": "error"
}
```

---

## Typical Frontend Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. App Init                                                 │
│     GET /cybet/matches/sports          → sport list          │
│     GET /cybet/sidebar/tree            → nav structure       │
│     GET /cybet/admin/.../order-config  → display order       │
│     GET /cybet/admin/.../Featured/Leagues → pinned leagues   │
│     GET /cybet/admin/.../Featured/Matches → pinned matches   │
│     POST /cybet/translation/translate-map → i18n strings     │
├─────────────────────────────────────────────────────────────┤
│  2. Sidebar Render                                           │
│     GET /cybet/matches/PING-SIDEBAR?type=1   → live nav      │
│     GET /cybet/matches/PING-SIDEBAR-NO-OUTRIGHT?type=2 → pre │
├─────────────────────────────────────────────────────────────┤
│  3. Match List                                               │
│     POST /cybet/matches/PING-EVENTS-AUTO-SELECT              │
│       body: { type, sport, eventIds }   → odds per event     │
├─────────────────────────────────────────────────────────────┤
│  4. Event Detail Page                                        │
│     GET  /cybet/matches/PING-EVENT/:eventId → all markets    │
│     GET  /cybet/markets/groups?sport=...    → market tabs    │
│     POST /bff/event-view/.../market-details → tab content    │
├─────────────────────────────────────────────────────────────┤
│  5. Place Bet                                                │
│     GET  /v1/cybet/bets/get-balance         → show balance   │
│     POST /cybet/bets                        → submit bet     │
│     GET  /cybet/cashout/:betId/cashout-offer → cashout value │
├─────────────────────────────────────────────────────────────┤
│  6. Results                                                  │
│     GET /cybet/matches/result/:eventId      → settlement     │
│     GET /cybet/bets/history                 → user history   │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Responses

All endpoints follow a consistent error shape:

```json
{
  "statusCode": 400,
  "message": "x-api-key header is required",
  "error": "Bad Request"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request — missing or invalid parameters |
| 401 | Unauthorised — missing or invalid API credentials |
| 404 | Resource not found |
| 500 | Internal server error |
