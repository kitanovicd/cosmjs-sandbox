import { IndexedTx, StargateClient } from "@cosmjs/stargate"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"

import * as dotenv from "dotenv"
dotenv.config()

const rpc = process.env.RPC
const walletAddress = process.env.WALLET_ADDRESS
const txHash = process.env.TX_HASH

const runAll = async (): Promise<void> => {
    const client = await StargateClient.connect(rpc!.toString())
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())

    console.log("Wallet balances:", await client.getAllBalances(walletAddress!))

    const faucetTx: IndexedTx = (await client.getTx(txHash!))!
    console.log("Faucet transaction:", faucetTx)

    const decodedTx = Tx.decode(faucetTx.tx)
    console.log("Decoded faucet transaction:", decodedTx)

    const decodedTxMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value)
    console.log("Sent message:", decodedTxMessage)

    const faucetAddress: string = decodedTxMessage.fromAddress
    console.log("Faucet balances:", await client.getAllBalances(faucetAddress!))
}

runAll()
