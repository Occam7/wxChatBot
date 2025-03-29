// personalCenter/index.js
Page({
  data: {
    userInfo: null,
    healthStats: {
      consultationCount: 0,   // 问诊次数
      healthAssessments: 0,   // 健康评估次数
      medicineInquiries: 0    // 药品咨询次数
    },
    healthRecords: {
      height: '',             // 身高(cm)
      weight: '',             // 体重(kg)
      bloodType: '',          // 血型
      allergies: [],          // 过敏史
      chronicDiseases: []     // 慢性病
    },
    notificationSettings: {   // 通知设置
      notificationsEnabled: true,  // 通知开关
      orderUpdates: true,     // 订单更新通知
      healthReminders: true   // 健康提醒
    },
    showEditHealth: false,    // 是否显示健康信息编辑弹窗
    activeTab: 0,             // 当前激活的标签页
    recentConsultations: [],  // 最近问诊记录
    orders: []                // 订单列表
  },

  onLoad() {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      });
      
      // 获取用户统计数据
      this.fetchUserStats();
      
      // 获取用户健康记录
      this.fetchHealthRecords();
      
      // 获取最近问诊记录
      this.fetchRecentConsultations();
      
      // 获取订单记录
      this.fetchOrders();
    } else {
      wx.redirectTo({
        url: '/pages/login/index',
      });
    }
  },
  
  // 获取用户订单记录
  fetchOrders() {
    wx.cloud.callFunction({
      name: 'getOrders',
      data: {
        userId: this.data.userInfo.userId
      },
      success: res => {
        if (res.result && res.result.orders) {
          this.setData({
            orders: res.result.orders
          });
        }
      },
      fail: err => {
        console.error('获取订单记录失败', err);
      }
    });
  },
  
  // 获取用户统计数据
  fetchUserStats() {
    wx.cloud.callFunction({
      name: 'getUserStats',
      data: {
        userId: this.data.userInfo.userId
      },
      success: res => {
        if (res.result && res.result.stats) {
          this.setData({
            'healthStats': res.result.stats
          });
        }
      },
      fail: err => {
        console.error('获取用户统计数据失败', err);
      }
    });
  },
  
  // 获取用户健康记录
  fetchHealthRecords() {
    wx.cloud.callFunction({
      name: 'getHealthRecords',
      data: {
        userId: this.data.userInfo.userId
      },
      success: res => {
        if (res.result && res.result.healthRecords) {
          this.setData({
            'healthRecords': res.result.healthRecords
          });
        }
      },
      fail: err => {
        console.error('获取健康记录失败', err);
      }
    });
  },
  
  // 获取最近问诊记录
  fetchRecentConsultations() {
    wx.cloud.callFunction({
      name: 'getRecentConsultations',
      data: {
        userId: this.data.userInfo.userId,
        limit: 5
      },
      success: res => {
        if (res.result && res.result.consultations) {
          this.setData({
            recentConsultations: res.result.consultations
          });
        }
      },
      fail: err => {
        console.error('获取最近问诊记录失败', err);
      }
    });
  },
  
  // 显示编辑健康信息弹窗
  showHealthEditor() {
    this.setData({
      showEditHealth: true
    });
  },
  
  // 关闭编辑健康信息弹窗
  closeHealthEditor() {
    this.setData({
      showEditHealth: false
    });
  },
  
  // 保存健康信息
  saveHealthRecords(e) {
    const formData = e.detail.value;
    
    wx.cloud.callFunction({
      name: 'updateHealthRecords',
      data: {
        userId: this.data.userInfo.userId,
        healthRecords: formData
      },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({
            healthRecords: formData,
            showEditHealth: false
          });
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        }
      },
      fail: err => {
        console.error('保存健康记录失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 切换标签页
  onTabChange(event) {
    this.setData({
      activeTab: event.detail.index
    });
  },
  
  // 切换通知设置
  toggleNotifications(event) {
    const value = event.detail;
    this.setData({
      'notificationSettings.notificationsEnabled': value
    });
    
    this.updateNotificationSettings();
  },
  
  // 切换订单更新通知
  toggleOrderUpdates(event) {
    const value = event.detail;
    this.setData({
      'notificationSettings.orderUpdates': value
    });
    
    this.updateNotificationSettings();
  },
  
  // 切换健康提醒通知
  toggleHealthReminders(event) {
    const value = event.detail;
    this.setData({
      'notificationSettings.healthReminders': value
    });
    
    this.updateNotificationSettings();
  },
  
  // 更新通知设置
  updateNotificationSettings() {
    wx.cloud.callFunction({
      name: 'updateNotificationSettings',
      data: {
        userId: this.data.userInfo.userId,
        settings: this.data.notificationSettings
      },
      success: res => {
        if (res.result && res.result.success) {
          wx.showToast({
            title: '设置已更新',
            icon: 'success',
            duration: 1000
          });
        }
      },
      fail: err => {
        console.error('更新通知设置失败', err);
      }
    });
  },
  
  // 查看订单详情
  viewOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/orderDetail/index?id=${orderId}`
    });
  },
  
  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.redirectTo({
            url: '/pages/login/index'
          });
        }
      }
    });
  },
  
  // 查看全部问诊记录
  viewAllConsultations() {
    wx.navigateTo({
      url: '/pages/consultationRecords/index'
    });
  },
  
  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacyPolicy/index'
    });
  },
  
  // 前往用户反馈页面
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  }
})