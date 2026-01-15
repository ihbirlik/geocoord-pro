
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, UserRole } from './types';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import ProjectManagement from './pages/ProjectManagement';
import Sidebar from './components/Sidebar';
import { LayoutDashboard, Users, Map, Settings, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('geo_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('geo_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('geo_user');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <Sidebar user={currentUser} onLogout={handleLogout} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard user={currentUser} />} />
            <Route path="/projects" element={<ProjectManagement user={currentUser} />} />
            {currentUser.role === UserRole.ADMIN && (
              <Route path="/users" element={<UserManagement />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
