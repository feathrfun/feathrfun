<div align="center">

# 🪶 Feathr

### **Swipe right = you own it.**

Design, tokenomics, and threat model for [Feathr](https://feathr.fun) — a swipe-to-trade layer for Robinhood Chain.

[![Chain](https://img.shields.io/badge/Robinhood%20Chain-4663-c8ff3d?style=flat-square)](https://feathr.fun)
[![Status](https://img.shields.io/badge/status-pre--launch-ff6f5e?style=flat-square)](#what-actually-runs-today)
[![Trading](https://img.shields.io/badge/trading-paper%20mode%20default-ff6f5e?style=flat-square)](./ARCHITECTURE.md#5-trading-path--partial)
[![Token](https://img.shields.io/badge/%24FEATHR-not%20launched-0b0f0e?style=flat-square)](./THESIS.md#vi-the-token)

[feathr.fun](https://feathr.fun) · [@feathrfun](https://x.com/feathrfun) · [Telegram](https://t.me/feathrfun)

</div>

---

## What this repository is

This is the **documentation** repository for Feathr. It holds the argument for the product, the architecture it is being built toward, and an honest threat model.

It is **not** the application source. It contains no product code beyond two standalone verification tools.

Every document here tags its claims:

| Tag | Meaning |
|---|---|
| `SHIPPED` | Running in production today |
| `PARTIAL` | Exists but incomplete or known-broken |
| `PLANNED` | Design intent, no code behind it |

That convention exists because a spec that reads like a finished system is worse than no spec. If you find something here that does not match reality, it is a bug in this repository, and an issue is welcome.

---

## Contents

| Document | What it covers |
|---|---|
| [**THESIS.md**](./THESIS.md) | Why the product exists: the discovery gap on Robinhood Chain, why latency is the only lever under FCFS sequencing, the client-side taste engine, the free scam filter, planned tokenomics, and the honest risks |
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | What runs today versus what is planned. Components, API surface, trading path, taste engine, and a table of known gaps |
| [**THREAT_MODEL.md**](./THREAT_MODEL.md) | STRIDE per component, Web3 abuse patterns, residual risk, credential handling, pre-launch checklist |
| [**tools/**](./tools) | Two standalone scripts, described below |

---

## What actually runs today

Being specific about this matters more than anything else in the repository.

**Live:**

- The swipe deck, four feed modes, and all four gestures
- Live card data from two market-data sources plus direct contract reads
- The scam filter, server-side and free at every tier
- The client-side taste engine, stored in the browser and never transmitted
- Wallet connect on chain 4663, tier resolution from live on-chain balance
- AI narrative summaries and generated P/L cards
- A Telegram feed bot and a browse-only mini app

**Not live:**

- **Verified on-chain execution.** The deck ships in **paper mode by default**. A right-swipe opens a tracked position against live market data and does not touch the chain. The real swap path is implemented but has not been verified end to end against mainnet, so it sits behind an explicit opt-in.
- **`$FEATHR`.** The token has not launched. Every tokenomics number in these documents is a planned parameter, not an observed fact.
- Interface fees, treasury, buyback, points, social features, and all automation.

---

## Tools

Two scripts that run standalone and make no claims they cannot verify.

```bash
npm install
```

### Model the launch curve

```bash
npx tsx tools/tokenomics_calc.ts --eth-price 1900
```

Computes the launch curve, anti-snipe caps, tier thresholds, and a revenue model from public platform constants. Everything is quoted in ETH; USD is display-only and floats with the price you pass in.

### Verify launchpad config against the docs

```bash
npx tsx tools/launch_verify.ts --token 0xYourTokenAddress
```

Reads fees, wallet caps, the graduation threshold, and lock status directly from the launchpad and locker contracts, then diffs them against the constants published in [THESIS.md](./THESIS.md). Exits non-zero on a critical mismatch.

Platforms update their own parameters. **Run this before quoting any tokenomics number as fact.**

---

## Token, as designed

> `PLANNED` — `$FEATHR` has not launched. These are intended parameters, and none of them are observable yet.

| Property | Value |
|---|---|
| Supply | 1,000,000,000 fixed · 18 decimals |
| Chain | Robinhood Chain, id 4663 |
| Launch | pons.family fair launch |
| LP | 100% of supply into a one-sided Uniswap V3 position, NFT locked permanently |
| Pre-mine | 0%, creator bundle ≤5% bought at market in the launch tx |
| Emissions | None |
| Anti-snipe | ~73 min window · 5% max wallet · 5.5% max cumulative buy |
| Graduation | 4.2 WETH LP principal, badge only, LP never moves |

**Tiers** resolve from a live on-chain balance with no staking or lockup. They gate convenience and status. They do not gate safety: the scam filter, the risk data, and the full deck are free at every tier, permanently.

---

## Source code

This is the public documentation repository. The application source is not public yet.

| Component | What it is |
|---|---|
| App | The PWA swipe deck and its API |
| Web | Landing page, docs, blog |
| Bot | Telegram feed bot |

Those repositories open once the launch gates in [THREAT_MODEL.md §5](./THREAT_MODEL.md#5-launch-gates) are met. The two tools in this repository are the parts that can be run and checked today.

---

## ⚠️ Scam warning

> **There is no presale. No allocation. No whitelist.**
> Anyone offering one is a scammer, without exception.

`$FEATHR` has not launched and no contract address exists. Any address circulating as `$FEATHR` today is fraudulent.

When it does launch, the address will appear on [feathr.fun](https://feathr.fun), in this repository, and in pinned posts on [@feathrfun](https://x.com/feathrfun) and [t.me/feathrfun](https://t.me/feathrfun) at the same time. Nothing legitimate will ever reach you first by DM.

---

> $FEATHR has not launched. Nothing in this repository is an offer to sell, and nothing here is financial advice.
Trading low-cap tokens is extremely high risk and most go to zero. The scam filter reduces exposure to obvious
concentration risk but cannot catch everything. Feathr is an independent application and is not affiliated with,
endorsed by, or sponsored by Robinhood Markets, Inc. "Robinhood Chain" is referenced solely to identify the
underlying public blockchain network. Feathr is not affiliated with or endorsed by Match Group or Tinder.
AI-generated summaries are descriptive, may be wrong, and are never trading recommendations. DYOR. NFA.
