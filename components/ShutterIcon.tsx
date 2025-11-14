
import React from 'react';

export const ShutterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center cursor-pointer group-hover:border-gray-300 transition-all duration-200">
        <div className="w-16 h-16 rounded-full bg-white group-hover:bg-gray-300 group-active:scale-90 transition-all duration-200" />
    </div>
);
