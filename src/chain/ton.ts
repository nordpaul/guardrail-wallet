import { mnemonicToPrivateKey } from "@ton/crypto";
import {
  Address,
  beginCell,
  internal,
  SendMode,
  toNano,
  type Cell,
} from "@ton/core";
import { JettonMaster, TonClient, WalletContractV5R1 } from "@ton/ton";
import type { Executor, ExecutionResult } from "./executor.js";
import type { PaymentRecord } from "../types.js";

// ---------------------------------------------------------------------------
// TON settlement adapter: sends native USDT (a TIP-3 jetton) from a guardrail
// wallet using the SESSION key (limited), not the owner key.
//
// Trust split (see SECURITY.md):
//   - This adapter is the *soft* path: it only runs after the policy engine and
//     (when required) the human approved.
//   - The *hard* floor (per-tx / daily cap / freeze) is meant to live in an
//     on-chain guardrail extension on the wallet so a compromised server still
//     cannot exceed it. That contract is the next milestone; this adapter is the
//     off-chain signer that talks to it.
//
// USDT on TON has 6 decimals. The display amount (e.g. 42.5 "USD") maps 1:1 to
// USDT base units here; make decimals configurable if you settle another jetton.
// ---------------------------------------------------------------------------

const JETTON_TRANSFER_OP = 0xf8a7ea5;

export interface TonExecutorConfig {
  network: "mainnet" | "testnet";
  /** Toncenter (or compatible) JSON-RPC endpoint. */
  endpoint: string;
  apiKey?: string;
  /** 24-word mnemonic of the SESSION key (NOT the owner key). */
  sessionMnemonic: string;
  /** Address of the USDT jetton master. */
  usdtJettonMaster: string;
  /** Jetton decimals (USDT on TON = 6). */
  decimals: number;
  /** TON attached to each transfer to pay gas/forward. */
  gasTon: string;
}

const NETWORK_GLOBAL_ID = { mainnet: -239, testnet: -3 } as const;

export class TonExecutor implements Executor {
  private client: TonClient;

  constructor(private readonly cfg: TonExecutorConfig) {
    this.client = new TonClient({ endpoint: cfg.endpoint, apiKey: cfg.apiKey });
  }

  /** Derive the session wallet (W5 / Wallet v5R1) from the mnemonic. */
  private async wallet() {
    const words = this.cfg.sessionMnemonic.trim().split(/\s+/);
    const keyPair = await mnemonicToPrivateKey(words);
    const wallet = WalletContractV5R1.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
      walletId: { networkGlobalId: NETWORK_GLOBAL_ID[this.cfg.network] },
    });
    return { wallet, keyPair };
  }

  /** Convert a display amount to integer jetton units. */
  private toUnits(value: number): bigint {
    const factor = 10 ** this.cfg.decimals;
    return BigInt(Math.round(value * factor));
  }

  private transferBody(toOwner: Address, responseTo: Address, units: bigint, memo: string | null): Cell {
    const forward = memo
      ? beginCell().storeUint(0, 32).storeStringTail(memo).endCell()
      : null;
    return beginCell()
      .storeUint(JETTON_TRANSFER_OP, 32)
      .storeUint(0, 64) // query id
      .storeCoins(units)
      .storeAddress(toOwner) // destination owner
      .storeAddress(responseTo) // excess refunded here
      .storeMaybeRef(null) // custom payload
      .storeCoins(forward ? 1n : 0n) // forward ton amount (nanotons)
      .storeMaybeRef(forward) // forward payload (e.g. memo/comment)
      .endCell();
  }

  async execute(rec: PaymentRecord): Promise<ExecutionResult> {
    const { wallet, keyPair } = await this.wallet();
    const opened = this.client.open(wallet);

    // The jetton wallet that holds THIS wallet's USDT.
    const master = this.client.open(JettonMaster.create(Address.parse(this.cfg.usdtJettonMaster)));
    const senderJettonWallet = await master.getWalletAddress(wallet.address);

    const body = this.transferBody(
      Address.parse(rec.recipientAddress),
      wallet.address,
      this.toUnits(rec.amount),
      rec.memo,
    );

    const seqno = await opened.getSeqno();
    await opened.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [internal({ to: senderJettonWallet, value: toNano(this.cfg.gasTon), body, bounce: true })],
    });

    // TON has no synchronous tx hash; confirm by waiting for seqno to advance.
    const confirmed = await this.waitForSeqno(opened, seqno, 30_000);
    if (!confirmed) {
      throw new Error("transfer not confirmed within timeout (seqno did not advance)");
    }
    return { txHash: `ton:${wallet.address.toString()}:seqno${seqno + 1}` };
  }

  private async waitForSeqno(
    opened: ReturnType<TonClient["open"]>,
    seqno: number,
    timeoutMs: number,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      // @ts-expect-error getSeqno exists on the opened wallet contract
      const current: number = await opened.getSeqno();
      if (current > seqno) return true;
    }
    return false;
  }
}
