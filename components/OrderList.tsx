import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Order, PaymentStatus, DeliveryStatus, Station, User } from '../types';
import { getOrders, saveOrder, formatCurrency, formatDate, isEditable } from '../services/dataService';
import { Search, Filter, Edit, Plus, ArrowRight, Package, PackageCheck, Loader2, ChevronDown, ChevronRight, CheckCircle2, Phone, MapPin, Banknote, Truck, Download, FileSpreadsheet } from 'lucide-react';

interface OrderListProps {
  user: User;
}

// Tab types
type TabType = 'INBOUND' | 'OUTBOUND' | 'ALL';

// Interface cho nhóm phơi (dùng cho tab PHƠI ĐẾN)
interface PhoiGroup {
  key: string; // senderStation_date
  senderStation: Station;
  receiverStation: Station;
  date: string; // YYYY-MM-DD
  displayDate: string; // DD/MM
  orders: Order[];
  totalOrders: number;
  totalQuantity: number;
  unpaidCount: number;
  totalCost: number;
  unpaidCost: number;
}

// Helper: Lấy ngày từ ISO string (YYYY-MM-DD)
const getDateString = (isoString: string): string => {
  return isoString.split('T')[0];
};

// Helper: Format ngày hiển thị (DD/MM)
const formatDisplayDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
};

// Helper: Lấy ngày hôm nay theo format YYYY-MM-DD
const getTodayString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Helper: Lấy ngày hôm qua theo format YYYY-MM-DD
const getYesterdayString = (): string => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toISOString().split('T')[0];
};

