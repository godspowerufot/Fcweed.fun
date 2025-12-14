import React, { useState, useEffect } from 'react';
import { getProvider } from '../utils/contract';

const Navbar = () => {
    const [account, setAccount] = useState(null);

    const connectWallet = async () => {
        const provider = getProvider();
        if (provider) {
            try {
                const accounts = await provider.send("eth_requestAccounts", []);
                setAccount(accounts[0]);
            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            alert("Please install Metamask!");
        }
    };

    useEffect(() => {
        const checkConnection = async () => {
            const provider = getProvider();
            if (provider) {
                const accounts = await provider.send("eth_accounts", []);
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                }
            }
        };
        checkConnection();
    }, []);

    return (
        <nav style={{
            backgroundColor: 'var(--surface)',
            padding: 'var(--spacing-md) 0',
            borderBottom: '1px solid var(--border)',
            marginBottom: 'var(--spacing-xl)'
        }}>
            <div className="container" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: 'var(--font-size-xl)' }}>
                    Pump Launchpad
                </h1>

                {account ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)'
                    }}>
                        <span style={{
                            backgroundColor: 'var(--background)',
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 500
                        }}>
                            {account.slice(0, 6)}...{account.slice(-4)}
                        </span>
                    </div>
                ) : (
                    <button className="btn btn-primary" onClick={connectWallet}>
                        Connect Wallet
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
