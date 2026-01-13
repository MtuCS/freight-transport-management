const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function để tạo nhân viên mới
 * QUAN TRỌNG: Dùng onCall để tương thích với httpsCallable từ client
 */
exports.registerEmployee = functions
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // Kiểm tra xác thực
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Chưa đăng nhập');
    }

    // Kiểm tra quyền Admin
    const adminDoc = await admin.firestore()
      .collection('accounts')
      .doc(context.auth.uid)
      .get();
    
    if (!adminDoc.exists || adminDoc.data().role !== 'ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Không có quyền Admin');
    }

    const { email, password, name, username, role } = data;
    
    try {
      // Tạo user trong Auth
      const userRecord = await admin.auth().createUser({ 
        email, 
        password, 
        displayName: name 
      });
      
      // Tạo profile trong Firestore
      await admin.firestore()
        .collection('accounts')
        .doc(userRecord.uid)
        .set({
          email, 
          name, 
          username, 
          role, 
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      
      return { success: true, uid: userRecord.uid };
    } catch (error) {
      console.error('Error creating employee:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Cloud Function để xóa nhân viên
 * QUAN TRỌNG: Dùng onCall để tương thích với httpsCallable từ client
 */
exports.deleteEmployee = functions
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // Kiểm tra xác thực
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Chưa đăng nhập');
    }

    // Kiểm tra quyền Admin
    const adminDoc = await admin.firestore()
      .collection('accounts')
      .doc(context.auth.uid)
      .get();
    
    if (!adminDoc.exists || adminDoc.data().role !== 'ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Không có quyền Admin');
    }

    const { uid } = data;
    
    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing uid');
    }

    try {
      // Xóa user khỏi Auth
      await admin.auth().deleteUser(uid);
      
      // Xóa profile khỏi Firestore
      await admin.firestore()
        .collection('accounts')
        .doc(uid)
        .delete();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });
