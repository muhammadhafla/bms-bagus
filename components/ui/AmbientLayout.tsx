import React from 'react';

interface AmbientLayoutProps {
  children: React.ReactNode;
}

export default function AmbientLayout({ children }: AmbientLayoutProps) {
  return (
    <div className="relative w-full">
      <div className="relative z-10 flex flex-col min-h-full">
        {children}
      </div>
    </div>
  );
}
