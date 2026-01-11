import React from 'react';
import { useSimulationStore, selectError } from '../../stores/useSimulationStore';

export const ErrorBanner: React.FC = () => {
    const error = useSimulationStore(selectError);
    const clearError = useSimulationStore((state) => state.clearError);

    if (!error) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 69, 58, 0.9)', // Red
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: 'Inter, system-ui, sans-serif',
            maxWidth: '400px',
        }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Simulation Error</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>{error}</div>
            </div>
            <button
                onClick={clearError}
                style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                }}
            >
                Dismiss
            </button>
        </div>
    );
};
