import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually to avoid dependency
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from ${envPath}`);

if (!fs.existsSync(envPath)) {
    console.error(".env file not found!");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const PRIVATE_KEY = envConfig.PRIVATE_KEY;
const RPC_URL = envConfig.RPC_URL;

if (!PRIVATE_KEY || !RPC_URL) {
    console.error("Missing PRIVATE_KEY or RPC_URL in .env");
    process.exit(1);
}

const LAUNCHPAD_FACTORY_ADDRESS = "0x23d496D7Ae68bF9f9FBf97bB9c0d3c3E25964328";
const FCWEED_TOKEN_ADDRESS = "0x96a986C5996068fb77486076Af7A8A884bc6E214";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const abi = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
];

const contract = new ethers.Contract(FCWEED_TOKEN_ADDRESS, abi, wallet);

async function main() {
    try {
        const decimals = await contract.decimals();
        console.log(`Token decimals: ${decimals}`);

        const amount = ethers.parseUnits("10000", decimals);
        console.log(`Transferring 10000 FCWEED to ${LAUNCHPAD_FACTORY_ADDRESS}...`);

        const tx = await contract.transfer(LAUNCHPAD_FACTORY_ADDRESS, amount);
        console.log("Transaction sent:", tx.hash);

        await tx.wait();
        console.log("Transaction confirmed!");
    } catch (error) {
        console.error("Error:", error);
    }
}

main().catch(console.error);
