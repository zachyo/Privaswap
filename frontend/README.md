# Private DEX Frontend

A privacy-focused decentralized exchange frontend built with Next.js, TypeScript, and Tailwind CSS for the Hack2Build: Privacy Edition hackathon.

## Features

### 🔒 Privacy-First Design
- **Encrypted Balance Display**: Toggle between public and private balance views
- **Privacy Indicators**: Clear visual indicators when privacy features are active
- **Confidential Trading**: Trade amounts and balances remain encrypted on-chain

### 🔄 Core Functionality
- **Token Swapping**: Swap between eERC20 encrypted tokens with privacy protection
- **Liquidity Management**: Add and remove liquidity with encrypted amounts
- **Balance Management**: Deposit/withdraw between public and private balances
- **User Registration**: Register for encrypted operations with eERC20 tokens

### 🌐 Web3 Integration
- **Multi-Wallet Support**: MetaMask and Core Wallet integration
- **Avalanche C-Chain**: Optimized for Avalanche testnet and mainnet
- **Real-time Updates**: Live balance and transaction updates
- **Network Switching**: Automatic network detection and switching

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Web3 Library**: ethers.js v6
- **Icons**: Heroicons
- **Blockchain**: Avalanche C-Chain (Testnet/Mainnet)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask or Core Wallet browser extension

### Installation

1. **Clone and navigate to frontend**:
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your deployed contract addresses:
   ```env
   NEXT_PUBLIC_PRIVATE_DEX_ADDRESS=your_dex_contract_address
   NEXT_PUBLIC_TOKEN_A_ADDRESS=your_token_a_address
   NEXT_PUBLIC_TOKEN_B_ADDRESS=your_token_b_address
   NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS=your_pool_address
   NEXT_PUBLIC_SWAP_ROUTER_ADDRESS=your_router_address
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage Guide

### 1. Connect Wallet
- Click "Connect Wallet" in the top-right corner
- Choose between MetaMask or Core Wallet
- Approve the connection request
- Ensure you're on Avalanche C-Chain Testnet

### 2. Register for Privacy Features
- Go to the "Balance" tab
- Click "Register" next to any token
- Confirm the transaction to enable encrypted operations

### 3. Manage Private Balances
- **Deposit**: Convert public tokens to encrypted private balance
- **Withdraw**: Convert encrypted private balance back to public tokens
- **Toggle Visibility**: Use the eye icon to show/hide private balances

### 4. Private Trading
- Go to the "Swap" tab
- Select tokens and amounts
- Choose between public or private balance usage
- Execute swaps with privacy protection

### 5. Liquidity Provision
- Go to the "Liquidity" tab
- Add liquidity with encrypted amounts
- Remove liquidity while maintaining privacy

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   │   ├── WalletConnection.tsx
│   │   ├── SwapInterface.tsx
│   │   ├── LiquidityInterface.tsx
│   │   └── BalanceManager.tsx
│   ├── store/              # Zustand state management
│   │   ├── useWalletStore.ts
│   │   └── useDexStore.ts
│   └── config/             # Configuration files
│       └── contracts.ts
├── public/                 # Static assets
└── package.json
```

## Privacy Features

### Encrypted Balance Display
- **Public Mode**: Shows actual token balances
- **Private Mode**: Shows encrypted balances or masked values
- **Toggle Control**: Easy switching between modes

### Privacy Indicators
- **Shield Icons**: Indicate when privacy features are active
- **Status Messages**: Clear feedback on privacy protection
- **Visual Cues**: Color-coded privacy states

### Confidential Operations
- **Encrypted Transfers**: All amounts encrypted on-chain
- **Private Swaps**: Trade amounts remain confidential
- **Hidden Liquidity**: LP positions encrypted

---

**Built for Hack2Build: Privacy Edition**
*Powered by Avalanche C-Chain & eERC20 Encrypted Tokens*
