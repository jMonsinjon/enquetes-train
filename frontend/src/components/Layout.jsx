import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
