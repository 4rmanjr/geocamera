import React from 'react';

export const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center cursor-pointer transition-all duration-200 animate-pulse">
        <div className="w-8 h-8 rounded-md bg-red-500 transition-all duration-200" />
    </div>
);