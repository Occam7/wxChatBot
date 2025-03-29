// 云函数 getOrderDetail/index.js

// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 默认环境配置，可以替换为你自己的环境ID
})

const db = cloud.database()
const ordersCollection = db.collection('orders')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 获取用户的openid
  const openid = wxContext.OPENID
  
  // 从前端传来的订单ID
  const orderId = event.orderId
  
  if (!orderId) {
    return {
      success: false,
      message: '订单ID不能为空'
    }
  }
  
  try {
    // 查询订单信息
    // 注意：在实际生产环境中，应该验证订单是否属于当前用户
    const orderDoc = await ordersCollection.doc(orderId).get()
    
    if (orderDoc.data) {
      // 验证订单是否属于当前用户
      if (orderDoc.data.openid !== openid) {
        return {
          success: false,
          message: '无权查看此订单'
        }
      }
      
      return {
        success: true,
        data: orderDoc.data
      }
    } else {
      return {
        success: false,
        message: '订单不存在'
      }
    }
  } catch (err) {
    if (err.errCode === -1) {
      // 文档不存在错误
      return {
        success: false,
        message: '订单不存在'
      }
    }
    
    return {
      success: false,
      error: err,
      message: '查询订单失败'
    }
  }
}