/**
 * Miner reward as far as the block header alone can prove it: 1 BTN subsidy plus 1/32 BTN
 * per included uncle (verified on chain: a block without transactions raises the miner's
 * balance by exactly 1 BTN). Blocks with transactions also pay fees, which need receipts.
 */
export const blockRewardLabel = (block: { number?: number; uncles?: string[]; transactions: unknown[] }) => {
  if (block.number === 0) return '0 BTN';
  const base = 1 + (block.uncles?.length || 0) / 32;
  const text = `${Number.isInteger(base) ? base.toFixed(1) : base} BTN`;
  return block.transactions.length > 0 ? `${text} + fees` : text;
};

const WEI_PER_BTN = 10n ** 18n;

/**
 * Exact miner reward when the total transaction fees are known (the indexer reports them):
 * 1 BTN + 1/32 BTN per uncle + fees, all paid to the miner. Matches the miner's balance change.
 */
export const exactBlockRewardLabel = (uncleCount: number, feesWei: string | bigint) => {
  const total = WEI_PER_BTN + (BigInt(uncleCount) * WEI_PER_BTN) / 32n + BigInt(feesWei);
  const whole = total / WEI_PER_BTN;
  const frac = (total % WEI_PER_BTN).toString().padStart(18, '0').replace(/0+$/, '');
  return `${whole}.${frac || '0'} BTN`;
};
