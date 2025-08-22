import { create } from 'zustand';
import { ethers } from 'ethers';

// Contract ABIs (simplified for demo)
const MOCK_EERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function getEncryptedBalance(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function registerUser(bytes32 publicKey)',
  'function isUserRegistered(address user) view returns (bool)',
  'function depositToEncrypted(uint256 amount, uint256 nonce)',
  'function withdrawFromEncrypted(uint256 amount, uint256 nonce)',
  'function encryptedTransfer(address to, uint256 amount, uint256 nonce, bytes32 zkProof)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

const PRIVATE_DEX_ABI = [
  'function swapTokens(bytes32 pairId, uint256 amountIn, uint256 minAmountOut, bool isAToB) returns (uint256)',
  'function addLiquidity(bytes32 pairId, uint256 amountA, uint256 amountB, uint256 minShares) returns (uint256)',
  'function removeLiquidity(bytes32 pairId, uint256 shares, uint256 minAmountA, uint256 minAmountB) returns (uint256, uint256)',
  'function createPair(address tokenA, address tokenB, uint256 fee) returns (bytes32)',
  'function getPairInfo(bytes32 pairId) view returns (tuple(address tokenA, address tokenB, uint256 fee, uint256 reserveA, uint256 reserveB, bool isActive))',
  'function getLiquidityPosition(bytes32 pairId, address user) view returns (tuple(uint256 liquidity, uint256 amountA, uint256 amountB))',
  'function supportedTokens(address token) view returns (bool)',
];

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  encryptedBalance: string;
  isRegistered: boolean;
}

export interface PairInfo {
  id: string;
  tokenA: string;
  tokenB: string;
  fee: number;
  reserveA: string;
  reserveB: string;
  isActive: boolean;
}

export interface DexState {
  // Contract addresses
  privateDexAddress: string | null;
  tokenAddresses: { [symbol: string]: string };
  
  // Token data
  tokens: { [address: string]: TokenInfo };
  
  // Pair data
  pairs: { [id: string]: PairInfo };
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setContractAddresses: (dexAddress: string, tokens: { [symbol: string]: string }) => void;
  loadTokenData: (provider: ethers.BrowserProvider, userAddress: string) => Promise<void>;
  loadPairData: (provider: ethers.BrowserProvider, pairId: string) => Promise<void>;
  registerForEncryption: (provider: ethers.BrowserProvider, tokenAddress: string) => Promise<void>;
  depositToEncrypted: (provider: ethers.BrowserProvider, tokenAddress: string, amount: string) => Promise<void>;
  withdrawFromEncrypted: (provider: ethers.BrowserProvider, tokenAddress: string, amount: string) => Promise<void>;
  executeSwap: (provider: ethers.BrowserProvider, pairId: string, amountIn: string, minAmountOut: string, isAToB: boolean) => Promise<void>;
}

