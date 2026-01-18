
import { Order, Account, User, Role } from '../types';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc,
  deleteDoc, 
  query,
  where
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth, app } from './firebase';
//

const functions = getFunctions(app, 'asia-southeast1'); // hoặc region của bạn

const COLLECTION_ORDERS = 'orders';
const COLLECTION_ACCOUNTS = 'accounts';

const handleFirebaseError = (error: any, action: string) => {
  console.error(`Lỗi khi ${action}:`, error);
  const code = error.code || '';
  
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return "Tài khoản hoặc mật khẩu không chính xác.";
  }
  if (code === 'permission-denied') {
    return "Bị chặn quyền truy cập. Vui lòng liên hệ Admin.";
  }
  return error.message || "Đã xảy ra lỗi hệ thống.";
};

// --- XỬ LÝ XÁC THỰC (AUTH) ---

export const login = async (email: string, pass: string): Promise<Account | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;
    return await getAccountProfile(uid);
  } catch (error) {
    throw new Error(handleFirebaseError(error, "đăng nhập"));
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getAccountProfile = async (uid: string): Promise<Account | null> => {
  try {
    const docRef = doc(db, COLLECTION_ACCOUNTS, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as Account;
    }
    return null;
  } catch (error) {
    handleFirebaseError(error, "lấy thông tin tài khoản");
    return null;
  }
};

export async function getAccountByUid(uid: string): Promise<Account | null> {
  try {
    const ref = doc(db, COLLECTION_ACCOUNTS, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as any;

    // Account của mày đang dùng các field này (tùy types.ts)
    return {
      uid: uid,
      email: data.email,
      username: uid,           // tạm thời để uid (sau này đổi thành email)
      name: data.name,
      role: data.role,
      station: data.station,   // Station được gán cho STAFF
      // nếu type Account còn field khác thì map thêm ở đây
    } as Account;
  } catch (error) {
    handleFirebaseError(error, "lấy thông tin tài khoản theo uid");
    return null;
  }
}

// --- QUẢN LÝ NHÂN VIÊN (DÙNG CLOUD FUNCTIONS) ---

/**
 * Admin gọi Cloud Function để tạo tài khoản Firebase Auth mà không bị logout
 */
export const registerEmployee = async (employeeData: any) => {
  const registerFn = httpsCallable(functions, 'registerEmployee');
  try {
    const result = await registerFn(employeeData);
    return result.data;
  } catch (error) {
    throw new Error(handleFirebaseError(error, "đăng ký nhân viên qua Server"));
  }
};

export const deleteEmployee = async (targetUid: string) => {
  const deleteFn = httpsCallable(functions, 'deleteEmployee');
  try {
    await deleteFn({ uid: targetUid });
  } catch (error) {
    throw new Error(handleFirebaseError(error, "xóa nhân viên qua Server"));
  }
};

export const getAccounts = async (): Promise<Account[]> => {
  try {
    const q = query(collection(db, COLLECTION_ACCOUNTS));
    const querySnapshot = await getDocs(q);
    const accounts: Account[] = [];
    querySnapshot.forEach((doc) => {
      accounts.push({ uid: doc.id, ...doc.data() } as Account);
    });
    return accounts;
  } catch (error) {
    handleFirebaseError(error, "tải danh sách tài khoản");
    return [];
  }
};

// --- XỬ LÝ ĐƠN HÀNG ---

export const getOrders = async (): Promise<Order[]> => {
  try {
    const q = query(collection(db, COLLECTION_ORDERS));
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    querySnapshot.forEach((doc) => {
      orders.push(doc.data() as Order);
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error: any) {
    handleFirebaseError(error, "tải đơn hàng");
    return [];
  }
};

// Fix: Thêm hàm getOrderById để lấy thông tin chi tiết đơn hàng từ Firestore
export const getOrderById = async (id: string): Promise<Order | null> => {
  try {
    const docRef = doc(db, COLLECTION_ORDERS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Order;
    }
    return null;
  } catch (error: any) {
    handleFirebaseError(error, "lấy chi tiết đơn hàng");
    return null;
  }
};

export const saveOrder = async (order: Order): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTION_ORDERS, order.id), order);
  } catch (error) {
    throw new Error(handleFirebaseError(error, "lưu đơn hàng"));
  }
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_ORDERS, id));
  } catch (error) {
    throw new Error(handleFirebaseError(error, "xóa đơn hàng"));
  }
};

// --- HELPER ---
export const generateOrderCode = (): string => `VD${Math.floor(1000 + Math.random() * 9000)}`;
export const formatCurrency = (amount: number): string => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
export const formatDate = (isoString: string): string => isoString ? new Date(isoString).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export const isEditable = (order: Order): boolean => {
  if (!order || !order.createdAt) return false;
  const orderDate = new Date(order.createdAt);
  const now = new Date();
  return orderDate.toDateString() === now.toDateString();
};
