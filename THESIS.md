<div align="center">

# THE FEATHR THESIS

### Swipe right = you own it.

**A swipe-to-trade layer for Robinhood Chain**
v1.1 · July 2026 · [feathr.fun](https://feathr.fun)

</div>

> **Status of this document.** This is the argument for Feathr and the design it
> is being built toward. Sections marked `SHIPPED` describe behavior running in
> production today. Sections marked `PLANNED` describe intent that is not built
> yet. Nothing here should be read as a description of a finished product.

---

## I. The Chain Solved Execution and Forgot the Interface

Robinhood Chain went live in July 2026 and became a memecoin factory within days. Thousands of launches daily. Nine figures of DEX volume. An Arbitrum Orbit L2 running ETH gas at roughly one hundred millisecond blocks.

The engineering is sound. The sequencer runs strict first-come-first-served, so no address can bid its way ahead of another. Fills are fair by construction. Uniswap V3 is the primary AMM.

Then a user opens their phone and finds a table.

Rows of six-point type. Forty columns. Built by people who assumed a desk, a monitor, and three browser tabs. The chain's largest launch frontend vanished overnight; launches migrated and browsing them got harder. What remains was designed for chart analysts. The people actually arriving are degens from other chains, holding a phone at three in the morning with one thumb free.

Count the ritual. Five to ten seconds to scan a row. Three tabs to judge whether it rugs. Copy address, open DEX, paste, approve, swap: twenty to thirty seconds. Then a separate tool to track the position.

That arithmetic never resolved. It became habit instead.

---

## II. Discovery Is a Dating Problem

Token discovery runs on pattern recognition and dopamine. So does a dating app. Both ask a human to render fast judgment on limited information, repeatedly, and both reward the interface that makes judgment cheap.

Screeners took the opposite bet. They assumed traders want data, and buried the decision under forty columns of it.

Feathr collapses one launch into one full-screen card. Name, ticker, age, launchpad. Market cap, ATH, liquidity, holders, top-ten concentration, dev score, buy and sell counts. Narrative tags. A live tick while the card sits on top.

Two seconds to read. One thumb to decide.

Left passes. Right flips. Up super-flips at a larger size. A heart saves without buying and teaches the feed more than either.

`SHIPPED` The deck, the four feed modes, the card surface, and all four gestures are live.

---

## III. Latency Is the Only Lever

Most chains reward the trader who pays for position. Robinhood Chain does not offer the option. Strict FCFS sequencing means there are no priority fees, nothing to bid, no auction to win. Speed cannot be purchased here.

What remains is latency.

`PLANNED` Quote pre-fetch on the resting card, so the transaction is assembled before the thumb moves. The routing layer targets the Uniswap V3 SwapRouter with exact-in swaps and age-tuned slippage.

`SHIPPED` The EVM layer itself: chain 4663, WETH, the V3 factory and router, wallet connect, chain add and switch.

**The honest status of trading.** The deck ships in paper mode by default. A right-swipe opens a tracked position against live market data and does not touch the chain. The real swap path exists and is wired, but it has not been verified end to end against mainnet with real funds, so it sits behind an explicit opt-in. Paper mode stays the default until that verification is done.

That ordering is deliberate. Shipping an unverified swap path as the default is how people lose money on someone else's untested code.

---

## IV. The Feed Learns, and the Learning Stays With You

Every swipe, heart, and flip updates a taste profile: narrative tags, market-cap band, token age, dev score. The next cards reorder around it. Pass six dog coins and dog coins recede.

Your deck resembles nobody else's.

`SHIPPED` The profile lives in browser storage. No server holds it. No wallet address attaches to it. There is no sync endpoint, and adding one would break the promise.

This costs Feathr something real. A server-side profile would be easier to improve and considerably easier to sell. It would also require shipping a person's entire swipe history to infrastructure they have no reason to trust. Feathr declines.

The engine is heuristic rather than learned: weighted signals, tag affinity, and preference bands. Calling it anything more would be dressing it up.

---

## V. Safety Is Not for Sale

One filter guards every feed mode. Top-ten holder concentration at or above thirty-five percent, and the card never enters the deck.

`SHIPPED` The filter runs server-side inside the feed route. It is free at every tier, including no tier. It cannot be disabled by any client parameter.

The reasoning is narrow and selfish. Paywalling the mechanism that keeps users solvent wins a quarter and loses the product. Trust compounds; a filter sold by the month does not.

`PLANNED` Sponsored placement, when it exists, will be subject to the same filter. A stake that could move a card past it would make the filter a price list.

**What the filter does not do.** It catches obvious concentration and nothing subtle. Supply spread across eleven wallets defeats a top-ten check. Anyone reading this as a safety guarantee is reading it wrong, and the card says so too.

---

## VI. The Token

`SHIPPED` `$FEATHR` is live on Robinhood Chain.

```
0xf5743e3ba5d883e2d311055800f12dfcd79e3da9
```

Confirmed by direct contract read: name `Feathr`, symbol `FEATHR`, eighteen decimals, one billion fixed supply. Verify that address yourself before trading. Treat any address arriving by direct message as fraudulent.

What follows describes launch parameters as designed. Confirm them against live launchpad state with `tools/launch_verify.ts` rather than trusting this document.

Supply is one billion, fixed, eighteen decimals. All of it seeds a one-sided Uniswap V3 position at launch on ponsfamily.com. The LP NFT locks permanently in the platform locker.

The locker exposes no withdrawal function. The claim is architectural rather than moral. No multisig votes on it, no timelock counts toward it, no founder promises restraint. Anyone can confirm that by reading the deployed bytecode.

Team allocation is zero percent pre-mine. The creator bundle caps at five percent, purchased inside the launch transaction at market price, visible on-chain permanently.

Anti-snipe runs platform-enforced for roughly seventy-three minutes: launch-block buys revert, five percent maximum wallet, five and a half percent maximum cumulative buy per address.

Graduation at 4.2 WETH principal awards a badge. The LP never moves.

Every rug shares one shape. An unlock date arrives, or a multisig moves, or a migration window opens. Each requires a mechanism. Removing all three converts trust into a code review.

**Re-verify before launch.** These are platform constants, and platforms update their own parameters. `tools/launch_verify.ts` reads them from chain and diffs them against what this document claims. Run it before quoting any number here as fact.

---

## VII. Tiers

`SHIPPED` Tier resolution reads a live on-chain ERC-20 balance against 0xf5743e3ba5d883e2d311055800f12dfcd79e3da9. No staking, no lockup, no claim flow.

| Tier | Holding | Unlocks |
|---|---|---|
| Holder | > 0 | Badge, theme |
| Flipper | ≥ 100k | Larger super-flip cap, alert slots |
| Falcon | ≥ 1M | Higher cap, priority refresh |
| Legend | ≥ 10M | Highest cap, early access, governance signal |

The token gates convenience and status. It does not gate safety. The scam filter, the risk data, and the full deck are free at every tier.

`PLANNED` The interface fee, the creator-fee treasury, and the buyback are designed but not implemented. No fee is charged today because the deck's own execution path is still simulated.

---

## VIII. What Compounds

A frontend can copy the gesture in a sprint. It cannot copy the swipe telemetry, which forms a taste dataset nobody else on this chain has.

Leaving costs a trained profile and a streak. All of it resets.

The hooded robin is memeable and wearable as a profile picture. Lime on dark matches the chain's own visual meta.

The brand slot is winner-take-most, and the second entrant is a clone by definition.

---

## IX. The Honest Risks

The chain could go quiet. The deck engine is chain-agnostic by design.

A large terminal could bolt on swipe mode. They retrofit; Feathr is native.

The data layer could fail. Two sources answer, and contract reads answer regardless.

The launchpad could change its parameters. Every platform value is re-read from chain rather than hardcoded.

The swap path is unverified. Paper mode is the default until it is not.

Most low-cap tokens go to zero. The filter reduces exposure to obvious concentration risk and catches nothing subtle.

---

## X. Where This Actually Stands

Nobody has shipped swipe-to-trade on this chain.

What runs today: the deck, four feed modes, live card data from dual sources, the free scam filter, the client-side taste engine, wallet connect, tier resolution, the Telegram feed bot and mini app.

What does not run yet: verified in-app execution, fees, treasury, and every automation layer above them.

The gap between those two lists is the work. Publishing the second list is the point of writing this down.

Right = you own it.

<div align="center">

🪶

</div>

---

<div align="center">
<sub>

$FEATHR is a utility token for the Feathr application. It is not an investment product, security, or claim
on revenue. Nothing in this document is an offer, and nothing here is financial advice.
Trading low-cap tokens is extremely high risk and most go to zero. The scam filter reduces exposure to obvious
concentration risk but cannot catch everything. Feathr is an independent application, not affiliated with, endorsed by,
or sponsored by Robinhood Markets, Inc. "Robinhood Chain" identifies the underlying public blockchain network.
Feathr is not affiliated with or endorsed by Match Group or Tinder. AI-generated card summaries are descriptive,
may be wrong, and are never trading recommendations. DYOR. NFA.

</sub>
</div>
