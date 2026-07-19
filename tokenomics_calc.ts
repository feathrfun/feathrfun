#!/usr/bin/env tsx
/**
 * tokenomics_calc — model the $FEATHR launch curve from public platform constants.
 *
 * Every constant here is quoted in ETH or WETH. USD is display-only and floats
 * with the ETH price passed at runtime. Hardcoding a dollar figure into launch
 * math is how a doc goes stale the day ETH moves, so we decline to do it.
 *
 * Usage:
 *   npm run calc:tokenomics -- --eth-price 1900
 *   npm run calc:tokenomics -- --eth-price 1900 --dau 1000 --flips 6
 */

/** Fixed supply. 18 decimals. No emissions, no inflation, ever. */
export const TOTAL_SUPPLY = 1_000_000_000;

/** Public platform constants for ponsfamily.com, in ETH terms. */
export const LAUNCH = {
  startMcapEth: 1.36,
  graduationMcapEth: 22.8,
  graduationLpPrincipalWeth: 4.2,
  supplyOutAtGrad: 0.75,
  poolTradingFee: 0.01,
  creatorFeeShare: 0.9,
  platformFeeShare: 0.1,
  restrictionWindowMinutes: 73,
  maxWalletPct: 0.05,
  maxCumulativeBuyPct: 0.055,
  creatorBundleMaxPct: 0.05,
} as const;

/** Feathr's own interface fee. Buys only. The exit is never taxed. */
export const INTERFACE_FEE = { buy: 0.0085, sell: 0 } as const;

/** Revenue allocation. Published so the treasury can be checked, not trusted. */
export const ALLOCATION = {
  development: 0.4,
  buyback: 0.2,
  communityRewards: 0.2,
  marketing: 0.1,
  reserve: 0.1,
} as const;

/** Holder tiers, as absolute token counts against the 1B supply. */
export const TIERS = [
  { name: 'HOLDER', min: 1, superFlipCap: 1 },
  { name: 'FLIPPER', min: 100_000, superFlipCap: 4 },
  { name: 'FALCON', min: 1_000_000, superFlipCap: 10 },
  { name: 'LEGEND', min: 10_000_000, superFlipCap: 20 },
] as const;

export interface CurveModel {
  startMcapUsd: number;
  graduationMcapUsd: number;
  multipleToGraduation: number;
  supplyInCirculationAtGrad: number;
  graduationLpPrincipalWeth: number;
}

/**
 * Model the launch curve at a given ETH price.
 *
 * @param ethPriceUsd - Spot ETH price for display conversion only.
 * @returns The curve in both ETH-native and USD-display terms.
 *
 * @example
 * modelCurve(1900).multipleToGraduation // ≈ 16.8
 */
export function modelCurve(ethPriceUsd: number): CurveModel {
  return {
    startMcapUsd: LAUNCH.startMcapEth * ethPriceUsd,
    graduationMcapUsd: LAUNCH.graduationMcapEth * ethPriceUsd,
    multipleToGraduation: LAUNCH.graduationMcapEth / LAUNCH.startMcapEth,
    supplyInCirculationAtGrad: TOTAL_SUPPLY * LAUNCH.supplyOutAtGrad,
    graduationLpPrincipalWeth: LAUNCH.graduationLpPrincipalWeth,
  };
}

export interface RevenueModel {
  interfaceFeeEthPerDay: number;
  creatorFeeEthPerDay: number;
  sponsoredEthPerDay: number;
  totalEthPerDay: number;
  totalUsdPerDay: number;
  monthlyEth: number;
  buybackEthPerMonth: number;
}

/**
 * Model daily revenue under a conservative assumption set.
 *
 * @param opts.dau - Daily active users.
 * @param opts.flipsPerDau - Average flips per active user per day.
 * @param opts.avgFlipEth - Average flip size in ETH.
 * @param opts.poolVolumeUsd - Daily $FEATHR pool trading volume in USD.
 * @param opts.sponsoredSlots - Sponsored rotation slots sold per day (V2).
 * @param opts.ethPriceUsd - Spot ETH price for display conversion.
 * @returns Per-day and per-month revenue, plus the buyback slice.
 */
export function modelRevenue(opts: {
  dau: number;
  flipsPerDau: number;
  avgFlipEth: number;
  poolVolumeUsd: number;
  sponsoredSlots: number;
  ethPriceUsd: number;
}): RevenueModel {
  const { dau, flipsPerDau, avgFlipEth, poolVolumeUsd, sponsoredSlots, ethPriceUsd } = opts;

  const flips = dau * flipsPerDau;
  const interfaceFeeEthPerDay = flips * avgFlipEth * INTERFACE_FEE.buy;

  const creatorFeeUsdPerDay = poolVolumeUsd * LAUNCH.poolTradingFee * LAUNCH.creatorFeeShare;
  const creatorFeeEthPerDay = creatorFeeUsdPerDay / ethPriceUsd;

  const sponsoredEthPerDay = sponsoredSlots * 0.05;

  const totalEthPerDay = interfaceFeeEthPerDay + creatorFeeEthPerDay + sponsoredEthPerDay;
  const monthlyEth = totalEthPerDay * 30;

  return {
    interfaceFeeEthPerDay,
    creatorFeeEthPerDay,
    sponsoredEthPerDay,
    totalEthPerDay,
    totalUsdPerDay: totalEthPerDay * ethPriceUsd,
    monthlyEth,
    buybackEthPerMonth: monthlyEth * ALLOCATION.buyback,
  };
}

