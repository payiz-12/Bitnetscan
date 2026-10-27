// /api/rpc: the browser's JSON-RPC endpoint for rpc.bitnetmoney.org, limited to the read methods
// BitnetScan uses (see _lib/rpcProxy.js).
import { rpcProxy } from './_lib/rpcProxy.js';

export default rpcProxy('https://rpc.bitnetmoney.org/');
