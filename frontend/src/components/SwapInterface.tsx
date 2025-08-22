'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { useDexStore } from '@/store/useDexStore';
import { ArrowsUpDownIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function SwapInterface() {
  const { isConnected, provider, address } = useWalletStore();
  const { tokens, isLoading, loadTokenData, executeSwap } = useDexStore();

  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<string>('0.5');
  const [usePrivateBalance, setUsePrivateBalance] = useState<boolean>(true);
  const [showPrivateBalances, setShowPrivateBalances] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  // Mock pair ID for demo (in real app, this would be calculated)
  const mockPairId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  useEffect(() => {
    if (isConnected && provider && address) {
      loadTokenData(provider, address).catch(console.error);
    }
  }, [isConnected, provider, address, loadTokenData]);

  const tokenList = Object.values(tokens);
  const fromTokenData = tokens[fromToken];
  const toTokenData = tokens[toToken];

  const calculateToAmount = (amount: string) => {
    if (!amount || !fromTokenData || !toTokenData) return '';
    
    // Simple 1:2 ratio for demo (in real app, this would use AMM math)
    const ratio = fromTokenData.symbol === 'TokenA' ? 2 : 0.5;
    return (parseFloat(amount) * ratio).toString();
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    setToAmount(calculateToAmount(value));
  };

  const handleSwapTokens = () => {
    const newFromToken = toToken;
    const newToToken = fromToken;
    setFromToken(newFromToken);
    setToToken(newToToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    if (!provider || !fromAmount || !toAmount) return;

    setIsSwapping(true);
    try {
      const minAmountOut = (parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toString();
      const isAToB = fromTokenData.symbol === 'TokenA';
      
      await executeSwap(provider, mockPairId, fromAmount, minAmountOut, isAToB);
      
      // Reset form
      setFromAmount('');
      setToAmount('');
      
      alert('Swap completed successfully!');
    } catch (error: any) {
      alert(`Swap failed: ${error.message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const getBalance = (tokenData: any) => {
    if (!tokenData) return '0';
    return usePrivateBalance ? tokenData.encryptedBalance : tokenData.balance;
  };

  const getBalanceLabel = () => {
    return usePrivateBalance ? 'Private Balance' : 'Public Balance';
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Private DEX Swap</h2>
          <p className="text-gray-600">Connect your wallet to start trading privately</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Private Swap</h2>
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Privacy Enabled</span>
        </div>
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

      {/* From Token */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
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
                  ? getBalance(fromTokenData)
                  : '••••••'
                } {fromTokenData?.symbol}
              </div>
            </div>
          </div>
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => handleFromAmountChange(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-2xl font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleSwapTokens}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowsUpDownIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* To Token */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
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
                  ? getBalance(toTokenData)
                  : '••••••'
                } {toTokenData?.symbol}
              </div>
            </div>
          </div>
          <input
            type="number"
            value={toAmount}
            readOnly
            placeholder="0.0"
            className="w-full bg-transparent text-2xl font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Slippage */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Slippage Tolerance</label>
        <div className="flex gap-2">
          {['0.1', '0.5', '1.0'].map((value) => (
            <button
              key={value}
              onClick={() => setSlippage(value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                slippage === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {value}%
            </button>
          ))}
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="flex-1 px-3 py-1 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Custom"
          />
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!fromToken || !toToken || !fromAmount || isSwapping || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
      >
        {isSwapping ? 'Swapping...' : isLoading ? 'Loading...' : 'Swap Privately'}
      </button>

      {/* Privacy Notice */}
      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <div className="flex items-start gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
          <div className="text-sm text-green-700">
            <div className="font-medium">Privacy Protected</div>
            <div>Your trade amounts and balances are encrypted on-chain</div>
          </div>
        </div>
      </div>
    </div>
  );
}
