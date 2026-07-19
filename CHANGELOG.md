# Changelog

Notable changes to the Feathr documentation. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Rule for this repository:** when a component moves between `PLANNED`, `PARTIAL`,
and `SHIPPED`, the status tag and this changelog are updated in the same change.
A stale status tag is a correctness bug, not a documentation nit.

## [Unreleased]

### Planned
- Flip the paper-mode default once the swap path is verified on mainnet
- Re-tag the trading path to `SHIPPED` after that verification
- Post-launch addendum comparing the real launch curve against the modelled one
- Independent audit findings, published verbatim if and when one is performed

## [0.3.0] - 2026-07-20

### Changed
- Token search re-tagged `PARTIAL` → `SHIPPED`. It now resolves EVM addresses directly and matches tickers against the feed corpus, cached 60s. The previous implementation validated base58 addresses and queried the wrong chain, and its ticker path called an upstream endpoint that returns 404 on every chain while the caller swallowed the error and returned an empty array. Every ticker query since launch had silently returned nothing.
- Corrected the launchpad domain throughout. `pons.family` does not resolve; the correct host is `ponsfamily.com`, and token pages live at `/launchpad/{address}` rather than `/token/{address}`.
- Separated in-app execution from token trading wherever the two were conflated. The swipe deck's own swap path is still simulated by default; `$FEATHR` itself trades normally on any DEX.

### Fixed
- Documented limitation on ticker search: it covers tokens present in the feed, not every token that has ever existed on the chain. Address lookup is the escape hatch and does not depend on that corpus.

## [0.2.0] - 2026-07-19

### Added
- `$FEATHR` contract address, published in the README, the thesis, and the organization profile: `0xf5743e3ba5d883e2d311055800f12dfcd79e3da9`
- On-chain verification of the token identity before publication: name `Feathr`, symbol `FEATHR`, 18 decimals, 1,000,000,000 fixed supply, all read directly from the contract on Robinhood Chain

### Changed
- Token status moved from `PLANNED` to `SHIPPED`. Supply, decimals, name, and symbol are now confirmed facts rather than intended parameters.
- Tier resolution re-tagged `SHIPPED` and bound to the live contract address. It is no longer inert.
- Separated two things that were previously conflated: the deck's own execution path is still simulated by default and remains `PARTIAL`, while `$FEATHR` itself trades normally on any DEX. Every place that said "trading is simulated" now says which trading it means.
- Launch parameters (LP lock, pre-mine, anti-snipe window, graduation threshold) remain `PLANNED` in the sense that this document does not assert them as verified. Readers are directed to `tools/launch_verify.ts` to confirm them against live launchpad state.

### Security
- Rewrote the scam warning around a published address rather than the absence of one. The failure mode has changed: before launch the risk was any address at all, now it is lookalike addresses and impersonation accounts.

## [0.1.0] - 2026-07-19

Consolidated from five separate draft repositories into one documentation repository.

### Added
- `THESIS.md` — the argument for the product across ten sections, with per-section status tags
- `ARCHITECTURE.md` — what runs today versus what is planned, component and API status tables, and a known-gaps list
- `THREAT_MODEL.md` — STRIDE per component, Web3 abuse patterns, residual risk register, credential handling, pre-launch checklist
- `tools/tokenomics_calc.ts` — launch curve, anti-snipe caps, tier resolution, and revenue model from public platform constants in ETH terms
- `tools/launch_verify.ts` — reads launchpad and locker config from chain and diffs it against published constants
- Status tag convention (`SHIPPED` / `PARTIAL` / `PLANNED`) applied throughout

### Changed
Corrections against the actual codebase. The earlier drafts were written from a
blueprint before the implementation was reviewed, and described a system that
does not exist.

- Removed all references to a database. There is none; state is `localStorage` only.
- Removed `wagmi` from the described stack. The application uses a plain EIP-1193 provider.
- Removed six documented API endpoints that were never implemented (`auth/nonce`, `auth/verify`, `quote`, `profile`, `shills`, `shills/vote`), and documented the two real routes that had been omitted.
- Reframed the trading path as `PARTIAL`, and stated plainly that paper mode is the default because the swap path is unverified against mainnet.
- Reframed the interface fee as `PLANNED`. No fee logic exists in the codebase.
- Reframed all tokenomics as planned parameters. `$FEATHR` has not launched.
- Corrected the claim that the application was live in a fully functional state.

### Removed
- `feathr-conduit` SDK package. It declared version 1.0.0 against endpoints that do not exist and would have failed on first call.
- `feathr-sentinel` repository. It documented operational runbooks and container topology for automation infrastructure that has not been built.
- `feathr-deck` repository. Its component skeleton described a wallet layer the application does not use.

### Security
- Added a secret-management policy: no secret is committed, removal is not rotation, and every credential in a repository's history is rotated **before** that repository changes visibility.
- Added four launch gates as hard blockers: verified execution before it becomes default, chain-confirmed tokenomics, credential rotation ahead of any visibility change, and anti-impersonation published before a contract address exists.
