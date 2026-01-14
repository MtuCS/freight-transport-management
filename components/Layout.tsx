import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Truck, LayoutDashboard, PlusCircle, List, LogOut, FileBarChart, ShieldCheck, Users } from 'lucide-react';
import { User, Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800';
  };

  if (!user) return <>{children}</>;

  const isAdmin = user.role === Role.ADMIN;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white transition-all duration-300 border-r border-slate-800">
        <div className="flex items-center gap-3 p-6 border-b border-slate-800">
          <img src="/img/logo-removebg-preview.png" alt="Trang Hòa Logo" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <h1 className="text-lg font-black tracking-tight">Trang Hòa</h1>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Trạm: {user.station}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1.5 px-3">
            <li>
              <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/')}`}>
                <LayoutDashboard size={20} />
                <span className="font-semibold text-sm">Tổng quan</span>
              </Link>
            </li>
            <li>
              <Link to="/create" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/create')}`}>
                <PlusCircle size={20} />
                <span className="font-semibold text-sm">Tạo phiếu mới</span>
              </Link>
            </li>
            <li>
              <Link to="/orders" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/orders')}`}>
                <List size={20} />
                <span className="font-semibold text-sm">Danh sách đơn</span>
              </Link>
            </li>
             <li>
              <Link to="/reports" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/reports')}`}>
                <FileBarChart size={20} />
                <span className="font-semibold text-sm">Báo cáo & In</span>
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link to="/employees" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/employees')}`}>
                  <Users size={20} />
                  <span className="font-semibold text-sm">Nhân viên</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Promotional Image Area */}
        <div className="px-3 pb-4">
          <img src="/img/christmas.jpg" alt="Promotional" className="w-full h-40 object-cover rounded-xl shadow-md" />
        </div>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-500 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <div className="flex items-center gap-1">
                {isAdmin && <ShieldCheck size={10} className="text-blue-400" />}
                <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{user.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4 shadow-xl z-20">
           <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              <span className="font-black tracking-tight">TRANG HOA <span className="text-blue-500 ml-1">{user.station}</span></span>
           </div>
           <button onClick={onLogout} className="text-slate-400 p-2">
             <LogOut size={20} />
           </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden bg-white border-t border-slate-200 flex justify-around p-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
          <Link to="/" className={`flex flex-col items-center p-2 rounded-xl ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-400'}`}>
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-bold mt-1">Tổng quan</span>
          </Link>
          <Link to="/orders" className={`flex flex-col items-center p-2 rounded-xl ${location.pathname === '/orders' ? 'text-blue-600' : 'text-slate-400'}`}>
            <List size={20} />
            <span className="text-[10px] font-bold mt-1">Đơn hàng</span>
          </Link>
           <Link to="/create" className={`flex flex-col items-center justify-center -mt-8 h-14 w-14 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200 border-4 border-white`}>
            <PlusCircle size={28} />
          </Link>
           <Link to="/reports" className={`flex flex-col items-center p-2 rounded-xl ${location.pathname === '/reports' ? 'text-blue-600' : 'text-slate-400'}`}>
            <FileBarChart size={20} />
            <span className="text-[10px] font-bold mt-1">Báo cáo</span>
          </Link>
          {isAdmin && (
            <Link to="/employees" className={`flex flex-col items-center p-2 rounded-xl ${location.pathname === '/employees' ? 'text-blue-600' : 'text-slate-400'}`}>
              <Users size={20} />
              <span className="text-[10px] font-bold mt-1">Nhân viên</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Layout;