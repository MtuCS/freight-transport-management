import React, { useEffect, useState } from 'react';
import { Account, Role, User } from '../types';
import { getAccounts, registerEmployee, deleteEmployee } from '../services/dataService';
import { UserPlus, Shield, User as UserIcon, Loader2, Save, X, Search, Trash2 } from 'lucide-react';

interface EmployeeManagementProps {
  currentUser: User;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ currentUser }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: '', // Hiển thị ID
    role: Role.STAFF
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const data = await getAccounts();
    setAccounts(data);
    setLoading(false);
  };

  const handleDelete = async (targetUid: string, name: string) => {
    if (targetUid === currentUser.uid) {
      alert("Bạn không thể tự xóa chính mình!");
      return;
    }
    if (window.confirm(`Xóa nhân viên "${name}" khỏi hệ thống? Thao tác này sẽ xóa cả tài khoản đăng nhập.`)) {
      setIsProcessing(true);
      try {
        await deleteEmployee(targetUid);
        fetchAccounts();
      } catch (error: any) {
        alert(error.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    setIsProcessing(true);
    try {
      await registerEmployee(formData);
      setIsAdding(false);
      setFormData({ email: '', password: '', name: '', username: '', role: Role.STAFF });
      fetchAccounts();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !isAdding) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý nhân viên</h2>
          <p className="text-sm text-slate-500">Bảo mật xác thực qua Firebase Auth & Cloud Functions</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-bold"
          >
            <UserPlus size={20} />
            Cấp tài khoản mới
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">Cấp tài khoản Auth mới</h3>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email đăng nhập</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="nv-a@tranghoa.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Mật khẩu khởi tạo</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Nhập mật khẩu an toàn"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Họ và tên</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Vai trò hệ thống</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                >
                  <option value={Role.STAFF}>Nhân viên (STAFF)</option>
                  <option value={Role.MANAGER}>Quản lý (MANAGER)</option>
                  <option value={Role.ADMIN}>Quản trị viên (ADMIN)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                disabled={isProcessing}
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                disabled={isProcessing}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Tạo tài khoản Auth
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Tìm nhân viên theo tên hoặc email..."
              className="w-full outline-none bg-transparent text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Nhân viên</th>
                  <th className="px-6 py-4">Email Auth</th>
                  <th className="px-6 py-4">Phân quyền</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAccounts.map(account => (
                  <tr key={account.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {account.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{account.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">UID: {account.uid.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                      {account.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        account.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' : 
                        account.role === Role.MANAGER ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {account.role === Role.ADMIN && <Shield size={10} />}
                        {account.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <button 
                          onClick={() => handleDelete(account.uid, account.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Xóa tài khoản khỏi Auth & Firestore"
                          disabled={isProcessing}
                        >
                          <Trash2 size={18} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeManagement;