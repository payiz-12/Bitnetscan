export interface Block {
  number: number;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  extraDataAscii?: string;
  size: number;
  gasLimit: number;
  gasUsed: number;
  timestamp: number;
  transactions: (string | Transaction)[];
  uncles: string[];
  baseFeePerGas?: string;
  mixHash?: string;
}

export interface Transaction {
  hash: string;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  valueWei?: string;
  timestamp?: number;
  gas?: number;
  gasPrice?: string;
  gasPriceWei?: string;
  effectiveGasPrice?: string;
  effectiveGasPriceWei?: string;
  fee?: string;
  feeWei?: string;
  input?: string;
  nonce?: number;
  transactionIndex?: number;
  type?: string;
  // Receipt fields
  status?: number; // 1 = success, 0 = failed
  gasUsed?: number;
  cumulativeGasUsed?: number;
  contractAddress?: string | null;
  logs?: any[];
  dataSource?: 'rpc' | 'snapshot';
}

export interface NetworkStats {
  latestBlock: number;
  gasPriceGwei: string | null;
  difficulty: string;
  hashrateEstimate: string;
  hashrateHps?: number | null;
  peerCount: number | null;
  chainId: number;
  clientVersion: string;
  avgBlockTimeSeconds: number;
  blockReward: string;
  circulatingEstimate?: string;
  transactionsToday?: number;
  totalTransactions?: number;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  standard: 'BTS-20' | 'BTS-721' | 'BTS-1155' | 'BTS-21' | 'BTS-HCE';
  holdersCount?: number;
  icon?: string;
}

export interface RpcEndpointStatus {
  url: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  blockNumber: number;
  isPrimary?: boolean;
}
