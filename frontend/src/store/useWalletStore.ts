import { create } from 'zustand';
import { ethers } from 'ethers';

export interface WalletState {
  // Connection state
  isConnected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  
  // Wallet type
  walletType: 'metamask' | 'core' | 'rabby'| null;
  
  // Loading states
  isConnecting: boolean;
  
  // Actions
  connectWallet: (walletType: 'metamask' | 'core' | 'rabby') => Promise<void>;
  disconnectWallet: () => void;
  switchToAvalanche: () => Promise<void>;
}

const AVALANCHE_TESTNET = {
  chainId: '0xA869', // 43113 in hex
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
};

export const useWalletStore = create<WalletState>((set, get) => ({
  // Initial state
  isConnected: false,
  address: null,
  provider: null,
  signer: null,
  chainId: null,
  walletType: null,
  isConnecting: false,

  // Connect wallet function
  connectWallet: async (walletType: 'metamask' | 'core' | 'rabby') => {
    set({ isConnecting: true });
    
    try {
      let ethereum: any;
      
      // Get the appropriate provider
      if (walletType === 'metamask') {
        ethereum = (window as any).ethereum;
        if (!ethereum || !ethereum.isMetaMask) {
          throw new Error('MetaMask is not installed');
        }
      } else if (walletType === 'core') {
        ethereum = (window as any).ethereum;
        if (!ethereum || !ethereum.isAvalanche) {
          throw new Error('Core Wallet is not installed');
        }
      } else if (walletType === 'rabby') {
        ethereum = (window as any).ethereum;
        if (!ethereum || !ethereum.isRabby) {
          throw new Error('Rabby Wallet is not installed');
        }
      }

      // Request account access
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      set({
        isConnected: true,
        address: accounts[0],
        provider,
        signer,
        chainId: Number(network.chainId),
        walletType,
        isConnecting: false,
      });

      // Set up event listeners
      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          get().disconnectWallet();
        } else {
          set({ address: accounts[0] });
        }
      });

      ethereum.on('chainChanged', (chainId: string) => {
        set({ chainId: parseInt(chainId, 16) });
      });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      set({ isConnecting: false });
      throw error;
    }
  },

  // Disconnect wallet
  disconnectWallet: () => {
    set({
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      walletType: null,
      isConnecting: false,
    });
  },

  // Switch to Avalanche network
  switchToAvalanche: async () => {
    const { provider } = get();
    if (!provider) {
      throw new Error('No wallet connected');
    }

    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AVALANCHE_TESTNET.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [AVALANCHE_TESTNET],
          });
        } catch (addError) {
          throw new Error('Failed to add Avalanche network');
        }
      } else {
        throw new Error('Failed to switch to Avalanche network');
      }
    }
  },
}));
