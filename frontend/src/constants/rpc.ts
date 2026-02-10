/**
 * Free public RPC endpoints by chain.
 * No API key required. Use for read/write with the appropriate chain.
 */

export interface ChainRpcOption {
  label: string;
  url: string;
}

export interface ChainRpcConfig {
  chainId: number;
  chainName: string;
  rpcs: ChainRpcOption[];
}

export const CHAIN_RPC_OPTIONS: ChainRpcConfig[] = [
  {
    chainId: 1,
    chainName: "Ethereum Mainnet",
    rpcs: [
      { label: "Cloudflare", url: "https://cloudflare-eth.com" },
      { label: "PublicNode", url: "https://ethereum.publicnode.com" },
      { label: "1RPC", url: "https://1rpc.io/eth" },
      { label: "LlamaNodes", url: "https://eth.llamarpc.com" },
      { label: "dRPC", url: "https://eth.drpc.org" },
      { label: "BlockPI", url: "https://ethereum.public.blockpi.network/v1/rpc/public" },
      { label: "Ankr", url: "https://rpc.ankr.com/eth" },
      { label: "Flashbots (fast)", url: "https://rpc.flashbots.net" },
      { label: "MEV Blocker", url: "https://rpc.mevblocker.io" },
    ],
  },
  {
    chainId: 137,
    chainName: "Polygon",
    rpcs: [
      { label: "Polygon RPC", url: "https://polygon-rpc.com" },
      { label: "dRPC", url: "https://polygon.drpc.org" },
      { label: "PublicNode", url: "https://polygon-bor-rpc.publicnode.com" },
      { label: "Ankr", url: "https://rpc.ankr.com/polygon" },
      { label: "1RPC", url: "https://1rpc.io/matic" },
    ],
  },
  {
    chainId: 56,
    chainName: "BNB Smart Chain (BSC)",
    rpcs: [
      { label: "BNB Chain Official", url: "https://bsc-dataseed.bnbchain.org" },
      { label: "PublicNode", url: "https://bsc-rpc.publicnode.com" },
      { label: "Ankr", url: "https://rpc.ankr.com/bsc" },
      { label: "dRPC", url: "https://bsc.drpc.org" },
      { label: "1RPC", url: "https://1rpc.io/bnb" },
    ],
  },
  {
    chainId: 42161,
    chainName: "Arbitrum One",
    rpcs: [
      { label: "Arbitrum Official", url: "https://arb1.arbitrum.io/rpc" },
      { label: "PublicNode", url: "https://arbitrum-one-rpc.publicnode.com" },
      { label: "Ankr", url: "https://rpc.ankr.com/arbitrum" },
      { label: "dRPC", url: "https://arbitrum.drpc.org" },
      { label: "1RPC", url: "https://1rpc.io/arb" },
    ],
  },
  {
    chainId: 8453,
    chainName: "Base",
    rpcs: [
      { label: "Base Official", url: "https://mainnet.base.org" },
      { label: "PublicNode", url: "https://base-rpc.publicnode.com" },
      { label: "Ankr", url: "https://rpc.ankr.com/base" },
      { label: "dRPC", url: "https://base.drpc.org" },
      { label: "1RPC", url: "https://1rpc.io/base" },
    ],
  },
  {
    chainId: 10,
    chainName: "Optimism",
    rpcs: [
      { label: "Optimism Official", url: "https://mainnet.optimism.io" },
      { label: "PublicNode", url: "https://optimism-rpc.publicnode.com" },
      { label: "Ankr", url: "https://rpc.ankr.com/optimism" },
      { label: "dRPC", url: "https://optimism.drpc.org" },
      { label: "1RPC", url: "https://1rpc.io/op" },
    ],
  },
  {
    chainId: 43114,
    chainName: "Avalanche C-Chain",
    rpcs: [
      { label: "Avalanche Official", url: "https://api.avax.network/ext/bc/C/rpc" },
      { label: "PublicNode", url: "https://avalanche-c-chain-rpc.publicnode.com" },
      { label: "Ankr", url: "https://rpc.ankr.com/avalanche" },
      { label: "dRPC", url: "https://avax.drpc.org" },
    ],
  },
  {
    chainId: 250,
    chainName: "Fantom",
    rpcs: [
      { label: "Fantom Official", url: "https://rpc.ftm.tools" },
      { label: "PublicNode", url: "https://fantom-rpc.publicnode.com" },
      { label: "Ankr", url: "https://rpc.ankr.com/fantom" },
    ],
  },
];

/** All RPC URLs in one flat set (for detecting if current URL is a preset). */
export function getAllPresetRpcUrls(): string[] {
  return CHAIN_RPC_OPTIONS.flatMap((chain) => chain.rpcs.map((r) => r.url));
}

/** Return the preset URL that matches rpcUrl, or "" if custom. */
export function getPresetRpcValue(rpcUrl: string): string {
  const all = getAllPresetRpcUrls();
  return all.includes(rpcUrl) ? rpcUrl : "";
}
