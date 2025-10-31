# create-bridge-kit

Scaffold a working bidirectional USDC bridge modal between Ethereum Sepolia and Arc Testnet using Circle Bridge Kit.

## Quick Start

```bash
npx create-bridge-kit my-bridge-app
cd my-bridge-app
npm install
npm run dev
```

## What's Included

- ✅ Fully functional `BridgeModal` component with bidirectional bridging
- ✅ `useBridge` hook for flexible bridge integration
- ✅ Beautiful UI with Framer Motion animations
- ✅ Wagmi + RainbowKit wallet integration
- ✅ Circle Bridge Kit integration
- ✅ Automatic USDC balance fetching (both chains)
- ✅ Chain switching automation
- ✅ Visual chain swap button (↔) for direction toggle
- ✅ Progress timer during bridge process
- ✅ Confetti animation on successful bridge
- ✅ Chain icons (Sepolia & Arc)
- ✅ Error handling and user guidance
- ✅ TypeScript + React + Vite setup
- ✅ Tailwind CSS for styling

## Usage

The scaffolded project includes a ready-to-use `BridgeModal` component:

```tsx
import BridgeModal from './components/BridgeModal';
import { useState } from 'react';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Bridge USDC
      </button>
      <BridgeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
```

### Using the Hook Directly

For more control, use the `useBridge` hook:

```tsx
import { useBridge } from './hooks/useBridge';

function MyComponent() {
  const { state, tokenBalance, bridge, fetchTokenBalance } = useBridge();
  
  const handleBridge = async () => {
    // Bridge from Sepolia to Arc
    await bridge('USDC', '10', 'sepolia-to-arc');
    
    // Or bridge from Arc to Sepolia
    // await bridge('USDC', '10', 'arc-to-sepolia');
  };
  
  return (
    <div>
      <p>Balance: {tokenBalance} USDC</p>
      <button onClick={handleBridge}>Bridge</button>
      {state.step === 'success' && <p>Bridge successful!</p>}
    </div>
  );
}
```

## Features

### Bridge Modal Component

- **Bidirectional Bridging**: Bridge USDC from Sepolia ↔ Arc Testnet in either direction
- **Visual Chain Swap**: Click the swap button (↔) to toggle bridge direction
- **Auto-detects** USDC balance on source chain (Sepolia or Arc)
- **Multi-RPC fallback** for reliable balance fetching
- **Chain switching** prompts users to switch when needed
- **Progress Timer**: Shows elapsed time during bridge process
- **Confetti Animation**: Celebration on successful bridge
- **Error handling** with helpful messages
- **USDC contract address** validation and guidance
- **Real-time status** updates during bridging
- **Transaction Links**: Direct links to view transactions on block explorers

### Supported Chains (Bidirectional)

- **Ethereum Sepolia** (Chain ID: 11155111) ↔ **Arc Testnet** (Chain ID: 5042002)

## Requirements

- Node.js 18+
- MetaMask or compatible wallet
- USDC on Ethereum Sepolia or Arc Testnet (depending on bridge direction)
  - Get Sepolia USDC from [Circle Faucet](https://faucet.circle.com/)
  - Get Arc Testnet USDC from Arc Testnet faucet

### Manual Arc Testnet Setup

**Important**: Arc Testnet must be manually added to your wallet before using the bridge.

Add Arc Testnet to MetaMask with these details:
- **Network Name**: Arc Testnet
- **RPC URL**: `https://rpc.testnet.arc.network`
- **Chain ID**: `5042002`
- **Currency Symbol**: `USDC`
- **Block Explorer**: `https://testnet.arcscan.app`
- **Decimals**: `6` (USDC uses 6 decimals)

## Configuration

### WalletConnect Project ID

Update your WalletConnect Project ID in `src/config/wagmi.ts`:

```typescript
export const config = getDefaultConfig({
  appName: 'Bridge Kit App',
  projectId: 'your-project-id', // Get from https://cloud.walletconnect.com
  chains: [sepolia, arcTestnet],
});
```

## Project Structure

```
my-bridge-app/
├── src/
│   ├── components/
│   │   └── BridgeModal.tsx    # Main bridge modal component
│   ├── hooks/
│   │   └── useBridge.ts        # Core bridging logic hook
│   ├── config/
│   │   └── wagmi.ts           # Wagmi/RainbowKit configuration
│   ├── App.tsx                # Example app
│   ├── main.tsx               # Entry point
│   └── index.css              # Tailwind CSS
├── public/                    # Static assets (chain icons, USDC icon)
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Token Addresses

- **Sepolia USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Arc Testnet USDC**: `0x3600000000000000000000000000000000000000`

## Documentation

- [Circle Bridge Kit Docs](https://developers.circle.com/bridge-kit)
- [Wagmi Docs](https://wagmi.sh)
- [RainbowKit Docs](https://rainbowkit.com)

## License

MIT

