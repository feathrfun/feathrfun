#!/usr/bin/env tsx
/**
 * launch_verify — re-read launchpad and locker config directly from chain.
 *
 * This exists because of one line in the pre-launch checklist: platforms can
 * update their own parameters. Fees, wallet caps, and the graduation threshold
 * are not ours to assume. Every value below is read from a contract at runtime
 * and compared against what the docs currently claim. A mismatch is a finding,
 * not a rounding error: it means a user's buy is about to revert for a reason
 * nobody printed on the card.
 *
 * Run this before launch, and again whenever the platform ships anything.
 *
 * Usage:
 *   npm run verify:launch -- --token 0xYourTokenAddress
 *   npm run verify:launch -- --token 0x… --rpc https://rpc.mainnet.chain.robinhood.com
 */

import { createPublicClient, http, defineChain, type Address } from 'viem';
import { LAUNCH } from './tokenomics_calc';

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
});

/** Minimal ABI surface. We read; we never write. */
const LAUNCHPAD_ABI = [
  {
    type: 'function',
    name: 'launchConfig',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'restrictionEndsAt', type: 'uint64' },
      { name: 'maxWalletBps', type: 'uint16' },
      { name: 'maxCumulativeBuyBps', type: 'uint16' },
      { name: 'poolFeeBps', type: 'uint24' },
      { name: 'creatorFeeShareBps', type: 'uint16' },
    ],
  },
  {
    type: 'function',
    name: 'graduationThreshold',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'weth', type: 'uint256' }],
  },
] as const;

const LOCKER_ABI = [
  {
    type: 'function',
    name: 'lpPrincipal',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'weth', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isPermanentlyLocked',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'locked', type: 'bool' }],
  },
] as const;

export interface OnChainLaunchConfig {
  restrictionEndsAt: number;
  restrictionSecondsLeft: number;
  maxWalletPct: number;
  maxCumulativeBuyPct: number;
  poolFeePct: number;
  creatorFeeSharePct: number;
  graduationThresholdWeth: number;
  lpPrincipalWeth: number;
  permanentlyLocked: boolean;
}

export interface Finding {
  field: string;
  expected: string;
  actual: string;
  severity: 'critical' | 'warning';
}

const bpsToPct = (bps: number | bigint): number => Number(bps) / 10_000;
const weiToEth = (wei: bigint): number => Number(wei) / 1e18;

/**
 * Read every launch-relevant parameter from chain.
 *
 * @param token - The token address to inspect.
 * @param launchpad - Launchpad factory address.
 * @param locker - LP locker address.
 * @param rpcUrl - RPC endpoint override.
 * @returns The live config as the chain reports it.
 */
export async function readLaunchConfig(
  token: Address,
  launchpad: Address,
  locker: Address,
  rpcUrl?: string,
): Promise<OnChainLaunchConfig> {
  const client = createPublicClient({
    chain: robinhoodChain,
    transport: http(rpcUrl ?? robinhoodChain.rpcUrls.default.http[0]),
  });

  const [config, threshold, principal, locked] = await Promise.all([
    client.readContract({ address: launchpad, abi: LAUNCHPAD_ABI, functionName: 'launchConfig', args: [token] }),
    client.readContract({ address: launchpad, abi: LAUNCHPAD_ABI, functionName: 'graduationThreshold' }),
    client.readContract({ address: locker, abi: LOCKER_ABI, functionName: 'lpPrincipal', args: [token] }),
    client.readContract({ address: locker, abi: LOCKER_ABI, functionName: 'isPermanentlyLocked', args: [token] }),
  ]);

  const [restrictionEndsAt, maxWalletBps, maxCumulativeBuyBps, poolFeeBps, creatorFeeShareBps] = config;
  const now = Math.floor(Date.now() / 1000);

  return {
    restrictionEndsAt: Number(restrictionEndsAt),
    restrictionSecondsLeft: Math.max(0, Number(restrictionEndsAt) - now),
    maxWalletPct: bpsToPct(maxWalletBps),
    maxCumulativeBuyPct: bpsToPct(maxCumulativeBuyBps),
    poolFeePct: bpsToPct(poolFeeBps),
    creatorFeeSharePct: bpsToPct(creatorFeeShareBps),
    graduationThresholdWeth: weiToEth(threshold),
    lpPrincipalWeth: weiToEth(principal),
    permanentlyLocked: locked,
  };
}

