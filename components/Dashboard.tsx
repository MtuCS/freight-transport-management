import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Order, PaymentStatus, Station } from '../types';
import { getOrders, formatCurrency } from '../services/dataService';
import { Package, TrendingUp, AlertCircle, Wallet, Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <span className="ml-3 text-gray-500">Đang tải dữ liệu...</span>
      </div>
    );
  }

  // Compute Stats
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(o => o.paymentStatus === PaymentStatus.PAID)
    .reduce((sum, o) => sum + o.cost, 0);
  const totalUnpaid = orders
    .filter(o => o.paymentStatus === PaymentStatus.UNPAID)
    .reduce((sum, o) => sum + o.cost, 0);

  // Compute Chart Data (Orders per Station)
  const stationData = [Station.HT, Station.PA, Station.SG].map(station => ({
    name: station,
    orders: orders.filter(o => o.senderStation === station).length,
    revenue: orders.filter(o => o.senderStation === station && o.paymentStatus === PaymentStatus.PAID).reduce((s, o) => s + o.cost, 0)
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Tổng quan hoạt động</h2>
        <span className="text-sm text-gray-500">Cập nhật: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng đơn hàng</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Doanh thu thực thu</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Cước chưa thu</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(totalUnpaid)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng giá trị vận chuyển</p>
            <h3 className="text-lg font-bold text-gray-800">{formatCurrency(totalRevenue + totalUnpaid)}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Số lượng đơn theo trạm gửi</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {stationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-800 mb-4">Doanh thu thực tế theo trạm</h3>
           <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={40} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Quick Actions for Unpaid Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
           <h3 className="text-lg font-bold text-gray-800">Đơn hàng chưa thu cước gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Mã đơn</th>
                <th className="px-6 py-3">Ngày gửi</th>
                <th className="px-6 py-3">Gửi - Nhận</th>
                <th className="px-6 py-3">Người nhận</th>
                <th className="px-6 py-3 text-right">Cước phí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders
                .filter(o => o.paymentStatus === PaymentStatus.UNPAID)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{order.code}</td>
                  <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {order.senderStation}
                    </span>
                    →
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 ml-2">
                      {order.receiverStation}
                    </span>
                  </td>
                  <td className="px-6 py-4">{order.receiverName} <br/><span className="text-xs text-gray-500">{order.receiverPhone}</span></td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">{formatCurrency(order.cost)}</td>
                </tr>
              ))}
              {orders.filter(o => o.paymentStatus === PaymentStatus.UNPAID).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Tuyệt vời! Không có đơn hàng nào chưa thu cước.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;