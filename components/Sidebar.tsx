
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Map, LogOut, HardHat } from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Panel', icon: LayoutDashboard, roles: Object.values(UserRole) },
    { to: '/projects', label: 'Projeler', icon: Map, roles: Object.values(UserRole) },
    { to: '/users', label: 'Personel', icon: Users, roles: [UserRole.ADMIN] },
  ];

  const activeClass = "bg-emerald-600 text-white shadow-lg";
  const inactiveClass = "text-slate-400 hover:bg-slate-800 hover:text-white transition-all";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 h-full p-4">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <HardHat className="text-white w-6 h-6" />
        </div>
        <h1 className="text-white font-bold text-xl tracking-tight">GeoCoord Pro</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          if (!link.roles.includes(user.role)) return null;
          const Icon = link.icon;
          const isActive = location.pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${isActive ? activeClass : inactiveClass}`}
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-800">
        <div className="px-4 mb-4">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Kullanıcı</p>
          <p className="text-sm text-white font-semibold mt-1">{user.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{user.role}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
