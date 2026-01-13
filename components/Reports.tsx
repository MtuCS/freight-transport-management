import React, { useState, useEffect } from 'react';
import { getOrders, formatCurrency, formatDate } from '../services/dataService';
import { Order, PaymentStatus, Station } from '../types';
import { Printer, Download, Search, Loader2 } from 'lucide-react';

const Reports: React.FC = () => {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [stationFilter, setStationFilter] = useState<string>('ALL');
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

  const filteredOrders = orders.filter(o => {
    const isDateMatch = o.createdAt.startsWith(dateFilter);
    const isStationMatch = stationFilter === 'ALL' || o.senderStation === stationFilter || o.receiverStation === stationFilter;
    return isDateMatch && isStationMatch;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === PaymentStatus.PAID ? o.cost : 0), 0);
  const totalUnpaid = filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === PaymentStatus.UNPAID ? o.cost : 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Mã đơn", "Ngày gửi", "Trạm gửi", "Trạm nhận", "Người gửi", "SĐT Gửi", "Người nhận", "SĐT Nhận", "Loại hàng", "Số lượng", "Cước phí", "Trạng thái"];
    const rows = filteredOrders.map(o => [
      o.code,
      formatDate(o.createdAt),
      o.senderStation,
      o.receiverStation,
      o.senderName,
      o.senderPhone,
      o.receiverName,
      o.receiverPhone,
      o.goodsType,
      o.quantity,
      o.cost,
      o.paymentStatus
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bao_cao_${dateFilter}.csv`);
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
        <h2 className="text-2xl font-bold text-gray-800">Báo cáo cuối ngày</h2>
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
            In Báo cáo
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạm</label>
             <select 
              className="px-3 py-2 border border-gray-200 rounded-lg w-full md:w-48"
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạm</option>
              {Object.values(Station).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Area */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-8 hidden print-only">
          <h1 className="text-2xl font-bold uppercase">Bảng Kê Hàng Hóa</h1>
          <p>Ngày: {new Date(dateFilter).toLocaleDateString('vi-VN')}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
           <div className="bg-green-50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-200">
             <p className="text-sm text-gray-500 uppercase">Tổng thực thu</p>
             <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
           </div>
           <div className="bg-red-50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-200">
             <p className="text-sm text-gray-500 uppercase">Tổng chưa thu</p>
             <p className="text-2xl font-bold text-red-700">{formatCurrency(totalUnpaid)}</p>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200 text-gray-600 border-b border-gray-200">
                <th className="px-4 py-2 border border-gray-200">Mã</th>
                <th className="px-4 py-2 border border-gray-200">Tuyến</th>
                <th className="px-4 py-2 border border-gray-200">Người gửi</th>
                <th className="px-4 py-2 border border-gray-200">Người nhận</th>
                <th className="px-4 py-2 border border-gray-200">Hàng hóa</th>
                <th className="px-4 py-2 border border-gray-200 text-right">Cước</th>
                <th className="px-4 py-2 border border-gray-200 text-center">TT</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, idx) => (
                <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 border border-gray-200 font-bold">{order.code}</td>
                  <td className="px-4 py-2 border border-gray-200">{order.senderStation} → {order.receiverStation}</td>
                  <td className="px-4 py-2 border border-gray-200">{order.senderName}</td>
                  <td className="px-4 py-2 border border-gray-200">{order.receiverName}</td>
                   <td className="px-4 py-2 border border-gray-200">
                    {order.goodsType} (x{order.quantity})
                  </td>
                  <td className="px-4 py-2 border border-gray-200 text-right">{formatCurrency(order.cost)}</td>
                  <td className="px-4 py-2 border border-gray-200 text-center text-xs">
                     {order.paymentStatus === PaymentStatus.PAID ? 'Đã thu' : 'Nợ'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-gray-100 font-bold">
                 <td colSpan={5} className="px-4 py-2 border border-gray-200 text-right">Tổng cộng</td>
                 <td className="px-4 py-2 border border-gray-200 text-right">{formatCurrency(totalRevenue + totalUnpaid)}</td>
                 <td className="px-4 py-2 border border-gray-200"></td>
               </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-12 hidden print-only flex justify-between">
           <div className="text-center w-40">
             <p className="font-bold">Người lập bảng</p>
             <p className="mt-12 italic">(Ký, họ tên)</p>
           </div>
           <div className="text-center w-40">
             <p className="font-bold">Kế toán/Quản lý</p>
             <p className="mt-12 italic">(Ký, họ tên)</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;