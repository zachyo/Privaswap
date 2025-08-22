// Contract configuration for different networks
export const NETWORKS = {
  AVALANCHE_TESTNET: {
    chainId: 43113,
    name: 'Avalanche Fuji Testnet',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
  },
  AVALANCHE_MAINNET: {
    chainId: 43114,
    name: 'Avalanche Mainnet',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
  },
};

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [NETWORKS.AVALANCHE_TESTNET.chainId]: {
    PRIVATE_DEX: process.env.NEXT_PUBLIC_PRIVATE_DEX_ADDRESS || '0x1234567890123456789012345678901234567890',
    TOKENS: {
      TokenA: process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS || '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      TokenB: process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS || '0x1111111111111111111111111111111111111111',
    },
    LIQUIDITY_POOL: process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS || '0x2222222222222222222222222222222222222222',
    SWAP_ROUTER: process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS || '0x3333333333333333333333333333333333333333',
  },
  [NETWORKS.AVALANCHE_MAINNET.chainId]: {
    PRIVATE_DEX: '',
    TOKENS: {
      TokenA: '',
      TokenB: '',
    },
    LIQUIDITY_POOL: '',
    SWAP_ROUTER: '',
  },
};

// Get contract addresses for current network
export const getContractAddresses = (chainId: number) => {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[NETWORKS.AVALANCHE_TESTNET.chainId];
};

// Get network info
export const getNetworkInfo = (chainId: number) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};

// Check if network is supported
export const isSupportedNetwork = (chainId: number) => {
  return Object.values(NETWORKS).some(network => network.chainId === chainId);
};
