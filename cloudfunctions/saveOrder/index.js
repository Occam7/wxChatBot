// 云函数 saveOrder/index.js

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
  
  // 从前端传来的订单数据
  const orderData = event.orderData
  
  // 添加用户标识
  orderData.openid = openid
  
  // 添加创建时间
  orderData.createTime = db.serverDate()
  
  try {
    // 将订单数据插入到云数据库的orders集合中
    const result = await ordersCollection.add({
      data: orderData
    })
    
    return {
      success: true,
      orderId: result._id,
      message: '订单提交成功'
    }
  } catch (err) {
    return {
      success: false,
      error: err,
      message: '订单提交失败'
    }
  }
}