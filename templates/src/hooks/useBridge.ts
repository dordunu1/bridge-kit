import { useState, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { type EIP1193Provider } from 'viem';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

export type BridgeToken = 'USDC';
export type BridgeStep = 
  | 'idle' 
  | 'switching-network'
  | 'approving' 
  | 'signing-bridge'
  | 'waiting-receive-message'
  | 'success' 
  | 'error';

export interface BridgeState {
  step: BridgeStep;
  error: string | null;
  result: any | null;
  isLoading: boolean;
  // Transaction hashes
  sourceTxHash?: string; // Source chain transaction hash
  receiveTxHash?: string; // Destination chain receive message transaction hash
  // Direction information
  direction?: 'sepolia-to-arc' | 'arc-to-sepolia'; // Store the direction that was used
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string;
}

// Token configurations for both chains
export const CHAIN_TOKENS: Record<number, Record<BridgeToken, TokenInfo>> = {
  [11155111]: { // Sepolia
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Bridge Kit USDC on Sepolia
    },
  },
  [5042002]: { // Arc Testnet
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x3600000000000000000000000000000000000000', // Bridge Kit USDC on Arc Testnet
    },
  },
};

// Legacy export for backward compatibility
export const SEPOLIA_TOKENS = CHAIN_TOKENS[11155111];

// Chain IDs
export const SEPOLIA_CHAIN_ID = 11155111;
export const ARC_CHAIN_ID = 5042002;

// RPC URLs for balance fetching
const ARC_RPC_URLS = [
  'https://rpc.testnet.arc.network/',
  'https://rpc.testnet.arc.network',
];

