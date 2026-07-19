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
