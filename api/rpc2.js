// /api/rpc2: the browser's backup JSON-RPC endpoint for rpc.bitnetmoney.com, limited to the read
// methods BitnetScan uses (see _lib/rpcProxy.js).
import { rpcProxy } from './_lib/rpcProxy.js';

export default rpcProxy('https://rpc.bitnetmoney.com/');
