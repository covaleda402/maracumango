import React from 'react';
import { SedesCard } from '../components/customer/SedesCard';

export const SedesPage: React.FC = () => {
  return (
    <div className="w-full pt-28 pb-20 bg-surface min-h-screen">
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop">
        <SedesCard />
      </div>
    </div>
  );
};
