import React from 'react';

interface FlashIconProps extends React.SVGProps<SVGSVGElement> {
  mode: 'on' | 'off';
}

export const FlashIcon: React.FC<FlashIconProps> = ({ mode, ...props }) => {
  const commonProps = {
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props
  };

  if (mode === 'on') {
    return (
      <svg {...commonProps} fill="currentColor" stroke="currentColor">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  }

  // mode === 'off'
  return (
    <svg {...commonProps} fill="none" stroke="currentColor">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
};