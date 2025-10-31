import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Loader2, CheckCircle, AlertCircle, ExternalLink, ChevronDown, Clock, ArrowLeftRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import confetti from 'canvas-confetti';
import { useBridge, type BridgeToken, type BridgeStep, CHAIN_TOKENS, SEPOLIA_CHAIN_ID, ARC_CHAIN_ID } from '../hooks/useBridge';

interface BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Step labels for better UX - Setting expectations upfront
const STEP_LABELS: Record<BridgeStep, { title: string; description: string }> = {
  idle: { title: 'Ready', description: 'Enter amount to bridge' },
  'switching-network': { 
    title: 'Switching Network', 
    description: 'You will be asked to switch to Sepolia network in your wallet' 
  },
  approving: { 
    title: 'Bridge In Progress', 
    description: 'You will be asked to: (1) Approve USDC spend, (2) Confirm the transfer transaction, and (3) Confirm the receive message. Please approve each transaction in your wallet as they appear.' 
  },
  'signing-bridge': { 
    title: 'Bridge In Progress', 
    description: 'You will be asked to: (1) Approve USDC spend, (2) Confirm the transfer transaction, and (3) Confirm the receive message. Please approve each transaction in your wallet as they appear.' 
  },
  'waiting-receive-message': { 
    title: 'Bridge In Progress', 
    description: 'You will be asked to: (1) Approve USDC spend, (2) Confirm the transfer transaction, and (3) Confirm the receive message. Please approve each transaction in your wallet as they appear.' 
  },
  success: { title: 'Bridge Successful', description: 'Your USDC has been successfully transferred to Arc Testnet!' },
  error: { title: 'Bridge Failed', description: 'Bridge transaction failed. Please try again.' },
};

export type BridgeDirection = 'sepolia-to-arc' | 'arc-to-sepolia';

