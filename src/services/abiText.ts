import { ethers } from 'ethers';

/** Decodes an ABI `string` return value, falling back to a bytes32-encoded string. */
export function decodeStringOrBytes32(hex: string): string {
  if (!hex || hex === '0x') return '';
  try { return String(ethers.AbiCoder.defaultAbiCoder().decode(['string'], hex)[0]).trim(); } catch {}
  try { return ethers.decodeBytes32String(hex).trim(); } catch { return ''; }
}
