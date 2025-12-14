#!/bin/bash

echo "🔍 Checking your .env configuration..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Check PRIVATE_KEY
PRIVATE_KEY=$(grep "^PRIVATE_KEY=" .env | cut -d'=' -f2)

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY is empty"
    exit 1
elif [ "$PRIVATE_KEY" = "your_private_key_here" ]; then
    echo "❌ PRIVATE_KEY still has placeholder value"
    echo ""
    echo "📝 You need to replace 'your_private_key_here' with your actual private key"
    echo ""
    echo "Steps:"
    echo "1. Open MetaMask"
    echo "2. Click Account Details → Show Private Key"
    echo "3. Copy the key (64 hex characters, remove '0x' if present)"
    echo "4. Edit .env file and replace the placeholder"
    echo ""
    echo "Example:"
    echo "PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    exit 1
elif [ ${#PRIVATE_KEY} -ne 64 ]; then
    echo "❌ PRIVATE_KEY has wrong length: ${#PRIVATE_KEY} characters"
    echo "Expected: 64 hexadecimal characters (without 0x prefix)"
    echo "Current: $PRIVATE_KEY"
    exit 1
else
    echo "✅ PRIVATE_KEY format looks correct (64 characters)"
fi

# Check SEPOLIA_RPC_URL
SEPOLIA_RPC=$(grep "^SEPOLIA_RPC_URL=" .env | cut -d'=' -f2)
if [ -z "$SEPOLIA_RPC" ]; then
    echo "⚠️  SEPOLIA_RPC_URL is empty"
else
    echo "✅ SEPOLIA_RPC_URL is set"
fi

# Check ETHERSCAN_API_KEY
ETHERSCAN_KEY=$(grep "^ETHERSCAN_API_KEY=" .env | cut -d'=' -f2)
if [ -z "$ETHERSCAN_KEY" ]; then
    echo "⚠️  ETHERSCAN_API_KEY is empty (verification will fail)"
else
    echo "✅ ETHERSCAN_API_KEY is set"
fi

echo ""
echo "🎉 Configuration check complete!"
echo "You can now run: npx hardhat compile"
