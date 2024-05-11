import axios from "axios";
import { useCardano } from "mynth-use-cardano";
import { useState } from "react";
import TronWebOriginal from "tronweb";
import { useTronlink } from "../contexts/ConnectTronWalletContext";
import useDecimals from "../hooks/useDecimals";
import config from "../libs/Config";
import {
  getAddressUrl,
  getEnvConfig,
  getTransactionUrl,
  mapAssetsToRequestFormat,
} from "../libs/Functions";
import { balance, build, sign } from "../libs/TronWeb";
import { useGetValidationErrorsQuery } from "../store/errorMessages/validationErrors";
import useHandleApiError from "./useHandleApiErrors";
import useProcessModal from "./useProcessModal";

declare module "@tronweb3/tronwallet-adapter-tronlink" {
  export interface TronWeb extends TronWebOriginal {}
}

export type SwapInput = {
  sender: {
    amount: string;
    ticker: string;
    blockchain: string;
  };
  receiver: {
    address: string;
    amount: string;
    ticker: string;
    blockchain: string;
  };
};

const useHandleSwap = () => {
  const { lucid, account } = useCardano();

  const { handleApiError } = useHandleApiError();

  const { toCardanoTokens } = useDecimals();

  const { address } = useTronlink();

  const [isSwapLoading, setSwapLoading] = useState(false);

  const { data: errorMessages } = useGetValidationErrorsQuery();

  const { swapProcessStatus, showProcessModal, showSuccessModal } =
    useProcessModal();

  const handleSwap = async (data: SwapInput) => {
    if (data.sender.blockchain === "cardano") {
      return await handleSwapFromCardanoWallet(data);
    } else {
      return await handleSwapFromTronLinkWallet(data);
    }
  };

  const handleSwapFromCardanoWallet = async (data: SwapInput) => {
    if (isSwapLoading) return;
    setSwapLoading(true);

    const userAddress = account?.address;

    if (!lucid || !userAddress) {
      showProcessModal(
        "failed",
        "Connect your Wallet",
        errorMessages?.walletUnconnected ?? "Error"
      );
      setSwapLoading(false);

      return;
    }

    showProcessModal("generating");

    const utxos = await lucid.wallet.getUtxos();

    if (!utxos || !utxos.length) {
      setSwapLoading(false);
      showProcessModal(
        "failed",
        "Insufficient UTXOs",
        errorMessages?.insufficientUtxos ?? "Error"
      );
      return;
    }

    showProcessModal("building");

    const mappedUtxos = utxos.map((item) => ({
      ...item,
      assets: mapAssetsToRequestFormat(item.assets),
    }));

    const backendBaseUrl = config.get("backend.uri");
    let swapBuildUrl: string;
    let swapBuildData = {};
    let swapRequireSignatorie = true;

    const tokenToSwap = data.sender.ticker;
    const tokenToReceive = data.receiver.ticker;

    if (tokenToSwap === "ADA" && tokenToReceive === "MyUSD") {
      swapRequireSignatorie = false;
      swapBuildUrl = `${backendBaseUrl}/swap-ada/build`;
      swapBuildData = {
        address: userAddress,
        utxos: mappedUtxos,
        adaAmount: toCardanoTokens(data.sender.amount),
      };
    } else if (tokenToSwap === "MyUSD" && tokenToReceive === "ADA") {
      swapRequireSignatorie = false;
      swapBuildUrl = `${backendBaseUrl}/swap-myusd-ada/build`;
      swapBuildData = {
        address: userAddress,
        utxos: mappedUtxos,
        amount: toCardanoTokens(data.sender.amount),
      };
    } else if (
      (tokenToSwap === "MyUSD" || tokenToSwap === "IAG") &&
      (tokenToReceive === "USDT" || tokenToReceive === "USDC")
    ) {
      swapBuildUrl = `${backendBaseUrl}/swap/build`;
      swapBuildData = {
        address: userAddress,
        utxos: mappedUtxos,
        amountToSwap: toCardanoTokens(data.sender.amount),
        destinationAddress: data.receiver.address,
        tokenToSwap,
        tokenToReceive,
      };
    } else {
      setSwapLoading(false);
      showProcessModal(
        "failed",
        "Unavailable swap",
        `Swap of ${tokenToSwap} to ${tokenToReceive} is not available at this time, try again later`
      );
      return;
    }

    try {
      const txFromSwapBuildApi = await axios
        .post(swapBuildUrl, swapBuildData)
        .then((response) => {
          return response.data;
        })
        .catch((error) => {
          // If the error is from mynth-tx then `error.response` contains the error object
          // If its a wallet error, `error` contains the error object
          const errorToSend = error.response ?? error;
          handleApiError(errorToSend, showProcessModal);
          setSwapLoading(false);
        });

      if (!txFromSwapBuildApi || !txFromSwapBuildApi.tx) return;

      showProcessModal("signing");
      let signedTx;

      if (!swapRequireSignatorie) {
        try {
          const lucidTx = lucid.fromTx(txFromSwapBuildApi.tx);
          signedTx = await lucidTx.sign().complete();
        } catch (error) {
          setSwapLoading(false);
          console.error("Cannot assemble transaction", error);
          return handleApiError(error, showProcessModal);
        }
      } else {
        if (!txFromSwapBuildApi.signature) return;

        try {
          const lucidTx = lucid.fromTx(txFromSwapBuildApi.tx);
          signedTx = await lucidTx
            .sign()
            .assemble([txFromSwapBuildApi.signature])
            .complete();
        } catch (error) {
          setSwapLoading(false);
          console.error("Cannot assemble transaction", error);
          return handleApiError(error, showProcessModal);
        }
      }

      showProcessModal("submitting");

      const transactionID = await signedTx.submit();

      showSuccessModal(
        getTransactionUrl(data.sender.blockchain, transactionID),
        getAddressUrl(data.receiver.blockchain, data.receiver.address)
      );
    } catch (error) {
      handleApiError(error, showProcessModal);
    } finally {
      setSwapLoading(false);
    }
  };

  const handleSwapFromTronLinkWallet = async (data: SwapInput) => {
    if (isSwapLoading) return;
    setSwapLoading(true);

    const userAddress = data.receiver.address;

    showProcessModal("building");

    if (!address) {
      showProcessModal(
        "failed",
        "Connect your Wallet",
        errorMessages?.walletUnconnected ?? "Error"
      );
      setSwapLoading(false);
      return;
    }

    try {
      const usdtContractAddress = getEnvConfig<string>(
        "tron.usdt.contract_address"
      );

      const usdcContractAddress = getEnvConfig<string>(
        "tron.usdc.contract_address"
      );
      const usdtDestination = getEnvConfig<string>("tron.usdt.destination");
      const usdcDestination = getEnvConfig<string>("tron.usdc.destination");

      const contractAddress =
        data.sender.ticker === "USDT"
          ? usdtContractAddress
          : usdcContractAddress;
      const destination =
        data.sender.ticker === "USDT" ? usdtDestination : usdcDestination;

      const amountToSend = toCardanoTokens(data.sender.amount);

      if (
        !window.tron ||
        !window.tron.tronWeb ||
        !window.tron.tronWeb.defaultAddress
      )
        throw new Error("Tron wallet must be connected");
      const transactionBuilder = window.tron.tronWeb.transactionBuilder;

      const balanceCheck = async (
        address: {
          hex: false | string;
          base58: false | string;
          name: string;
        },
        trx: typeof TronWebOriginal.trx
      ) => {
        try {
          const response = await balance(address, trx);
          return response;
        } catch (error) {
          const errorToSend =
            typeof error === "string" ? { info: error } : error;
          handleApiError(errorToSend, showProcessModal);
          setSwapLoading(false);
          throw error;
        }
      };

      const userBalance = await balanceCheck(
        window.tron.tronWeb.defaultAddress,
        window.tron.tronWeb.trx as typeof TronWebOriginal.trx
      );

      if (!userBalance) return;

      const minbalance = parseInt(getEnvConfig<string>("tron.minimumBalance"));

      if (parseInt(userBalance) < minbalance * 1000000) {
        // 1000000 SUN = 1 TRX
        const errorToSend = {
          info: `Minimum Required balance is ${minbalance} TRX`,
        };
        handleApiError(errorToSend, showProcessModal);
        setSwapLoading(false);
        return;
      }

      const txFromTronBuildApi = await build(
        window.tron.tronWeb.defaultAddress,
        transactionBuilder,
        contractAddress,
        BigInt(amountToSend),
        destination,
        userAddress
      )
        .then((response) => {
          if (response.ok) {
            return response.data;
          } else {
            const error = response.error;
            const errorToSend =
              typeof error === "string"
                ? { info: response.error }
                : response.error;
            handleApiError(errorToSend, showProcessModal);
            setSwapLoading(false);
          }
        })
        .catch((error) => {
          console.log("error", error);
          const errorToSend =
            typeof error === "string" ? { info: error } : error;
          handleApiError(errorToSend, showProcessModal);
          setSwapLoading(false);
        });

      if (!txFromTronBuildApi) return;

      showProcessModal("signing");

      const result = await sign(
        window.tron.tronWeb.trx as typeof TronWebOriginal.trx,
        transactionBuilder,
        userAddress,
        txFromTronBuildApi
      )
        .then((response) => {
          if (!response.ok) {
            const error = response.error;
            const errorToSend =
              typeof error === "string"
                ? { info: response.error }
                : response.error;
            handleApiError(errorToSend, showProcessModal);
            setSwapLoading(false);
          } else {
            showSuccessModal(
              getTransactionUrl(data.sender.blockchain, response.data),
              getAddressUrl(data.receiver.blockchain, data.receiver.address)
            );
          }
        })
        .catch((error) => {
          const errorToSend =
            typeof error === "string" ? { info: error } : error;
          handleApiError(errorToSend, showProcessModal);
          setSwapLoading(false);
        });
    } catch (error) {
      handleApiError(error, showProcessModal);
    } finally {
      setSwapLoading(false);
    }
  };

  return {
    handleSwap,
    isSwapLoading,
    swapProcessStatus,
  };
};

export default useHandleSwap;
