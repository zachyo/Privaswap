'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { useDexStore } from '@/store/useDexStore';
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  ShieldCheckIcon, 
  EyeIcon, 
  EyeSlashIcon,
  UserPlusIcon 
} from '@heroicons/react/24/outline';

export default function BalanceManager() {
  const { isConnected, provider, address } = useWalletStore();
  const { 
    tokens, 
    isLoading, 
    loadTokenData, 
    registerForEncryption, 
    depositToEncrypted, 
    withdrawFromEncrypted 
  } = useDexStore();

  const [selectedToken, setSelectedToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [operation, setOperation] = useState<'deposit' | 'withdraw'>('deposit');
  const [showPrivateBalances, setShowPrivateBalances] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected && provider && address) {
      loadTokenData(provider, address).catch(console.error);
    }
  }, [isConnected, provider, address, loadTokenData]);

  const tokenList = Object.values(tokens);
  const selectedTokenData = tokens[selectedToken];

  const handleRegister = async (tokenAddress: string) => {
    if (!provider) return;

    setIsProcessing(true);
    try {
      await registerForEncryption(provider, tokenAddress);
      alert('Successfully registered for encrypted operations!');
    } catch (error: any) {
      alert(`Registration failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOperation = async () => {
    if (!provider || !selectedToken || !amount) return;

    setIsProcessing(true);
    try {
      if (operation === 'deposit') {
        await depositToEncrypted(provider, selectedToken, amount);
        alert('Deposit completed successfully!');
      } else {
        await withdrawFromEncrypted(provider, selectedToken, amount);
        alert('Withdrawal completed successfully!');
      }
      setAmount('');
    } catch (error: any) {
      alert(`Operation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMaxAmount = () => {
    if (!selectedTokenData) return '0';
    return operation === 'deposit' 
      ? selectedTokenData.balance 
      : selectedTokenData.encryptedBalance;
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Balance Manager</h2>
          <p className="text-gray-600">Connect your wallet to manage encrypted balances</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Balance Manager</h2>
        <button
          onClick={() => setShowPrivateBalances(!showPrivateBalances)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          {showPrivateBalances ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          {showPrivateBalances ? 'Hide' : 'Show'} Private
        </button>
      </div>

      {/* Token Balances */}
      <div className="space-y-3 mb-6">
        {tokenList.map((token) => (
          <div key={token.address} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {token.symbol.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-sm text-gray-500">
                    {token.isRegistered ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <ShieldCheckIcon className="w-3 h-3" />
                        Registered
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRegister(token.address)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                      >
                        <UserPlusIcon className="w-3 h-3" />
                        Register
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium">
                  Public: {token.balance} {token.symbol}
                </div>
                <div className="text-sm text-gray-600">
                  Private: {showPrivateBalances ? token.encryptedBalance : '••••••'} {token.symbol}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Operation Selection */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setOperation('deposit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
            operation === 'deposit'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowDownIcon className="w-4 h-4" />
          Deposit
        </button>
        <button
          onClick={() => setOperation('withdraw')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
            operation === 'withdraw'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowUpIcon className="w-4 h-4" />
          Withdraw
        </button>
      </div>

      {/* Token Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a token</option>
          {tokenList.map((token) => (
            <option key={token.address} value={token.address}>
              {token.symbol}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Amount</label>
          <button
            onClick={() => setAmount(getMaxAmount())}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Max: {getMaxAmount()} {selectedTokenData?.symbol}
          </button>
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Operation Button */}
      <button
        onClick={handleOperation}
        disabled={!selectedToken || !amount || isProcessing || isLoading || !selectedTokenData?.isRegistered}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          operation === 'deposit'
            ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white'
            : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white'
        }`}
      >
        {isProcessing 
          ? `${operation === 'deposit' ? 'Depositing' : 'Withdrawing'}...`
          : isLoading 
          ? 'Loading...'
          : !selectedTokenData?.isRegistered && selectedToken
          ? 'Register for encryption first'
          : `${operation === 'deposit' ? 'Deposit to' : 'Withdraw from'} Private Balance`
        }
      </button>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <div className="font-medium">
              {operation === 'deposit' ? 'Deposit to Private' : 'Withdraw from Private'}
            </div>
            <div>
              {operation === 'deposit' 
                ? 'Convert public tokens to encrypted private balance'
                : 'Convert encrypted private balance back to public tokens'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
