import React, { useState, useEffect } from 'react';
import { getOrders, formatCurrency, formatDate } from '../services/dataService';
import { Order, PaymentStatus, Station, User } from '../types';
import { Printer, Download, Search, Loader2 } from 'lucide-react';

interface ReportsProps {
  user: User;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [stationFilter, setStationFilter] = useState<string>(user.station);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredOrders = orders.filter(o => {
    const isDateMatch = o.createdAt.startsWith(dateFilter);
    const isStationMatch = stationFilter === 'ALL' || o.senderStation === stationFilter;
    return isDateMatch && isStationMatch;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === PaymentStatus.PAID ? o.cost : 0), 0);
  const totalUnpaid = filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === PaymentStatus.UNPAID ? o.cost : 0), 0);

  // Format ngày theo kiểu Việt Nam
  const formatVietnameseDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return {
      dayName: dayNames[dayOfWeek],
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  };

  const dateInfo = formatVietnameseDate(dateFilter);

  // Format cước phí ngắn gọn (50000 -> 50k)
  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000) {
      return Math.round(amount / 1000) + 'K';
    }
    return amount.toString();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Địa chỉ", "Điện thoại", "Tên", "Hàng", "Cước", "Ghi chú"];
    const rows = filteredOrders.map(o => [
      o.receiverAddress || o.receiverStation,
      o.receiverPhone,
      o.receiverName,
      `${o.goodsType} x${o.quantity}`,
      o.paymentStatus === PaymentStatus.PAID ? 'Đ/T' : 'C/T',
      o.paymentStatus === PaymentStatus.PAID ? formatShortCurrency(o.cost) : o.note || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phoi_hang_${stationFilter}_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <span className="ml-3 text-gray-500">Đang chuẩn bị báo cáo...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h2 className="text-2xl font-bold text-gray-800">Phơi hàng / Báo cáo</h2>
        <div className="flex gap-2">
           <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-blue-600 shadow-sm"
          >
            <Printer size={18} />
            In Phơi hàng
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạm gửi</label>
             <select 
              className="px-3 py-2 border border-gray-200 rounded-lg w-full md:w-32"
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              {Object.values(Station).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số tờ</label>
            <input 
              type="number" 
              min="1"
              value={pageNumber}
              onChange={(e) => setPageNumber(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg w-20"
            />
          </div>
          <div className="text-sm text-gray-500">
            Tổng: <span className="font-bold text-gray-800">{filteredOrders.length}</span> đơn
          </div>
        </div>
      </div>

      {/* Printable Area - Form Phơi Hàng */}
      <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 print:m-0">
        
        {/* Header - Tiêu đề form */}
        <div className="text-center mb-4 print:mb-2">
          <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wide">PHƠI HÀNG TRANG HÒA</h1>
        </div>
        
        {/* Sub-header - Thông tin trạm, ngày, số tờ */}
        <div className="text-center mb-4 print:mb-2 text-sm md:text-base">
          <p>
            Trạm <span className="font-bold underline px-2">{stationFilter === 'ALL' ? '........' : stationFilter}</span>
            {' '}xe..............tài..............{' '}
            <span className="font-medium">{dateInfo.dayName}</span>{' '}
            ngày <span className="font-bold">{dateInfo.day}</span>{' '}
            tháng <span className="font-bold">{dateInfo.month}</span>{' '}
            năm <span className="font-bold">{dateInfo.year}</span>{' '}
            số tờ <span className="font-bold underline px-2">{String(pageNumber).padStart(2, '0')}</span>
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200">
                <th className="px-2 py-2 border border-gray-400 text-center w-[15%]">ĐỊA CHỈ</th>
                <th className="px-2 py-2 border border-gray-400 text-center w-[18%]">ĐIỆN THOẠI</th>
                <th className="px-2 py-2 border border-gray-400 text-center w-[18%]">TÊN</th>
                <th className="px-2 py-2 border border-gray-400 text-center w-[20%]">HÀNG</th>
                <th className="px-2 py-2 border border-gray-400 text-center w-[10%]">CƯỚC</th>
                <th className="px-2 py-2 border border-gray-400 text-center w-[19%]">GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                  <td className="px-2 py-1.5 border border-gray-400">{order.receiverAddress || order.receiverStation}</td>
                  <td className="px-2 py-1.5 border border-gray-400">{order.receiverPhone}</td>
                  <td className="px-2 py-1.5 border border-gray-400">{order.receiverName}</td>
                  <td className="px-2 py-1.5 border border-gray-400">
                    {order.quantity > 1 ? `${order.quantity}` : ''}{order.goodsType}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-400 text-center font-medium">
                    {order.paymentStatus === PaymentStatus.PAID ? 'Đ/T' : 'C/T'}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-400">
                    {order.cost > 0 && (
                      <span className="font-medium">{formatShortCurrency(order.cost)}</span>
                    )}
                    {order.note && <span className="text-gray-600"> {order.note}</span>}
                  </td>
                </tr>
              ))}
              {/* Empty rows for handwriting */}
              {filteredOrders.length < 20 && [...Array(Math.max(0, 20 - filteredOrders.length))].map((_, idx) => (
                <tr key={`empty-${idx}`} className="print:h-8">
                  <td className="px-2 py-3 border border-gray-400">&nbsp;</td>
                  <td className="px-2 py-3 border border-gray-400"></td>
                  <td className="px-2 py-3 border border-gray-400"></td>
                  <td className="px-2 py-3 border border-gray-400"></td>
                  <td className="px-2 py-3 border border-gray-400"></td>
                  <td className="px-2 py-3 border border-gray-400"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Summary - Chỉ hiện trên màn hình, không in */}
        <div className="mt-4 grid grid-cols-2 gap-4 no-print">
           <div className="bg-green-50 p-3 rounded-lg">
             <p className="text-sm text-gray-500">Đã thu (Đ/T)</p>
             <p className="text-xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
           </div>
           <div className="bg-red-50 p-3 rounded-lg">
             <p className="text-sm text-gray-500">Chưa thu (C/T)</p>
             <p className="text-xl font-bold text-red-700">{formatCurrency(totalUnpaid)}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;