export const useDexStore = create<DexState>((set, get) => ({
  // Initial state
  privateDexAddress: null,
  tokenAddresses: {},
  tokens: {},
  pairs: {},
  isLoading: false,

  // Set contract addresses
  setContractAddresses: (dexAddress: string, tokens: { [symbol: string]: string }) => {
    set({
      privateDexAddress: dexAddress,
      tokenAddresses: tokens,
    });
  },

  // Load token data for a user
  loadTokenData: async (provider: ethers.BrowserProvider, userAddress: string) => {
    const { tokenAddresses } = get();
    set({ isLoading: true });

    try {
      const tokenData: { [address: string]: TokenInfo } = {};

      for (const [symbol, address] of Object.entries(tokenAddresses)) {
        const contract = new ethers.Contract(address, MOCK_EERC20_ABI, provider);
        
        const [balance, encryptedBalance, decimals, isRegistered] = await Promise.all([
          contract.balanceOf(userAddress),
          contract.getEncryptedBalance(userAddress),
          contract.decimals(),
          contract.isUserRegistered(userAddress),
        ]);

        tokenData[address] = {
          address,
          symbol,
          decimals: Number(decimals),
          balance: ethers.formatUnits(balance, decimals),
          encryptedBalance: ethers.formatUnits(encryptedBalance, decimals),
          isRegistered,
        };
      }

      set({ tokens: tokenData, isLoading: false });
    } catch (error) {
      console.error('Failed to load token data:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Load pair data
  loadPairData: async (provider: ethers.BrowserProvider, pairId: string) => {
    const { privateDexAddress } = get();
    if (!privateDexAddress) throw new Error('DEX address not set');

    try {
      const contract = new ethers.Contract(privateDexAddress, PRIVATE_DEX_ABI, provider);
      const pairInfo = await contract.getPairInfo(pairId);

      const pair: PairInfo = {
        id: pairId,
        tokenA: pairInfo.tokenA,
        tokenB: pairInfo.tokenB,
        fee: Number(pairInfo.fee),
        reserveA: ethers.formatEther(pairInfo.reserveA),
        reserveB: ethers.formatEther(pairInfo.reserveB),
        isActive: pairInfo.isActive,
      };

      set(state => ({
        pairs: { ...state.pairs, [pairId]: pair }
      }));
    } catch (error) {
      console.error('Failed to load pair data:', error);
      throw error;
    }
  },

  // Register user for encrypted operations
  registerForEncryption: async (provider: ethers.BrowserProvider, tokenAddress: string) => {
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, MOCK_EERC20_ABI, signer);
      
      // Generate a simple public key (in real implementation, this would be more sophisticated)
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes(`pubkey_${await signer.getAddress()}_${Date.now()}`));
      
      const tx = await contract.registerUser(publicKey);
      await tx.wait();
      
      // Reload token data
      const userAddress = await signer.getAddress();
      await get().loadTokenData(provider, userAddress);
    } catch (error) {
      console.error('Failed to register for encryption:', error);
      throw error;
    }
  },

  // Deposit tokens to encrypted balance
  depositToEncrypted: async (provider: ethers.BrowserProvider, tokenAddress: string, amount: string) => {
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, MOCK_EERC20_ABI, signer);
      
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      const nonce = Math.floor(Math.random() * 1000000);
      
      const tx = await contract.depositToEncrypted(amountWei, nonce);
      await tx.wait();
      
      // Reload token data
      const userAddress = await signer.getAddress();
      await get().loadTokenData(provider, userAddress);
    } catch (error) {
      console.error('Failed to deposit to encrypted:', error);
      throw error;
    }
  },

  // Withdraw from encrypted balance
  withdrawFromEncrypted: async (provider: ethers.BrowserProvider, tokenAddress: string, amount: string) => {
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, MOCK_EERC20_ABI, signer);
      
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      const nonce = Math.floor(Math.random() * 1000000);
      
      const tx = await contract.withdrawFromEncrypted(amountWei, nonce);
      await tx.wait();
      
      // Reload token data
      const userAddress = await signer.getAddress();
      await get().loadTokenData(provider, userAddress);
    } catch (error) {
      console.error('Failed to withdraw from encrypted:', error);
      throw error;
    }
  },

  // Execute swap
  executeSwap: async (provider: ethers.BrowserProvider, pairId: string, amountIn: string, minAmountOut: string, isAToB: boolean) => {
    const { privateDexAddress } = get();
    if (!privateDexAddress) throw new Error('DEX address not set');

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(privateDexAddress, PRIVATE_DEX_ABI, signer);
      
      const amountInWei = ethers.parseEther(amountIn);
      const minAmountOutWei = ethers.parseEther(minAmountOut);
      
      const tx = await contract.swapTokens(pairId, amountInWei, minAmountOutWei, isAToB);
      await tx.wait();
      
      // Reload data
      const userAddress = await signer.getAddress();
      await get().loadTokenData(provider, userAddress);
      await get().loadPairData(provider, pairId);
    } catch (error) {
      console.error('Failed to execute swap:', error);
      throw error;
    }
  },
}));
