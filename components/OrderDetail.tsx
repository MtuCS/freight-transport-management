import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Order, User, PaymentStatus } from '../types';
import { getOrderById, formatCurrency, formatDate, isEditable } from '../services/dataService';
import { ArrowLeft, Edit, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface OrderDetailProps {
  user: User;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (id) {
        setLoading(true);
        const data = await getOrderById(id);
        setOrder(data);
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle size={48} className="text-gray-300" />
        <p className="text-gray-500">Không tìm thấy đơn hàng</p>
        <button onClick={() => navigate('/orders')} className="text-accent hover:underline">
          ← Quay lại danh sách
        </button>
      </div>
    );
  }

  const canEdit = user.role === 'ADMIN' || isEditable(order);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chi tiết đơn hàng</h1>
            <p className="text-sm text-gray-500">Mã: {order.code}</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate(`/edit/${order.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Edit size={18} />
            Chỉnh sửa
          </button>
        )}
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sender Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Người gửi</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Tên</p>
              <p className="font-medium text-gray-900">{order.senderName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Điện thoại</p>
              <p className="font-medium text-gray-900">{order.senderPhone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Trạm</p>
              <p className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {order.senderStation}
              </p>
            </div>
          </div>
        </div>

        {/* Receiver Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Người nhận</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Tên</p>
              <p className="font-medium text-gray-900">{order.receiverName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Điện thoại</p>
              <p className="font-medium text-gray-900">{order.receiverPhone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Trạm</p>
              <p className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {order.receiverStation}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Địa chỉ</p>
              <p className="font-medium text-gray-900">{order.receiverAddress || '(không có)'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goods & Cost Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Hàng hóa</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Loại hàng</p>
              <p className="font-medium text-gray-900">{order.goodsType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Số lượng</p>
              <p className="font-medium text-gray-900">{order.quantity} cái</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ghi chú</p>
              <p className="font-medium text-gray-900">{order.note || '(không có)'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Cước phí</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Giá cước</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(order.cost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Trạng thái</p>
              <p
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  order.paymentStatus === PaymentStatus.PAID
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {order.paymentStatus === PaymentStatus.PAID ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Clock size={16} />
                )}
                {order.paymentStatus}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          📋 Lịch sử thu cước
        </h2>
        
        {order.paymentHistory && order.paymentHistory.length > 0 ? (
          <div className="space-y-4">
            {order.paymentHistory.map((record, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  record.status === PaymentStatus.PAID
                    ? 'border-l-green-500 bg-green-50'
                    : 'border-l-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {record.status === PaymentStatus.PAID ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                      <Clock size={20} className="text-red-600" />
                    )}
                    <div>
                      <p
                        className={`font-semibold ${
                          record.status === PaymentStatus.PAID
                            ? 'text-green-800'
                            : 'text-red-800'
                        }`}
                      >
                        {record.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Ngày: {formatDate(record.date)}
                      </p>
                    </div>
                  </div>
                  {idx === order.paymentHistory.length - 1 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Lần mới nhất
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 font-medium">
                  Người thực hiện: <span className="text-blue-600">{record.changedBy}</span>
                </p>
                {record.note && (
                  <p className="text-sm text-gray-600 mt-2">
                    Ghi chú: <span className="italic">{record.note}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Chưa có lịch sử thu cước</p>
        )}
      </div>

      {/* Order Metadata */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Người tạo</p>
            <p className="font-medium text-gray-900">{order.createdBy}</p>
          </div>
          <div>
            <p className="text-gray-500">Ngày tạo</p>
            <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Mã đơn</p>
            <p className="font-medium text-gray-900">{order.code}</p>
          </div>
          <div>
            <p className="text-gray-500">ID đơn</p>
            <p className="font-mono text-xs text-gray-600">{order.id.substring(0, 8)}...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
