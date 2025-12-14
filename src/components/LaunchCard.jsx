import React, { useState, useEffect } from 'react';
import { formatEther, getMemeTokenContract, getProvider } from '../utils/contract';

const LaunchCard = ({ launch, onClick }) => {
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');

    useEffect(() => {
        const fetchTokenDetails = async () => {
            try {
                const provider = getProvider();
                if (provider) {
                    const tokenContract = getMemeTokenContract(launch.token, provider);
                    const name = await tokenContract.name();
                    const symbol = await tokenContract.symbol();
                    setTokenName(name);
                    setTokenSymbol(symbol);
                }
            } catch (error) {
                console.error("Error fetching token details:", error);
            }
        };

        if (launch.token) {
            fetchTokenDetails();
        }
    }, [launch.token]);

    return (
        <div className="card" onClick={onClick} style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {launch.imageURI && (
                        <img
                            src={launch.imageURI}
                            alt={tokenName}
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    )}
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--primary-dark)' }}>{tokenName || 'Loading...'}</h3>
                        <span style={{
                            color: 'var(--text-light)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600
                        }}>
                            ${tokenSymbol || '...'}
                        </span>
                    </div>
                </div>
                {launch.graduated && (
                    <span style={{
                        backgroundColor: 'var(--secondary)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                    }}>
                        DEX
                    </span>
                )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-light)', marginBottom: '4px' }}>
                    Raised
                </p>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                    {launch.baseAssetRaised ? formatEther(launch.baseAssetRaised) : '0'} FCWEED
                </p>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-light)', marginBottom: '4px' }}>
                    Market Cap
                </p>
                <p style={{ fontWeight: 600 }}>
                    {/* Market cap estimation could be added here */}
                    Active
                </p>
            </div>

            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--background)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                    width: `${launch.baseAssetRaised ? (Number(formatEther(launch.baseAssetRaised)) / 9) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: 'var(--secondary)'
                }} />
            </div>
        </div>
    );
};

export default LaunchCard;
