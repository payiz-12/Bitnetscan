// Common EVM & Bitnet method and event signatures. Fallback for txDecode.ts when the public
// signature database cannot be reached.
export const KNOWN_METHOD_SIGNATURES: Record<string, { name: string; params: string[] }> = {
  // ERC-20 / BTS-20
  '0xa9059cbb': { name: 'transfer', params: ['address recipient', 'uint256 amount'] },
  '0x095ea7b3': { name: 'approve', params: ['address spender', 'uint256 amount'] },
  '0x23b872dd': { name: 'transferFrom', params: ['address sender', 'address recipient', 'uint256 amount'] },
  '0x70a08231': { name: 'balanceOf', params: ['address account'] },
  '0x18160ddd': { name: 'totalSupply', params: [] },
  '0x313ce567': { name: 'decimals', params: [] },
  '0x06fdde03': { name: 'name', params: [] },
  '0x95d89b41': { name: 'symbol', params: [] },

  // Wrapped Bitnet (WBTN, WETH9 interface)
  '0xd0e30db0': { name: 'deposit', params: [] },
  '0x2e1a7d4d': { name: 'withdraw', params: ['uint256 amount'] },

  // BTS-721 / ERC-721 (NFTs)
  '0x40c10f19': { name: 'mint', params: ['address to', 'uint256 tokenId'] },
  '0x42842e0e': { name: 'safeTransferFrom', params: ['address from', 'address to', 'uint256 tokenId'] },
  '0xb88d4fde': { name: 'safeTransferFrom', params: ['address from', 'address to', 'uint256 tokenId', 'bytes data'] },
  '0x6352211e': { name: 'ownerOf', params: ['uint256 tokenId'] },
  '0xc87b56dd': { name: 'tokenURI', params: ['uint256 tokenId'] },
  '0x081812fc': { name: 'getApproved', params: ['uint256 tokenId'] },
  '0xe985e9c5': { name: 'isApprovedForAll', params: ['address owner', 'address operator'] },
  '0xa22cb463': { name: 'setApprovalForAll', params: ['address operator', 'bool approved'] },

  // BTS-1155
  '0xf242432a': { name: 'safeTransferFrom', params: ['address from', 'address to', 'uint256 id', 'uint256 amount', 'bytes data'] },
  '0x2eb2c2d6': { name: 'safeBatchTransferFrom', params: ['address from', 'address to', 'uint256[] ids', 'uint256[] amounts', 'bytes data'] },

  // Bitnet BTS-21 & BTS-HCE specific methods
  '0x715018a6': { name: 'renounceOwnership', params: [] },
  '0xf2fde38b': { name: 'transferOwnership', params: ['address newOwner'] },
  '0x8da5cb5b': { name: 'owner', params: [] },
  '0x8797f1f0': { name: 'freezeAccount', params: ['address account', 'bool isFrozen'] },
  '0xeb573d82': { name: 'setOraclePrice', params: ['uint256 newPrice'] },
};

// Known Event Signatures (Topic 0)
export const KNOWN_EVENT_TOPICS: Record<string, { name: string; params: string[] }> = {
  // Transfer(address,address,uint256)
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': {
    name: 'Transfer',
    params: ['address from', 'address to', 'uint256 value_or_tokenId'],
  },
  // Approval(address,address,uint256)
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': {
    name: 'Approval',
    params: ['address owner', 'address spender', 'uint256 value'],
  },
  // OwnershipTransferred(address,address)
  '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0': {
    name: 'OwnershipTransferred',
    params: ['address previousOwner', 'address newOwner'],
  },
};
