# Backend API Requirements — Star Players & Trending Accas (Home Page)

**To:** Backend / Platform team  
**From:** Sportsbook frontend  
**Subject:** Curated home widgets — API contracts and business rules  

---

## 1. Summary

The home page needs two curated content blocks served by the platform:

| Widget | Purpose |
|--------|---------|
| **Star Players** | Carousel highlighting popular players with a small multi-selection bundle per fixture |
| **Trending Accas** | A small set of ready-made accumulator coupons (e.g. 5-fold combos) for quick betting |

Both should be **curated and validated on the server** (open markets, correct selection types, stable ordering). The client will render the payload and map selections into the standard bet placement flow (`eventId`, `marketId`, `selectionId`, `odds`).

---

## 2. Recommended endpoints

```
GET /api/v1/home/star-players
GET /api/v1/home/trending-accas
```

**Alternative:** `GET /api/v1/home/widgets` returning both sections in one response.

**Common query parameters**

| Parameter | Type | Required | Notes |
|-----------|------|----------|--------|
| `lang` | string | Yes | Same as platform (`en`, etc.) |
| `limit` | number | No | Defaults: Star Players **20**, Trending Accas **3** coupons |
| `sportId` | number | No | Optional filter |

**Auth:** Public is acceptable (same as sidebar). Optional `Authorization: Bearer` if curation becomes player-specific later.

**Caching:** Short TTL (e.g. 30–60 seconds) or precomputed lists are fine.

---

## 3. Star Players

### 3.1 Product intent

Each card promotes a **popular player** on an upcoming fixture. The platform should:

- Choose a **player selection** from a popular / star player (e.g. goalscorer, player props — per your product rules).
- Attach **two related selections on the same match** so the card reads as a small bundle (typical pattern: match outcome + a totals line, or equivalent per sport).
- Return display copy and **placement-ready ids** for all legs.

