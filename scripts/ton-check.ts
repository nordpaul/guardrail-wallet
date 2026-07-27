// Live verification of the TON adapter wiring — no funds required.
//   A) testnet: generate a session key, derive the W5 wallet, read its balance
//   B) mainnet (read-only): resolve the USDT jetton-wallet address via the real
//      USDT master, proving the jetton path works against production contracts
//   C) offline: build the jetton-transfer body cell and print its hash
//
// Run: npx tsx scripts/ton-check.ts
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { Address, beginCell, fromNano } from "@ton/core";
import { JettonMaster, TonClient, WalletContractV5R1 } from "@ton/ton";

const USDT_MAINNET_MASTER = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";
const JETTON_TRANSFER_OP = 0xf8a7ea5;

async function main() {
  console.log("== A) testnet: derive session wallet + read balance ==");
  const words = await mnemonicNew(); // throwaway session key for this check
  const keyPair = await mnemonicToPrivateKey(words);
  const wallet = WalletContractV5R1.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
    walletId: { networkGlobalId: -3 }, // testnet
  });
  console.log("session wallet (testnet):", wallet.address.toString({ testOnly: true }));

  const testnet = new TonClient({ endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC" });
  const balance = await testnet.getBalance(wallet.address);
  console.log("TON balance:", fromNano(balance), "(0 expected — unfunded)");

  console.log("\n== B) mainnet (read-only): resolve USDT jetton wallet ==");
  const mainnet = new TonClient({ endpoint: "https://toncenter.com/api/v2/jsonRPC" });
  const owner = WalletContractV5R1.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
    walletId: { networkGlobalId: -239 }, // mainnet
  });
  const master = mainnet.open(JettonMaster.create(Address.parse(USDT_MAINNET_MASTER)));
  const jettonWallet = await master.getWalletAddress(owner.address);
  console.log("owner (mainnet):       ", owner.address.toString());
  console.log("its USDT jetton wallet:", jettonWallet.toString());

  console.log("\n== C) offline: build transfer body ==");
  const units = BigInt(Math.round(42.5 * 1e6)); // 42.5 USDT, 6 decimals
  const body = beginCell()
    .storeUint(JETTON_TRANSFER_OP, 32)
    .storeUint(0, 64)
    .storeCoins(units)
    .storeAddress(owner.address)
    .storeAddress(owner.address)
    .storeMaybeRef(null)
    .storeCoins(1n)
    .storeMaybeRef(beginCell().storeUint(0, 32).storeStringTail("test memo").endCell())
    .endCell();
  console.log("transfer body op:", "0x" + JETTON_TRANSFER_OP.toString(16), "| 42.5 USDT =", units, "units");
  console.log("body cell hash:  ", body.hash().toString("hex"));

  console.log("\nOK — key derivation, network, USDT master resolution and message build all work.");
  console.log("A funded testnet wallet + TON_SESSION_MNEMONIC is needed to broadcast a real transfer.");
}

main().catch((e) => {
  console.error("ton-check failed:", e.message ?? e);
  process.exit(1);
});
