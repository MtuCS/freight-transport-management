import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import Login from './components/Login';
import Reports from './components/Reports';
import EmployeeManagement from './components/EmployeeManagement';
import { User, Role, Station } from './types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { getAccountProfile } from './services/dataService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Security: Luôn verify với Firebase Auth, không tin hoàn toàn localStorage
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User đã login Firebase Auth, verify role từ Firestore
        const account = await getAccountProfile(firebaseUser.uid);
        if (account) {
          // Lấy station đã chọn từ localStorage (chỉ station, không lấy role)
          const storedUser = localStorage.getItem('vantai_user');
          const station = storedUser 
            ? (JSON.parse(storedUser).station as Station) || Station.HT 
            : Station.HT;
          setUser({ ...account, station });
        } else {
          // Có Auth nhưng không có profile → logout
          setUser(null);
          localStorage.removeItem('vantai_user');
        }
      } else {
        // Không có Firebase Auth session
        setUser(null);
        localStorage.removeItem('vantai_user');
      }
      setIsVerifying(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('vantai_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vantai_user');
  };

  // Hiển thị loading khi đang verify auth state
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<OrderForm user={user} />} />
          <Route path="/edit/:id" element={<OrderForm user={user} />} />
          <Route path="/orders" element={<OrderList user={user} />} />
          <Route path="/reports" element={<Reports />} />
          {user.role === Role.ADMIN && (
            <Route path="/employees" element={<EmployeeManagement currentUser={user} />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;