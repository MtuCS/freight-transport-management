import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Station, PaymentStatus, Order } from '../types';
import { saveOrder, getOrderById, generateOrderCode, isEditable } from '../services/dataService';
import { ArrowLeft, Save, AlertTriangle, Loader2 } from 'lucide-react';

interface OrderFormProps {
  user: User;
}

// Format số với dấu . ngăn cách hàng ngàn
const formatCurrencyDisplay = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Parse chuỗi từ input: loại bỏ dấu . và chuyển thành number
const parseCurrencyInput = (str: string): number => {
  const cleanStr = str.replace(/\./g, '');
  return cleanStr === '' ? 0 : parseInt(cleanStr, 10);
};

// Validate số điện thoại Việt Nam (hỗ trợ +84, 84, 0 và các mạng chính)
const isVietnamesePhoneNumberValid = (number: string): boolean => {
  return /((\+?84)|0)(3|5|7|8|9)\d{8}\b/.test(number.trim());
};

const OrderForm: React.FC<OrderFormProps> = ({ user }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Lấy danh sách trạm nhận (loại trừ trạm hiện tại của user)
  const availableReceiverStations = Object.values(Station).filter(s => s !== user.station);
  const defaultReceiverStation = availableReceiverStations[0] || Station.SG;

  // Refs để focus và select text
  const senderPhoneRef = useRef<HTMLInputElement>(null);
  const receiverPhoneRef = useRef<HTMLInputElement>(null);
  const costRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Field-level error states
  const [fieldErrors, setFieldErrors] = useState<{
    senderPhone?: string;
    receiverPhone?: string;
    cost?: string;
  }>({});
  const [formData, setFormData] = useState<Partial<Order>>({
    senderStation: user.station,
    receiverStation: defaultReceiverStation,
    paymentStatus: PaymentStatus.UNPAID,
    quantity: 1,
    cost: 0,
    goodsType: '',
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    note: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      if (isEditMode && id) {
        setIsLoading(true);
        const existing = await getOrderById(id);
        if (existing) {
          // Security: Kiểm tra quyền chỉnh sửa
          // - ADMIN: sửa được tất cả
          // - MANAGER: sửa được tất cả
          // - STAFF: chỉ sửa được order của chính mình VÀ trong ngày
          const isOwner = existing.createdById === user.uid;
          const canEdit = 
            user.role === 'ADMIN' || 
            user.role === 'MANAGER' ||
            (user.role === 'STAFF' && isOwner && isEditable(existing));
          
          if (!canEdit) {
            if (!isOwner && user.role === 'STAFF') {
              alert('Bạn không có quyền chỉnh sửa đơn hàng của người khác.');
            } else {
              alert('Không thể chỉnh sửa đơn hàng cũ (quá 24h). Vui lòng liên hệ quản lý.');
            }
            navigate('/orders');
            return;
          }
          setFormData(existing);
        } else {
          navigate('/orders');
        }
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [id, isEditMode, navigate, user.role, user.uid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Xử lý đặc biệt cho trường cost (cước phí)
    if (name === 'cost') {
      const numValue = parseCurrencyInput(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
      
      // Kiểm tra cước phí khi nhập
      if (value.trim() === '') {
        setFieldErrors(prev => ({
          ...prev,
          cost: 'Vui lòng nhập cước phí'
        }));
      } else if (numValue <= 0) {
        setFieldErrors(prev => ({
          ...prev,
          cost: 'Cước phí phải lớn hơn 0'
        }));
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cost;
          return newErrors;
        });
      }
      return;
    }
    
    // Kiểm tra số điện thoại người gửi
    if (name === 'senderPhone') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (value.trim() === '') {
        setFieldErrors(prev => ({
          ...prev,
          senderPhone: 'Vui lòng nhập số điện thoại'
        }));
      } else if (!isVietnamesePhoneNumberValid(value)) {
        setFieldErrors(prev => ({
          ...prev,
          senderPhone: 'Số điện thoại không hợp lệ (VD: 0946169794, +84946169794)'
        }));
        // Focus khi validation fail
        setTimeout(() => {
          senderPhoneRef.current?.focus();
        }, 0);
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.senderPhone;
          return newErrors;
        });
      }
      return;
    }
    
    // Kiểm tra số điện thoại người nhận
    if (name === 'receiverPhone') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (value.trim() !== '' && !isVietnamesePhoneNumberValid(value)) {
        setFieldErrors(prev => ({
          ...prev,
          receiverPhone: 'Số điện thoại không hợp lệ (VD: 0946169794, +84946169794)'
        }));
        // Focus khi validation fail
        setTimeout(() => {
          receiverPhoneRef.current?.focus();
        }, 0);
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.receiverPhone;
          return newErrors;
        });
      }
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Kiểm tra trường bắt buộc
    if (!formData.senderName || !formData.senderPhone || !formData.cost) {
      setError('Vui lòng điền tên người gửi, SĐT và cước phí.');
      if (!formData.senderPhone && senderPhoneRef.current) {
        senderPhoneRef.current.focus();
      }
      if (!formData.cost && costRef.current) {
        costRef.current.focus();
      }
      return;
    }

    // Kiểm tra định dạng số điện thoại người gửi
    if (!isVietnamesePhoneNumberValid(formData.senderPhone)) {
      const error = 'Số điện thoại người gửi không hợp lệ. Vui lòng nhập số Việt Nam (ví dụ: 0946169794, +84946169794).';
      setFieldErrors(prev => ({ ...prev, senderPhone: error }));
      senderPhoneRef.current?.focus();
      return;
    }

    // Kiểm tra định dạng số điện thoại người nhận (nếu có)
    if (formData.receiverPhone && !isVietnamesePhoneNumberValid(formData.receiverPhone)) {
      const error = 'Số điện thoại người nhận không hợp lệ. Vui lòng nhập số Việt Nam (ví dụ: 0946169794, +84946169794).';
      setFieldErrors(prev => ({ ...prev, receiverPhone: error }));
      receiverPhoneRef.current?.focus();
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    
    const newOrder: Order = {
      id: isEditMode ? (formData.id as string) : Date.now().toString(),
      code: isEditMode ? (formData.code as string) : generateOrderCode(),
      createdAt: isEditMode ? (formData.createdAt as string) : now,
      senderStation: formData.senderStation as Station,
      receiverStation: formData.receiverStation as Station,
      senderName: formData.senderName || '',
      senderPhone: formData.senderPhone || '',
      receiverName: formData.receiverName || '',
      receiverPhone: formData.receiverPhone || '',
      receiverAddress: formData.receiverAddress || '',
      goodsType: formData.goodsType || '',
      quantity: formData.quantity || 1,
      note: formData.note || '',
      cost: formData.cost || 0,
      paymentStatus: formData.paymentStatus as PaymentStatus,
      createdBy: isEditMode ? (formData.createdBy as string) : user.name,
      createdById: isEditMode ? (formData.createdById as string) : user.uid, // Security: Lưu UID để kiểm tra ownership
      history: isEditMode && formData.history ? [...formData.history, { date: now, action: 'Updated', user: user.name }] : []
    };

    await saveOrder(newOrder);
    setIsSaving(false);
    navigate('/orders');
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-4 p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditMode ? `Chỉnh sửa đơn: ${formData.code}` : 'Tạo phiếu gửi mới'}
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Station Info */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Thông tin trạm</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạm gửi</label>
                <select 
                  name="senderStation" 
                  value={formData.senderStation} 
                  onChange={handleChange}
                  disabled={user.role === 'STAFF'}
                  className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3 ${
                    user.role === 'STAFF' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  {Object.values(Station).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {user.role === 'STAFF' && (
                  <p className="text-xs text-gray-500 mt-1">Trạm được gán cho tài khoản của bạn</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạm nhận</label>
                <select 
                  name="receiverStation" 
                  value={formData.receiverStation} 
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3"
                >
                  {availableReceiverStations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Sender Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Người gửi</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên người gửi </label>
                <input 
                  type="text" 
                  name="senderName" 
                  value={formData.senderName} 
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3"
                  placeholder="Nguyễn Văn A"
                  // required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input 
                  ref={senderPhoneRef}
                  type="tel" 
                  name="senderPhone" 
                  value={formData.senderPhone} 
                  onChange={handleChange}
                  className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3 ${
                    fieldErrors.senderPhone ? 'border-red-500 bg-red-50' : ''
                  }`}
                  placeholder="09xxx..."
                  required
                />
                {fieldErrors.senderPhone && (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    {fieldErrors.senderPhone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Receiver Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Người nhận</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên người nhận <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="receiverName" 
                  value={formData.receiverName} 
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3"
                  placeholder="Trần Thị B"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input 
                  ref={receiverPhoneRef}
                  type="tel" 
                  name="receiverPhone" 
                  value={formData.receiverPhone} 
                  onChange={handleChange}
                  className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3 ${
                    fieldErrors.receiverPhone ? 'border-red-500 bg-red-50' : ''
                  }`}
                  placeholder="09xxx..."
                />
                {fieldErrors.receiverPhone && (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    {fieldErrors.receiverPhone}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ nhận</label>
             <input 
                type="text" 
                name="receiverAddress" 
                value={formData.receiverAddress} 
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3"
                placeholder="Số nhà, đường, phường, xã..."
              />
          </div>

          {/* Goods & Cost */}
          <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
             <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Hàng hóa & Cước phí</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại hàng</label>
                   <input 
                      type="text" 
                      name="goodsType" 
                      value={formData.goodsType} 
                      onChange={handleChange}
                      list="goodsTypes"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3"
                      placeholder="VD: Bao, Kiện, Thùng giấy..."
                    />
                    <datalist id="goodsTypes">
                      <option value="Bao" />
                      <option value="Kiện" />
                      <option value="Thùng giấy" />
                      <option value="Thùng xốp" />
                      <option value="Hồ sơ/Giấy tờ" />
                    </datalist>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                   <input 
                      type="number" 
                      name="quantity" 
                      min="1"
                      value={formData.quantity} 
                      onChange={handleChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3"
                    />
                </div>
                
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cước phí (VNĐ) <span className="text-red-500">*</span></label>
                   <input 
                      ref={costRef}
                      type="text" 
                      name="cost" 
                      value={formatCurrencyDisplay(formData.cost as number)}
                      onChange={handleChange}
                      placeholder="0"
                      className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 h-10 border px-3 font-bold text-gray-900 ${
                        fieldErrors.cost ? 'border-red-500 bg-red-50' : ''
                      }`}
                    />
                    {fieldErrors.cost && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle size={14} />
                        {fieldErrors.cost}
                      </p>
                    )}
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái thanh toán</label>
                   <div className="flex gap-4 mt-2">
                     <label className="inline-flex items-center">
                       <input 
                        type="radio" 
                        name="paymentStatus" 
                        value={PaymentStatus.PAID}
                        checked={formData.paymentStatus === PaymentStatus.PAID}
                        onChange={handleChange}
                        className="form-radio text-accent h-4 w-4"
                       />
                       <span className="ml-2">Đã thu</span>
                     </label>
                     <label className="inline-flex items-center">
                       <input 
                        type="radio" 
                        name="paymentStatus" 
                        value={PaymentStatus.UNPAID}
                        checked={formData.paymentStatus === PaymentStatus.UNPAID}
                        onChange={handleChange}
                        className="form-radio text-red-500 h-4 w-4"
                       />
                       <span className="ml-2">Chưa thu</span>
                     </label>
                   </div>
                </div>
             </div>
             
             <div className="mt-4">
               <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
               <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50 border p-3"
                  placeholder="Ghi chú thêm về hàng hóa..."
               ></textarea>
             </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
          <button 
            type="button" 
            onClick={() => navigate('/orders')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isSaving}
          >
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEditMode ? 'Cập nhật' : 'Lưu phiếu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;