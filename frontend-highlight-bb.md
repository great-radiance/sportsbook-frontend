# Bet Builder Highlights

A home-page widget that surfaces curated **Bet Builder** cards — one per match — each combining 2–3 pre-selected market picks into a single validated price. Unlike Star Players (which always centres on a player prop), every pick slot here is freely configurable per sport: any BB-supported market type can fill any slot.

**Base URL:** `https://your-platform-domain.com/api/v1`  
**Admin Base URL:** `https://your-platform-domain.com/api/v1/admin`  
**Auth (admin):** `x-operator-key: <your-api-key>`

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Public Endpoint](#public-endpoint)
3. [Response Structure](#response-structure)
4. [Frontend Integration](#frontend-integration)
   - [Rendering a Card](#rendering-a-card)
   - [Placing the Bet Builder Bet](#placing-the-bet-builder-bet)
5. [Sport Configuration (Auto-generation)](#sport-configuration-auto-generation)
   - [Market Slots](#market-slots)
   - [Selection Strategy](#selection-strategy)
   - [Selection Filter](#selection-filter)
6. [Override System](#override-system)
   - [Suppress a Card](#suppress-a-card)
   - [Pin a Card](#pin-a-card)
   - [Manual Card](#manual-card)
7. [Admin Endpoints](#admin-endpoints)
8. [Widget Settings](#widget-settings)
9. [Caching](#caching)

---

## How It Works

```
GET /home/bet-builder-highlights
         │
         ▼
  Redis cache hit? ──yes──▶  return cached response
         │ no
         ▼
  Load widget config
  Load active overrides (pin / suppress / manual)
  Load SportAutoConfig.highlights.marketSlots[] per sport
         │
         ▼
  Fetch events from Redis
  (tradingStatus = Open, isBetBuilderSupported = true, sorted ASC by kick-off)
         │
         ▼
  For each event:
    ├─ Skip if eventId is suppressed
    ├─ Load this sport's marketSlots[], ordered by slotIndex
    ├─ For each slot → try marketTypes[] in order → first open BB market wins
    ├─ Pick one selection using selectionStrategy + selectionFilter
    └─ If any slot fails to resolve → skip this event entirely
         │
         ▼
  Validate all resolved cards via POST /odds88/bet-builder/price (parallel)
  Drop any card whose BB price is rejected or unavailable
         │
         ▼
  Sort: pinned overrides first → auto cards by kick-off ASC
  Prepend manual override cards
  Slice to limit
         │
         ▼
  Batch-translate sport / league / region names
  Write result to Redis cache (TTL = autoRefreshInterval seconds)
         │
         ▼
  Return { data: cards[], meta: { count, generatedAt } }
```

**A card only appears if every configured slot resolves to a live, BB-validated pick.** Events whose sport has no `highlights.marketSlots` configured are skipped entirely.

---

## Public Endpoint

```
GET /home/bet-builder-highlights
```

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `lang` | string | `en` | Language code for sport / league / region name translation |
| `limit` | number | `20` | Max cards to return. Hard cap: `50` |
| `sportId` | number | *(all)* | Filter to a single sport |

**Success (200):**

```json
{
  "data": [ ...cards ],
  "meta": {
    "count": 3,
    "generatedAt": "2026-06-01T09:00:00.000Z"
  }
}
```

---

## Response Structure

Each entry in `data[]` is a highlight card:

```json
{
  "cardId": "bbh_12345",
  "eventId": 12345,
  "matchName": "San Antonio Spurs - New York Knicks",
  "sport":   { "id": 2,  "name": "Basketball" },
  "league":  { "id": 88, "name": "USA - NBA" },
  "region":  { "id": 3,  "name": "USA" },
  "startTime": "2026-04-06T09:30:00.000Z",
  "competitors": [
    { "id": 101, "name": "San Antonio Spurs" },
    { "id": 102, "name": "New York Knicks" }
  ],
  "picks": [
    {
      "slotIndex": 0,
      "label": "Victor Wembanyama Total Points",
      "eventId": 12345,
      "marketId": 9001,
      "selectionId": 7701,
      "marketName": "Player Total Points",
      "outcomeName": "Over 28.5",
      "odds": 1.95,
      "parameters": null,
      "extraParameters": null,
      "selectionExtraParameters": null
    },
    {
      "slotIndex": 1,
      "label": "Jalen Brunson Total Points",
      "eventId": 12345,
      "marketId": 9002,
      "selectionId": 7702,
      "marketName": "Player Total Points",
      "outcomeName": "Over 26.5",
      "odds": 1.87,
      "parameters": null,
      "extraParameters": null,
      "selectionExtraParameters": null
    },
    {
      "slotIndex": 2,
      "label": "Karl-Anthony Towns Total Points",
      "eventId": 12345,
      "marketId": 9003,
      "selectionId": 7703,
      "marketName": "Player Total Points",
      "outcomeName": "Over 18.5",
      "odds": 1.86,
      "parameters": null,
      "extraParameters": null,
      "selectionExtraParameters": null
    }
  ],
  "combinedOdds": 6.80,
  "bbCombinedOdds": 6.80,
  "displayOrder": 1
}
```

**Field reference:**

| Field | Description |
|---|---|
| `cardId` | Unique card ID. Auto: `bbh_{eventId}`. Manual: `bbh_manual_{eventId}_{hex}` |
| `eventId` | The event this card belongs to |
| `matchName` | Full match name as stored in the odds feed |
| `sport` / `league` / `region` | Translated entity names for the requested `lang` |
| `startTime` | ISO-8601 kick-off time |
| `competitors` | Home and away team |
| `picks[]` | Ordered list of resolved picks (ordered by `slotIndex`) |
| `picks[].slotIndex` | Slot position (0-based) |
| `picks[].label` | Display label — set in admin slot config, falls back to `marketName` |
| `picks[].marketId` / `picks[].selectionId` | IDs needed to build the BB bet slip |
| `picks[].outcomeName` | The selected outcome, e.g. `"Over 28.5"` |
| `picks[].odds` | Individual leg odds |
| `picks[].parameters` / `picks[].extraParameters` / `picks[].selectionExtraParameters` | Pass-through parameters required by the BB price API and bet placement |
| `combinedOdds` | Product of all pick odds (calculated locally) |
| `bbCombinedOdds` | Price returned by the BB price API (server-validated). **Use this as the displayed odds** |
| `displayOrder` | 1-based render order |

---

## Frontend Integration

### Rendering a Card

Display each card as a tile. Use `bbCombinedOdds` as the shown odds (server-validated), not `combinedOdds`. Render picks in `slotIndex` order. Use the `label` field as the pick description text.

```
┌──────────────────────────────────────────────────┐
│  BET+  Thu 06/04 · 09:30                        │
│                                                  │
│  USA - NBA                                       │
│  San Antonio Spurs - New York Knicks             │
│                                                  │
│  ○  Victor Wembanyama Total Points - Over 28.5   │
│  ○  Jalen Brunson Total Points - Over 26.5       │
│  ○  Karl-Anthony Towns Total Points - Over 18.5  │
│                                                  │
│                  6.80                            │
└──────────────────────────────────────────────────┘
```

**Key points:**
- Show `bbCombinedOdds` on the odds button
- If `bbCombinedOdds` is `null`, the card was not returned (the server filters these out automatically)
- `startTime` is in UTC — convert to the player's local timezone before displaying

---

### Placing the Bet Builder Bet

When the player taps the odds button on a highlight card:

**Step 1 — Get the current BB price**

Always fetch a fresh price immediately before adding to the bet slip. Do not use `bbCombinedOdds` from the widget response as the bet price — it may be stale.

```
POST /odds88/bet-builder/price
Content-Type: application/json

{
  "requestId": "<uuid>",
  "segmentId": <your-segment-id>,
  "eventId":   12345,
  "bets": [
    { "marketId": 9001, "selectionId": 7701 },
    { "marketId": 9002, "selectionId": 7702 },
    { "marketId": 9003, "selectionId": 7703 }
  ]
}
```

Build the `bets` array directly from `card.picks`:

```js
const bets = card.picks.map(p => ({
  marketId:    p.marketId,
  selectionId: p.selectionId,
}));
```

**Price response (200):**

```json
{
  "data": {
    "requestId": "<uuid>",
    "price": 6.80,
    "timeStamp": "...",
    "rejectInfo": null
  }
}
```

If `rejectInfo` is not null, the combination is no longer available — show an error and do not add to the bet slip.

**Step 2 — Add to bet slip as a Bet Builder leg**

After a valid price is returned, construct the bet slip leg. Bet Builder legs use `marketId: -1` and `selectionId: -1` as sentinels, with the actual picks in `betBuilderBetItems`:

```js
const bbLeg = {
  eventId:            card.eventId,
  marketId:           -1,
  selectionId:        -1,
  odds:               priceResponse.data.price,
  betBuilderBetItems: card.picks.map(p => ({
    marketId:    p.marketId,
    selectionId: p.selectionId,
    marketName:  p.marketName,
    selectionName: p.outcomeName,
  })),
  // Display metadata
  eventName:   card.matchName,
  marketName:  'Bet Builder',
  outcomeName: card.picks.map(p => p.outcomeName).join(' + '),
};
```

**Step 3 — Submit the bet**

```
POST /bets
Content-Type: application/json
x-user-id: player_001
x-operator-id: a1b2c3d4e5f6g7h8

{
  "idempotencyKey": "<uuid>",
  "betType": "single",
  "stakeAmount": 10.00,
  "currency": "USD",
  "selections": [
    {
      "eventId":     12345,
      "marketId":    -1,
      "selectionId": -1,
      "odds":        6.80,
      "betBuilderBetItems": [
        { "marketId": 9001, "selectionId": 7701 },
        { "marketId": 9002, "selectionId": 7702 },
        { "marketId": 9003, "selectionId": 7703 }
      ]
    }
  ]
}
```

**Complete add-to-slip flow:**

```js
async function addHighlightCardToSlip(card) {
  // 1. Fetch fresh price
  const priceRes = await fetch('/api/v1/odds88/bet-builder/price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      segmentId: YOUR_SEGMENT_ID,
      eventId:   card.eventId,
      bets:      card.picks.map(p => ({ marketId: p.marketId, selectionId: p.selectionId })),
    }),
  }).then(r => r.json());

  if (priceRes.data?.rejectInfo) {
    showError('This combination is no longer available.');
    return;
  }

  const currentPrice = priceRes.data.price;

  // 2. Warn if price drifted more than a threshold from the displayed odds
  if (Math.abs(currentPrice - card.bbCombinedOdds) > 0.05) {
    const accepted = await showPriceChangedDialog({
      old: card.bbCombinedOdds,
      current: currentPrice,
    });
    if (!accepted) return;
  }

  // 3. Add to slip
  addToSlip({
    type:               'betbuilder',
    eventId:            card.eventId,
    marketId:           -1,
    selectionId:        -1,
    odds:               currentPrice,
    betBuilderBetItems: card.picks.map(p => ({
      marketId:      p.marketId,
      selectionId:   p.selectionId,
      marketName:    p.marketName,
      selectionName: p.outcomeName,
    })),
    eventName:   card.matchName,
    marketName:  'Bet Builder',
    outcomeName: card.picks.map(p => `${p.label} - ${p.outcomeName}`).join(' | '),
  });
}
```

---

## Sport Configuration (Auto-generation)

Each sport gets its own list of **market slots**. The engine works through the slot list for every open event that supports Bet Builder — for each slot it tries the `marketTypes[]` candidate list in order and picks the first open BB-supported market it finds.

Configure slots via the auto-config endpoint:

```
PUT  /admin/home/auto-config/:sportId        Full replace
PATCH /admin/home/auto-config/:sportId       Partial update (pass only highlights)
```

### Market Slots

```json
{
  "highlights": {
    "marketSlots": [
      {
        "slotIndex":         0,
        "label":             "Player Total Points",
        "marketTypes":       [1450, 1451, 1452],
        "selectionStrategy": "highest_odds",
        "selectionFilter":   "over_only"
      },
      {
        "slotIndex":         1,
        "label":             "Match Winner",
        "marketTypes":       [1],
        "selectionStrategy": "lowest_odds",
        "selectionFilter":   "exclude_draw"
      },
      {
        "slotIndex":         2,
        "label":             "Total Points",
        "marketTypes":       [18, 19],
        "selectionStrategy": "lowest_odds",
        "selectionFilter":   "over_only"
      }
    ]
  }
}
```

**Slot fields:**

| Field | Required | Description |
|---|---|---|
| `slotIndex` | Yes | 0-based display position on the card. Slots are rendered in this order |
| `label` | No | Human-readable name shown on the card. Falls back to the matched market's name if omitted |
| `marketTypes` | Yes | Candidate market type IDs, tried left to right. First open BB-supported market wins |
| `selectionStrategy` | No | How to choose one outcome within the market. Default: `lowest_odds` |
| `selectionFilter` | No | Pre-filter outcomes before strategy applies. Optional |

**An event is skipped if any slot cannot be resolved (no market found or no valid selection after filtering).**

---

### Selection Strategy

| Value | Picks the selection with… |
|---|---|
| `lowest_odds` | Lowest price (most likely outcome). **Default** |
| `highest_odds` | Highest price (longest shot) |
| `first` | First available outcome — no sorting applied |

---

### Selection Filter

Applied before the strategy picks a winner. Only outcomes passing the filter enter the pool.

| Value | Keeps outcomes where… |
|---|---|
| `over_only` | Name contains the word `over` (case-insensitive) |
| `under_only` | Name contains the word `under` (case-insensitive) |
| `exclude_draw` | Name does not match `draw` or `X` (case-insensitive) |
| *(none)* | All active BB-supported outcomes with `price > 1` |

---

### Example Configurations by Sport

**NBA / Basketball**

```json
{
  "marketSlots": [
    { "slotIndex": 0, "label": "Player Total Points", "marketTypes": [1450, 1451], "selectionStrategy": "highest_odds", "selectionFilter": "over_only" },
    { "slotIndex": 1, "label": "Match Total Assists",  "marketTypes": [1460],       "selectionStrategy": "lowest_odds",  "selectionFilter": "over_only" },
    { "slotIndex": 2, "label": "Total Points",         "marketTypes": [18, 19],     "selectionStrategy": "lowest_odds",  "selectionFilter": "over_only" }
  ]
}
```

**Football / Soccer**

```json
{
  "marketSlots": [
    { "slotIndex": 0, "label": "Match Winner",    "marketTypes": [1],    "selectionStrategy": "lowest_odds", "selectionFilter": "exclude_draw" },
    { "slotIndex": 1, "label": "Both Teams Score", "marketTypes": [37],   "selectionStrategy": "lowest_odds" },
    { "slotIndex": 2, "label": "Total Goals",      "marketTypes": [18],   "selectionStrategy": "lowest_odds", "selectionFilter": "over_only" }
  ]
}
```

**WNBA / Basketball**

```json
{
  "marketSlots": [
    { "slotIndex": 0, "label": "Match Total Assists",  "marketTypes": [1460], "selectionStrategy": "lowest_odds", "selectionFilter": "over_only" },
    { "slotIndex": 1, "label": "Match Total Rebounds", "marketTypes": [1461], "selectionStrategy": "lowest_odds", "selectionFilter": "over_only" },
    { "slotIndex": 2, "label": "Total Points",         "marketTypes": [18],   "selectionStrategy": "lowest_odds", "selectionFilter": "over_only" }
  ]
}
```

---

## Override System

Admins can control which cards appear without touching the auto-generation config. Three override types are available.

| Type | Effect |
|---|---|
| `suppress` | Hides the auto-generated card for a specific `eventId` |
| `pin` | Keeps the auto-generated card but floats it to the top of the list |
| `manual` | Replaces auto-generation for a specific event with a fully hand-crafted card |

All overrides support `expiresAt` (auto-deactivates at a given UTC time), `displayOrder`, and `note`.

---

### Suppress a Card

Hide an event that was auto-generated but should not be featured.

```
POST /admin/home/bet-builder-highlights
Content-Type: application/json
x-operator-key: <your-api-key>

{
  "type":    "suppress",
  "eventId": 12345,
  "note":    "Event postponed"
}
```

---

### Pin a Card

Force an auto-generated card to appear at the very top of the widget, regardless of kick-off order.

```
POST /admin/home/bet-builder-highlights
Content-Type: application/json
x-operator-key: <your-api-key>

{
  "type":    "pin",
  "eventId": 99999,
  "note":    "Featured NBA final"
}
```

---

### Manual Card

Provide the full card content. Picks are specified directly — the auto-generation engine is bypassed for this event.

```
POST /admin/home/bet-builder-highlights
Content-Type: application/json
x-operator-key: <your-api-key>

{
  "type":      "manual",
  "eventId":   12345,
  "matchName": "Monaco - Nanterre",
  "picks": [
    {
      "slotIndex":   0,
      "label":       "Top Points Scorer in the Game",
      "eventId":     12345,
      "marketId":    5001,
      "selectionId": 3301,
      "marketName":  "Top Points Scorer",
      "outcomeName": "Elie Okobo",
      "odds":        2.10
    },
    {
      "slotIndex":   1,
      "label":       "Winner",
      "eventId":     12345,
      "marketId":    5002,
      "selectionId": 3302,
      "marketName":  "Match Winner",
      "outcomeName": "Monaco",
      "odds":        1.65
    },
    {
      "slotIndex":   2,
      "label":       "Total Points",
      "eventId":     12345,
      "marketId":    5003,
      "selectionId": 3303,
      "marketName":  "Total Points",
      "outcomeName": "Over 173.5",
      "odds":        2.08
    }
  ],
  "displayOrder": 1,
  "expiresAt":    "2026-04-03T03:00:00.000Z",
  "note":         "Manually featured for Pro A final"
}
```

> `picks[].odds` values are used to compute the local `combinedOdds`. The `bbCombinedOdds` will still be fetched from the BB price API at generation time — if the combination is rejected by the provider, the manual card will not appear.

---

## Admin Endpoints

### List Overrides

```
GET /admin/home/bet-builder-highlights
x-operator-key: <your-api-key>
```

Returns all overrides sorted by `displayOrder`, then `createdAt` descending.

---

### Create Override

```
POST /admin/home/bet-builder-highlights
x-operator-key: <your-api-key>
```

**Body (pin / suppress):**

```json
{
  "type":    "pin | suppress",
  "eventId": 12345,
  "note":    "optional"
}
```

**Body (manual):**

```json
{
  "type":         "manual",
  "eventId":      12345,
  "matchName":    "Team A - Team B",
  "picks":        [ ...pick objects ],
  "displayOrder": 0,
  "expiresAt":    "2026-06-30T23:59:00.000Z",
  "note":         "optional"
}
```

Responds **201** with the created document.

---

### Update Override

```
PATCH /admin/home/bet-builder-highlights/:cardId
x-operator-key: <your-api-key>
```

Updatable fields: `displayOrder`, `active`, `expiresAt`, `note`, `matchName`, `picks`.

```json
{
  "active":       false,
  "expiresAt":    "2026-06-01T12:00:00.000Z",
  "displayOrder": 2
}
```

---

### Delete Override

```
DELETE /admin/home/bet-builder-highlights/:cardId
x-operator-key: <your-api-key>
```

Responds **204 No Content**.

---

### Preview (bypass cache)

Generates all home widgets live and returns the results without touching the cache. Useful for QA.

```
GET /admin/home/preview?lang=en
x-operator-key: <your-api-key>
```

Response includes `betBuilderHighlights` alongside `starPlayers` and `trendingAccas`:

```json
{
  "starPlayers":          { "data": [...], "meta": { "count": 5, "generatedAt": "..." } },
  "betBuilderHighlights": { "data": [...], "meta": { "count": 3, "generatedAt": "..." } },
  "trendingAccas":        { "data": [...], "meta": { "count": 3, "generatedAt": "..." } }
}
```

---

### Sport Auto-Config Endpoints

```
GET    /admin/home/auto-config                   List all sport configs
GET    /admin/home/auto-config/:sportId          Get single sport config
PUT    /admin/home/auto-config/:sportId          Full replace (pass highlights + starPlayer + acca)
PATCH  /admin/home/auto-config/:sportId          Partial update — only pass what changes
DELETE /admin/home/auto-config/:sportId          Remove config entirely
```

**PATCH example — update only highlights slots:**

```
PATCH /admin/home/auto-config/2
x-operator-key: <your-api-key>

{
  "highlights": {
    "marketSlots": [
      { "slotIndex": 0, "label": "Player Total Points", "marketTypes": [1450], "selectionStrategy": "highest_odds", "selectionFilter": "over_only" },
      { "slotIndex": 1, "label": "Match Winner",         "marketTypes": [1],    "selectionStrategy": "lowest_odds",  "selectionFilter": "exclude_draw" },
      { "slotIndex": 2, "label": "Total Points",         "marketTypes": [18],   "selectionStrategy": "lowest_odds",  "selectionFilter": "over_only" }
    ]
  }
}
```

**GET response shape (single sport):**

```json
{
  "data": {
    "sportId":   2,
    "sportName": "Basketball",
    "enabled":   true,
    "starPlayer": {
      "marketRoles": [ ... ]
    },
    "highlights": {
      "marketSlots": [
        { "slotIndex": 0, "label": "Player Total Points", "marketTypes": [1450, 1451], "selectionStrategy": "highest_odds", "selectionFilter": "over_only" },
        { "slotIndex": 1, "label": "Match Winner",         "marketTypes": [1],          "selectionStrategy": "lowest_odds",  "selectionFilter": "exclude_draw" },
        { "slotIndex": 2, "label": "Total Points",         "marketTypes": [18],          "selectionStrategy": "lowest_odds",  "selectionFilter": "over_only" }
      ]
    },
    "acca": { ... }
  }
}
```

If no config exists for the requested sport, the endpoint returns `enabled: false` and empty arrays rather than a 404.

---

## Widget Settings

The shared widget config document controls the max card count:

```
PUT /admin/home/settings
x-operator-key: <your-api-key>

{
  "maxBetBuilderHighlightCards": 12
}
```

| Setting | Default | Effect |
|---|---|---|
| `maxBetBuilderHighlightCards` | `20` | Upper bound on cards returned by auto-generation |
| `autoRefreshInterval` | `60` | Cache TTL in seconds (shared with all home widgets) |
| `featuredLeaguesOnly` | `false` | When `true`, only events from featured leagues appear (respects sidebar config) |

---

## Caching

Responses are cached in Redis per `lang` and `sportId`.

| Cache key | TTL |
|---|---|
| `home:bet-builder-highlights:{lang}:{sportId\|all}` | `autoRefreshInterval` seconds (default 60s) |

**Cache is flushed automatically when:**
- Any bet builder highlight override is created, updated, or deleted
- Any sport auto-config is updated or deleted
- Widget settings are updated

**Cache is NOT written if** the generator returned zero cards (prevents caching an empty state during feed downtime).

To force a fresh generation during QA without modifying any config, use the admin preview endpoint — it bypasses the cache entirely and does not write to it.

---

## Key Differences vs Star Players

| | Star Players | Bet Builder Highlights |
|---|---|---|
| Card headline | Player name | Match name |
| Pick structure | Rigid 3 roles: `player_prop` + `match_result` + `total_goals` | Flexible N slots — any market type per slot |
| Slot count | Always 3 | Configurable (1 to N) per sport |
| Per-slot label | Role name | Custom label set in admin slot config |
| BB validation | Yes | Yes (same mechanism) |
| Override model | `StarPlayerOverride` | `BetBuilderHighlightOverride` |
| Card ID prefix | `sp_` | `bbh_` |
| Cache key prefix | `home:star-players:` | `home:bet-builder-highlights:` |