export default function BridgeModal({ isOpen, onClose }: BridgeModalProps) {
  const { address, isConnected, chainId } = useAccount();
  
  const [amount, setAmount] = useState('');
  const selectedToken: BridgeToken = 'USDC'; // Only USDC supported
  const [direction, setDirection] = useState<BridgeDirection>('sepolia-to-arc');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bridgeStartTime, setBridgeStartTime] = useState<number | null>(null);

  const {
    state,
    tokenBalance,
    isLoadingBalance,
    balanceError,
    fetchTokenBalance,
    bridge,
    reset,
    isOnSepolia,
    isOnArc,
    currentChainId,
  } = useBridge();

  // Auto-detect direction based on current chain when modal opens (only if not in success state)
  useEffect(() => {
    if (isOpen && currentChainId && state.step !== 'success' && !state.direction) {
      if (currentChainId === ARC_CHAIN_ID) {
        setDirection('arc-to-sepolia');
      } else if (currentChainId === SEPOLIA_CHAIN_ID) {
        setDirection('sepolia-to-arc');
      }
    }
  }, [isOpen, currentChainId, state.step, state.direction]);

  // Use stored direction from bridge state if available (for success screen), otherwise use current direction
  const activeDirection = state.direction || direction;
  
  // Determine source chain ID based on active direction
  const sourceChainId = activeDirection === 'sepolia-to-arc' ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
  const destinationChainId = activeDirection === 'sepolia-to-arc' ? ARC_CHAIN_ID : SEPOLIA_CHAIN_ID;
  const sourceChainName = activeDirection === 'sepolia-to-arc' ? 'Sepolia' : 'Arc Testnet';
  const destinationChainName = activeDirection === 'sepolia-to-arc' ? 'Arc Testnet' : 'Sepolia';

  // Fetch token balance when modal opens, direction changes, or token changes
  // Only fetch if not in success state (to avoid unnecessary calls)
  useEffect(() => {
    if (isOpen && address && isConnected && state.step !== 'success') {
      fetchTokenBalance(selectedToken, sourceChainId);
     } else if (!isOpen) {
       // Reset state when modal closes
       setAmount('');
       reset();
     }
  }, [isOpen, address, isConnected, selectedToken, sourceChainId, state.step, fetchTokenBalance, reset]);

  // Timer effect during bridging - starts when isLoading becomes true
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (state.isLoading) {
      // Start timer when bridge begins
      if (!bridgeStartTime) {
        setBridgeStartTime(Date.now());
        setElapsedTime(0);
      }
      
      interval = setInterval(() => {
        if (bridgeStartTime) {
          const elapsed = Math.floor((Date.now() - bridgeStartTime) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else {
      // Reset timer when bridge completes or errors
      setElapsedTime(0);
      setBridgeStartTime(null);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isLoading, bridgeStartTime]);

  // Confetti effect on successful bridge
  useEffect(() => {
    if (state.step === 'success') {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Launch from left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        
        // Launch from right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Cleanup
      return () => clearInterval(interval);
    }
  }, [state.step]);

  const handleBridge = async () => {
    await bridge(selectedToken, amount, direction);
  };

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    reset();
    setAmount('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleClose}
    >
      <motion.div
        className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 max-w-2xl w-full border border-orange-200/30 shadow-2xl relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: `
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1),
            0 20px 40px rgba(0, 0, 0, 0.1),
            0 8px 16px rgba(0, 0, 0, 0.1)
          `
        }}
      >
        {/* Hologram Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent animate-pulse pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bridge Tokens</h2>
            <p className="text-sm text-gray-600">Transfer USDC between Sepolia and Arc Testnet</p>
          </div>
          <motion.button
            onClick={handleClose}
            className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5 text-gray-600" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {state.step === 'idle' && (
            <div className="space-y-6">
              {/* Chain Display with Swap Button */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-600 mb-1">From</p>
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <img 
                        src={sourceChainId === SEPOLIA_CHAIN_ID ? "/sepolia.png" : "/Arc.png"} 
                        alt={sourceChainName} 
                        className="w-6 h-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="font-bold text-gray-900">{sourceChainName}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Chain ID: {sourceChainId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDirection(direction === 'sepolia-to-arc' ? 'arc-to-sepolia' : 'sepolia-to-arc');
                    }}
                    disabled={state.isLoading}
                    className="mx-4 p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Swap chains"
                  >
                    <ArrowLeftRight className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-600 mb-1">To</p>
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <img 
                        src={destinationChainId === SEPOLIA_CHAIN_ID ? "/sepolia.png" : "/Arc.png"} 
                        alt={destinationChainName} 
                        className="w-6 h-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="font-bold text-gray-900">{destinationChainName}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Chain ID: {destinationChainId}</p>
                  </div>
                </div>
              </div>

               {/* Token Display */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Token
                 </label>
                 <div className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <img 
                       src="/usdc.svg" 
                       alt="USDC" 
                       className="w-6 h-6"
                       onError={(e) => {
                         // Hide icon if it fails to load
                         (e.target as HTMLImageElement).style.display = 'none';
                       }}
                     />
                     <div>
                       <span className="font-medium text-gray-900">USDC</span>
                       <span className="text-xs text-gray-500 ml-2">(USD Coin)</span>
                     </div>
                   </div>
                 </div>
                 <p className="text-xs text-gray-500 mt-2">
                   Bridge Kit supports USDC for bidirectional bridging between Sepolia and Arc Testnet
                 </p>
               </div>

              {/* Token Balance Display */}
              {isConnected && address && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <img 
                        src="/usdc.svg" 
                        alt="USDC" 
                        className="w-5 h-5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <p className="text-xs text-emerald-700 font-medium mb-1">{sourceChainName} {selectedToken} Balance</p>
                        {isLoadingBalance ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                            <span className="text-sm text-emerald-800">Loading...</span>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-emerald-900">
                            {parseFloat(tokenBalance) > 0 
                              ? `${parseFloat(tokenBalance).toFixed(2)} ${selectedToken}`
                              : `0.00 ${selectedToken}`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {CHAIN_TOKENS[sourceChainId] && (
                        <p className="text-xs text-emerald-600 font-mono">
                          {CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(0, 6)}...{CHAIN_TOKENS[sourceChainId][selectedToken].contractAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                  {balanceError && (
                    <div className="mt-2 pt-2 border-t border-emerald-200">
                      <p className="text-xs text-amber-600">
                        ⚠️ {balanceError}
                      </p>
                    </div>
                  )}
                  {parseFloat(tokenBalance) === 0 && !isLoadingBalance && !balanceError && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <p className="text-xs text-emerald-700 mb-2">
                        ⚠️ You need {selectedToken} at the Bridge Kit contract address to bridge
                      </p>
                      <a
                        href="https://faucet.circle.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        <span>Get {selectedToken} on Sepolia here</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({selectedToken})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  disabled={state.isLoading}
                />
                 <p className="text-xs text-gray-500 mt-2">
                   Enter the {selectedToken} amount you want to bridge to {destinationChainName}
                 </p>
              </div>

              {/* Warning if not on source chain */}
              {isConnected && chainId !== sourceChainId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Switch to {sourceChainName}</p>
                      <p className="text-xs mt-1">
                        You'll need to switch to {sourceChainName} network to bridge tokens. We'll prompt you during the bridge process.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connect Wallet Prompt */}
              {!isConnected && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-800">
                    Please connect your wallet to bridge tokens
                  </p>
                </div>
              )}

              {/* Bridge Button */}
              <button
                onClick={handleBridge}
                disabled={!isConnected || !amount || parseFloat(amount) <= 0 || state.isLoading}
                className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                  !isConnected || !amount || parseFloat(amount) <= 0 || state.isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
                }`}
              >
                {state.isLoading ? 'Processing...' : `Bridge ${selectedToken}`}
              </button>
            </div>
          )}

          {/* Bridge In Progress - Simplified with Timer */}
          {(state.step !== 'idle' && state.step !== 'success' && state.step !== 'error') && (
            <div className="space-y-6">
              {/* Timer and Spinner */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 text-center">
                <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
                
                {/* Timer Display */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Bridge in Progress</p>
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <p className="text-2xl font-bold text-gray-900 font-mono">
                      {formatTime(elapsedTime)}
                    </p>
                  </div>
                </div>
                
                {/* Status Message */}
                <div className="space-y-2">
                  <p className="text-lg font-bold text-gray-900">
                    {state.step === 'switching-network' 
                      ? 'Switching Network' 
                      : 'Processing Bridge'}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {state.step === 'switching-network'
                      ? `You will be asked to switch to ${sourceChainName} network in your wallet.`
                      : `You will be asked to approve transactions in your wallet. Please approve each transaction as it appears. The bridge will automatically handle the transfer and receive message confirmation.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {state.step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-2">Bridge Successful!</p>
                <p className="text-sm text-gray-600 mb-4">
                  Your {selectedToken} has been successfully transferred from {sourceChainName} to {destinationChainName}.
                </p>
                
                 {/* Transaction Links */}
                 <div className="space-y-2 mb-4">
                   {state.sourceTxHash && (
                     <a
                       href={
                         sourceChainId === SEPOLIA_CHAIN_ID
                           ? `https://sepolia.etherscan.io/tx/${state.sourceTxHash}`
                           : `https://testnet.arcscan.app/tx/${state.sourceTxHash}`
                       }
                       target="_blank"
                       rel="noopener noreferrer"
                       className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 text-sm block"
                     >
                       <span>View {sourceChainName} Transaction</span>
                       <ExternalLink className="w-4 h-4" />
                     </a>
                   )}
                   {state.receiveTxHash ? (
                     <a
                       href={
                         destinationChainId === SEPOLIA_CHAIN_ID
                           ? `https://sepolia.etherscan.io/tx/${state.receiveTxHash}`
                           : `https://testnet.arcscan.app/tx/${state.receiveTxHash}`
                       }
                       target="_blank"
                       rel="noopener noreferrer"
                       className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 text-sm block"
                     >
                       <span>View Receive Message Transaction</span>
                       <ExternalLink className="w-4 h-4" />
                     </a>
                   ) : (
                     <div className="text-xs text-gray-500 pt-2">
                       <p>Receive message transaction hash will be available after confirmation.</p>
                       <p className="mt-1">Check the browser console for details or {destinationChainName} explorer later.</p>
                     </div>
                   )}
                   {!state.sourceTxHash && !state.receiveTxHash && state.result && (state.result as any)?.txHash && (
                     <a
                       href={
                         sourceChainId === SEPOLIA_CHAIN_ID
                           ? `https://sepolia.etherscan.io/tx/${(state.result as any).txHash}`
                           : `https://testnet.arcscan.app/tx/${(state.result as any).txHash}`
                       }
                       target="_blank"
                       rel="noopener noreferrer"
                       className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 text-sm block"
                     >
                       <span>View Transaction</span>
                       <ExternalLink className="w-4 h-4" />
                     </a>
                   )}
                 </div>
              </div>
              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-2">Bridge Failed</p>
                <div className="text-sm text-red-600 mb-4 max-h-40 overflow-y-auto text-left bg-red-50 p-3 rounded-lg">
                  <p className="whitespace-pre-wrap break-words">{state.error}</p>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Check the browser console for detailed {selectedToken} contract address information.
                </p>
                <button
                  onClick={() => {
                    reset();
                    setAmount('');
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


