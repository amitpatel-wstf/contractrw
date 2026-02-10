import { Address, WriteContractErrorType } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import ownerShipAbi from "./ownerShipAbi.json";
import { useSetAtom } from "jotai";
import { txhashAtom } from "@/components/StateProvider/AppState";
import { getClient } from "@/utils/common";

export function useContractWrite() {
  const walletClient = useWalletClient().data;
  const setTxhash = useSetAtom(txhashAtom);
  const { chain } = useAccount();


  // function call to users proxyContract in the below sequence
  // first check if the current wallet (biconomy) is the owner of the users proxyContract
  // if yes then
  // 1. invoke proxyContract.addAdmin method by passing a new wallet address (privy)
  // 2. invoke proxyContract.transferOwnership method by passing new wallet address (privy)

  const transferOwner = async (
    contractAddress: Address,
    userAddress: Address
  ) => {
    if (!walletClient || !chain) return;
    try {
      const client = getClient(chain);
      if (!client) return;

      const isAdmin = await client?.readContract({
        address: contractAddress,
        abi: ownerShipAbi,
        functionName: "isAdmin",
        args: [userAddress]
      })

      if(!isAdmin){
        try {
          const adminTx = await walletClient?.writeContract({
            address: contractAddress,
            abi: ownerShipAbi,
            functionName: "addAdmin",
            args: [userAddress],
          });
  
          if (adminTx) {
            await client.waitForTransactionReceipt({ hash: adminTx });
          }
        } catch (error: any) {
          console.log("transaction error", error);
          if (!error.includes('Admin already exists')) {
            return;
          }
        }
      }

      const tx = await walletClient?.writeContract({
        address: contractAddress,
        abi: ownerShipAbi,
        functionName: "transferOwnership",
        args: [userAddress],
      });

      if (tx) {
        setTxhash(tx);

        const res = await client.waitForTransactionReceipt({ hash: tx });

        console.log("Transfer response--", res);
        setTxhash("");
        if (res?.status === "success") {
          return {
            status: "success",
            message: "Transaction made successfully.",
            hash: res.transactionHash,
          };
        }

        if (res?.status === "reverted") {
          return {
            status: "reverted",
            message: "Execution reverted.",
            hash: res.transactionHash,
          };
        }
      }
    } catch (e) {
      const error = e as WriteContractErrorType;
      console.log("transaction error", error);
    }
  };

  return {
    transferOwner
  };
}
