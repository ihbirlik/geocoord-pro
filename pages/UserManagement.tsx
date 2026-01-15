
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { UserPlus, Search, Trash2, Edit2, ShieldCheck } from 'lucide-react';

const mockUsers: User[] = [
  { id: '1', name: 'Ahmet Yılmaz', email: 'ahmet@geocoord.com', role: UserRole.ADMIN },
  { id: '2', name: 'Merve Kaya', email: 'merve@geocoord.com', role: UserRole.GEOLOGICAL_ENGINEER },
  { id: '3', name: 'Can Demir', email: 'can@geocoord.com', role: UserRole.TECHNICIAN },
  { id: '4', name: 'Zeynep Ak', email: 'zeynep@geocoord.com', role: UserRole.GEOPHYSICAL_ENGINEER },
  { id: '5', name: 'Selin Er', email: 'selin@geocoord.com', role: UserRole.OFFICE_PERSONNEL },
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personel Yönetimi</h1>
          <p className="text-slate-500 mt-1">Şirket içi yetkilendirmeleri ve çalışan listesini buradan yönetin.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 font-bold transition-all active:scale-95">
          <UserPlus size={20} />
          Yeni Personel Ekle
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Personel ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Personel</th>
                <th className="px-6 py-4">E-posta</th>
                <th className="px-6 py-4">Görev / Rol</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-semibold text-slate-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm font-medium">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                      ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 
                        user.role === UserRole.GEOLOGICAL_ENGINEER ? 'bg-emerald-100 text-emerald-700' :
                        user.role === UserRole.GEOPHYSICAL_ENGINEER ? 'bg-sky-100 text-sky-700' :
                        'bg-slate-100 text-slate-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <ShieldCheck size={14} />
                      AKTİF
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                        <Edit2 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
