# Bet Detail API — Backend Requirements for Professional UI

**Endpoints in scope:** `GET /bets/:betId`, `GET /bets/history` (selection payloads should stay aligned)  
**Audience:** Backend / API team  
**Goal:** Return everything the frontend needs to render a professional bet receipt **without extra round-trips** to odds/event services for basic display.

---

## 1. Context

The frontend receives bet detail responses like mixed parlays (Bet Builder leg + regular leg). The structure is mostly correct, but several fields are **not sufficient for end-user display**. Today the UI would have to call `GET /odds88/events/:eventId` per event (and per BB component) to show readable labels — which is slow, fragile for settled/historical bets, and unnecessary if names were stored at placement time.

**Principle:** At bet acceptance, persist **human-readable labels** on each selection and BB component. Snapshots already exist partially; they need to be **complete and resolved**.

---

## 2. Required — Bet Builder legs (`isBetBuilder: true`)

### 2.1 Enrich `betBuilderBetItems[]`

**Current shape (not enough for UI):**

```json
"betBuilderBetItems": [
  { "marketId": 75, "selectionId": 19 },
  { "marketId": 1, "selectionId": 3 }
]
```

**Required shape:**

```json
"betBuilderBetItems": [
  {
    "marketId": 75,
    "selectionId": 19,
    "marketName": "Total Goals",
    "selectionName": "Over 2.5"
  },
  {
    "marketId": 1,
    "selectionId": 3,
    "marketName": "1x2",
    "selectionName": "Nottingham Forest"
  }
]
```

| Field | Required | Notes |
|-------|----------|-------|
| `marketId` | Yes | Keep as today |
| `selectionId` | Yes | Keep as today |
| `marketName` | **Yes** | Resolved at placement; never empty for accepted bets |
| `selectionName` | **Yes** | Resolved at placement (competitor templates expanded) |
| `oddsAtPlacement` | Recommended | Per-component price at time of bet (audit / display) |

### 2.2 Leg-level `selectionName`

**Current (not acceptable for UI):**

```json
"selectionName": "75/19 + 1/3 + 14/20"
```

**Required:** A user-facing summary, e.g. `"Bet Builder (3 selections)"` or a comma-separated list of resolved selection names — **not** internal ID encoding.

### 2.3 Leg-level odds

Keep `oddsAtPlacement` as the **combined** Bet Builder price (already correct). Do not omit it for BB legs.

---

## 3. Required — Regular selection legs

### 3.1 Resolve template tokens in names

**Current (broken for UI):**

```json
"selectionName": "{$competitor1}",
"selectionSnapshot": { "name": "{$competitor1}", "price": 2.2 }
```

**Required at persistence time:**

```json
"selectionName": "Burnley FC",
"selectionSnapshot": {
  "id": 1,
  "name": "Burnley FC",
  "price": 2.2
}
```

Apply the same resolution to `marketSnapshot.name` if it contains templates or parameters.

**Rule:** Any field intended for display (`selectionName`, `marketName`, snapshot `name` fields) must be **final strings** at write time, using competitors/parameters from the event at placement.

---

## 4. Required — Bet-level fields (detail + history)

Ensure **`GET /bets/:betId`** and **`GET /bets/history`** rows expose the same display-critical fields.

| Field | Status | Requirement |
|-------|--------|-------------|
| `betId` | OK | Full ID; no truncation needed client-side |
| `betType` | OK | `single` \| `parlay` |
| `status` | OK | Include full lifecycle values |
| `currency` | OK | Required on every bet |
| `stakeAmount` | OK | |
| `combinedOdds` | OK | |
| `potentialPayout` | OK | Must match stake × combined odds logic server-side |
| `actualPayout` | OK | Populated when settled / cashed out |
| `selectionCount` | OK | **Leg count** (BB leg = 1, not component count) |
| `shortResult` | **Missing on detail** | Add to `GET /bets/:betId` — same format as history (`"Pending"`, `"Won ARS 74.80"`, etc.) |
| `createdAt` | OK | |
| `acceptedAt` | OK | Expose on detail (already in sample) |
| `settledAt` | OK | |
| `cashoutAt` / `cashoutAmount` | OK | When partially/fully cashed out |
| `walletReserveRef` | OK in sample | **Document and keep stable** — support/reconciliation |
| `rejectionReason` | OK | For rejected bets |

---

## 5. Required — Per-selection (leg) fields

Each item in `selections[]` should support a full receipt row:

