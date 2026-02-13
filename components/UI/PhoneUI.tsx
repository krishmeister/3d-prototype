'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import './PhoneUI.css';

export function PhoneUI() {
    const activeLightId = useStore((s) => s.activeLightId);
    const lightStates = useStore((s) => s.lightStates);
    const toggleLight = useStore((s) => s.toggleLight);

    const isVisible = activeLightId !== null;
    const isOn = activeLightId ? !!lightStates[activeLightId] : false;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (activeLightId) {
            toggleLight(activeLightId);
        }
    };

    return (
        <div className={`phone-container ${isVisible ? 'phone-visible' : ''}`}>
            {/* iPhone frame */}
            <div className="phone-frame">
                {/* Notch */}
                <div className="phone-notch">
                    <div className="phone-notch-camera" />
                </div>

                {/* Status bar */}
                <div className="phone-status-bar">
                    <span className="phone-time">9:41</span>
                    <div className="phone-status-icons">
                        <span>●●●●</span>
                        <span>WiFi</span>
                        <span>🔋</span>
                    </div>
                </div>

                {/* Screen content */}
                <div className="phone-screen">
                    {/* App header */}
                    <div className="phone-app-header">
                        <div className="phone-app-icon">💡</div>
                        <h2 className="phone-app-title">Wiser Home</h2>
                        <p className="phone-app-subtitle">Smart Light Control</p>
                    </div>

                    {/* Light status indicator */}
                    <div className={`phone-light-status ${isOn ? 'status-on' : 'status-off'}`}>
                        <div className="phone-light-bulb">
                            <svg
                                viewBox="0 0 24 24"
                                width="64"
                                height="64"
                                fill="none"
                                stroke={isOn ? '#fbbf24' : '#6b7280'}
                                strokeWidth="1.5"
                            >
                                <path d="M9 21h6M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3Z" />
                                {isOn && (
                                    <>
                                        <line x1="12" y1="1" x2="12" y2="0" stroke="#fbbf24" strokeWidth="2" />
                                        <line x1="4.22" y1="4.22" x2="3.5" y2="3.5" stroke="#fbbf24" strokeWidth="2" />
                                        <line x1="1" y1="12" x2="0" y2="12" stroke="#fbbf24" strokeWidth="2" />
                                        <line x1="19.78" y1="4.22" x2="20.5" y2="3.5" stroke="#fbbf24" strokeWidth="2" />
                                        <line x1="23" y1="12" x2="24" y2="12" stroke="#fbbf24" strokeWidth="2" />
                                    </>
                                )}
                            </svg>
                        </div>
                        <span className="phone-light-label">
                            {isOn ? 'Light is ON' : 'Light is OFF'}
                        </span>
                    </div>

                    {/* Toggle button */}
                    <button
                        className={`phone-toggle-btn ${isOn ? 'btn-off' : 'btn-on'}`}
                        onClick={handleToggle}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <span className="phone-toggle-text">
                            {isOn ? 'Turn OFF' : 'Turn ON'}
                        </span>
                    </button>

                    {/* Room info */}
                    <div className="phone-room-info">
                        <span className="phone-room-label">Pendant Light</span>
                        <span className="phone-room-id">
                            {activeLightId?.replace('pendant_light_', 'Room ')}
                        </span>
                    </div>
                </div>

                {/* Home indicator */}
                <div className="phone-home-indicator">
                    <div className="phone-home-bar" />
                </div>
            </div>
        </div>
    );
}