/**
 * Compare live chain state against the constants the docs publish.
 *
 * @param live - Config as read from chain.
 * @returns Findings. An empty array means the docs are still honest.
 */
export function diffAgainstDocs(live: OnChainLaunchConfig): Finding[] {
  const findings: Finding[] = [];
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  const check = (field: string, expected: number, actual: number, fmt: (n: number) => string, severity: Finding['severity']) => {
    if (Math.abs(expected - actual) > 1e-9) {
      findings.push({ field, expected: fmt(expected), actual: fmt(actual), severity });
    }
  };

  check('maxWalletPct', LAUNCH.maxWalletPct, live.maxWalletPct, pct, 'critical');
  check('maxCumulativeBuyPct', LAUNCH.maxCumulativeBuyPct, live.maxCumulativeBuyPct, pct, 'critical');
  check('poolTradingFee', LAUNCH.poolTradingFee, live.poolFeePct, pct, 'warning');
  check('creatorFeeShare', LAUNCH.creatorFeeShare, live.creatorFeeSharePct, pct, 'warning');
  check(
    'graduationThresholdWeth',
    LAUNCH.graduationLpPrincipalWeth,
    live.graduationThresholdWeth,
    (n) => `${n} WETH`,
    'warning',
  );

  if (!live.permanentlyLocked) {
    findings.push({
      field: 'permanentlyLocked',
      expected: 'true',
      actual: 'false',
      severity: 'critical',
    });
  }

  return findings;
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const token = flag('--token') as Address | undefined;
  if (!token) {
    console.error('usage: npm run verify:launch -- --token 0x… [--rpc URL]');
    process.exit(1);
  }

  const launchpad = (flag('--launchpad') ?? process.env.LAUNCHPAD_ADDRESS) as Address | undefined;
  const locker = (flag('--locker') ?? process.env.LOCKER_ADDRESS) as Address | undefined;
  if (!launchpad || !locker) {
    console.error('set LAUNCHPAD_ADDRESS and LOCKER_ADDRESS, or pass --launchpad / --locker');
    process.exit(1);
  }

  const live = await readLaunchConfig(token, launchpad, locker, flag('--rpc'));

  console.log(`\n  On-chain launch config for ${token}\n`);
  console.log(`  Permanently locked     ${live.permanentlyLocked ? 'yes' : 'NO'}`);
  console.log(`  Restriction left       ${Math.ceil(live.restrictionSecondsLeft / 60)} min`);
  console.log(`  Max wallet             ${(live.maxWalletPct * 100).toFixed(2)}%`);
  console.log(`  Max cumulative buy     ${(live.maxCumulativeBuyPct * 100).toFixed(2)}%`);
  console.log(`  Pool trading fee       ${(live.poolFeePct * 100).toFixed(2)}%`);
  console.log(`  Creator fee share      ${(live.creatorFeeSharePct * 100).toFixed(2)}%`);
  console.log(`  Graduation threshold   ${live.graduationThresholdWeth} WETH`);
  console.log(`  LP principal           ${live.lpPrincipalWeth.toFixed(4)} WETH`);
  console.log(
    `  Graduation progress    ${((live.lpPrincipalWeth / live.graduationThresholdWeth) * 100).toFixed(1)}%`,
  );

  const findings = diffAgainstDocs(live);
  if (findings.length === 0) {
    console.log(`\n  ✅ Chain agrees with published constants.\n`);
    return;
  }

  console.log(`\n  ⚠️  ${findings.length} mismatch(es) against published constants:\n`);
  for (const f of findings) {
    const tag = f.severity === 'critical' ? 'CRITICAL' : 'warning ';
    console.log(`  [${tag}] ${f.field}: docs say ${f.expected}, chain says ${f.actual}`);
  }
  console.log(`\n  Update the docs and the card copy before launch.\n`);
  process.exit(findings.some((f) => f.severity === 'critical') ? 2 : 0);
}

if (process.argv[1]?.includes('launch_verify')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
