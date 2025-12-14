import React, { useState } from 'react';
import { getLaunchpadFactoryContract, getFCWEEDContract, getSigner, parseEther, formatEther } from '../utils/contract';

const CreateLaunch = ({ onLaunchCreated }) => {
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [imageURI, setImageURI] = useState('');
    const [twitter, setTwitter] = useState('');
    const [telegram, setTelegram] = useState('');
    const [website, setWebsite] = useState('');
    const [initialBuy, setInitialBuy] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleCreate = async (e) => {
        e.preventDefault();
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
            const fcweed = getFCWEEDContract(signer);
            const userAddress = await signer.getAddress();
            const creationFee = await factory.creationFee();

            let totalCost = creationFee;
            let initialBuyWei = 0n;

            if (initialBuy) {
                initialBuyWei = parseEther(initialBuy);
                totalCost = totalCost + initialBuyWei;
            }

            // Check Allowance
            setStatus('Checking allowance...');
            const allowance = await fcweed.allowance(userAddress, await factory.getAddress());

            if (allowance < totalCost) {
                setStatus(`Approving ${formatEther(totalCost)} FCWEED...`);
                const txApprove = await fcweed.approve(await factory.getAddress(), totalCost);
                await txApprove.wait();
            }

            // Create Launch
            setStatus('Creating Launch...');
            const tx = await factory.createLaunch(
                name,
                symbol,
                imageURI,
                twitter,
                telegram,
                website,
                initialBuyWei
            );
            await tx.wait();

            alert("Launch created successfully!");
            setName('');
            setSymbol('');
            setImageURI('');
            setTwitter('');
            setTelegram('');
            setWebsite('');
            setInitialBuy('');
            if (onLaunchCreated) onLaunchCreated();
        } catch (error) {
            console.error("Error creating launch:", error);
            alert("Error creating launch: " + error.message);
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: 'var(--primary)' }}>Start a New Launch</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-light)', marginBottom: 'var(--spacing-lg)' }}>
                Fee: 0.01 FCWEED
            </p>

            <form onSubmit={handleCreate}>
                <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 500 }}>Token Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. Super Meme"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 500 }}>Token Symbol</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. MEME"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 500 }}>Image URI (URL)</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="https://ipfs.io/ipfs/..."
                        value={imageURI}
                        onChange={(e) => setImageURI(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-3" style={{ gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 500 }}>Twitter</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Optional"
                            value={twitter}
                            onChange={(e) => setTwitter(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 500 }}>Telegram</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Optional"
                            value={telegram}
                            onChange={(e) => setTelegram(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 500 }}>Website</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Optional"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 500 }}>Initial Buy (Optional)</label>
                    <input
                        type="number"
                        className="input"
                        placeholder="Amount in FCWEED"
                        value={initialBuy}
                        onChange={(e) => setInitialBuy(e.target.value)}
                        step="0.001"
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                        Buy tokens immediately upon creation.
                    </p>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={loading}
                >
                    {loading ? status : 'Approve & Launch Token'}
                </button>
            </form>
        </div>
    );
};

export default CreateLaunch;
