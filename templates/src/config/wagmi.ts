import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'viem/chains';

// Arc Testnet configuration
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 6, // USDC has 6 decimals (Arc uses USDC as gas fee)
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
  },
} as const;

export const config = getDefaultConfig({
  appName: 'Bridge Kit App',
  projectId: 'ed1deffe285a3c80426c7502b6b773dd', // Replace with your WalletConnect Project ID
  chains: [sepolia, arcTestnet],
});