| Field | Required | Notes |
|-------|----------|-------|
| `eventId`, `marketId`, `selectionId` | Yes | Keep; use `-1` for BB leg root as today |
| `isBetBuilder` | Yes | |
| `betBuilderBetItems` | Yes | Enriched (see §2.1) |
| `eventName` | Yes | e.g. `"Nottingham vs Bournemouth"` |
| `marketName` | Yes | e.g. `"Bet Builder"` or `"1x2"` |
| `selectionName` | Yes | **Resolved** (see §2.2, §3.1) |
| `oddsAtPlacement` | Yes | Leg odds (combined for BB) |
| `status` | Yes | Per-leg: `pending`, `won`, `lost`, `voided`, etc. |
| `settlementResult` | Yes | Populated when settled; `null` while pending |
| `stakePortion` | Recommended | Useful for single bets; optional for parlay legs |
| `potentialPayout` | Recommended | Leg-level display (optional for parlay) |
| `actualPayout` | Yes when settled | |
| `settledAt` | Yes when settled | |

### 5.1 Event snapshot (keep and complete)

Already useful. Please ensure every accepted bet includes:

```json
"eventSnapshot": {
  "id": 10177591,
  "name": "Nottingham vs Bournemouth",
  "status": 1,
  "statusDescription": "Not started yet",
  "startTime": "2026-05-24T15:00:00Z",
  "sport": { "id": 1, "name": "Soccer" },
  "country": { "id": 25, "name": "England" },
  "competition": { "id": 33, "name": "Premier League" },
  "competitors": [
    { "id": 10887, "name": "Nottingham Forest" },
    { "id": 10946, "name": "AFC Bournemouth" }
  ]
}
```

Do not omit `competitors`, `startTime`, or `competition` for BB or regular legs.

---

## 6. Recommended — Open-bet live updates

Not blocking for a static receipt, but needed for a **polished open-bets experience:

| Field | Where | Purpose |
|-------|--------|---------|
| `currentOdds` | Per selection (regular legs) | Show line movement vs `oddsAtPlacement` |
| `combinedCurrentOdds` | Bet level (parlay) | Optional; client can compute if per-leg provided |
| Event `scoreboard` or `liveScore` | Inside `eventSnapshot` or sibling | In-play display in My Bets |

If not provided, frontend will show placement odds only (acceptable for v1).

---

## 7. Recommended — Audit / support (already partially present)

Keep and document in OpenAPI:

- `statusTimeline[]` — status transitions with `fromStatus`, `toStatus`, `createdAt`
- `walletTransactions[]` — debit/credit with `operation`, `status`, `externalRef`, `amount`, `currency`

No UI requirement to expose all of this to players initially, but fields should remain stable for support tools.

---

## 8. Not required from backend (frontend / other services)

| Item | Owner |
|------|--------|
| Resolving BB component names via live `GET /odds88/events/:eventId` | Frontend fallback only if §2 not done |
| Cashout amount polling | Separate cashout API |
| Idempotency / place bet | `POST /bets/place` |
| Template resolution logic definition | Backend at **persist** time (same rules as odds feed display names) |

---

## 9. Acceptance criteria (test with mixed parlay)

Use a bet equivalent to:

- **Leg 1:** Bet Builder, 3 components, combined odds 8.50  
- **Leg 2:** Regular 1x2, odds 2.20  
- **Bet:** Parlay, stake 4 ARS, combined 18.70, potential payout 74.80  

**Pass when:**

1. `GET /bets/:betId` returns `shortResult` (e.g. `"Pending"`).
2. BB leg `betBuilderBetItems` each have `marketName` + `selectionName` (no raw IDs in user-facing strings).
3. BB leg `selectionName` is not ID-encoded (`"75/19 + …"`).
4. Regular leg `selectionName` is `"Burnley FC"` (or equivalent), not `{$competitor1}`.
5. Every leg has complete `eventSnapshot` with competitors and `startTime`.
6. `selectionCount` equals **2** (not 4).
7. History list row for same bet matches detail selection payloads (no drift).

---

## 10. Summary checklist for backend

- [ ] Add `marketName` + `selectionName` to each `betBuilderBetItems[]` entry at bet write time  
- [ ] Replace BB leg `selectionName` ID encoding with human-readable summary  
- [ ] Resolve all `{$competitorN}` (and similar) templates in `selectionName` / snapshots at write time  
- [ ] Add `shortResult` to `GET /bets/:betId` response  
- [ ] Align `GET /bets/history` selection objects with detail (same enriched shape)  
- [ ] Guarantee full `eventSnapshot` on every leg for accepted bets  
- [ ] Document `walletReserveRef`, `statusTimeline`, `walletTransactions` in API spec  
- [ ] (Optional v2) Per-leg `currentOdds` and live score for open bets  

---

*Questions: contact frontend team with a sample `betId` for mixed BB + parlay verification.*
