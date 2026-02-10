import { useState, useMemo } from "react";
import type { Address } from "viem";
import type { Abi } from "viem";
import {
  PROXY_ABI,
  getPublicClient,
  getWalletClient,
  getWalletAddress,
  getReadFunctions,
  getWriteFunctions,
  parseCustomAbi,
} from "./contract";
import { CHAIN_RPC_OPTIONS, getPresetRpcValue } from "./constants/rpc";
import "./App.css";

type AbiInput = { name: string; internalType: string; type: string };

function argKey(inp: AbiInput, index: number): string {
  return (inp.name && inp.name.trim()) ? inp.name : `_${index}`;
}

function parseArg(value: string, internalType: string): Address | bigint | string {
  const trimmed = value.trim();
  if (internalType.startsWith("uint") || internalType === "uint256") return BigInt(trimmed || "0");
  if (internalType === "address") return trimmed as Address;
  return trimmed;
}

function ContractForm() {
  const [contractAddress, setContractAddress] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [customAbiJson, setCustomAbiJson] = useState("");

  const parsedCustomAbi = useMemo(() => {
    const result = parseCustomAbi(customAbiJson);
    return result.ok ? result : null;
  }, [customAbiJson]);

  const customAbiError = useMemo(() => {
    if (!customAbiJson.trim()) return null;
    const result = parseCustomAbi(customAbiJson);
    return result.ok ? null : result.error;
  }, [customAbiJson]);

  const effectiveAbi: Abi = useMemo(
    () => (parsedCustomAbi ? parsedCustomAbi.abi : PROXY_ABI),
    [parsedCustomAbi]
  );

  const readFns = useMemo(() => {
    if (parsedCustomAbi) return parsedCustomAbi.readFns;
    return getReadFunctions();
  }, [parsedCustomAbi]);

  const writeFns = useMemo(() => {
    if (parsedCustomAbi) return parsedCustomAbi.writeFns;
    return getWriteFunctions();
  }, [parsedCustomAbi]);

  type FnWithType = { name: string; inputs?: unknown; _type: "read" | "write" };
  const allFns = useMemo((): FnWithType[] => {
    const withType = (f: { name: string; inputs?: unknown }, type: "read" | "write"): FnWithType => ({ ...f, _type: type });
    return [
      ...readFns.map((f) => withType(f, "read")),
      ...writeFns.map((f) => withType(f, "write")),
    ];
  }, [readFns, writeFns]);

  const selectedFn = useMemo(
    () => allFns.find((f) => f.name === functionName),
    [allFns, functionName]
  );

  const isRead = selectedFn?._type === "read";
  const rawInputs: unknown = selectedFn && "inputs" in selectedFn ? selectedFn.inputs ?? [] : [];
  const inputs = (Array.isArray(rawInputs) ? rawInputs : []) as AbiInput[];

  const onSelectFunction = (name: string) => {
    setFunctionName(name);
    const fn = allFns.find((f) => f.name === name);
    if (fn) {
      const inps = ((fn.inputs ?? []) as unknown) as AbiInput[];
      const next: Record<string, string> = {};
      inps.forEach((inp, i) => {
        next[argKey(inp, i)] = inp.type === "address" ? "" : inp.type.startsWith("uint") ? "0" : "";
      });
      setArgs(next);
    }
  };

  const handleRead = async () => {
    if (!contractAddress.trim() || !rpcUrl.trim() || !functionName) {
      setError("Contract address, RPC URL and function are required.");
      return;
    }
    setError("");
    setResult("");
    setLoading(true);
    try {
      const client = getPublicClient(rpcUrl.trim());
      const argsArray = inputs.map((inp, i) => parseArg(args[argKey(inp, i)] ?? "", inp.internalType));
      const value = await client.readContract({
        address: contractAddress.trim() as Address,
        abi: effectiveAbi,
        functionName: functionName as never,
        args: argsArray.length ? argsArray : undefined,
      });
      setResult(JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMetaMask = async () => {
    setError("");
    try {
      const addr = await getWalletAddress();
      if (addr) setWalletAddress(addr);
      else setError("No account returned from MetaMask.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleWrite = async () => {
    if (!contractAddress.trim() || !rpcUrl.trim() || !functionName) {
      setError("Contract address, RPC URL and function are required.");
      return;
    }
    if (!walletAddress) {
      setError("Connect MetaMask first.");
      return;
    }
    setError("");
    setResult("");
    setLoading(true);
    try {
      const wallet = await getWalletClient(rpcUrl.trim());
      if (!wallet) {
        setError("MetaMask not available.");
        setLoading(false);
        return;
      }
      const accounts = await wallet.getAddresses();
      const account = accounts?.[0] ?? walletAddress;
      const argsArray = inputs.map((inp, i) => parseArg(args[argKey(inp, i)] ?? "", inp.internalType));
      const chainIdHex = (await window.ethereum!.request({ method: "eth_chainId" })) as string;
      const chainId = Number(chainIdHex);
      const chain = {
        id: chainId,
        name: "Custom",
        nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
        rpcUrls: { default: { http: [rpcUrl.trim()] } },
      };
      const hash = await wallet.writeContract({
        address: contractAddress.trim() as Address,
        abi: effectiveAbi,
        functionName: functionName as never,
        args: argsArray.length ? argsArray : undefined,
        account,
        chain,
      });
      setResult(JSON.stringify({ status: "success", hash }, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Proxy contract – Read / Write</h1>
        <p>Configure contract address, RPC URL and function. Read uses RPC only; write uses MetaMask.</p>
      </header>

      <div className="card form-card">
        <div className="custom-abi-section">
          <label>
            Custom ABI (optional)
            <span className="label-hint">Leave empty to use default proxy ABI. Paste JSON array or &#123; "abi": [...] &#125;</span>
            <textarea
              className="abi-textarea"
              placeholder='[{"type":"function","name":"myFunc",...}] or {"abi":[...]}'
              value={customAbiJson}
              onChange={(e) => setCustomAbiJson(e.target.value)}
              rows={4}
            />
          </label>
          {customAbiJson.trim() && (
            <button type="button" className="btn-clear-abi" onClick={() => { setCustomAbiJson(""); setFunctionName(""); setArgs({}); }}>
              Clear custom ABI
            </button>
          )}
          {customAbiError && <div className="abi-error">{customAbiError}</div>}
          {parsedCustomAbi && <div className="abi-ok">Using custom ABI ({parsedCustomAbi.readFns.length} read, {parsedCustomAbi.writeFns.length} write)</div>}
        </div>
        <label>
          Contract address
          <input
            type="text"
            placeholder="0x..."
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
          />
        </label>
        <label>
          RPC URL by chain (free public options or custom)
          <select
            className="rpc-preset"
            value={getPresetRpcValue(rpcUrl)}
            onChange={(e) => setRpcUrl(e.target.value)}
          >
            <option value="">Custom (enter below)</option>
            {CHAIN_RPC_OPTIONS.map((chain) => (
              <optgroup key={chain.chainId} label={`${chain.chainName} (Chain ID: ${chain.chainId})`}>
                {chain.rpcs.map((rpc) => (
                  <option key={rpc.url} value={rpc.url}>
                    {rpc.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            type="url"
            placeholder="https://... (or pick a chain RPC above)"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
          />
        </label>
        <label>
          Function
          <select
            value={functionName}
            onChange={(e) => onSelectFunction(e.target.value)}
          >
            <option value="">Select function</option>
            {readFns.length > 0 && (
              <optgroup label="Read">
                {readFns.map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </optgroup>
            )}
            {writeFns.length > 0 && (
              <optgroup label="Write">
                {writeFns.map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {inputs.length > 0 && (
          <div className="args">
            <span className="args-title">Arguments</span>
            {inputs.map((inp, i) => {
              const key = argKey(inp, i);
              return (
                <label key={key}>
                  {inp.name || `arg ${i}`} ({inp.internalType})
                  <input
                    type="text"
                    placeholder={inp.type === "address" ? "0x..." : inp.type}
                    value={args[key] ?? ""}
                    onChange={(e) => setArgs((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
              );
            })}
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="actions">
          {selectedFn && (
            <>
              {isRead ? (
                <button onClick={handleRead} disabled={loading}>
                  {loading ? "Fetching…" : "Fetch (read via RPC)"}
                </button>
              ) : (
                <>
                  {!walletAddress ? (
                    <button onClick={handleConnectMetaMask}>Connect MetaMask</button>
                  ) : (
                    <span className="wallet-badge">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
                  )}
                  <button onClick={handleWrite} disabled={loading || !walletAddress}>
                    {loading ? "Signing…" : "Execute (write via MetaMask)"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {result && (
        <div className="card result-card">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <ContractForm />;
}
