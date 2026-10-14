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
