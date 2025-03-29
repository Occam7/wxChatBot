

// syncChatSession/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 从请求中获取会话信息
  const { sessionId, title, serviceType, messages, department } = event
  
  try {
    // 查询会话是否存在
    const sessionQuery = await db.collection('chat_sessions')
      .where({
        sessionId: sessionId,
        _openid: openid
      })
      .get()
    
    // 准备更新数据
    const sessionData = {
      title,
      serviceType,
      lastMessage: messages && messages.length > 0 ? 
        messages[messages.length - 1].content : '',
      messageCount: messages ? messages.length : 0,
      updateTime: db.serverDate()
    }
    
    // 如果是医疗服务且有科室信息，添加科室字段
    if (serviceType === 'MEDICAL' && department) {
      sessionData.department = department
    }
    
    if (sessionQuery.data.length > 0) {
      // 更新现有会话
      await db.collection('chat_sessions').doc(sessionQuery.data[0]._id).update({
        data: sessionData
      })
      
      return {
        success: true,
        sessionId,
        action: 'update'
      }
    } else {
      // 创建新会话
      sessionData.sessionId = sessionId
      sessionData.createTime = db.serverDate()
      
      const result = await db.collection('chat_sessions').add({
        data: sessionData
      })
      
      return {
        success: true,
        sessionId,
        _id: result._id,
        action: 'create'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}