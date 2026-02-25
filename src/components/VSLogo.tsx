import React from "react";

export const VSLogo: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => {
    return (
        <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 538 363.06"
            className={className}
            style={style}
            aria-label="Video Synergie Logo"
        >
            <g id="Groupe_S">
                <path
                    fill="#009FE3" // st11 in original
                    d="M359.98,0.1c-5.08,2.15-22.48,10.23-32.95,30.19c-2.4,4.58-10.25,19.99-6.93,39.48c0.09,0.54,1.99,11.18,8.07,21.11
          c23.91,39.07,80.97,31.59,115.44,77.04c7.68,10.13,7.35,25.04,2.15,48.17c4.37-1.78,14.45-8.26,21.72-17.2
          c9.2-11.31,10.81-23.39,11.18-28.04c1.3-7.72,1.99-21.05-4.57-34.16c-11.04-22.07-31.07-31.17-48.88-39
          c-28.74-12.64-42.69-21.8-49.69-27.27c-16.67-13.04-21.22-27.97-20.25-43.86C355.21,21.74,358.06,5.58,359.98,0.1z"
                />
                <polygon
                    fill="#009FE3" // st11
                    points="432.81,48.17 432.81,0 479.53,24.08"
                />
            </g>
            <g id="Groupe_V">
                <polygon
                    fill="#010202" // Text color generally, or black
                    points="120.33,0.17 60.83,0.17 172.83,216.51 201.84,160.47"
                />
                <circle
                    fill="#E6007E" // st12
                    cx="246.21" cy="24.17" r="24"
                />
            </g>
            <g id="Slogan">
                <text transform="matrix(1 0 0 1 1.5021 298.9737)" style={{ fontFamily: 'sans-serif', fontSize: '96px', letterSpacing: '-4px' }}>
                    <tspan x="0" y="0" style={{ fill: '#010202' }}>Vidéo </tspan>
                    <tspan x="225.69" y="0" style={{ fill: '#010202', fontWeight: 'bold' }}>Synergie</tspan>
                </text>
            </g>
        </svg>
    );
};
