'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { useDexStore } from '@/store/useDexStore';
import { PlusIcon, MinusIcon, ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LiquidityInterface() {
  const { isConnected, provider, address } = useWalletStore();
  const { tokens, isLoading, loadTokenData } = useDexStore();

  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [tokenA, setTokenA] = useState<string>('');
  const [tokenB, setTokenB] = useState<string>('');
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [showPrivateBalances, setShowPrivateBalances] = useState<boolean>(false);
  const [usePrivateBalance, setUsePrivateBalance] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected && provider && address) {
      loadTokenData(provider, address).catch(console.error);
    }
  }, [isConnected, provider, address, loadTokenData]);

  const tokenList = Object.values(tokens);
  const tokenAData = tokens[tokenA];
  const tokenBData = tokens[tokenB];

  const getBalance = (tokenData: any) => {
    if (!tokenData) return '0';
    return usePrivateBalance ? tokenData.encryptedBalance : tokenData.balance;
  };

  const getBalanceLabel = () => {
    return usePrivateBalance ? 'Private Balance' : 'Public Balance';
  };

  const handleAmountAChange = (value: string) => {
    setAmountA(value);
    // In a real implementation, this would calculate the proportional amount for token B
    // For demo purposes, we'll use a simple 1:2 ratio
    if (tokenAData?.symbol === 'TokenA') {
      setAmountB((parseFloat(value || '0') * 2).toString());
    } else {
      setAmountB((parseFloat(value || '0') * 0.5).toString());
    }
  };

  const handleAddLiquidity = async () => {
    if (!provider || !amountA || !amountB) return;

    setIsProcessing(true);
    try {
      // Mock pair ID for demo
      const mockPairId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // In a real implementation, this would:
      // 1. Approve tokens for the DEX contract
      // 2. Call addLiquidity on the DEX contract
      // 3. Handle the transaction
      
      // For demo, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Liquidity added successfully!');
      setAmountA('');
      setAmountB('');
    } catch (error: any) {
      alert(`Failed to add liquidity: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!provider || !amountA) return;

    setIsProcessing(true);
    try {
      // Mock implementation for removing liquidity
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Liquidity removed successfully!');
      setAmountA('');
      setAmountB('');
    } catch (error: any) {
      alert(`Failed to remove liquidity: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Private Liquidity</h2>
          <p className="text-gray-600">Connect your wallet to provide liquidity privately</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Private Liquidity</h2>
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Privacy Enabled</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'add'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <PlusIcon className="w-4 h-4" />
          Add Liquidity
        </button>
        <button
          onClick={() => setActiveTab('remove')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'remove'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MinusIcon className="w-4 h-4" />
          Remove Liquidity
        </button>
      </div>

      {/* Privacy Controls */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Balance Type</label>
          <button
            onClick={() => setShowPrivateBalances(!showPrivateBalances)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {showPrivateBalances ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            {showPrivateBalances ? 'Hide' : 'Show'} Private
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setUsePrivateBalance(false)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              !usePrivateBalance
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setUsePrivateBalance(true)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              usePrivateBalance
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Private
          </button>
        </div>
      </div>

      {activeTab === 'add' ? (
        <>
          {/* Token A Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Token A</label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <select
                  value={tokenA}
                  onChange={(e) => setTokenA(e.target.value)}
                  className="bg-transparent text-lg font-medium focus:outline-none"
                >
                  <option value="">Select token</option>
                  {tokenList.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{getBalanceLabel()}</div>
                  <div className="font-medium">
                    {showPrivateBalances || !usePrivateBalance
                      ? getBalance(tokenAData)
                      : '••••••'
                    } {tokenAData?.symbol}
                  </div>
                </div>
              </div>
              <input
                type="number"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Token B Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Token B</label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <select
                  value={tokenB}
                  onChange={(e) => setTokenB(e.target.value)}
                  className="bg-transparent text-lg font-medium focus:outline-none"
                >
                  <option value="">Select token</option>
                  {tokenList.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{getBalanceLabel()}</div>
                  <div className="font-medium">
                    {showPrivateBalances || !usePrivateBalance
                      ? getBalance(tokenBData)
                      : '••••••'
                    } {tokenBData?.symbol}
                  </div>
                </div>
              </div>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Add Liquidity Button */}
          <button
            onClick={handleAddLiquidity}
            disabled={!tokenA || !tokenB || !amountA || !amountB || isProcessing || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {isProcessing ? 'Adding Liquidity...' : isLoading ? 'Loading...' : 'Add Liquidity Privately'}
          </button>
        </>
      ) : (
        <>
          {/* Remove Liquidity Interface */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Liquidity Shares</label>
            <div className="bg-gray-50 rounded-lg p-4">
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl font-medium focus:outline-none"
              />
              <div className="text-sm text-gray-500 mt-2">
                Amount of liquidity shares to remove
              </div>
            </div>
          </div>

          {/* Remove Liquidity Button */}
          <button
            onClick={handleRemoveLiquidity}
            disabled={!amountA || isProcessing || isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {isProcessing ? 'Removing Liquidity...' : isLoading ? 'Loading...' : 'Remove Liquidity'}
          </button>
        </>
      )}

      {/* Privacy Notice */}
      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <div className="flex items-start gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
          <div className="text-sm text-green-700">
            <div className="font-medium">Privacy Protected</div>
            <div>Your liquidity positions and amounts are encrypted on-chain</div>
          </div>
        </div>
      </div>
    </div>
  );
}
