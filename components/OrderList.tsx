import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Order, PaymentStatus, Station, User } from '../types';
import { getOrders, formatCurrency, formatDate, isEditable } from '../services/dataService';
import { Search, Filter, Edit, Plus, ArrowRight, X, Loader2 } from 'lucide-react';

interface OrderListProps {
  user: User;
}

const OrderList: React.FC<OrderListProps> = ({ user }) => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters - Initialize from URL params if available
  const [searchTerm, setSearchTerm] = useState('');
  const [senderStationFilter, setSenderStationFilter] = useState<string>(searchParams.get('senderStation') || searchParams.get('station') || 'ALL');
  const [receiverStationFilter, setReceiverStationFilter] = useState<string>(searchParams.get('receiverStation') || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [dateFilter, setDateFilter] = useState<string>(searchParams.get('date') || 'ALL');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Update filters when URL params change
  useEffect(() => {
    const senderStation = searchParams.get('senderStation') || searchParams.get('station');
    const receiverStation = searchParams.get('receiverStation');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    
    if (senderStation) setSenderStationFilter(senderStation);
    if (receiverStation) setReceiverStationFilter(receiverStation);
    if (status) setStatusFilter(status);
    if (date) setDateFilter(date);
  }, [searchParams]);

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

    // Filter by Sender Station
    if (senderStationFilter !== 'ALL') {
      result = result.filter(o => o.senderStation === senderStationFilter);
    }

    // Filter by Receiver Station
    if (receiverStationFilter !== 'ALL') {
      result = result.filter(o => o.receiverStation === receiverStationFilter);
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
        
        // Kiểm tra nếu là ngày cụ thể (format YYYY-MM-DD)
        if (dateFilter.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return o.createdAt.startsWith(dateFilter);
        }
        
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
  }, [orders, searchTerm, senderStationFilter, receiverStationFilter, statusFilter, dateFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setSenderStationFilter('ALL');
    setReceiverStationFilter('ALL');
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
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[120px]"
            value={dateFilter.match(/^\d{4}-\d{2}-\d{2}$/) ? 'CUSTOM' : dateFilter}
            onChange={(e) => {
              if (e.target.value !== 'CUSTOM') {
                setDateFilter(e.target.value);
              }
            }}
          >
            <option value="ALL">Tất cả ngày</option>
            <option value="TODAY">Hôm nay</option>
            <option value="YESTERDAY">Hôm qua</option>
            <option value="WEEK">7 ngày qua</option>
            <option value="MONTH">Tháng này</option>
            <option value="CUSTOM" disabled>Chọn ngày...</option>
          </select>
          
          <input 
            type="date" 
            value={dateFilter.match(/^\d{4}-\d{2}-\d{2}$/) ? dateFilter : ''}
            onChange={(e) => setDateFilter(e.target.value || 'ALL')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 w-[140px]"
            title="Chọn ngày cụ thể"
          />

          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[110px]"
            value={senderStationFilter}
            onChange={(e) => setSenderStationFilter(e.target.value)}
          >
            <option value="ALL">Trạm gửi</option>
            {Object.values(Station).map(s => <option key={s} value={s}>Gửi: {s}</option>)}
          </select>

          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-w-[110px]"
            value={receiverStationFilter}
            onChange={(e) => setReceiverStationFilter(e.target.value)}
          >
            <option value="ALL">Trạm nhận</option>
            {Object.values(Station).map(s => <option key={s} value={s}>Nhận: {s}</option>)}
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
                  <th className="px-6 py-3">Người nhận</th>
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
                      <div className="font-medium text-gray-900">{order.receiverName}</div>
                      <div className="text-xs text-gray-500">{order.receiverPhone}</div>
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