/**
 * Resolve a holder tier from a live on-chain balance.
 *
 * @param balance - Raw $FEATHR balance (whole tokens, not wei).
 * @returns The tier, or null when the wallet holds nothing.
 */
export function tierFor(balance: number): (typeof TIERS)[number] | null {
  let match: (typeof TIERS)[number] | null = null;
  for (const t of TIERS) if (balance >= t.min) match = t;
  return match;
}

/**
 * Max wallet allowance in tokens during the anti-snipe window.
 *
 * @returns Absolute token count a single address may hold while restricted.
 */
export function restrictedWalletCap(): number {
  return TOTAL_SUPPLY * LAUNCH.maxWalletPct;
}

function arg(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = Number.parseFloat(process.argv[i + 1] ?? '');
  return Number.isFinite(v) ? v : fallback;
}

function main(): void {
  const ethPriceUsd = arg('--eth-price', 1900);
  const dau = arg('--dau', 1000);
  const flipsPerDau = arg('--flips', 6);

  const curve = modelCurve(ethPriceUsd);
  const rev = modelRevenue({
    dau,
    flipsPerDau,
    avgFlipEth: 0.008,
    poolVolumeUsd: 150_000,
    sponsoredSlots: 4,
    ethPriceUsd,
  });

  const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
  const eth = (n: number) => `${n.toFixed(3)} ETH`;

  console.log(`\n  $FEATHR — launch curve @ ETH ${usd(ethPriceUsd)}\n`);
  console.log(`  Total supply           ${TOTAL_SUPPLY.toLocaleString('en-US')} (fixed, 0% pre-mine)`);
  console.log(`  Start mcap            ${LAUNCH.startMcapEth} ETH  (${usd(curve.startMcapUsd)})`);
  console.log(`  Graduation mcap       ${LAUNCH.graduationMcapEth} ETH  (${usd(curve.graduationMcapUsd)})`);
  console.log(`  Multiple to grad      ${curve.multipleToGraduation.toFixed(1)}x`);
  console.log(`  Supply out at grad    ${(LAUNCH.supplyOutAtGrad * 100).toFixed(0)}%`);
  console.log(`  Grad LP principal     ${LAUNCH.graduationLpPrincipalWeth} WETH (badge only, LP never moves)`);

  console.log(`\n  Anti-snipe window\n`);
  console.log(`  Duration              ~${LAUNCH.restrictionWindowMinutes} min (launch-block buys revert)`);
  console.log(`  Max wallet            ${(LAUNCH.maxWalletPct * 100).toFixed(1)}%  (${restrictedWalletCap().toLocaleString('en-US')} tokens)`);
  console.log(`  Max cumulative buy    ${(LAUNCH.maxCumulativeBuyPct * 100).toFixed(1)}% per address`);

  console.log(`\n  Revenue @ ${dau.toLocaleString('en-US')} DAU · ${flipsPerDau} flips/DAU\n`);
  console.log(`  Interface fees        ${eth(rev.interfaceFeeEthPerDay)}/day  (0.85% buys, 0% sells)`);
  console.log(`  Creator fees          ${eth(rev.creatorFeeEthPerDay)}/day  (90% of 1% pool fee)`);
  console.log(`  Sponsored slots       ${eth(rev.sponsoredEthPerDay)}/day  (V2)`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  Daily total           ${eth(rev.totalEthPerDay)}  (${usd(rev.totalUsdPerDay)})`);
  console.log(`  Monthly               ${eth(rev.monthlyEth)}  (${usd(rev.monthlyEth * ethPriceUsd)})`);
  console.log(`  Buyback slice (20%)   ${eth(rev.buybackEthPerMonth)}/month  (market buys, verifiable txs)`);

  console.log(`\n  Tiers (live on-chain balance, no staking)\n`);
  for (const t of TIERS) {
    const pct = ((t.min / TOTAL_SUPPLY) * 100).toFixed(t.min < 1_000_000 ? 3 : 1);
    console.log(`  ${t.name.padEnd(8)} >= ${t.min.toLocaleString('en-US').padStart(12)} (${pct}%)  super-flip cap x${t.superFlipCap}`);
  }
  console.log('');
}

if (process.argv[1]?.includes('tokenomics_calc')) main();
