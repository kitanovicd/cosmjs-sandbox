import { StargateClient } from "@cosmjs/stargate"

import * as dotenv from "dotenv"
dotenv.config()

const rpc = process.env.RPC
const walletAddress = process.env.WALLET_ADDRESS

const runAll = async (): Promise<void> => {
    const client = await StargateClient.connect(rpc!.toString())
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())

    console.log("Wallet balances:", await client.getAllBalances(walletAddress!))
}

runAll()
