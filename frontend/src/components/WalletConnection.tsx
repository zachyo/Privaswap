'use client';

import { useState } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { WalletIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function WalletConnection() {
  const {
    isConnected,
    address,
    chainId,
    walletType,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchToAvalanche,
  } = useWalletStore();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isAvalancheTestnet = chainId === 43113;

  const handleConnect = async (type: 'metamask' | 'core') => {
    try {
      await connectWallet(type);
      setShowWalletOptions(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToAvalanche();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowWalletOptions(!showWalletOptions)}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <WalletIcon className="w-5 h-5" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>

        {showWalletOptions && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
            <div className="p-2">
              <button
                onClick={() => handleConnect('metamask')}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-medium">MetaMask</span>
              </button>
              
              <button
                onClick={() => handleConnect('core')}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-medium">Core Wallet</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Network indicator */}
      {!isAvalancheTestnet && (
        <button
          onClick={handleSwitchNetwork}
          className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
        >
          Switch to Avalanche
        </button>
      )}

      {isAvalancheTestnet && (
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
          Avalanche Testnet
        </div>
      )}

      {/* Wallet info */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {walletType === 'metamask' ? 'M' : 'C'}
            </span>
          </div>
          <span className="font-medium">{formatAddress(address!)}</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        {showDropdown && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
            <div className="p-2">
              <div className="p-3 border-b border-gray-100">
                <div className="text-sm text-gray-500">Connected with {walletType}</div>
                <div className="font-mono text-sm mt-1">{address}</div>
              </div>
              
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowDropdown(false);
                }}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors text-red-600"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
