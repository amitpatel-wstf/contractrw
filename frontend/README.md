# Proxy Contract – Read / Write Frontend

React + Vite + TypeScript app to interact with the proxy contract: configure **contract address**, **RPC URL**, and **function name**, then either **read** (via RPC only) or **write** (via MetaMask).

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Then open the URL shown (e.g. http://localhost:5173).

## Usage

1. **Contract address** – Proxy contract address (e.g. `0x...`).
2. **RPC URL** – JSON-RPC endpoint for the chain (e.g. `https://eth.llamarpc.com` or your custom RPC).
3. **Function** – Choose a **Read** or **Write** function from the dropdown.
4. **Arguments** – If the function has parameters, fill the inputs (address, uint256, string, etc.).
5. **Read** – Click **“Fetch (read via RPC)”** to call the function over the RPC (no wallet).
6. **Write** – Click **“Connect MetaMask”**, then **“Execute (write via MetaMask)”** to sign and send the transaction.

## Build

```bash
npm run build
```

Output is in `dist/`.
