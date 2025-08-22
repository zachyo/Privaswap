'use client';

import { useState, useEffect } from 'react';
import WalletConnection from '@/components/WalletConnection';
import SwapInterface from '@/components/SwapInterface';
import LiquidityInterface from '@/components/LiquidityInterface';
import BalanceManager from '@/components/BalanceManager';
import { useDexStore } from '@/store/useDexStore';
import { ShieldCheckIcon, CurrencyDollarIcon, BanknotesIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'balance'>('swap');
  const { setContractAddresses } = useDexStore();

  useEffect(() => {
    // Set mock contract addresses for demo
    // In a real app, these would come from environment variables or a config file
    setContractAddresses(
      '0x1234567890123456789012345678901234567890', // Mock DEX address
      {
        'TokenA': '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        'TokenB': '0x1111111111111111111111111111111111111111',
      }
    );
  }, [setContractAddresses]);

  const tabs = [
    { id: 'swap', label: 'Swap', icon: CurrencyDollarIcon },
    { id: 'liquidity', label: 'Liquidity', icon: BanknotesIcon },
    { id: 'balance', label: 'Balance', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Private DEX</h1>
                <p className="text-sm text-gray-500">Privacy-focused trading on Avalanche</p>
              </div>
            </div>
            <WalletConnection />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Privacy Features</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">Encrypted Balances</div>
                    <div className="text-sm text-gray-600">Your token balances are encrypted on-chain</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">Private Trading</div>
                    <div className="text-sm text-gray-600">Trade amounts remain confidential</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">MEV Protection</div>
                    <div className="text-sm text-gray-600">Protected from front-running attacks</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">How It Works</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Register for encrypted operations</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Deposit tokens to private balance</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Trade privately with encrypted amounts</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Withdraw to public balance when needed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Interface */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'swap' && <SwapInterface />}
              {activeTab === 'liquidity' && <LiquidityInterface />}
              {activeTab === 'balance' && <BalanceManager />}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">Private DEX - Built for Hack2Build: Privacy Edition</p>
            <p className="text-sm">Powered by Avalanche C-Chain & eERC20 Encrypted Tokens</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
