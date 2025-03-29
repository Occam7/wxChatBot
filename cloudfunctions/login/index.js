// 云函数入口文件 login/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const usersCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 获取登录类型和相关数据
    const { loginType, userInfo, phoneNumber, useWechatInfo } = event
    let userId = null
    let userRecord = null
    
    // 根据openid查询用户是否已存在
    const existingUser = await usersCollection.where({
      openid: openid
    }).get()
    
    if (existingUser.data.length > 0) {
      // 用户已存在，获取用户ID
      userRecord = existingUser.data[0]
      userId = userRecord._id
      
      // 更新用户信息
      if (loginType === 'wechat' && userInfo) {
        let updateData = {
          lastLoginTime: db.serverDate()
        };
        
        // 只有当用户选择使用微信信息时，才更新微信相关字段
        if (useWechatInfo !== false) {
          updateData = {
            ...updateData,
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            country: userInfo.country,
            province: userInfo.province,
            city: userInfo.city
          };
        }
        
        await usersCollection.doc(userId).update({
          data: updateData
        });
      } else if (loginType === 'phone' && phoneNumber) {
        await usersCollection.doc(userId).update({
          data: {
            phoneNumber: phoneNumber,
            lastLoginTime: db.serverDate()
          }
        });
      }
    } else {
      // 用户不存在，创建新用户
      let userData = {
        openid: openid,
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      };
      
      if (loginType === 'wechat' && userInfo) {
        // 只有当用户选择使用微信信息时，才添加微信相关字段
        if (useWechatInfo !== false) {
          userData = {
            ...userData,
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            country: userInfo.country,
            province: userInfo.province,
            city: userInfo.city
          };
        } else {
          // 使用默认信息
          userData = {
            ...userData,
            nickName: userInfo.nickName, // 前端已处理为默认昵称
            avatarUrl: userInfo.avatarUrl // 前端已处理为默认头像
          };
        }
      } else if (loginType === 'phone' && phoneNumber) {
        userData = {
          ...userData,
          phoneNumber: phoneNumber
        };
      }
      
      const addResult = await usersCollection.add({
        data: userData
      });
      
      userId = addResult._id;
    }
    
    // 返回用户信息
    return {
      openid: openid,
      userId: userId,
      success: true
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      error: error
    };
  }
};