# Feathr — Architecture

> **Read this first.** This document describes both what runs today and what the
> system is being built toward. Every component carries a status tag. Do not read
> the target architecture as a description of shipped infrastructure.
>
> `SHIPPED` running in production · `PARTIAL` exists but incomplete · `PLANNED` not built

---

## 1. What exists today

Three deployed pieces. That is the whole system right now.

```
   ┌──────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
   │  feathr-web      │      │  feathr-app          │      │  feathr-bot     │
   │  SHIPPED         │      │  SHIPPED             │      │  SHIPPED        │
   │                  │      │                      │      │                 │
   │  Landing, docs,  │      │  PWA swipe deck      │      │  Telegram bot   │
   │  blog. Static.   │      │  + 7 API routes      │      │  grammY poll    │
   │  EN / ZH.        │      │  + /tg mini app      │      │                 │
   └──────────────────┘      └──────────┬───────────┘      └────────┬────────┘
                                        │                           │
                                        │  ◀────────────────────────┘
                                        │     GET /api/feed
                                        ▼
                        ┌───────────────────────────────┐
                        │  EXTERNAL                      │
                        │  GMGN API      (market data)   │
                        │  DEX Screener  (secondary)     │
                        │  Chain RPC 4663                │
                        │  Vertex AI     (narrative)     │
                        └───────────────────────────────┘
```

**There is no database.** All user state lives in browser `localStorage`: taste profile, liked tokens, paper positions, streak, settings. Server-side statistics are in-process counters that reset on restart.

That is a deliberate MVP choice, not an oversight. It also means every "your data never leaves your device" claim in the thesis is currently true by construction.

---

## 2. Components

### feathr-web · `SHIPPED`

Next.js 16 marketing site. Landing page, `/docs`, `/blog`. English and Simplified Chinese. All screens on the landing page are static mockups; the page makes no API calls.

### feathr-app · `SHIPPED`

The product. A single client-side SPA behind four tabs: Feed, Liked, Portfolio, Wrap. Installable PWA with an offline shell.

| Layer | Choice | Status |
|---|---|---|
| Framework | Next.js 16, React 19, Tailwind 4 | `SHIPPED` |
| Web3 | viem, plain EIP-1193 injected wallet | `SHIPPED` |
| Wallets | MetaMask, Rabby, any injected EVM | `SHIPPED` |
| Chain | Robinhood Chain, id 4663, ETH gas | `SHIPPED` |
| DEX | Uniswap V3 fork, 1% fee tier | `PARTIAL` |
| Data | GMGN primary, DEX Screener secondary | `SHIPPED` |
| AI | Vertex Gemini (narrative), Imagen (P/L card) | `SHIPPED` |
| Persistence | `localStorage` only | `SHIPPED` |

There is no wagmi and no WalletConnect. Wallet handling is a direct EIP-1193 provider with `wallet_switchEthereumChain` and a 4902 add-chain fallback.

### feathr-bot · `SHIPPED`

grammY long-polling Telegram bot. Four commands (`/start`, `/trending`, `/fresh`, `/grad`) that read the app's own feed API and render six rows each. Opens the mini app via an inline keyboard button.

---

## 3. API surface

Seven routes, all `runtime=nodejs` and `force-dynamic`.

| Route | Purpose | Status |
|---|---|---|
| `GET /api/feed` | Ranked feed, four modes, 90s cache. **Applies the scam filter.** | `SHIPPED` |
| `GET /api/token-live` | Single-token poll for the visible card, 3s cache | `SHIPPED` |
| `GET /api/token-resolve` | Address to full card, for search | `SHIPPED` |
| `GET /api/tokens/search` | Ticker or address search | `PARTIAL` |
| `POST /api/stats` | In-process counters, reset on restart | `PARTIAL` |
| `GET /api/why` | Vertex Gemini narrative, 5m cache | `SHIPPED` |
| `GET /api/pnl-card` | 1200×630 OG image, Imagen hero panel | `SHIPPED` |

