'use client';

import React from 'react';

export function DebugOverlay() {
    return (
        <div
            id="debug-overlay"
            style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#00ff00',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '14px',
                borderRadius: '8px',
                zIndex: 9999,
                pointerEvents: 'none',
                minWidth: '150px'
            }}
        >
            <div>POS X: <span id="debug-x">0.00</span></div>
            <div>POS Y: <span id="debug-y">0.00</span></div>
            <div>POS Z: <span id="debug-z">0.00</span></div>
        </div>
    );
}
