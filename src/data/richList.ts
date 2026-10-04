import officialData from './official_rich_list.json';
import { rpcService } from '../services/rpc';

export interface RichAccount {
  rank: number;
  address: string;
  balance: number;
  balanceFormatted: string;
  percentage: string;
  txCount: number;
}

// 50 verified on-chain addresses on Bitnet L1
export const VERIFIED_HODL_WALLETS: RichAccount[] = officialData as RichAccount[];

/**
 * Live balance verification directly from the Bitnet JSON-RPC node (eth_getBalance & eth_getTransactionCount).
 * Does NOT scrape or rely on any external explorer websites.
 */
export async function fetchLiveRichList(latestBlock?: number): Promise<RichAccount[]> {
  const estimatedTotalSupply = Math.max(latestBlock || 7721800, 7700000);

  try {
    // Query balances directly from Bitnet JSON-RPC in parallel batches
    const updatedAccounts = await Promise.all(
      VERIFIED_HODL_WALLETS.slice(0, 50).map(async (acc) => {
        try {
          const [balStr, nonce] = await Promise.all([
            rpcService.getBalance(acc.address),
            rpcService.getTransactionCount(acc.address),
          ]);
          const balNum = parseFloat(balStr);
          if (!isNaN(balNum) && balNum >= 0) {
            return {
              ...acc,
              balance: balNum,
              balanceFormatted: balNum.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              }),
              percentage: ((balNum / estimatedTotalSupply) * 100).toFixed(4) + '%',
              txCount: nonce,
            };
          }
        } catch {
          // Fallback to initial state if an individual query fails
        }
        return acc;
      })
    );

    // Re-sort strictly by live balance descending
    updatedAccounts.sort((a, b) => b.balance - a.balance);
    updatedAccounts.forEach((acc, idx) => {
      acc.rank = idx + 1;
    });

    return updatedAccounts;
  } catch (e) {
    console.warn('Failed to verify live balances via RPC, using verified list:', e);
    return VERIFIED_HODL_WALLETS;
  }
}