export function useBridge() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  
  const [state, setState] = useState<BridgeState>({
    step: 'idle',
    error: null,
    result: null,
    isLoading: false,
    sourceTxHash: undefined,
    receiveTxHash: undefined,
    direction: undefined,
  });

  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string>('');

  // Fetch token balance on a specific chain
  const fetchTokenBalance = useCallback(async (token: BridgeToken, sourceChainId: number) => {
    if (!address) return;
    
    setIsLoadingBalance(true);
    setBalanceError('');
    
    try {
      const chainTokens = CHAIN_TOKENS[sourceChainId];
      if (!chainTokens) {
        throw new Error(`Chain ${sourceChainId} not supported for token balance fetching`);
      }

      const tokenInfo = chainTokens[token];
      
      // ERC20 ABI for balanceOf and decimals
      const erc20Abi = [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function',
        },
        {
          constant: true,
          inputs: [],
          name: 'decimals',
          outputs: [{ name: '', type: 'uint8' }],
          type: 'function',
        },
      ] as const;

      let publicClient;
      let lastError;

      if (sourceChainId === SEPOLIA_CHAIN_ID) {
        // Try multiple Sepolia RPC endpoints for reliability
        const sepoliaRpcUrls = [
          'https://ethereum-sepolia-rpc.publicnode.com',
          'https://rpc.sepolia.org',
          'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        ];
        
        for (const rpcUrl of sepoliaRpcUrls) {
          try {
            publicClient = createPublicClient({
              chain: sepolia,
              transport: http(rpcUrl, {
                retryCount: 2,
                timeout: 8000,
              }),
            });
            
            await publicClient.getBlockNumber();
            console.log(`✅ Connected to Sepolia via: ${rpcUrl}`);
            break;
          } catch (err: any) {
            lastError = err;
            continue;
          }
        }
      } else if (sourceChainId === ARC_CHAIN_ID) {
        // Try Arc Testnet RPC endpoints
        for (const rpcUrl of ARC_RPC_URLS) {
          try {
            publicClient = createPublicClient({
              chain: {
                id: ARC_CHAIN_ID,
                name: 'Arc Testnet',
                network: 'arc-testnet',
                nativeCurrency: {
                  decimals: 6,
                  name: 'USDC',
                  symbol: 'USDC',
                },
                rpcUrls: {
                  default: { http: [rpcUrl] },
                  public: { http: [rpcUrl] },
                },
                blockExplorers: {
                  default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
                },
              },
              transport: http(rpcUrl, {
                retryCount: 2,
                timeout: 8000,
              }),
            });
            
            await publicClient.getBlockNumber();
            console.log(`✅ Connected to Arc Testnet via: ${rpcUrl}`);
            break;
          } catch (err: any) {
            lastError = err;
            continue;
          }
        }
      }
      
      if (!publicClient) {
        throw new Error(`Failed to connect to RPC for chain ${sourceChainId}: ${lastError?.message || ''}`);
      }

      const balance = await publicClient.readContract({
        address: tokenInfo.contractAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      const formattedBalance = formatUnits(balance as bigint, tokenInfo.decimals);
      setTokenBalance(formattedBalance);
      
      const chainName = sourceChainId === SEPOLIA_CHAIN_ID ? 'Sepolia' : 'Arc Testnet';
      console.log(`✅ ${chainName} ${token} balance fetched:`, {
        address,
        balance: formattedBalance,
        contractAddress: tokenInfo.contractAddress,
      });
    } catch (err: any) {
      console.error(`❌ Error fetching balance for chain ${sourceChainId}:`, err);
      setTokenBalance('0');
      
      if (err.message?.includes('timeout') || err.message?.includes('took too long')) {
        setBalanceError('RPC timeout - balance may not be accurate.');
      } else {
        setBalanceError('Unable to fetch balance.');
      }
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address]);

  // Execute bridge transaction (bidirectional)
  const bridge = useCallback(async (
    token: BridgeToken,
    amount: string,
    direction: 'sepolia-to-arc' | 'arc-to-sepolia'
  ): Promise<void> => {
    if (!isConnected || !address) {
      setState({
        step: 'error',
        error: 'Please connect your wallet first',
        result: null,
        isLoading: false,
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setState({
        step: 'error',
        error: `Please enter a valid ${token} amount`,
        result: null,
        isLoading: false,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, step: 'idle', error: null, isLoading: true }));

      // Get the provider from window.ethereum (MetaMask)
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }

      // Create adapter from browser wallet provider
      const adapter = await createAdapterFromProvider({
        provider: window.ethereum as EIP1193Provider,
      });

      // Initialize Bridge Kit
      const kit = new BridgeKit();
      const supportedChains = kit.getSupportedChains();
      
      // Determine source and destination chains based on direction
      const isSepoliaToArc = direction === 'sepolia-to-arc';
      const sourceChainId = isSepoliaToArc ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
      const destinationChainId = isSepoliaToArc ? ARC_CHAIN_ID : SEPOLIA_CHAIN_ID;

      // Find source chain
      let sourceChain = supportedChains.find(c => {
        const isEVM = 'chainId' in c;
        if (!isEVM) return false;
        return (c as any).chainId === sourceChainId;
      });
      
      if (!sourceChain && sourceChainId === SEPOLIA_CHAIN_ID) {
        // Try alternative search for Sepolia
        sourceChain = supportedChains.find(c => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          const chainId = (c as any).chainId;
          if (chainId === 84532 || chainId === 421614) return false; // Exclude Base/Arbitrum Sepolia
          const name = c.name.toLowerCase();
          return (name.includes('ethereum') && name.includes('sepolia')) || 
                 (name.includes('sepolia') && !name.includes('base') && !name.includes('arbitrum'));
        });
      }
      
      if (!sourceChain && sourceChainId === ARC_CHAIN_ID) {
        // Try alternative search for Arc
        sourceChain = supportedChains.find(c => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          return c.name.toLowerCase().includes('arc');
        });
      }
      
      // Find destination chain
      let destinationChain = supportedChains.find(c => {
        const isEVM = 'chainId' in c;
        if (!isEVM) return false;
        return (c as any).chainId === destinationChainId;
      });
      
      if (!destinationChain && destinationChainId === SEPOLIA_CHAIN_ID) {
        destinationChain = supportedChains.find(c => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          const chainId = (c as any).chainId;
          if (chainId === 84532 || chainId === 421614) return false;
          const name = c.name.toLowerCase();
          return (name.includes('ethereum') && name.includes('sepolia')) || 
                 (name.includes('sepolia') && !name.includes('base') && !name.includes('arbitrum'));
        });
      }
      
      if (!destinationChain && destinationChainId === ARC_CHAIN_ID) {
        destinationChain = supportedChains.find(c => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          return c.name.toLowerCase().includes('arc');
        });
      }
      
      if (!sourceChain) {
        const chainName = sourceChainId === SEPOLIA_CHAIN_ID ? 'Ethereum Sepolia' : 'Arc Testnet';
        throw new Error(`${chainName} (chain ID ${sourceChainId}) is not supported by Bridge Kit.`);
      }
      
      if (!destinationChain) {
        const chainName = destinationChainId === SEPOLIA_CHAIN_ID ? 'Ethereum Sepolia' : 'Arc Testnet';
        throw new Error(`${chainName} (chain ID ${destinationChainId}) is not supported by Bridge Kit.`);
      }

      // Verify source chain ID
      const actualSourceChainId = (sourceChain as any).chainId;
      if (actualSourceChainId !== sourceChainId) {
        throw new Error(`Incorrect source chain selected! Expected chain ID ${sourceChainId}, but got ${sourceChain.name} (${actualSourceChainId}).`);
      }

      console.log('Selected chains:', {
        from: sourceChain.name,
        fromChainId: actualSourceChainId,
        to: destinationChain.name,
        toChainId: (destinationChain as any).chainId,
        token,
        amount,
        direction,
      });

      // Switch to source chain if not already on it
      const isOnSourceChain = chainId === sourceChainId;
      if (!isOnSourceChain) {
        setState(prev => ({ ...prev, step: 'switching-network' }));
        await switchChain({ chainId: sourceChainId });
        // Wait for chain switch
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 2: Approving token (if needed)
      // Bridge Kit handles the entire flow: approval, transfer, chain switching, and receive message
      // We set state to indicate bridge is in progress - Bridge Kit will handle chain switching automatically
      setState(prev => ({ ...prev, step: 'approving' }));

      // Execute the bridge
      // Bridge Kit handles:
      // 1. Approval transaction (if needed)
      // 2. Transfer transaction on source chain
      // 3. Automatic chain switching to destination chain
      // 4. Receive message transaction on destination chain
      // The bridge() method completes only after ALL steps are done or user cancels
      const result = await kit.bridge({
        from: {
          adapter: adapter,
          chain: sourceChain.chain,
        },
        to: {
          adapter: adapter,
          chain: destinationChain.chain,
        },
        amount: amount,
      });

      // Helper function to safely stringify BigInt values
      const safeStringify = (obj: any): string => {
        return JSON.stringify(obj, (key, value) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          return value;
        }, 2);
      };
      
      console.log('Bridge result:', result);
      try {
        console.log('Bridge result (stringified):', safeStringify(result));
      } catch (err) {
        console.log('Could not stringify result (contains non-serializable values)');
      }

      // Extract transaction hashes from result
      // Bridge Kit result structure contains a 'steps' array with transaction details:
      // - steps[0] "approve" - approval transaction on Sepolia
      // - steps[1] "burn" - burn/transfer transaction on Sepolia (source)
      // - steps[2] "fetchAttestation" - attestation data (no txHash)
      // - steps[3] "mint" - mint/receive transaction on Arc Testnet (destination)
      let sourceTxHash: string | undefined;
      let receiveTxHash: string | undefined;

      const resultAny = result as any;
      
      if (resultAny && resultAny.steps && Array.isArray(resultAny.steps)) {
        console.log('Found steps array with', resultAny.steps.length, 'steps');
        
        // Loop through steps to find transaction hashes
        resultAny.steps.forEach((step: any, index: number) => {
          console.log(`Step ${index}: ${step.name} - ${step.state}`);
          
            if (step.name === 'burn' && step.txHash) {
            // Burn/transfer transaction on source chain
            sourceTxHash = step.txHash;
            console.log('Found sourceTxHash from burn step:', sourceTxHash);
          } else if (step.name === 'mint' && step.txHash) {
            // Mint/receive transaction on destination chain
            receiveTxHash = step.txHash;
            console.log('Found receiveTxHash from mint step:', receiveTxHash);
          } else if (step.name === 'approve' && step.txHash) {
            // Approval transaction - we could use this as fallback for source
            if (!sourceTxHash) {
              sourceTxHash = step.txHash;
              console.log('Using approval txHash as sourceTxHash fallback:', sourceTxHash);
            }
          }
        });
      } else {
        // Fallback: try other possible result structures
        console.log('No steps array found, trying alternative structures...');
        
        if (resultAny.txHash) {
          sourceTxHash = resultAny.txHash;
          console.log('Found sourceTxHash from txHash:', sourceTxHash);
        }
        if (resultAny.sourceTxHash || resultAny.sourceTransactionHash || resultAny.fromTxHash) {
          sourceTxHash = resultAny.sourceTxHash || resultAny.sourceTransactionHash || resultAny.fromTxHash;
          console.log('Found sourceTxHash from sourceTxHash/sourceTransactionHash/fromTxHash:', sourceTxHash);
        }
        if (resultAny.receiveTxHash || resultAny.receiveTransactionHash || resultAny.toTxHash || resultAny.destinationTxHash) {
          receiveTxHash = resultAny.receiveTxHash || resultAny.receiveTransactionHash || resultAny.toTxHash || resultAny.destinationTxHash;
          console.log('Found receiveTxHash:', receiveTxHash);
        }
      }

      console.log('Extracted transaction hashes:', { sourceTxHash, receiveTxHash });

      // Bridge Kit's bridge() method only resolves after ALL transactions complete
      // This includes: approval, transfer, chain switch, and receive message
      // So if we reach here, the bridge is complete
      setState({
        step: 'success',
        error: null,
        result,
        isLoading: false,
        sourceTxHash,
        receiveTxHash,
        direction, // Store the direction that was used
      });

    } catch (err: any) {
      console.error('Bridge error:', err);
      
      let errorMessage = err.message || 'Bridge transaction failed';
      
      if (err.message?.includes('Insufficient funds')) {
        const tokenInfo = SEPOLIA_TOKENS[token];
        errorMessage = `❌ Wrong ${token} Contract Address!\n\n` +
          `Bridge Kit requires ${token} at:\n` +
          `📌 ${tokenInfo.contractAddress}\n\n` +
          `⚠️ Your ${token} is at a different contract address\n\n` +
          `💡 Solution:\n` +
          `1. Get ${token} from the official Circle/Bridge Kit contract\n` +
          `2. Or swap your current ${token} to the correct contract\n` +
          `3. Use Sepolia ${token} Faucet that provides the correct contract\n\n` +
          `Your current ${token} contract won't work with Bridge Kit.`;
      }
      
      setState({
        step: 'error',
        error: errorMessage,
        result: null,
        isLoading: false,
      });
    }
  }, [address, isConnected, chainId, switchChain]);

  // Reset bridge state
  const reset = useCallback(() => {
    setState({
      step: 'idle',
      error: null,
      result: null,
      isLoading: false,
      sourceTxHash: undefined,
      receiveTxHash: undefined,
      direction: undefined,
    });
    setTokenBalance('0');
    setBalanceError('');
  }, []);

  return {
    state,
    tokenBalance,
    isLoadingBalance,
    balanceError,
    fetchTokenBalance,
    bridge,
    reset,
    isOnSepolia: chainId === SEPOLIA_CHAIN_ID,
    isOnArc: chainId === ARC_CHAIN_ID,
    currentChainId: chainId,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: EIP1193Provider | any;
  }
}

