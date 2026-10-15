// Ethash parameters used by Bitnet (consensus/ethash/algorithm.go in BitnetMoney/bitnet).
export const ETHASH_EPOCH_LENGTH = 30000;

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

/** Ethash dataset (DAG) size in bytes for an epoch, as computed by calcDatasetSize. */
export function ethashDagSize(epoch: number): number {
  const mixBytes = 128;
  let size = 2 ** 30 + 2 ** 23 * epoch - mixBytes;
  while (!isPrime(size / mixBytes)) size -= 2 * mixBytes;
  return size;
}
