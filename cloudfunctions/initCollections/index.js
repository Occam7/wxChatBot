// initCollections/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 创建users集合
    try {
      await db.createCollection('users')
      console.log('users集合创建成功')
    } catch (e) {
      console.log('users集合已存在或创建失败', e)
    }

    // 创建health_profiles集合
    try {
      await db.createCollection('health_profiles')
      console.log('health_profiles集合创建成功')
    } catch (e) {
      console.log('health_profiles集合已存在或创建失败', e)
    }

    // 创建chat_sessions集合
    try {
      await db.createCollection('chat_sessions')
      console.log('chat_sessions集合创建成功')
    } catch (e) {
      console.log('chat_sessions集合已存在或创建失败', e)
    }

    // 为chat_sessions创建索引
    try {
      await db.collection('chat_sessions').createIndex({
        fieldPath: 'sessionId',
        unique: true
      })
      console.log('chat_sessions sessionId索引创建成功')
    } catch (e) {
      console.log('创建索引失败', e)
    }

    try {
      await db.collection('chat_sessions').createIndex({
        fieldPath: ['_openid', 'updateTime'],
        unique: false
      })
      console.log('chat_sessions _openid和updateTime复合索引创建成功')
    } catch (e) {
      console.log('创建索引失败', e)
    }

    // 为health_profiles创建索引
    try {
      await db.collection('health_profiles').createIndex({
        fieldPath: '_openid',
        unique: true  // 每个用户只有一个健康档案
      })
      console.log('health_profiles _openid索引创建成功')
    } catch (e) {
      console.log('创建索引失败', e)
    }

    return {
      success: true,
      message: '集合初始化完成'
    }
  } catch (error) {
    return {
      success: false,
      error
    }
  }
}