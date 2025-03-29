// order-detail/index.js
Page({
  data: {
    orderId: '',
    orderInfo: null,
    loading: true
  },

  onLoad: function(options) {
    if (options.orderId) {
      this.setData({
        orderId: options.orderId
      });
      
      // 加载订单信息
      this.loadOrderInfo(options.orderId);
    } else {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      });
    }
  },
  
  // 从云数据库加载订单信息
  loadOrderInfo: function(orderId) {
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'getOrderDetail',
      data: {
        orderId: orderId
      },
      success: res => {
        console.log('获取订单详情成功:', res);
        
        const result = res.result;
        if (result.success && result.data) {
          this.setData({
            orderInfo: result.data
          });
        } else {
          wx.showToast({
            title: '订单不存在',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('获取订单详情失败:', err);
        wx.showToast({
          title: '获取订单信息失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },
  
  // 格式化时间
  formatDate: function(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },
  
  // 格式化支付方式文本
  formatPaymentMethod: function(method) {
    if (method === 'wechat') {
      return '微信支付';
    } else if (method === 'cod') {
      return '货到付款';
    }
    return method;
  },
  
  // 格式化配送方式文本
  formatDeliveryMethod: function(method) {
    if (method === 'express') {
      return '快递配送';
    } else if (method === 'self') {
      return '到店自取';
    }
    return method;
  },
  
  // 格式化订单状态文本
  formatOrderStatus: function(status) {
    const statusMap = {
      'pending': '待支付',
      'paid': '已支付',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },
  
  // 复制订单号
  copyOrderId: function() {
    wx.setClipboardData({
      data: this.data.orderId,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        });
      }
    });
  },
  
  // 返回首页
  backToHome: function() {
    wx.switchTab({
      url: '/pages/index/index'  // 替换为你的首页路径
    });
  },
  
  // 查看物流信息（示例）
  viewLogistics: function() {
    wx.showToast({
      title: '暂无物流信息',
      icon: 'none'
    });
  },
  
  // 联系客服（示例）
  contactService: function() {
    wx.showToast({
      title: '客服功能开发中',
      icon: 'none'
    });
  }
});