### 3.2 Response shape (proposed)

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
      "startTime": "2026-05-15T19:45:00.000Z",
      "picks": [
        {
          "role": "player_prop",
          "eventId": 5001,
          "marketId": 88001,
          "selectionId": 10234,
          "marketName": "Anytime Goalscorer",
          "outcomeName": "Erling Haaland",
          "odds": 2.10
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

### 3.3 Required fields

| Field | Required | Description |
|-------|----------|-------------|
| `cardId` | Yes | Stable identifier |
| `eventId` | Yes | Fixture id |
| `playerName` | Yes | Display name for the star player |
| `matchName` | Yes | Fixture label (e.g. `Home vs Away`) |
| `picks` | Yes | **Exactly 3** selections on the **same** `eventId` |
| `picks[].role` | Yes | `player_prop` \| `match_result` \| `total_goals` (or sport-specific equivalents) |
| `picks[].eventId` | Yes | Must match parent event |
| `picks[].marketId` | Yes | Numeric — used at bet placement |
| `picks[].selectionId` | Yes | Numeric — used at bet placement |
| `picks[].odds` | Yes | Decimal price at response time |
| `picks[].marketName` / `outcomeName` | Yes | Localized display strings |
| `sport` / `league` / `region` / `startTime` | Recommended | Labels and kick-off without extra calls |
| `combinedOdds` | Optional | Product of the three legs if you want server truth |
| `displayOrder` | Optional | Sort order in the carousel |

### 3.4 Server-side rules

- Only **bettable** selections (respect trading status and selection status).
- All three picks belong to the **same event**.
- **Player leg:** odds for a **popular / star player** (your curation logic — e.g. featured goalscorers, top props).
- **Companion legs:** two additional selections on that match that fit the product template (e.g. main match result + main totals line; adjust per sport).
- Default list size: up to **20** cards; return `data: []` when nothing qualifies.
- Ordering: by your business rules (popularity, margin, sport mix, kick-off time, etc.).

---

## 4. Trending Accas

### 4.1 Product intent

Return a fixed set of **pre-built accumulator coupons** (default: **3 coupons**, each **5 legs**). Each leg is a single **match result** style pick (home or away — **no draw**). Legs must come from **different events**. Combined odds is the product of leg prices (unless you run boosted accas promos).

### 4.2 Response shape (proposed)

```json
{
  "data": [
    {
      "couponId": "ta_coupon_1",
      "foldCount": 5,
      "combinedOdds": 24.50,
      "socialProof": {
        "betCount": 187
      },
      "legs": [
        {
          "eventId": 5001,
          "matchName": "Team A vs Team B",
          "sport": { "id": 1, "name": "Soccer" },
          "region": { "id": 10, "name": "England" },
          "league": { "id": 101, "name": "Premier League" },
          "startTime": "2026-05-15T15:00:00.000Z",
          "marketId": 1,
          "selectionId": 10001,
          "marketName": "Match Result",
          "outcomeName": "Team A",
          "odds": 1.90
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

### 4.3 Required fields

| Field | Required | Description |
|-------|----------|-------------|
| `couponId` | Yes | Unique per coupon |
| `foldCount` | Yes | Number of legs (default **5**) |
| `legs` | Yes | Length = `foldCount` |
| `legs[].eventId` | Yes | **Unique within the coupon** |
| `legs[].marketId` / `selectionId` / `odds` | Yes | Bet placement |
| `legs[].matchName`, `marketName`, `outcomeName` | Yes | UI copy |
| `legs[].sport`, `region`, `league`, `startTime` | Recommended | Icons and datetime |
| `combinedOdds` | Yes | Combined price for the coupon |
| `socialProof.betCount` | Optional | e.g. “N+ bets on this” if you track it |
| `displayOrder` | Optional | Coupon order in the carousel |

### 4.4 Server-side rules

- Default: **3** coupons; each with **5** legs from **5 different events**.
- Each leg: **match result** type only; **exclude draw**.
- Events should be **upcoming** and open for betting.
- Coupons should not duplicate the same leg set.
- Optional: mix sports/leagues, cap combined odds, liability limits.
- Return fewer coupons or empty `data` when the pool is insufficient.

---

## 5. Relation to existing APIs

| Existing | Relationship |
|----------|----------------|
| `GET /sidebar` → `featuredMatches` | Event id list for “Popular” navigation — **not** a substitute for Star Players or Trending Accas payloads |
| `POST /bets/place` | Each leg uses `{ eventId, marketId, selectionId, odds }`; full acca = `betType: "parlay"` |
| `GET /odds88/events/selected` | Optional hydration if you return minimal ids only |

---

## 6. Non-functional requirements

| Topic | Requirement |
|-------|-------------|
| Latency | p95 &lt; 300ms (precomputed curation acceptable) |
| Errors | Prefer `200` + empty `data` over hard failures for home widgets |
| i18n | Respect `lang` on market/outcome names |
| Odds | Prices should match placement validation, or document max staleness |

---

## 7. Open questions

1. **Star Players:** Are companion legs always match result + totals, or sport-specific templates (e.g. basketball spread + total)?
2. **Trending Accas:** Fixed 5-fold only, or configurable folds?
3. **Social proof:** Is `betCount` real aggregated data?
4. **Personalization:** Global vs per-operator vs per-player curation?
5. **Boosted accas:** Can `combinedOdds` differ from the raw product of legs?
6. **Auth:** Public vs JWT-only endpoints?

---

## 8. Acceptance criteria

- [ ] Documented OpenAPI (or equivalent) for both endpoints  
- [ ] Star Players: each card has 3 picks on one `eventId`; player leg reflects **popular / star player** curation  
- [ ] Trending Accas: 3 × 5-fold coupons; distinct events per coupon; no draw legs  
- [ ] All `marketId` / `selectionId` valid for live, bettable markets  
- [ ] Empty lists supported without error  
- [ ] Selections place successfully via `POST /bets/place` using returned ids and odds  
