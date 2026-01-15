
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { HardHat, LogIn, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@geocoord.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mock Login Logic
    if (email === 'admin@geocoord.com' && password === '123456') {
      onLogin({
        id: '1',
        name: 'Ahmet Yılmaz',
        email: 'admin@geocoord.com',
        role: UserRole.ADMIN
      });
    } else if (email === 'muhendis@geocoord.com') {
      onLogin({
        id: '2',
        name: 'Merve Kaya',
        email: 'muhendis@geocoord.com',
        role: UserRole.GEOLOGICAL_ENGINEER
      });
    } else if (email === 'tekniker@geocoord.com') {
      onLogin({
        id: '3',
        name: 'Can Demir',
        email: 'tekniker@geocoord.com',
        role: UserRole.TECHNICIAN
      });
    } else {
      setError('Geçersiz email veya şifre');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-slate-500 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8 text-center bg-slate-900 text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg">
            <HardHat size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GeoCoord Pro</h1>
          <p className="text-slate-400 mt-2 text-sm">Jeoloji Mühendisliği Koordinasyon Sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
              <ShieldAlert size={18} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">E-posta Adresi</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="isim@geocoord.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <LogIn size={20} />
            Sisteme Giriş Yap
          </button>

          <div className="text-center pt-4">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-3">Test Hesapları</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-[10px] px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-600">admin@geocoord.com</span>
              <span className="text-[10px] px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-600">muhendis@geocoord.com</span>
              <span className="text-[10px] px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-600">tekniker@geocoord.com</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
