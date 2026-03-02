import React from 'react';
import { NavLink } from 'react-router-dom';
import { ClipboardList, CheckSquare, Users } from 'lucide-react';

const navItems = [
  { to: '/', icon: ClipboardList, label: 'Enquêtes', end: true },
  { to: '/admin/criteria', icon: CheckSquare, label: 'Critères', end: false },
  { to: '/admin/collaborators', icon: Users, label: 'Équipes', end: false },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors min-h-[56px] ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="mt-0.5">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
