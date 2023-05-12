import { IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"

import { readFile } from "fs/promises"
import { strict as assert } from "assert"

import * as dotenv from "dotenv"
dotenv.config()

const RPC = process.env.RPC
const WALLET_ADDRESS = process.env.WALLET_ADDRESS
const TX_HASH = process.env.TX_HASH

const getSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.mnemonic.key")).toString(), {
        prefix: "cosmos",
    })
}

const sendTokensBack = async (
    client: StargateClient,
    faucetAddress: string,
    amount: number
): Promise<void> => {
    const signer: OfflineDirectSigner = await getSignerFromMnemonic()
    const wallet = (await signer.getAccounts())[0].address

    assert(wallet == WALLET_ADDRESS, "Wallet address is undefined")

    const walletBalanceBefore = await client.getAllBalances(wallet)
    const atomWalletBalanceBefore = walletBalanceBefore.find((balance) => balance.denom == "uatom")?.amount

    const faucetBalanceBefore = await client.getAllBalances(faucetAddress)
    const atomFaucetBalanceBefore = faucetBalanceBefore.find((balance) => balance.denom == "uatom")?.amount

    const signingClient = await SigningStargateClient.connectWithSigner(RPC!, signer)

    await signingClient.sendTokens(wallet, faucetAddress, [{ denom: "uatom", amount: amount.toString() }], {
        amount: [{ denom: "uatom", amount: "500" }],
        gas: "200000",
    })

    const walletBalanceAfter = await client.getAllBalances(wallet)
    const atomWalletBalanceAfter = walletBalanceAfter.find((balance) => balance.denom == "uatom")?.amount

    const faucetBalanceAfter = await client.getAllBalances(faucetAddress)
    const atomFaucetBalanceAfter = faucetBalanceAfter.find((balance) => balance.denom == "uatom")?.amount

    assert(
        Number(atomWalletBalanceAfter) < Number(atomWalletBalanceBefore) - amount,
        "Wallet balance is properly decreased"
    )

    assert(
        Number(atomFaucetBalanceAfter) == Number(atomFaucetBalanceBefore) + amount,
        "Faucet balance is properly increased"
    )

    console.log("Success!")
}

const inspectAndDecodeTx = async (client: StargateClient): Promise<string> => {
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())

    console.log("Wallet balances:", await client.getAllBalances(WALLET_ADDRESS!))

    const faucetTx: IndexedTx = (await client.getTx(TX_HASH!))!
    console.log("Faucet transaction:", faucetTx)

    const decodedTx = Tx.decode(faucetTx.tx)
    console.log("Decoded faucet transaction:", decodedTx)

    const decodedTxMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value)
    console.log("Sent message:", decodedTxMessage)

    const faucetAddress: string = decodedTxMessage.fromAddress
    console.log("Faucet balances:", await client.getAllBalances(faucetAddress!))

    return faucetAddress
}

const runAll = async (): Promise<void> => {
    const client = await StargateClient.connect(RPC!)

    const faucetAddress = await inspectAndDecodeTx(client)

    const amountToSendBack = 10000

    sendTokensBack(client, faucetAddress, amountToSendBack)
}

runAll()
