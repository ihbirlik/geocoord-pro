
import React from 'react';
import { User, UserRole, ProjectStatus } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { TrendingUp, MapPin, ClipboardList, Clock, CheckCircle } from 'lucide-react';

const data = [
  { name: 'Planlama', count: 4, color: '#94a3b8' },
  { name: 'Arazi', count: 7, color: '#10b981' },
  { name: 'Analiz', count: 3, color: '#0ea5e9' },
  { name: 'Rapor', count: 5, color: '#f59e0b' },
  { name: 'Tamam', count: 12, color: '#8b5cf6' },
];

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const stats = [
    { label: 'Aktif Projeler', value: '19', icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Bekleyen Görevler', value: '42', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Ort. Bitirme Süresi', value: '14 Gün', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Başarı Oranı', value: '%98', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hoş geldin, {user.name}</h1>
          <p className="text-slate-500 mt-1">Sistem genelindeki güncel durumu buradan takip edebilirsin.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
          <TrendingUp className="text-emerald-500" size={20} />
          <span className="font-semibold text-slate-700">Verimlilik Artışı: +%12.5</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            Proje Durum Dağılımı
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Son Aktiviteler</h2>
          <div className="space-y-6">
            {[
              { text: 'A-12 Sondaj verisi girildi', time: '12dk önce', role: 'Tekniker' },
              { text: 'Bursa OSB raporu onaylandı', time: '1sa önce', role: 'Mühendis' },
              { text: 'Yeni proje tanımlandı: İzmit Kentsel Dönüşüm', time: '3sa önce', role: 'Admin' },
              { text: 'Arazi ekipmanı bakım kaydı', time: 'Dün', role: 'Tekniker' },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4 relative">
                {i !== 3 && <div className="absolute top-8 left-2.5 w-0.5 h-10 bg-slate-100" />}
                <div className="w-5 h-5 rounded-full bg-emerald-100 border-2 border-emerald-500 mt-1 z-10" />
                <div>
                  <p className="text-sm text-slate-900 font-medium leading-tight">{activity.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{activity.role}</span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm transition-colors">
            Tümünü Görüntüle
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