`PARTIAL` on search: the route is being reworked for this chain and should not be relied on yet.

`PARTIAL` on stats: counters are per-process and non-durable, so any number derived from them is a lower bound at best.

**Not built:** authentication, quotes as a service, shill board, profiles, targets, alerts, burner automation, treasury. Any earlier draft of this document that listed those endpoints was describing intent, not implementation.

---

## 4. The scam filter · `SHIPPED`

The one control that runs today exactly as the thesis describes it.

```
GET /api/feed
    → fetch candidates from GMGN
    → drop any token where top_10_holder_rate >= 0.35
    → drop blacklisted launchpad types
    → rank by mode
    → return
```

Server-side, after ranking, with no client parameter that disables it. Free at every tier.

Known limitation: supply distributed across more than ten wallets defeats a top-ten check. This is stated on the card and in the thesis rather than papered over.

---

## 5. Trading path · `PARTIAL`

```
   swipe right
        │
        ▼
   ┌──────────────────────────────────────────┐
   │  isPaperMode()  →  DEFAULT TRUE          │
   └──────────────┬───────────────┬───────────┘
                  │               │
             true │               │ false (explicit opt-in)
                  ▼               ▼
         openPaperPosition()   buy via V3 SwapRouter
         localStorage only     exactInputSingle, 8% slippage
         no chain contact      ⚠ UNVERIFIED against mainnet
```

Paper mode is the default because the on-chain path has not been verified end to end with real funds. The real path is implemented and wired through the feed, search, and portfolio sell flows, but it stays behind a settings toggle until that verification happens.

Sell path uses `approve` then `multicall([exactInputSingle, unwrapWETH9])`. Minimum output is derived from pool `slot0` spot price rather than a quoter contract, which is why slippage is set wide.

**No interface fee is implemented.** The 0.85% figure in the thesis and docs is a design target with no corresponding code.

---

## 6. Taste engine · `SHIPPED`

Heuristic, client-side, and small enough to run between two swipes on a mid-range phone.

```
signal weights   super-flip +3 · flip +2 · like +1 · pass −1 · dislike −3
profile          tag affinity sums, mcap / age / dev-score preference bands
rerank           tag affinity + mcap ratio + age ratio − dev-score distance
foryou unlock    3+ signals, then drops tokens whose worst tag affinity < −2
storage          localStorage, never transmitted
```

Twelve narrative tags are derived by regex over name and symbol.

Numeric filtering is `PARTIAL`. Category filtering is applied today; the remaining numeric criteria are being tuned against live feed data before they gate the deck.

---

## 7. Target architecture · `PLANNED`

Everything below is design intent. None of it exists.

```
   PWA ──▶ API ──▶ durable store (positions, profiles, social)
    │       │
    │       └──▶ quote service (pre-fetched, per resting card)
    │
    └──▶ wallet ──▶ V3 router          [verified execution]

   workers ──▶ TP/SL scanner ──▶ opt-in burner, encrypted, capped
           └─▶ alert scanner  ──▶ push dispatch
```

Sequencing that matters:

1. Verify the swap path on mainnet with small amounts, then flip the paper-mode default
2. Re-enable numeric filters
3. Rewrite token search for this chain
4. Add a durable store, at which point the "state never leaves your device" claim must be revised to name exactly what is stored server-side
5. Only then consider automation, because automation is the first component that would ever hold key material

Step 4 is a positioning change as much as a technical one. It should not happen quietly.

---

## 8. Maturity

Components tagged `PARTIAL` are under active work and should not be relied on in their current form. The `PLANNED` sections of this document describe intent only.

Two properties are worth stating plainly for anyone evaluating the product today:

- **Trading is simulated by default.** Real execution is opt-in and unverified.
- **Usage figures are not durable.** Server-side counters are per-process, so any number derived from them is a lower bound and should not be quoted as a metric.

The engineering checklist that gates launch is tracked privately and is not part of this repository.

---

<sub>This document describes a system under construction. Status tags are accurate as of the last commit and should be updated in the same change that moves a component between states.</sub>
