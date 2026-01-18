export enum Station {
  HT = 'HT',
  PA = 'PA',
  SG = 'SG'
}

export enum Role {
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export enum PaymentStatus {
  PAID = 'Đã thu',
  UNPAID = 'Chưa thu'
}

export interface Account {
  uid: string;
  email: string;
  username: string; // Tên hiển thị/ID cũ
  name: string;
  role: Role;
  station?: Station; // Bắt buộc với STAFF, optional với ADMIN/MANAGER
}

export interface User extends Account {
  station: Station;
}

export interface OrderHistory {
  date: string;
  action: string;
  user: string;
}

export interface PaymentRecord {
  date: string;           // ISO timestamp
  status: PaymentStatus;  // PAID / UNPAID
  changedBy: string;      // Tên nhân viên thay đổi
  changedById: string;    // UID của nhân viên
  note?: string;          // Ghi chú (VD: "Thu tiền mặt", "Chuyển khoản")
}

export interface Order {
  id: string;
  code: string; 
  senderStation: Station;
  receiverStation: Station;
  createdAt: string; 
  
  senderName: string;
  senderPhone: string;
  
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  
  goodsType: string;
  quantity: number;
  note: string;
  
  cost: number;
  paymentStatus: PaymentStatus;
  paymentHistory: PaymentRecord[];  // Lịch sử thu cước
  
  createdBy: string;
  createdById?: string; // UID của tài khoản tạo đơn
  history: OrderHistory[];
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalUnpaid: number;
  ordersByStation: { name: string; value: number }[];
  revenueByDay: { date: string; value: number }[];
}