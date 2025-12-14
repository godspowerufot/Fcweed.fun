import React, { useState, useEffect } from 'react';
import { formatEther, parseEther, getLaunchpadFactoryContract, getMemeTokenContract, getFCWEEDContract, getSigner, getProvider } from '../utils/contract';

const LaunchDetails = ({ launch, onBack }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [balance, setBalance] = useState('0');
    const [fcweedBalance, setFcweedBalance] = useState('0');
    const [mode, setMode] = useState('buy'); // 'buy' or 'sell'

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const provider = getProvider();
                if (provider) {
                    const tokenContract = getMemeTokenContract(launch.token, provider);
                    const name = await tokenContract.name();
                    const symbol = await tokenContract.symbol();
                    setTokenName(name);
                    setTokenSymbol(symbol);

                    const signer = await getSigner();
                    if (signer) {
                        const userAddress = await signer.getAddress();
                        const bal = await tokenContract.balanceOf(userAddress);
                        setBalance(formatEther(bal));

                        const fcweed = getFCWEEDContract(provider);
                        const fcBal = await fcweed.balanceOf(userAddress);
                        setFcweedBalance(formatEther(fcBal));
                    }
                }
            } catch (error) {
                console.error("Error fetching details:", error);
            }
        };
        fetchDetails();
    }, [launch]);

    const handleTrade = async () => {
        if (!amount) return;
        setLoading(true);
        setStatus('Checking wallet...');

        try {
            const signer = await getSigner();
            if (!signer) {
                alert("Please connect your wallet!");
                setLoading(false);
                return;
            }

            const factory = await getLaunchpadFactoryContract(signer);
            const factoryAddress = await factory.getAddress();
            const amountWei = parseEther(amount);

            if (mode === 'buy') {
                // BUY LOGIC
                const fcweed = getFCWEEDContract(signer);
                const userAddress = await signer.getAddress();

                setStatus('Checking allowance...');
                const allowance = await fcweed.allowance(userAddress, factoryAddress);

                if (allowance < amountWei) {
                    setStatus('Approving FCWEED...');
                    // Approve max uint256 to avoid future approvals
                    const maxApproval = parseEther("1000000000");
                    const txApprove = await fcweed.approve(factoryAddress, maxApproval);
                    await txApprove.wait();
                }

                setStatus('Buying Tokens...');
                const minTokensOut = 0; // Slippage 0 for now
                const tx = await factory.buy(launch.token, amountWei, minTokensOut);
                await tx.wait();
                alert("Tokens purchased successfully!");

            } else {
                // SELL LOGIC
                const tokenContract = getMemeTokenContract(launch.token, signer);
                const userAddress = await signer.getAddress();

                setStatus('Checking allowance...');
                const allowance = await tokenContract.allowance(userAddress, factoryAddress);

                if (allowance < amountWei) {
                    setStatus(`Approving ${tokenSymbol}...`);
                    const txApprove = await tokenContract.approve(factoryAddress, amountWei);
                    await txApprove.wait();
                }

                setStatus('Selling Tokens...');
                const minBaseOut = 0; // Slippage 0 for now
                const tx = await factory.sell(launch.token, amountWei, minBaseOut);
                await tx.wait();
                alert("Tokens sold successfully!");
            }

            setAmount('');
            // Refresh logic could be added here
        } catch (error) {
            console.error("Error trading:", error);
            // Check for ERC20InsufficientAllowance (0xfb8f41b2) or "transfer failed"
            if (error.message.includes("0xfb8f41b2") || error.message.includes("transfer failed") || error.message.includes("insufficient allowance")) {
                alert("Allowance error. Please try again to Approve.");
                // Force approval next time
            } else {
                alert("Error: " + error.message);
            }
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <button
                onClick={onBack}
                style={{
                    background: 'none',
                    color: 'var(--text-light)',
                    marginBottom: 'var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}
            >
                ← Back to Launches
            </button>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        {launch.imageURI && (
                            <img
                                src={launch.imageURI}
                                alt={tokenName}
                                style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }}
                            />
                        )}
                        <div>
                            <h1 style={{ color: 'var(--primary)', marginBottom: 'var(--spacing-xs)' }}>{tokenName}</h1>
                            <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-light)', fontWeight: 600 }}>${tokenSymbol}</span>
                            <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: 'var(--spacing-md)' }}>
                                {launch.twitter && <a href={launch.twitter} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Twitter</a>}
                                {launch.telegram && <a href={launch.telegram} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Telegram</a>}
                                {launch.website && <a href={launch.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Website</a>}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ color: 'var(--text-light)', fontSize: 'var(--font-size-sm)' }}>Address</p>
                        <p style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{launch.token}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ color: 'var(--text-light)', fontSize: 'var(--font-size-sm)' }}>Total Raised</p>
                        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
                            {launch.baseAssetRaised ? formatEther(launch.baseAssetRaised) : '0'} FCWEED
                        </p>
                    </div>
                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ color: 'var(--text-light)', fontSize: 'var(--font-size-sm)' }}>Your Balance</p>
                        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>{balance} {tokenSymbol}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-light)' }}>{fcweedBalance} FCWEED</p>
                    </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Bonding Curve Progress</h3>
                    <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--background)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${launch.baseAssetRaised ? (Number(formatEther(launch.baseAssetRaised)) / 9) * 100 : 0}%`,
                            height: '100%',
                            backgroundColor: 'var(--secondary)',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-light)' }}>
                        <span>0 FCWEED</span>
                        <span>9 FCWEED (Graduation)</span>
                    </div>
                </div>

                {!launch.graduated ? (
                    <div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                            <button
                                className={`btn ${mode === 'buy' ? 'btn-primary' : ''}`}
                                style={{ flex: 1, backgroundColor: mode === 'buy' ? 'var(--primary)' : 'var(--background)', color: mode === 'buy' ? 'white' : 'var(--text-main)' }}
                                onClick={() => setMode('buy')}
                            >
                                Buy
                            </button>
                            <button
                                className={`btn ${mode === 'sell' ? 'btn-accent' : ''}`}
                                style={{ flex: 1, backgroundColor: mode === 'sell' ? 'var(--accent)' : 'var(--background)', color: mode === 'sell' ? 'white' : 'var(--text-main)' }}
                                onClick={() => setMode('sell')}
                            >
                                Sell
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder={mode === 'buy' ? "Amount in FCWEED" : `Amount in ${tokenSymbol}`}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    step="0.001"
                                    style={{ width: '100%' }}
                                />
                                {mode === 'buy' && (
                                    <button
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'var(--secondary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            const raised = launch.baseAssetRaised ? Number(formatEther(launch.baseAssetRaised)) : 0;
                                            const max = 9 - raised;
                                            setAmount(max.toFixed(4));
                                        }}
                                    >
                                        Max
                                    </button>
                                )}
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ minWidth: '160px', backgroundColor: mode === 'sell' ? 'var(--accent)' : 'var(--primary)' }}
                                onClick={handleTrade}
                                disabled={loading || (mode === 'sell' && Number(amount) > Number(balance))}
                            >
                                {loading ? status : (mode === 'buy' ? 'Approve & Buy' : (Number(amount) > Number(balance) ? 'Insufficient Balance' : 'Approve & Sell'))}
                            </button>
                        </div>
                        {mode === 'buy' && (
                            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                                Max Buy: {(9 - (launch.baseAssetRaised ? Number(formatEther(launch.baseAssetRaised)) : 0)).toFixed(4)} FCWEED
                            </p>
                        )}
                    </div>
                ) : (
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--secondary)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center'
                    }}>
                        <h3>🚀 Graduated to DEX!</h3>
                        <p>This token is now trading on Uniswap against FCWEED.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LaunchDetails;
