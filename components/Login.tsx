import React, { useState } from 'react';
import { User, Station, Account } from '../types';
import { Truck, Lock, Mail, MapPin, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { login } from '../services/dataService';
import { getAccountByUid } from '../services/dataService';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'AUTH' | 'STATION'>('AUTH');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempAccount, setTempAccount] = useState<Account | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station>(Station.HT);

  // const handleAuthSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError('');
  //   setLoading(true);

  //   try {
  //     // Firebase Auth yêu cầu email. Nếu dùng username cũ, ta có thể giả định domain @tranghoa.com
  //     const emailToAuth = email.includes('@') ? email : `${email}@tranghoa.com`;
  //     const account = await login(emailToAuth, password);
  //     if (account) {
  //       setTempAccount(account);
  //       setStep('STATION');
  //     } else {
  //       setError('Không tìm thấy thông tin phân quyền cho tài khoản này.');
  //     }
  //   } catch (err: any) {
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleAuthSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    // 1) Chuẩn hóa email (nếu mày muốn cho nhập "admin" thì auto thêm domain)
    const emailToAuth = email.includes('@') ? email : `${email}@tranghoa.com`;

    // 2) Login Firebase Auth
    const cred = await signInWithEmailAndPassword(auth, emailToAuth, password);
    const uid = cred.user.uid;

    // 3) Lấy account/role từ Firestore: accounts/{uid}
    const account = await getAccountByUid(uid);

    if (!account) {
      setError('Tài khoản đã đăng nhập nhưng chưa được cấp quyền (không có accounts/{uid}).');
      return;
    }

    // 4) Nếu là STAFF và có station được gán → đăng nhập trực tiếp
    if (account.role === 'STAFF' && account.station) {
      onLogin({
        ...account,
        station: account.station
      });
      return;
    }

    // 5) ADMIN/MANAGER → chọn trạm làm việc
    setTempAccount(account);
    setStep('STATION');
  } catch (err: any) {
    // Firebase error code ví dụ: auth/user-not-found, auth/wrong-password
    setError(`Lỗi đăng nhập: ${err?.code || err?.message || 'unknown'}`);
  } finally {
    setLoading(false);
  }
};


  const handleStationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempAccount) {
      onLogin({
        ...tempAccount,
        station: selectedStation
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans" style={{
      backgroundImage: 'url(/img/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 transition-all">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <Truck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">TRANG HÒA LIMOUSINE</h1>
          <p className="text-slate-500 text-sm mt-1">Hệ thống quản lý hàng hóa bảo mật</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2 animate-shake">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === 'AUTH' ? (
          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email hoặc ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all"
                  placeholder="admin@tranghoa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all mt-4 shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Tiếp theo
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStationSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-slate-500 text-sm">Xác nhận danh tính,</p>
              <h2 className="text-xl font-bold text-blue-700">{tempAccount?.name}</h2>
              <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                Quyền: {tempAccount?.role}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 text-center">Chọn trạm làm việc</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.values(Station).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStation(s)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      selectedStation === s 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' 
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin size={24} className={selectedStation === s ? 'text-blue-500' : 'text-slate-300'} />
                    <span className="mt-2 font-bold text-lg">{s}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setStep('AUTH')}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Quay lại
              </button>
              <button 
                type="submit" 
                className="flex-[2] bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-100"
              >
                Vào hệ thống
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;