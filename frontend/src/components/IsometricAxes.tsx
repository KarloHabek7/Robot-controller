import React from 'react';

interface IsometricAxesProps {
    size?: number;
    opacity?: number;
}

const IsometricAxes: React.FC<IsometricAxesProps> = ({ opacity = 1 }) => {
    // Isometric projection math for SVG
    // X: (-1, 0.5), Y: (1, 0.5), Z: (0, -1) normalized to some scale
    const scale = 70;

    return (
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
            <svg
                width="220"
                height="220"
                viewBox="0 0 220 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-2xl"
                style={{ opacity }}
            >
                <g transform="translate(110, 110)">
                    {/* Z Axis - Blue (Up) */}
                    <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2={-scale}
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M -8.66 ${-scale + 5} L 0 ${-scale} L 8.66 ${-scale + 5}`}
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* X Axis - Red (Left Down) */}
                    <line
                        x1="0"
                        y1="0"
                        x2={-scale * 0.866}
                        y2={scale * 0.5}
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${-scale * 0.866 + 8.66} ${scale * 0.5 + 5} L ${-scale * 0.866} ${scale * 0.5} L ${-scale * 0.866} ${scale * 0.5 - 10}`}
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Y Axis - Green (Right Down) */}
                    <line
                        x1="0"
                        y1="0"
                        x2={scale * 0.866}
                        y2={scale * 0.5}
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${scale * 0.866 - 8.66} ${scale * 0.5 + 5} L ${scale * 0.866} ${scale * 0.5} L ${scale * 0.866} ${scale * 0.5 - 10}`}
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Origin Point */}
                    <circle cx="0" cy="0" r="4" fill="#94a3b8" />
                    <circle cx="0" cy="0" r="6" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
                </g>
            </svg>
        </div>
    );
};

export default IsometricAxes;
