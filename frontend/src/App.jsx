import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LaunchList from './components/LaunchList';
import CreateLaunch from './components/CreateLaunch';
import LaunchDetails from './components/LaunchDetails';

function App() {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'details'
  const [selectedLaunch, setSelectedLaunch] = useState(null);

  const handleLaunchSelect = (launch) => {
    setSelectedLaunch(launch);
    setCurrentView('details');
  };

  const handleBack = () => {
    setSelectedLaunch(null);
    setCurrentView('list');
  };

  const handleLaunchCreated = () => {
    setCurrentView('list');
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'var(--spacing-xl)' }}>
      <Navbar />

      <div className="container">
        {currentView === 'list' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-lg)' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentView('create')}
              >
                + Start New Launch
              </button>
            </div>
            <LaunchList onSelectLaunch={handleLaunchSelect} />
          </>
        )}

        {currentView === 'create' && (
          <div>
            <button
              onClick={() => setCurrentView('list')}
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
            <CreateLaunch onLaunchCreated={handleLaunchCreated} />
          </div>
        )}

        {currentView === 'details' && selectedLaunch && (
          <LaunchDetails launch={selectedLaunch} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}

export default App;
