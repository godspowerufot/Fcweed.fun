import React, { useState, useEffect } from 'react';
import { getLaunchpadFactoryContract, getProvider } from '../utils/contract';
import LaunchCard from './LaunchCard';

const LaunchList = ({ onSelectLaunch }) => {
    const [launches, setLaunches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const provider = getProvider();
                if (provider) {
                    const factory = await getLaunchpadFactoryContract(provider);
                    const allLaunchAddresses = await factory.getAllLaunches();

                    const launchDataPromises = allLaunchAddresses.map(async (address) => {
                        const launch = await factory.getLaunch(address);
                        return launch;
                    });

                    const launchesData = await Promise.all(launchDataPromises);
                    // Sort by newest first
                    setLaunches(launchesData.reverse());
                }
            } catch (error) {
                console.error("Error fetching launches:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLaunches();
    }, []);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>Loading launches...</div>;
    }

    return (
        <div>
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Trending Launches</h2>
            {launches.length === 0 ? (
                <p style={{ color: 'var(--text-light)' }}>No launches yet. Be the first!</p>
            ) : (
                <div className="grid grid-cols-3">
                    {launches.map((launch, index) => (
                        <LaunchCard
                            key={launch.token || index}
                            launch={launch}
                            onClick={() => onSelectLaunch(launch)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default LaunchList;
