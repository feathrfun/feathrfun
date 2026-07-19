# Feathr — Threat Model

> **Status honesty.** Every control below is tagged. `SHIPPED` controls run today.
> `PLANNED` controls are design intent with no code behind them. A threat model
> that lists planned mitigations as if they were live is worse than no threat
> model, because it tells a reader they are protected when they are not.
>
> Methodology: STRIDE per trust boundary, plus Web3-specific abuse patterns.

---

## 1. Assets and the boundary that defines everything

| Asset | Where it lives | Loss impact |
|---|---|---|
| User funds | The user's own wallet | Catastrophic |
| Taste profile, liked list, paper positions | Browser `localStorage` | Low, by design |
| Third-party API keys | Server env only | Moderate |
| AI service-account credentials | Server env, **and currently in source as fallbacks** | High — see §6 |
| Card integrity | Derived per request | Severe, it drives real decisions |

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  USER'S DEVICE   │     │  FEATHR SERVER   │     │      CHAIN       │
│                  │     │                  │     │                  │
│  private keys ───┼──✕──┤  NEVER CROSSES   │     │  Uniswap V3      │
│  taste profile ──┼──✕──┤  NEVER CROSSES   │     │  launchpad       │
│  signs swaps ────┼─────┼──────────────────┼────▶│                  │
│                  │     │  NO DATABASE     │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

`SHIPPED` **Zero custody, and zero server-side user state.** There is no database. The app holds no key material anywhere. This is the strongest security property Feathr currently has, and it exists partly because persistence was never built.

Adding a durable store later moves this boundary. That change should be treated as a security event, not a feature.

---

## 2. STRIDE by component

### Client (PWA)

| Threat | Vector | Control | Status |
|---|---|---|---|
| **S**poofing | Cloned site harvesting signatures | Safe-browsing audit, CA published across channels simultaneously | `PLANNED` |
| **T**ampering | Malicious extension rewriting the confirm sheet | Render fee and quote from the same object that builds the tx | `PLANNED` |
| **R**epudiation | Disputed swap | Every real flip is a user-signed on-chain tx | `SHIPPED` |
| **I**nfo disclosure | Taste profile leaking | Profile never leaves `localStorage`; no sync endpoint exists | `SHIPPED` |
| **D**oS | Card polling draining battery | Live tick scoped to the visible card only | `SHIPPED` |
| **E**oP | XSS forging a swap | Token-supplied strings rendered as text, never markup | `SHIPPED` |

> **Token metadata is hostile input.** Name, symbol, and tags come from whatever a launcher typed into a contract. Treat every one of those fields as attacker-controlled.

### API

| Threat | Vector | Control | Status |
|---|---|---|---|
| **T**ampering | Filter bypass via crafted params | Filter applied server-side after ranking, no disable parameter | `SHIPPED` |
| **I**nfo disclosure | Data-provider keys leaking to the client | Keys server-side only; client calls no third-party domain | `SHIPPED` |
| **D**oS | Feed scraping exhausting upstream quota | 90s cache, rate-limit backoff, ban-extension handling | `PARTIAL` |
| **S**poofing | Session replay | Signed-nonce auth flow | `PLANNED` — no auth exists |
| **E**oP | Editing another user's record | Ownership derived from session | `PLANNED` — no user records exist |

Several classic API threats are currently **not applicable** rather than mitigated: with no accounts, no database, and no writes, there is nothing to escalate into. That changes the moment persistence ships.

### AI narrative

| Threat | Vector | Control | Status |
|---|---|---|---|
| Prompt injection via token metadata | Launcher writes instructions into the token name | Metadata passed as delimited untrusted data; system prompt forbids safety claims and price prediction | `SHIPPED` |
| Model output read as advice | User treats a summary as a rating | Output labeled descriptive, bounded length, disclaimed in the sheet | `SHIPPED` |
| Paid-tier bypass | Client claims a tier it does not hold | Server-side balance re-check | `PLANNED` — tier-gated AI options are cosmetic until this lands |

---

## 3. Web3 abuse patterns

### 3.1 Scam filter evasion `SHIPPED, with a stated limit`

A launcher spreading supply across eleven wallets defeats a top-ten concentration check.

**This limit is disclosed rather than mitigated.** It appears on the card, in the thesis, and here. Marketing that implies the filter makes a token safe is a policy violation, not merely imprecise.

