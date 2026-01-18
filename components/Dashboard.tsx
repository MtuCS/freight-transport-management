import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Order, PaymentStatus, Station, User } from '../types';
import { getOrders, formatCurrency } from '../services/dataService';
import { Package, TrendingUp, AlertCircle, Wallet, Loader2, Filter, X, ExternalLink, Calendar, MapPin } from 'lucide-react';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters - STAFF mặc định là trạm của mình
  const [dateFilter, setDateFilter] = useState<string>('TODAY');
  const [stationFilter, setStationFilter] = useState<string>(
    user.role === 'STAFF' ? user.station : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = orders;

    // Filter by Station
    if (stationFilter !== 'ALL') {
      result = result.filter(o => o.senderStation === stationFilter || o.receiverStation === stationFilter);
    }

    // Filter by Payment Status
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.paymentStatus === statusFilter);
    }

    // Filter by Date
    if (dateFilter !== 'ALL') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      
      result = result.filter(o => {
        const orderTime = new Date(o.createdAt).getTime();
        switch (dateFilter) {
          case 'TODAY':
            return orderTime >= today;
          case 'YESTERDAY':
            return orderTime >= today - 86400000 && orderTime < today;
          case 'WEEK':
            return orderTime >= today - 7 * 86400000;
          case 'MONTH':
            return orderTime >= startOfMonth;
          default:
            return true;
        }
      });
    }

    setFilteredOrders(result);
  }, [orders, stationFilter, statusFilter, dateFilter]);

  // Clear filters - reset về mặc định theo role
  const clearFilters = () => {
    setDateFilter('TODAY');
    setStationFilter(user.role === 'STAFF' ? user.station : 'ALL');
    setStatusFilter('ALL');
  };

  // Navigate to orders with filters
  const navigateToOrders = (params: { status?: string; station?: string; date?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.station) searchParams.set('station', params.station);
    if (params.date) searchParams.set('date', params.date || dateFilter);
    navigate(`/orders?${searchParams.toString()}`);
  };

  // Get filter label for display
  const getFilterLabel = () => {
    const parts: string[] = [];
    
    const dateLabels: Record<string, string> = {
      'ALL': 'Tất cả thời gian',
      'TODAY': 'Hôm nay',
      'YESTERDAY': 'Hôm qua',
      'WEEK': '7 ngày qua',
      'MONTH': 'Tháng này'
    };
    parts.push(dateLabels[dateFilter] || dateFilter);
    
    parts.push(stationFilter === 'ALL' ? 'Tất cả trạm' : `Trạm ${stationFilter}`);
    
    const statusLabels: Record<string, string> = {
      'ALL': 'Tất cả cước',
      [PaymentStatus.PAID]: 'Đã thu',
      [PaymentStatus.UNPAID]: 'Chưa thu'
    };
    parts.push(statusLabels[statusFilter] || statusFilter);
    
    return parts.join(' · ');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <span className="ml-3 text-gray-500">Đang tải dữ liệu...</span>
      </div>
    );
  }

  // Compute Stats from FILTERED orders
  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders
    .filter(o => o.paymentStatus === PaymentStatus.PAID)
    .reduce((sum, o) => sum + o.cost, 0);
  const totalUnpaid = filteredOrders
    .filter(o => o.paymentStatus === PaymentStatus.UNPAID)
    .reduce((sum, o) => sum + o.cost, 0);
  const unpaidCount = filteredOrders.filter(o => o.paymentStatus === PaymentStatus.UNPAID).length;

  // Compute Chart Data (Orders per Station) from FILTERED orders
  const stationData = [Station.HT, Station.PA, Station.SG].map(station => ({
    name: station,
    orders: filteredOrders.filter(o => o.senderStation === station).length,
    revenue: filteredOrders.filter(o => o.senderStation === station && o.paymentStatus === PaymentStatus.PAID).reduce((s, o) => s + o.cost, 0)
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tổng quan hoạt động</h2>
          {/* Active Filters Display */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Filter size={14} />
              {getFilterLabel()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X size={14} />
            Xóa bộ lọc
          </button>
          <button
            onClick={() => navigateToOrders({ date: dateFilter, station: stationFilter !== 'ALL' ? stationFilter : undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined })}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-accent rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ExternalLink size={14} />
            Xem chi tiết
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Filter size={18} />
          <span className="text-sm font-medium">Bộ lọc:</span>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          {/* Date Filter */}
          <div className="flex items-center gap-1">
            <Calendar size={16} className="text-gray-400" />
            <select 
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[130px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="TODAY">Hôm nay</option>
              <option value="YESTERDAY">Hôm qua</option>
              <option value="WEEK">7 ngày qua</option>
              <option value="MONTH">Tháng này</option>
            </select>
          </div>

          {/* Station Filter - STAFF chỉ có thể xem trạm của mình */}
          <div className="flex items-center gap-1">
            <MapPin size={16} className="text-gray-400" />
            <select 
              className={`px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[120px] focus:border-accent focus:ring-1 focus:ring-accent outline-none ${
                user.role === 'STAFF' ? 'cursor-not-allowed bg-gray-100' : ''
              }`}
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              disabled={user.role === 'STAFF'}
            >
              {user.role !== 'STAFF' && <option value="ALL">Tất cả trạm</option>}
              {user.role === 'STAFF' ? (
                <option value={user.station}>{user.station}</option>
              ) : (
                Object.values(Station).map(s => <option key={s} value={s}>{s}</option>)
              )}
            </select>
          </div>

          {/* Payment Status Filter */}
          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[120px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả cước</option>
            <option value={PaymentStatus.PAID}>Đã thu</option>
            <option value={PaymentStatus.UNPAID}>Chưa thu</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-gray-400">
          Cập nhật: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => navigateToOrders({ date: dateFilter, station: stationFilter !== 'ALL' ? stationFilter : undefined })}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="p-3 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-200 transition-colors">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng đơn hàng</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalOrders}</h3>
          </div>
          <ExternalLink size={16} className="ml-auto text-gray-300 group-hover:text-blue-500 transition-colors" />
        </div>

        <div 
          onClick={() => navigateToOrders({ status: PaymentStatus.PAID, date: dateFilter, station: stationFilter !== 'ALL' ? stationFilter : undefined })}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
        >
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 group-hover:bg-emerald-200 transition-colors">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Doanh thu thực thu</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</h3>
          </div>
          <ExternalLink size={16} className="ml-auto text-gray-300 group-hover:text-emerald-500 transition-colors" />
        </div>

        <div 
          onClick={() => navigateToOrders({ status: PaymentStatus.UNPAID, date: dateFilter, station: stationFilter !== 'ALL' ? stationFilter : undefined })}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
        >
          <div className="p-3 bg-red-100 rounded-full text-red-600 group-hover:bg-red-200 transition-colors">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Cước chưa thu ({unpaidCount})</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(totalUnpaid)}</h3>
          </div>
          <ExternalLink size={16} className="ml-auto text-gray-300 group-hover:text-red-500 transition-colors" />
        </div>
        
        <div 
          onClick={() => navigateToOrders({ date: dateFilter, station: stationFilter !== 'ALL' ? stationFilter : undefined })}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-purple-200 transition-all group"
        >
          <div className="p-3 bg-purple-100 rounded-full text-purple-600 group-hover:bg-purple-200 transition-colors">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng giá trị vận chuyển</p>
            <h3 className="text-lg font-bold text-gray-800">{formatCurrency(totalRevenue + totalUnpaid)}</h3>
          </div>
          <ExternalLink size={16} className="ml-auto text-gray-300 group-hover:text-purple-500 transition-colors" />
        </div>
      </div>

      {/* Charts Section - Only show for ADMIN/MANAGER or show simplified for STAFF */}
      {user.role !== 'STAFF' ? (
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
                  <Bar 
                    dataKey="orders" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => navigateToOrders({ station: data.name, date: dateFilter })}
                    className="cursor-pointer"
                  >
                    {stationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Click vào cột để xem chi tiết đơn hàng của trạm</p>
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
                  <Bar 
                    dataKey="revenue" 
                    fill="#10b981" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                    onClick={(data) => navigateToOrders({ station: data.name, status: PaymentStatus.PAID, date: dateFilter })}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Click vào thanh để xem đơn đã thu của trạm</p>
          </div>
        </div>
      ) : (
        /* STAFF: Hiển thị đơn giản hơn - focus vào đơn chưa thu và đơn mới */
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Trạm {user.station} - Tình hình hôm nay
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
              <div className="text-sm text-gray-500">Tổng đơn</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {filteredOrders.filter(o => o.paymentStatus === PaymentStatus.PAID).length}
              </div>
              <div className="text-sm text-gray-500">Đã thu</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{unpaidCount}</div>
              <div className="text-sm text-gray-500">Chưa thu</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Actions for Unpaid Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">
            Đơn hàng chưa thu cước {dateFilter === 'TODAY' ? 'hôm nay' : dateFilter === 'YESTERDAY' ? 'hôm qua' : ''}
          </h3>
          {unpaidCount > 5 && (
            <button 
              onClick={() => navigateToOrders({ status: PaymentStatus.UNPAID, date: dateFilter, station: stationFilter !== 'ALL' ? stationFilter : undefined })}
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              Xem tất cả ({unpaidCount})
              <ExternalLink size={14} />
            </button>
          )}
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
              {filteredOrders
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
              {filteredOrders.filter(o => o.paymentStatus === PaymentStatus.UNPAID).length === 0 && (
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