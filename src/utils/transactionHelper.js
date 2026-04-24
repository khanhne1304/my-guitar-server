import mongoose from 'mongoose';

let transactionSupported = null;

/**
 * Kiểm tra xem MongoDB có hỗ trợ transactions không
 * Transactions chỉ hoạt động trên replica set hoặc sharded cluster
 */
export async function isTransactionSupported() {
  if (transactionSupported !== null) {
    return transactionSupported;
  }

  try {
    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();
    
    // Kiểm tra xem có phải replica set hoặc sharded cluster không
    const isReplicaSet = serverStatus.repl && serverStatus.repl.setName;
    const isSharded = serverStatus.process === 'mongos';
    
    transactionSupported = isReplicaSet || isSharded;
    
    if (!transactionSupported) {
      console.warn('⚠️  MongoDB transactions not supported. Running in standalone mode. Using fallback operations.');
    } else {
      console.log('✅ MongoDB transactions supported');
    }
    
    return transactionSupported;
  } catch (error) {
    // Nếu không thể check, giả sử không hỗ trợ để an toàn
    console.warn('⚠️  Could not check transaction support. Assuming not supported.');
    transactionSupported = false;
    return false;
  }
}

/**
 * Wrapper để thực thi code với hoặc không có transaction
 */
export async function executeWithTransaction(callback) {
  const supportsTransaction = await isTransactionSupported();
  
  if (supportsTransaction) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    // Fallback: thực thi không có transaction
    // Sử dụng atomic operations để giảm thiểu race conditions
    return await callback(null);
  }
}

