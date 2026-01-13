import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Order, PaymentStatus, Station, User } from '../types';
import { getOrders, formatCurrency, formatDate, isEditable } from '../services/dataService';
import { Search, Filter, Edit, Plus, ArrowRight, X, Loader2 } from 'lucide-react';

interface OrderListProps {
  user: User;
}

const OrderList: React.FC<OrderListProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // Simple day filter: ALL, TODAY, YESTERDAY

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = orders;

    // Filter by Search (Name, Phone, Code)
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.senderName.toLowerCase().includes(lower) || 
        o.senderPhone.includes(lower) ||
        o.code.toLowerCase().includes(lower) ||
        o.receiverName.toLowerCase().includes(lower)
      );
    }

    // Filter by Station (From or To)
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
      
      result = result.filter(o => {
        const orderTime = new Date(o.createdAt).getTime();
        if (dateFilter === 'TODAY') {
          return orderTime >= today;
        }
        if (dateFilter === 'YESTERDAY') {
          return orderTime >= today - 86400000 && orderTime < today;
        }
        return true;
      });
    }

    setFilteredOrders(result);
  }, [orders, searchTerm, stationFilter, statusFilter, dateFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStationFilter('ALL');
    setStatusFilter('ALL');
    setDateFilter('ALL');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Danh sách đơn hàng</h2>
          <p className="text-sm text-gray-500">Quản lý và tra cứu phiếu gửi</p>
        </div>
        <Link 
          to="/create" 
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Tạo phiếu mới
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo Mã, Tên, SĐT..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[120px]"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="ALL">Tất cả ngày</option>
            <option value="TODAY">Hôm nay</option>
            <option value="YESTERDAY">Hôm qua</option>
          </select>

          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[100px]"
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạm</option>
            {Object.values(Station).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[120px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả cước</option>
            <option value={PaymentStatus.PAID}>Đã thu</option>
            <option value={PaymentStatus.UNPAID}>Chưa thu</option>
          </select>
          
          <button 
            onClick={clearFilters}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Xóa bộ lọc"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {loading ? (
           <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="ml-2 text-gray-500">Đang tải danh sách...</span>
          </div>
        ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                <tr>
                  <th className="px-6 py-3">Mã</th>
                  <th className="px-6 py-3">Ngày tạo</th>
                  <th className="px-6 py-3">Tuyến</th>
                  <th className="px-6 py-3">Khách hàng</th>
                  <th className="px-6 py-3">Hàng hóa</th>
                  <th className="px-6 py-3 text-right">Cước phí</th>
                  <th className="px-6 py-3 text-center">TT Cước</th>
                  <th className="px-6 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.code}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{order.senderStation}</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="font-semibold">{order.receiverStation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.senderName}</div>
                      <div className="text-xs text-gray-500">{order.senderPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{order.goodsType}</div>
                      <div className="text-xs text-gray-500">SL: {order.quantity}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(order.cost)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.paymentStatus === PaymentStatus.PAID 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(user.role === 'ADMIN' || isEditable(order)) ? (
                        <Link to={`/edit/${order.id}`} className="text-accent hover:text-blue-700">
                          <Edit size={18} className="mx-auto" />
                        </Link>
                      ) : (
                        <span className="text-gray-300 cursor-not-allowed">
                          <Edit size={18} className="mx-auto" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Search size={40} className="text-gray-300" />
                        <p>Không tìm thấy đơn hàng nào.</p>
                        <button onClick={clearFilters} className="text-accent hover:underline text-sm">Xóa bộ lọc</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredOrders.map(order => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-900 mr-2">{order.code}</span>
                    <span className="text-xs text-gray-500">{formatDate(order.createdAt).split(',')[1]}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    order.paymentStatus === PaymentStatus.PAID 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                  }`}>{order.paymentStatus}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <span className="font-semibold">{order.senderStation}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="font-semibold">{order.receiverStation}</span>
                  <span className="text-gray-300">|</span>
                  <span>{order.goodsType} (x{order.quantity})</span>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <div>
                      <div className="text-sm font-medium">{order.senderName}</div>
                      <div className="text-xs text-gray-500">{order.senderPhone}</div>
                  </div>
                  <div className="text-right">
                      <div className="font-bold text-accent">{formatCurrency(order.cost)}</div>
                      {(user.role === 'ADMIN' || isEditable(order)) && (
                        <Link to={`/edit/${order.id}`} className="text-xs text-gray-400 hover:text-accent mt-1 block">
                          Sửa đơn
                        </Link>
                      )}
                  </div>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="p-8 text-center text-gray-500">Không tìm thấy đơn hàng.</div>
            )}
          </div>
        </>
        )}
      </div>
    </div>
  );
};

export default OrderList;