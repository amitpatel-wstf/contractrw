import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Chain,
  type PublicClient,
  type WalletClient,
  type Abi,
} from "viem";

const ownershipAbi = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "MAX_ADMINS", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_admin", type: "address" }], name: "addAdmin", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "admins", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "factory", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "string", name: "_name", type: "string" }, { internalType: "address", name: "_owner", type: "address" }], name: "initialize", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_address", type: "address" }], name: "isAdmin", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_admin", type: "address" }], name: "removeAdmin", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_asset", type: "address" }, { internalType: "address", name: "_recipient", type: "address" }, { internalType: "uint256", name: "_amount", type: "uint256" }], name: "withdrawAsset", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

export const PROXY_ABI = ownershipAbi as Abi;

export type AbiFunction = (typeof ownershipAbi)[number] & { type: "function" };

function isReadFunction(f: { stateMutability?: string }): boolean {
  const s = f.stateMutability ?? "";
  return s === "view" || s === "pure";
}

export function getAbiFunctions(): AbiFunction[] {
  return ownershipAbi.filter((item): item is AbiFunction => item.type === "function");
}

export function getReadFunctions(): AbiFunction[] {
  return getAbiFunctions().filter((f) => isReadFunction(f));
}

export function getWriteFunctions(): AbiFunction[] {
  return getAbiFunctions().filter((f) => !isReadFunction(f));
}

/** Generic ABI function item (for custom ABI). */
export interface GenericAbiFunction {
  name: string;
  type: "function";
  inputs?: { name: string; internalType: string; type: string }[];
  stateMutability?: string;
}

export type ParseCustomAbiResult =
  | { ok: true; abi: Abi; readFns: GenericAbiFunction[]; writeFns: GenericAbiFunction[] }
  | { ok: false; error: string };

/**
 * Parse custom ABI JSON. Accepts:
 * - JSON array of ABI items: [{ type: "function", name: "...", ... }, ...]
 * - JSON object with "abi" key: { abi: [...] } (e.g. Etherscan export)
 */
export function parseCustomAbi(input: string): ParseCustomAbiResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "ABI is empty" };
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object" && "abi" in raw && Array.isArray((raw as { abi: unknown }).abi)) {
    items = (raw as { abi: unknown[] }).abi;
  } else {
    return { ok: false, error: "ABI must be a JSON array or object with 'abi' array" };
  }
  const functions: GenericAbiFunction[] = [];
  for (const item of items) {
    if (item && typeof item === "object" && "type" in item && (item as { type: string }).type === "function") {
      const o = item as { name?: string; inputs?: { name: string; internalType: string; type: string }[]; stateMutability?: string };
      if (typeof o.name === "string") {
        functions.push({
          name: o.name,
          type: "function",
          inputs: Array.isArray(o.inputs) ? o.inputs : [],
          stateMutability: typeof o.stateMutability === "string" ? o.stateMutability : undefined,
        });
      }
    }
  }
  if (functions.length === 0) return { ok: false, error: "No functions found in ABI" };
  const readFns = functions.filter((f) => f.stateMutability === "view" || f.stateMutability === "pure");
  const writeFns = functions.filter((f) => f.stateMutability !== "view" && f.stateMutability !== "pure");
  const abi = items as Abi;
  return { ok: true, abi, readFns, writeFns };
}

function makeChain(chainId: number, rpcUrl: string): Chain {
  return {
    id: chainId,
    name: "Custom",
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [rpcUrl] } },
  };
}

export function getPublicClient(rpcUrl: string): PublicClient {
  return createPublicClient({
    transport: http(rpcUrl),
    chain: makeChain(0, rpcUrl),
  });
}

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

export async function getWalletClient(rpcUrl: string): Promise<WalletClient | null> {
  if (!window.ethereum) return null;
  const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  const chainId = Number(chainIdHex);
  return createWalletClient({
    transport: custom(window.ethereum),
    chain: makeChain(chainId, rpcUrl),
  });
}

export async function getWalletAddress(): Promise<`0x${string}` | null> {
  if (!window.ethereum) return null;
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts", params: [] })) as `0x${string}`[];
  return accounts[0] ?? null;
}