const OrderList: React.FC<OrderListProps> = ({ user }) => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  
  // Tab hiện tại - mặc định PHƠI ĐẾN cho workflow sáng
  const [activeTab, setActiveTab] = useState<TabType>('INBOUND');
  
  // Expanded phơi groups (cho tab PHƠI ĐẾN)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ===== FILTERS CHO TAB PHƠI ĐẾN (INBOUND) =====
  const [inboundDateFilter, setInboundDateFilter] = useState<string>(getYesterdayString()); // Mặc định hôm qua
  const [inboundSenderFilter, setInboundSenderFilter] = useState<string>('ALL');
  const [inboundStatusFilter, setInboundStatusFilter] = useState<string>('ALL');
  const [inboundSearchTerm, setInboundSearchTerm] = useState('');

  // ===== FILTERS CHO TAB PHƠI ĐI (OUTBOUND) =====
  const [outboundDateFilter, setOutboundDateFilter] = useState<string>('TODAY');
  const [outboundReceiverFilter, setOutboundReceiverFilter] = useState<string>('ALL');
  const [outboundStatusFilter, setOutboundStatusFilter] = useState<string>('ALL');
  const [outboundSearchTerm, setOutboundSearchTerm] = useState('');

  // ===== FILTERS CHO TAB TẤT CẢ ĐƠN (ADMIN) =====
  const [allDateFilter, setAllDateFilter] = useState<string>('ALL');
  const [allDateFrom, setAllDateFrom] = useState<string>(''); // Date range: từ ngày
  const [allDateTo, setAllDateTo] = useState<string>(''); // Date range: đến ngày
  const [allSenderStationFilter, setAllSenderStationFilter] = useState<string>('ALL');
  const [allReceiverStationFilter, setAllReceiverStationFilter] = useState<string>('ALL');
  const [allStatusFilter, setAllStatusFilter] = useState<string>('ALL');
  const [allSearchTerm, setAllSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Update filters từ URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'outbound') setActiveTab('OUTBOUND');
    else if (tab === 'inbound') setActiveTab('INBOUND');
  }, [searchParams]);

  // ===== LOGIC LỌC CHO TAB PHƠI ĐẾN =====
  const inboundOrders = useMemo(() => {
    // Điều kiện cốt lõi: Trạm nhận = Trạm user đang đăng nhập
    let result = orders.filter(o => o.receiverStation === user.station);

    // Lọc theo ngày phơi (ngày tạo đơn ở trạm gửi)
    if (inboundDateFilter && inboundDateFilter !== 'ALL') {
      result = result.filter(o => getDateString(o.createdAt) === inboundDateFilter);
    }

    // Lọc theo trạm gửi
    if (inboundSenderFilter !== 'ALL') {
      result = result.filter(o => o.senderStation === inboundSenderFilter);
    }

    // Lọc theo trạng thái cước
    if (inboundStatusFilter !== 'ALL') {
      result = result.filter(o => o.paymentStatus === inboundStatusFilter);
    }

    // Tìm kiếm theo SĐT người nhận
    if (inboundSearchTerm) {
      const lower = inboundSearchTerm.toLowerCase();
      result = result.filter(o => 
        o.receiverPhone.includes(lower) ||
        o.receiverName.toLowerCase().includes(lower) ||
        o.code.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [orders, user.station, inboundDateFilter, inboundSenderFilter, inboundStatusFilter, inboundSearchTerm]);

  // Nhóm đơn hàng thành các phơi (cho tab PHƠI ĐẾN)
  const phoiGroups = useMemo((): PhoiGroup[] => {
    const groupMap = new Map<string, PhoiGroup>();

    inboundOrders.forEach(order => {
      const dateStr = getDateString(order.createdAt);
      const key = `${order.senderStation}_${dateStr}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          senderStation: order.senderStation,
          receiverStation: order.receiverStation,
          date: dateStr,
          displayDate: formatDisplayDate(dateStr),
          orders: [],
          totalOrders: 0,
          totalQuantity: 0,
          unpaidCount: 0,
          totalCost: 0,
          unpaidCost: 0
        });
      }

      const group = groupMap.get(key)!;
      group.orders.push(order);
      group.totalOrders++;
      group.totalQuantity += order.quantity;
      group.totalCost += order.cost;
      if (order.paymentStatus === PaymentStatus.UNPAID) {
        group.unpaidCount++;
        group.unpaidCost += order.cost;
      }
    });

    // Sort theo ngày mới nhất
    return Array.from(groupMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [inboundOrders]);

  // ===== LOGIC LỌC CHO TAB PHƠI ĐI =====
  const outboundOrders = useMemo(() => {
    // Điều kiện cốt lõi: Trạm gửi = Trạm user đang đăng nhập
    let result = orders.filter(o => o.senderStation === user.station);

    // Lọc theo ngày
    const now = new Date();
    const today = getTodayString();
    const yesterday = getYesterdayString();

    if (outboundDateFilter === 'TODAY') {
      result = result.filter(o => getDateString(o.createdAt) === today);
    } else if (outboundDateFilter === 'YESTERDAY') {
      result = result.filter(o => getDateString(o.createdAt) === yesterday);
    } else if (outboundDateFilter.match(/^\d{4}-\d{2}-\d{2}$/)) {
      result = result.filter(o => getDateString(o.createdAt) === outboundDateFilter);
    }

    // Lọc theo trạm nhận
    if (outboundReceiverFilter !== 'ALL') {
      result = result.filter(o => o.receiverStation === outboundReceiverFilter);
    }

    // Lọc theo trạng thái cước
    if (outboundStatusFilter !== 'ALL') {
      result = result.filter(o => o.paymentStatus === outboundStatusFilter);
    }

    // Tìm kiếm
    if (outboundSearchTerm) {
      const lower = outboundSearchTerm.toLowerCase();
      result = result.filter(o => 
        o.code.toLowerCase().includes(lower) ||
        o.senderPhone.includes(lower) ||
        o.senderName.toLowerCase().includes(lower) ||
        o.receiverName.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [orders, user.station, outboundDateFilter, outboundReceiverFilter, outboundStatusFilter, outboundSearchTerm]);

  // ===== LOGIC LỌC CHO TAB TẤT CẢ ĐƠN (ADMIN) =====
  const allOrders = useMemo(() => {
    let result = [...orders];

    // Lọc theo khoảng ngày (ưu tiên nếu có)
    if (allDateFrom || allDateTo) {
      result = result.filter(o => {
        const orderDate = getDateString(o.createdAt);
        if (allDateFrom && allDateTo) {
          return orderDate >= allDateFrom && orderDate <= allDateTo;
        } else if (allDateFrom) {
          return orderDate >= allDateFrom;
        } else if (allDateTo) {
          return orderDate <= allDateTo;
        }
        return true;
      });
    } else if (allDateFilter !== 'ALL') {
      // Lọc theo preset nếu không có date range
      const now = new Date();
      const today = getTodayString();
      const yesterday = getYesterdayString();

      if (allDateFilter === 'TODAY') {
        result = result.filter(o => getDateString(o.createdAt) === today);
      } else if (allDateFilter === 'YESTERDAY') {
        result = result.filter(o => getDateString(o.createdAt) === yesterday);
      } else if (allDateFilter === 'WEEK') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        result = result.filter(o => new Date(o.createdAt) >= weekAgo);
      } else if (allDateFilter === 'MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter(o => new Date(o.createdAt) >= startOfMonth);
      } else if (allDateFilter.match(/^\d{4}-\d{2}-\d{2}$/)) {
        result = result.filter(o => getDateString(o.createdAt) === allDateFilter);
      }
    }

    // Lọc theo trạm gửi
    if (allSenderStationFilter !== 'ALL') {
      result = result.filter(o => o.senderStation === allSenderStationFilter);
    }

    // Lọc theo trạm nhận
    if (allReceiverStationFilter !== 'ALL') {
      result = result.filter(o => o.receiverStation === allReceiverStationFilter);
    }

    // Lọc theo trạng thái cước
    if (allStatusFilter !== 'ALL') {
      result = result.filter(o => o.paymentStatus === allStatusFilter);
    }

    // Tìm kiếm
    if (allSearchTerm) {
      const lower = allSearchTerm.toLowerCase();
      result = result.filter(o => 
        o.code.toLowerCase().includes(lower) ||
        o.senderPhone.includes(lower) ||
        o.senderName.toLowerCase().includes(lower) ||
        o.receiverName.toLowerCase().includes(lower) ||
        o.receiverPhone.includes(lower)
      );
    }

    return result;
  }, [orders, allDateFilter, allDateFrom, allDateTo, allSenderStationFilter, allReceiverStationFilter, allStatusFilter, allSearchTerm]);

  // Thống kê cho tab TẤT CẢ ĐƠN
  const allStats = useMemo(() => {
    return {
      totalOrders: allOrders.length,
      totalQuantity: allOrders.reduce((sum, o) => sum + o.quantity, 0),
      totalCost: allOrders.reduce((sum, o) => sum + o.cost, 0),
      unpaidCount: allOrders.filter(o => o.paymentStatus === PaymentStatus.UNPAID).length,
      paidCount: allOrders.filter(o => o.paymentStatus === PaymentStatus.PAID).length
    };
  }, [allOrders]);

  // Thống kê cho tab PHƠI ĐI
  const outboundStats = useMemo(() => {
    return {
      totalOrders: outboundOrders.length,
      totalQuantity: outboundOrders.reduce((sum, o) => sum + o.quantity, 0),
      totalCost: outboundOrders.reduce((sum, o) => sum + o.cost, 0),
      unpaidCount: outboundOrders.filter(o => o.paymentStatus === PaymentStatus.UNPAID).length,
      paidCount: outboundOrders.filter(o => o.paymentStatus === PaymentStatus.PAID).length
    };
  }, [outboundOrders]);

  // Toggle expand phơi group
  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Hàm đánh dấu đã thu cước (1 click) - đồng thời ghi nhận đã giao
  const handleMarkPaid = async (order: Order) => {
    if (order.paymentStatus === PaymentStatus.PAID) return;
    
    setSavingOrderId(order.id);
    const now = new Date().toISOString();
    
    const updatedOrder: Order = {
      ...order,
      paymentStatus: PaymentStatus.PAID,
      deliveryStatus: DeliveryStatus.DELIVERED, // Tự động đánh dấu đã giao
      paymentHistory: [
        ...(order.paymentHistory || []),
        {
          date: now,
          status: PaymentStatus.PAID,
          changedBy: user.name,
          changedById: user.uid,
          note: 'Thu cước & Giao hàng từ danh sách phơi đến'
        }
      ],
      history: [
        ...(order.history || []),
        {
          date: now,
          action: 'Thu cước & Giao hàng',
          user: user.name
        }
      ]
    };

    try {
      await saveOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    } catch (error) {
      alert('Lỗi khi cập nhật!');
    }
    setSavingOrderId(null);
  };

  // Hàm đánh dấu đã giao (cho đơn đã thu cước)
  const handleMarkDelivered = async (order: Order) => {
    if (order.deliveryStatus === DeliveryStatus.DELIVERED) return;
    
    setSavingOrderId(order.id);
    const now = new Date().toISOString();
    
    const updatedOrder: Order = {
      ...order,
      deliveryStatus: DeliveryStatus.DELIVERED,
      history: [
        ...(order.history || []),
        {
          date: now,
          action: 'Đã giao hàng',
          user: user.name
        }
      ]
    };

    try {
      await saveOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    } catch (error) {
      alert('Lỗi khi cập nhật trạng thái giao hàng!');
    }
    setSavingOrderId(null);
  };

  // Clear filters
  const clearInboundFilters = () => {
    setInboundDateFilter(getYesterdayString());
    setInboundSenderFilter('ALL');
    setInboundStatusFilter('ALL');
    setInboundSearchTerm('');
  };

  const clearOutboundFilters = () => {
    setOutboundDateFilter('TODAY');
    setOutboundReceiverFilter('ALL');
    setOutboundStatusFilter('ALL');
    setOutboundSearchTerm('');
  };

  const clearAllFilters = () => {
    setAllDateFilter('ALL');
    setAllDateFrom('');
    setAllDateTo('');
    setAllSenderStationFilter('ALL');
    setAllReceiverStationFilter('ALL');
    setAllStatusFilter('ALL');
    setAllSearchTerm('');
  };

  // Hàm xuất CSV
  const exportToCSV = () => {
    const headers = [
      'Mã đơn',
      'Ngày tạo',
      'Trạm gửi',
      'Trạm nhận',
      'Người gửi',
      'SĐT người gửi',
      'Người nhận',
      'SĐT người nhận',
      'Địa chỉ nhận',
      'Loại hàng',
      'Số lượng',
      'Cước phí',
      'Trạng thái cước',
      'Trạng thái giao',
      'Người tạo',
      'Ghi chú'
    ];

    const csvData = allOrders.map(order => [
      order.code,
      formatDate(order.createdAt),
      order.senderStation,
      order.receiverStation,
      order.senderName,
      order.senderPhone,
      order.receiverName,
      order.receiverPhone,
      order.receiverAddress || '',
      order.goodsType,
      order.quantity,
      order.cost,
      order.paymentStatus,
      order.deliveryStatus || 'Chờ giao',
      order.createdBy,
      order.note || ''
    ]);

    // Tạo nội dung CSV với BOM để Excel đọc được tiếng Việt
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...csvData.map(row => 
        row.map(cell => {
          // Escape các ký tự đặc biệt trong CSV
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Tạo và download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Tên file với ngày xuất
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    const fileName = `danh-sach-don-hang_${dateStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lấy danh sách trạm gửi khả dụng (không bao gồm trạm hiện tại)
  const availableSenderStations = Object.values(Station).filter(s => s !== user.station);
  const availableReceiverStations = Object.values(Station).filter(s => s !== user.station);

  return (
    <div className="space-y-4">
      {/* ===== TAB SWITCHER ===== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-0.5 flex text-sm">
        <button
          onClick={() => setActiveTab('INBOUND')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md font-medium transition-all ${
            activeTab === 'INBOUND'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Package size={16} />
          <span>Phơi đến</span>
        </button>
        <button
          onClick={() => setActiveTab('OUTBOUND')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md font-medium transition-all ${
            activeTab === 'OUTBOUND'
              ? 'bg-green-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PackageCheck size={16} />
          <span>Phơi đi</span>
        </button>
        
        {/* Tab TẤT CẢ - Chỉ hiển thị cho ADMIN */}
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md font-medium transition-all ${
              activeTab === 'ALL'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Tất cả</span>
          </button>
        )}
      </div>

      {/* ===== TAB PHƠI ĐẾN (INBOUND) ===== */}
      {activeTab === 'INBOUND' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="text-blue-600" size={24} />
                Phơi đến trạm {user.station}
              </h2>
              <p className="text-sm text-gray-500">Hàng từ trạm khác gửi sang - Giao hàng & Thu cước</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm SĐT người nhận, tên, mã đơn..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={inboundSearchTerm}
                onChange={(e) => setInboundSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto flex-wrap items-center">
              <input 
                type="date" 
                value={inboundDateFilter !== 'ALL' ? inboundDateFilter : ''}
                onChange={(e) => setInboundDateFilter(e.target.value || 'ALL')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                title="Chọn ngày phơi"
              />

              <select 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                value={inboundSenderFilter}
                onChange={(e) => setInboundSenderFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạm gửi</option>
                {availableSenderStations.map(s => <option key={s} value={s}>Từ: {s}</option>)}
              </select>

              <select 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                value={inboundStatusFilter}
                onChange={(e) => setInboundStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả cước</option>
                <option value={PaymentStatus.UNPAID}>⚠️ Chưa thu</option>
                <option value={PaymentStatus.PAID}>✅ Đã thu</option>
              </select>
              
              <button 
                onClick={clearInboundFilters}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa bộ lọc"
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Inbound Stats Summary */}
          {!loading && inboundOrders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-bold text-gray-900">{inboundOrders.length}</div>
                <div className="text-xs text-gray-500">Tổng đơn</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-bold text-gray-900">{inboundOrders.reduce((sum, o) => sum + o.quantity, 0)}</div>
                <div className="text-xs text-gray-500">Tổng kiện</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-bold text-green-600">{inboundOrders.filter(o => o.paymentStatus === PaymentStatus.PAID).length}</div>
                <div className="text-xs text-gray-500">Đã thu cước</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-bold text-red-600">{inboundOrders.filter(o => o.paymentStatus === PaymentStatus.UNPAID).length}</div>
                <div className="text-xs text-gray-500">Chưa thu cước</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-bold text-purple-600">{inboundOrders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED).length}</div>
                <div className="text-xs text-gray-500">Đã giao</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center col-span-2 md:col-span-1">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(inboundOrders.reduce((sum, o) => sum + o.cost, 0))}</div>
                <div className="text-xs text-gray-500">Tổng cước</div>
              </div>
            </div>
          )}

          {/* Inbound Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-500">Đang tải danh sách...</span>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                      <tr>
                        <th className="px-4 py-3">Mã</th>
                        <th className="px-4 py-3">Ngày tạo</th>
                        <th className="px-4 py-3">Tuyến</th>
                        <th className="px-4 py-3">Người nhận</th>
                        <th className="px-4 py-3">Hàng hóa</th>
                        <th className="px-4 py-3 text-right">Cước phí</th>
                        <th className="px-4 py-3 text-center">TT Cước</th>
                        <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {inboundOrders.map(order => {
                        const isPaid = order.paymentStatus === PaymentStatus.PAID;
                        const isDelivered = order.deliveryStatus === DeliveryStatus.DELIVERED;
                        const isSaving = savingOrderId === order.id;

                        return (
                          <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${
                            !isPaid ? 'bg-red-50/30' : ''
                          } ${isDelivered ? 'bg-green-50/20' : ''}`}>
                            <td className="px-4 py-3 font-medium">
                              <Link to={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-700 hover:underline">
                                {order.code}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold">
                                <span className="text-blue-600">{order.senderStation}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600">{order.receiverStation}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{order.receiverName}</div>
                              <div className="text-xs text-gray-500">
                                <a href={`tel:${order.receiverPhone}`} className="hover:text-blue-600">
                                  {order.receiverPhone}
                                </a>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900">{order.goodsType}</div>
                              <div className="text-xs text-gray-500">SL: {order.quantity}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(order.cost)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {order.paymentStatus}
                                </span>
                                {isDelivered && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Đã giao
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Logic hiển thị nút theo trạng thái */}
                                {!isPaid ? (
                                  // Chưa thu cước → Nút "Thu cước" (sẽ tự động đánh dấu đã giao)
                                  <button
                                    onClick={() => handleMarkPaid(order)}
                                    disabled={isSaving}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                                    title="Thu cước & Giao hàng"
                                  >
                                    {isSaving ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Banknote size={14} />
                                    )}
                                    Thu cước
                                  </button>
                                ) : !isDelivered ? (
                                  // Đã thu cước nhưng chưa giao → Nút "Đã giao"
                                  <button
                                    onClick={() => handleMarkDelivered(order)}
                                    disabled={isSaving}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
                                    title="Đánh dấu đã giao"
                                  >
                                    {isSaving ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Truck size={14} />
                                    )}
                                    Đã giao
                                  </button>
                                ) : (
                                  // Đã hoàn tất (thu cước + giao hàng)
                                  <span className="flex items-center gap-1 text-green-600 text-xs px-2 py-1">
                                    <CheckCircle2 size={16} />
                                    <span className="font-medium">Hoàn tất</span>
                                  </span>
                                )}
                                
                                <Link 
                                  to={`/orders/${order.id}`} 
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Xem chi tiết"
                                >
                                  <Edit size={14} />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {inboundOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-3">
                              <Package size={40} className="text-gray-300" />
                              <p>Không có đơn hàng nào cho ngày này.</p>
                              <button onClick={clearInboundFilters} className="text-blue-600 hover:underline text-sm">
                                Xóa bộ lọc
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden divide-y divide-gray-100">
                  {inboundOrders.map(order => {
                    const isPaid = order.paymentStatus === PaymentStatus.PAID;
                    const isDelivered = order.deliveryStatus === DeliveryStatus.DELIVERED;
                    const isSaving = savingOrderId === order.id;

                    return (
                      <div key={order.id} className={`p-4 hover:bg-gray-50 ${
                        !isPaid ? 'bg-red-50/30' : ''
                      } ${isDelivered ? 'bg-green-50/20' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Link to={`/orders/${order.id}`} className="font-bold text-blue-600 hover:underline mr-2">
                              {order.code}
                            </Link>
                            <span className="text-xs text-gray-500">{formatDate(order.createdAt).split(',')[1]}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>{order.paymentStatus}</span>
                            {isDelivered && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                Đã giao
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                          <span className="font-semibold text-blue-600">{order.senderStation}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-semibold text-green-600">{order.receiverStation}</span>
                          <span className="text-gray-300">|</span>
                          <span>{order.goodsType} (x{order.quantity})</span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3">
                          <div>
                            <div className="text-sm font-medium">{order.receiverName}</div>
                            <a href={`tel:${order.receiverPhone}`} className="text-xs text-gray-500 hover:text-blue-600">
                              {order.receiverPhone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-bold text-blue-600">{formatCurrency(order.cost)}</div>
                            </div>
                            
                            {/* Nút thao tác mobile */}
                            {!isPaid ? (
                              <button
                                onClick={() => handleMarkPaid(order)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-medium"
                              >
                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Banknote size={12} />}
                                Thu cước
                              </button>
                            ) : !isDelivered ? (
                              <button
                                onClick={() => handleMarkDelivered(order)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 font-medium"
                              >
                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                                Đã giao
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600 text-xs">
                                <CheckCircle2 size={14} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {inboundOrders.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <p>Không có đơn hàng nào.</p>
                      <button onClick={clearInboundFilters} className="text-blue-600 hover:underline text-sm mt-2">
                        Xóa bộ lọc
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB PHƠI ĐI (OUTBOUND) ===== */}
      {activeTab === 'OUTBOUND' && (
        <div className="space-y-4">
          {/* Header với nút tạo phiếu nổi bật */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <PackageCheck className="text-green-600" size={24} />
                Phơi đi từ trạm {user.station}
              </h2>
              <p className="text-sm text-gray-500">Hàng nhận trong ngày - Chuẩn bị chốt phơi</p>
            </div>
            <Link 
                to="/create" 
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus size={14} />
                Tạo phiếu mới
              </Link>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-gray-900">{outboundStats.totalOrders}</div>
              <div className="text-xs text-gray-500">Tổng đơn</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-gray-900">{outboundStats.totalQuantity}</div>
              <div className="text-xs text-gray-500">Tổng kiện</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-green-600">{outboundStats.paidCount}</div>
              <div className="text-xs text-gray-500">Đã thu cước</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-red-600">{outboundStats.unpaidCount}</div>
              <div className="text-xs text-gray-500">Chưa thu cước</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center col-span-2 md:col-span-1">
              <div className="text-xl font-bold text-blue-600">{formatCurrency(outboundStats.totalCost)}</div>
              <div className="text-xs text-gray-500">Tổng cước</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm mã đơn, SĐT, tên khách..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                value={outboundSearchTerm}
                onChange={(e) => setOutboundSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto flex-wrap items-center">
              <select 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                value={outboundDateFilter.match(/^\d{4}-\d{2}-\d{2}$/) ? 'CUSTOM' : outboundDateFilter}
                onChange={(e) => {
                  if (e.target.value !== 'CUSTOM') {
                    setOutboundDateFilter(e.target.value);
                  }
                }}
              >
                <option value="TODAY">Hôm nay</option>
                <option value="YESTERDAY">Hôm qua</option>
                <option value="ALL">Tất cả ngày</option>
                <option value="CUSTOM" disabled>Chọn ngày...</option>
              </select>
              
              <input 
                type="date" 
                value={outboundDateFilter.match(/^\d{4}-\d{2}-\d{2}$/) ? outboundDateFilter : ''}
                onChange={(e) => setOutboundDateFilter(e.target.value || 'TODAY')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                title="Chọn ngày cụ thể"
              />

              <select 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                value={outboundReceiverFilter}
                onChange={(e) => setOutboundReceiverFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạm nhận</option>
                {availableReceiverStations.map(s => <option key={s} value={s}>Đến: {s}</option>)}
              </select>

              <select 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                value={outboundStatusFilter}
                onChange={(e) => setOutboundStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả cước</option>
                <option value={PaymentStatus.PAID}>Đã thu</option>
                <option value={PaymentStatus.UNPAID}>Chưa thu</option>
              </select>
              
              <button 
                onClick={clearOutboundFilters}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa bộ lọc"
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="ml-2 text-gray-500">Đang tải danh sách...</span>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                      <tr>
                        <th className="px-4 py-3">Mã</th>
                        <th className="px-4 py-3">Ngày tạo</th>
                        <th className="px-4 py-3">Tuyến</th>
                        <th className="px-4 py-3">Người nhận</th>
                        <th className="px-4 py-3">Hàng hóa</th>
                        <th className="px-4 py-3 text-right">Cước phí</th>
                        <th className="px-4 py-3 text-center">TT Cước</th>
                        <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {outboundOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <Link to={`/orders/${order.id}`} className="text-green-600 hover:text-green-700 hover:underline">
                              {order.code}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold">
                              <span className="text-green-600">{order.senderStation}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-blue-600">{order.receiverStation}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{order.receiverName}</div>
                            <div className="text-xs text-gray-500">{order.receiverPhone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">{order.goodsType}</div>
                            <div className="text-xs text-gray-500">SL: {order.quantity}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(order.cost)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.paymentStatus === PaymentStatus.PAID 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(user.role === 'ADMIN' || user.role === 'MANAGER' || isEditable(order)) ? (
                              <Link to={`/edit/${order.id}`} className="text-green-600 hover:text-green-700">
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
                      {outboundOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-3">
                              <PackageCheck size={40} className="text-gray-300" />
                              <p>Chưa có đơn hàng nào trong ngày.</p>
                              <Link to="/create" className="text-green-600 hover:underline font-medium">
                                + Tạo phiếu mới
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden divide-y divide-gray-100">
                  {outboundOrders.map(order => (
                    <div key={order.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Link to={`/orders/${order.id}`} className="font-bold text-green-600 hover:underline mr-2">
                            {order.code}
                          </Link>
                          <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          order.paymentStatus === PaymentStatus.PAID 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>{order.paymentStatus}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <span className="font-semibold text-green-600">{order.senderStation}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-semibold text-blue-600">{order.receiverStation}</span>
                        <span className="text-gray-300">|</span>
                        <span>{order.goodsType} (x{order.quantity})</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3">
                        <div>
                          <div className="text-sm font-medium">{order.receiverName}</div>
                          <div className="text-xs text-gray-500">{order.receiverPhone}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{formatCurrency(order.cost)}</div>
                          {(user.role === 'ADMIN' || user.role === 'MANAGER' || isEditable(order)) && (
                            <Link to={`/edit/${order.id}`} className="text-xs text-gray-400 hover:text-green-600 mt-1 block">
                              Sửa đơn
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {outboundOrders.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <p>Chưa có đơn hàng nào.</p>
                      <Link to="/create" className="text-green-600 hover:underline font-medium mt-2 block">
                        + Tạo phiếu mới
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB TẤT CẢ ĐƠN (ADMIN ONLY) ===== */}
      {activeTab === 'ALL' && user.role === 'ADMIN' && (
        <div className="space-y-4">
          {/* Header với nút xuất CSV */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
                <FileSpreadsheet className="text-purple-600" size={18} />
                Danh sách đơn hàng
              </h2>
              <p className="text-xs text-gray-500">Quản lý và tra cứu tất cả phiếu gửi</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-sm"
              >
                <Download size={14} />
                Xuất CSV
              </button>
              <Link 
                to="/create" 
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus size={14} />
                Tạo phiếu
              </Link>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold text-gray-900">{allStats.totalOrders}</div>
              <div className="text-[10px] text-gray-500">Tổng đơn</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold text-gray-900">{allStats.totalQuantity}</div>
              <div className="text-[10px] text-gray-500">Tổng kiện</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold text-green-600">{allStats.paidCount}</div>
              <div className="text-[10px] text-gray-500">Đã thu</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 text-center">
              <div className="text-lg font-bold text-red-600">{allStats.unpaidCount}</div>
              <div className="text-[10px] text-gray-500">Chưa thu</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 text-center col-span-3 md:col-span-1">
              <div className="text-base font-bold text-purple-600">{formatCurrency(allStats.totalCost)}</div>
              <div className="text-[10px] text-gray-500">Tổng cước</div>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 space-y-2">
            {/* Row 1: Search + Preset + Stations + Status */}
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm Mã, Tên, SĐT..." 
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  value={allSearchTerm}
                  onChange={(e) => setAllSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto items-center text-xs">
                <select 
                  className="px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 min-w-[90px]"
                  value={(allDateFrom || allDateTo) ? 'RANGE' : allDateFilter}
                  onChange={(e) => {
                    if (e.target.value === 'RANGE') return;
                    setAllDateFilter(e.target.value);
                    setAllDateFrom('');
                    setAllDateTo('');
                  }}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="TODAY">Hôm nay</option>
                  <option value="YESTERDAY">Hôm qua</option>
                  <option value="WEEK">7 ngày</option>
                  <option value="MONTH">Tháng này</option>
                  {(allDateFrom || allDateTo) && <option value="RANGE" disabled>Khoảng ngày</option>}
                </select>

                <select 
                  className="px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 min-w-[80px]"
                  value={allSenderStationFilter}
                  onChange={(e) => setAllSenderStationFilter(e.target.value)}
                >
                  <option value="ALL">Gửi</option>
                  {Object.values(Station).map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select 
                  className="px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 min-w-[80px]"
                  value={allReceiverStationFilter}
                  onChange={(e) => setAllReceiverStationFilter(e.target.value)}
                >
                  <option value="ALL">Nhận</option>
                  {Object.values(Station).map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select 
                  className="px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 min-w-[85px]"
                  value={allStatusFilter}
                  onChange={(e) => setAllStatusFilter(e.target.value)}
                >
                  <option value="ALL">Cước</option>
                  <option value={PaymentStatus.PAID}>Đã thu</option>
                  <option value={PaymentStatus.UNPAID}>Chưa thu</option>
                </select>
                
                <button 
                  onClick={clearAllFilters}
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Xóa bộ lọc"
                >
                  <Filter size={14} />
                </button>
              </div>
            </div>
            
            {/* Row 2: Date Range */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 whitespace-nowrap">Từ ngày:</span>
              <input 
                type="date" 
                value={allDateFrom}
                onChange={(e) => {
                  setAllDateFrom(e.target.value);
                  if (e.target.value) setAllDateFilter('ALL');
                }}
                className="px-2 py-1 border border-gray-200 rounded-md bg-gray-50 w-[120px]"
              />
              <span className="text-gray-500 whitespace-nowrap">Đến ngày:</span>
              <input 
                type="date" 
                value={allDateTo}
                onChange={(e) => {
                  setAllDateTo(e.target.value);
                  if (e.target.value) setAllDateFilter('ALL');
                }}
                className="px-2 py-1 border border-gray-200 rounded-md bg-gray-50 w-[120px]"
              />
              {(allDateFrom || allDateTo) && (
                <button 
                  onClick={() => { setAllDateFrom(''); setAllDateTo(''); }}
                  className="text-red-500 hover:underline"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-500">Đang tải danh sách...</span>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                      <tr>
                        <th className="px-4 py-3">Mã</th>
                        <th className="px-4 py-3">Ngày tạo</th>
                        <th className="px-4 py-3">Tuyến</th>
                        <th className="px-4 py-3">Người nhận</th>
                        <th className="px-4 py-3">Hàng hóa</th>
                        <th className="px-4 py-3 text-right">Cước phí</th>
                        <th className="px-4 py-3 text-center">TT Cước</th>
                        <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <Link to={`/orders/${order.id}`} className="text-purple-600 hover:text-purple-700 hover:underline">
                              {order.code}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold">
                              <span className="text-blue-600">{order.senderStation}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600">{order.receiverStation}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{order.receiverName}</div>
                            <div className="text-xs text-gray-500">{order.receiverPhone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">{order.goodsType}</div>
                            <div className="text-xs text-gray-500">SL: {order.quantity}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(order.cost)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.paymentStatus === PaymentStatus.PAID 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link to={`/edit/${order.id}`} className="text-purple-600 hover:text-purple-700">
                              <Edit size={18} className="mx-auto" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {allOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-3">
                              <Search size={40} className="text-gray-300" />
                              <p>Không tìm thấy đơn hàng nào.</p>
                              <button onClick={clearAllFilters} className="text-purple-600 hover:underline text-sm">
                                Xóa bộ lọc
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden divide-y divide-gray-100">
                  {allOrders.map(order => (
                    <div key={order.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Link to={`/orders/${order.id}`} className="font-bold text-purple-600 hover:underline mr-2">
                            {order.code}
                          </Link>
                          <span className="text-xs text-gray-500">{formatDate(order.createdAt).split(',')[1]}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          order.paymentStatus === PaymentStatus.PAID 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>{order.paymentStatus}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <span className="font-semibold text-blue-600">{order.senderStation}</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="font-semibold text-green-600">{order.receiverStation}</span>
                        <span className="text-gray-300">|</span>
                        <span>{order.goodsType} (x{order.quantity})</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3">
                        <div>
                          <div className="text-sm font-medium">{order.receiverName}</div>
                          <div className="text-xs text-gray-500">{order.receiverPhone}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">{formatCurrency(order.cost)}</div>
                          <Link to={`/edit/${order.id}`} className="text-xs text-gray-400 hover:text-purple-600 mt-1 block">
                            Sửa đơn
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  {allOrders.length === 0 && (
                    <div className="p-8 text-center text-gray-500">Không tìm thấy đơn hàng.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;