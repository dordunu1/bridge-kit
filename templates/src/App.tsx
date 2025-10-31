import { useState } from 'react';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import BridgeModal from './components/BridgeModal';
import { ArrowLeftRight } from 'lucide-react';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function AppContent() {
  const { address, isConnected } = useAccount();
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center relative">
        {/* Wallet Connect Button - Top Right */}
        <div className="absolute top-6 right-6">
          <ConnectButton
            showBalance={true}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>

        <div className="mt-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bridge Kit Demo
          </h1>
          <p className="text-gray-600 mb-6 text-sm">
            Bridge USDC from Ethereum Sepolia to Arc Testnet
          </p>

          {/* Connected State */}
          {isConnected && address && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-emerald-700 font-medium mb-1">
                Wallet Connected
              </p>
              <p className="text-sm text-emerald-900 font-mono break-all">
                {address}
              </p>
            </div>
          )}

          {/* Bridge Button */}
          <button
            onClick={() => setIsBridgeModalOpen(true)}
            disabled={!isConnected}
            className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              isConnected
                ? 'bg-gradient-to-r from-orange-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ArrowLeftRight className="w-5 h-5" />
            {isConnected ? 'Bridge USDC' : 'Connect Wallet to Bridge'}
          </button>

          {!isConnected && (
            <p className="text-xs text-gray-500 mt-3">
              Connect your wallet to start bridging USDC
            </p>
          )}
        </div>
      </div>

      <BridgeModal
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