Compensating signals on the card: holder count, age, liquidity, dev score, buy/sell split.

### 3.2 Sponsored placement as laundering `PLANNED`

When sponsored slots exist, the filter must apply to them identically, with a hard ratio cap and a permanent `SPONSORED` label. If a stake could ever move a card past the filter, the filter becomes a price list.

### 3.3 Points farming `PLANNED`

No points system ships today. When one does, the defenses go in with v1, not after: minimum trade size for credit, multiples verified against on-chain fills rather than self-reports, wash-trade detection, per-wallet caps.

### 3.4 Quote and slippage manipulation `PARTIAL`

Strict FCFS sequencing makes sandwiching materially harder, since an attacker cannot pay for position. The residual risk is a thin-liquidity fill.

Minimum output is currently derived from pool spot price with wide slippage to compensate. Tightening this is part of the execution-verification gate in §5.

### 3.5 Launchpad parameter drift `SHIPPED`

Platforms update their own fees, caps, and thresholds. Every platform value is re-read from chain rather than hardcoded. `tools/launch_verify.ts` diffs live config against published constants; run it before quoting any number as fact.

### 3.6 Impersonation and presale fraud `PLANNED`

The highest-frequency real-world attack on a launching token.

- There is no presale, no allocation, and no whitelist. Anyone offering one is a scammer.
- The CA should drop on the site, the repo, and pinned posts simultaneously.
- Announcements originate only from official channels.

---

## 4. Residual risk

| Risk | Why accepted | Compensating control |
|---|---|---|
| Filter misses distributed supply | No perfect rug oracle exists | Disclosed everywhere; supporting data on card |
| Third-party data integrity | A provider can serve wrong data | Dual-sourced, contract reads for launch state |
| AI narrative can be wrong | Model output is probabilistic | Labeled descriptive, never advice |
| Unverified swap path | Verification requires mainnet funds | **Paper mode is the default until verified** |
| Non-durable stats | In-process counters | Published numbers treated as unreliable |
| Most low-cap tokens go to zero | Market reality | Stated in every disclaimer |

---

## 5. Launch gates

Four conditions gate launch. Each is a hard blocker, not a preference.

1. **Execution is verified before it is default.** The swap path is exercised end to end on mainnet with small amounts before paper mode stops being the default. Until then, simulated trading is what ships.
2. **Platform constants are re-read from chain.** Every tokenomics figure published anywhere is confirmed against live launchpad and locker state via `tools/launch_verify.ts`. Nothing is quoted from a document as fact.
3. **Secret material is rotated before any repository changes visibility.** See §6.
4. **Anti-impersonation is published before a contract address exists.** "No presale, no whitelist, nothing by DM" goes out ahead of the launch, not alongside it.

The detailed engineering checklist behind these gates is tracked privately.

---

## 6. Secret management

Policy, applied to every repository in the project.

- **No secret is ever committed.** Credentials, service-account keys, and tokens are supplied through the deployment environment.
- **Removal is not rotation.** Version control retains history permanently, so a value that was ever committed must be treated as disclosed regardless of whether current source still contains it.
- **Visibility changes are one-way.** Before any repository moves from private to public, every credential that has ever appeared in its history is rotated first. Auditing history and rotating are separate steps, and both are required.
- **Least privilege on third-party accounts.** Service accounts are scoped to the single API they serve, so that a compromise is bounded.

This ordering matters: rotation happens *before* publication, never after. Publishing first and rotating on discovery means the window of exposure is however long it took someone to notice.

---

## 7. Incident response

| Severity | Trigger | First action |
|---|---|---|
| SEV-1 | Credential exposure, filter serving known-bad tokens | Rotate, disable the affected surface, post publicly within the hour |
| SEV-2 | Data source serving wrong cards | Fail over to secondary, banner in-app, post-mortem within 24h |
| SEV-3 | Degraded AI or image generation | Fall back silently, fix async |

Disclosure posture: state it plainly, early, with real numbers. A project that ships visibly has no credibility left if it goes quiet the one time something breaks.

---

<sub>This threat model documents design intent and known residual risk. It is not a substitute for an independent audit, and no independent audit has been performed. Trading low-cap tokens is extremely high risk and most go to zero. DYOR. NFA.</sub>
