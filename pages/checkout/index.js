// checkout/index.js
Page({
  data: {
    address: null,
    cartItems: [],
    totalPrice: 0,
    freight: 0,
    totalAmount: 0,
    remark: '',
    paymentMethod: 'wechat',
    deliveryMethod: 'express',
    deliveryMethodText: '快递配送',
    needInvoice: false,
    invoiceTitle: '',
    invoiceTaxNumber: '',
    showDeliveryPopup: false,
    showInvoicePopup: false,
    submitting: false
  },

  onLoad: function(options) {
    // 从本地存储加载购物车数据
    this.loadCartFromStorage();
    
    // 从本地存储加载地址数据
    this.loadAddressFromStorage();
    
    // 计算价格
    this.calculatePrice();
  },

  // 从本地存储加载购物车数据
  loadCartFromStorage: function() {
    try {
      const cartData = wx.getStorageSync('cartItems');
      if (cartData) {
        const cartItems = JSON.parse(cartData);
        this.setData({
          cartItems: cartItems
        });
      }
    } catch (e) {
      console.error('加载购物车数据失败:', e);
    }
  },

  // 从本地存储加载地址数据
  loadAddressFromStorage: function() {
    try {
      const addressData = wx.getStorageSync('defaultAddress');
      if (addressData) {
        this.setData({
          address: JSON.parse(addressData)
        });
      }
    } catch (e) {
      console.error('加载地址数据失败:', e);
    }
  },

  // 计算价格
  calculatePrice: function() {
    const totalPrice = this.data.cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    // 计算运费，这里简单实现：总价超过99元免运费，否则8元运费
    const freight = totalPrice >= 99 ? 0 : 8;
    
    // 计算总金额
    const totalAmount = totalPrice + freight;
    
    this.setData({
      totalPrice: totalPrice.toFixed(2),
      freight: freight.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    });
  },

  // 点击返回按钮
  onClickBack: function() {
    wx.navigateBack();
  },

  // 选择地址
  chooseAddress: function() {
     // 判断是否在开发环境
    if (wx.getSystemInfoSync().platform === 'devtools') {
      // 模拟器中使用测试数据
      const mockAddress = {
        name: '测试用户',
        phone: '13800138000',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园路000号'
      };
      
      this.setData({
        address: mockAddress
      });
      
      // 保存地址到本地存储
      wx.setStorageSync('defaultAddress', JSON.stringify(mockAddress));
    } else {
      const that = this;
      wx.chooseAddress({
        success(res) {
          const address = {
            name: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            detail: res.detailInfo
          };
        
          that.setData({
            address: address
          });
        
          // 保存地址到本地存储
          try {
            wx.setStorageSync('defaultAddress', JSON.stringify(address));
          } catch (e) {
            console.error('保存地址数据失败:', e);
          } 
        },
        fail(err) {
          // 如果用户拒绝授权或取消选择地址
          if (err.errMsg !== 'chooseAddress:fail cancel') {
            wx.showToast({
              title: '请授权使用通讯地址',
              icon: 'none'
            });
          }
        }
      });
    }
  },

  // 备注内容变化
  onRemarkChange: function(event) {
    this.setData({
      remark: event.detail
    });
  },

  // 点击支付方式单元格
  onPaymentCellClick: function(event) {
    const name = event.currentTarget.dataset.name;
    this.setData({
      paymentMethod: name
    });
  },

  // 支付方式变化
  onPaymentChange: function(event) {
    this.setData({
      paymentMethod: event.detail
    });
  },

  // 显示配送方式弹出层
  showDeliveryPopup: function() {
    this.setData({
      showDeliveryPopup: true
    });
  },

  // 关闭配送方式弹出层
  onCloseDeliveryPopup: function() {
    this.setData({
      showDeliveryPopup: false
    });
    
    // 如果选择了自提，则更新运费为0
    if (this.data.deliveryMethod === 'self') {
      this.setData({
        freight: 0
      });
    } else {
      // 如果选择了快递，重新计算运费
      const totalPrice = parseFloat(this.data.totalPrice);
      const freight = totalPrice >= 99 ? 0 : 8;
      this.setData({
        freight: freight.toFixed(2)
      });
    }
    
    // 重新计算总金额
    this.setData({
      totalAmount: (parseFloat(this.data.totalPrice) + parseFloat(this.data.freight)).toFixed(2)
    });
  },

  // 点击配送方式单元格
  onDeliveryCellClick: function(event) {
    const name = event.currentTarget.dataset.name;
    let text = '';
    
    if (name === 'express') {
      text = '快递配送';
    } else if (name === 'self') {
      text = '到店自取';
    }
    
    this.setData({
      deliveryMethod: name,
      deliveryMethodText: text
    });
  },

  // 配送方式变化
  onDeliveryChange: function(event) {
    let text = '';
    
    if (event.detail === 'express') {
      text = '快递配送';
    } else if (event.detail === 'self') {
      text = '到店自取';
    }
    
    this.setData({
      deliveryMethod: event.detail,
      deliveryMethodText: text
    });
  },

  // 显示发票弹出层
  showInvoicePopup: function() {
    this.setData({
      showInvoicePopup: true
    });
  },

  // 关闭发票弹出层
  onCloseInvoicePopup: function() {
    this.setData({
      showInvoicePopup: false
    });
  },

  // 点击发票类型单元格
  onInvoiceCellClick: function(event) {
    const name = event.currentTarget.dataset.name;
    this.setData({
      needInvoice: name === 'yes'
    });
  },

  // 发票类型变化
  onInvoiceTypeChange: function(event) {
    this.setData({
      needInvoice: event.detail === 'yes'
    });
  },

  // 发票抬头变化
  onInvoiceTitleChange: function(event) {
    this.setData({
      invoiceTitle: event.detail
    });
  },

  // 纳税人识别号变化
  onInvoiceTaxNumberChange: function(event) {
    this.setData({
      invoiceTaxNumber: event.detail
    });
  },

  // 提交订单
  onSubmitOrder: function() {
    // 校验地址
    if (!this.data.address) {
      wx.showToast({
        title: '请选择收货地址',
        icon: 'none'
      });
      return;
    }
    
    // 如果需要发票但未填写抬头
    if (this.data.needInvoice && !this.data.invoiceTitle) {
      wx.showToast({
        title: '请填写发票抬头',
        icon: 'none'
      });
      return;
    }
    
    // 设置提交中状态
    this.setData({
      submitting: true
    });
    
    // 创建订单数据
    const orderData = {
      address: this.data.address,
      cartItems: this.data.cartItems,
      totalPrice: this.data.totalPrice,
      freight: this.data.freight,
      totalAmount: this.data.totalAmount,
      remark: this.data.remark,
      paymentMethod: this.data.paymentMethod,
      deliveryMethod: this.data.deliveryMethod,
      needInvoice: this.data.needInvoice,
      invoiceTitle: this.data.invoiceTitle,
      invoiceTaxNumber: this.data.invoiceTaxNumber,
      orderTime: new Date().getTime(),
      orderStatus: 'pending' // 待支付状态
    };
    
    // 调用云函数将订单数据保存到云数据库
    wx.cloud.callFunction({
      name: 'saveOrder',
      data: {
        orderData: orderData
      },
      success: res => {
        console.log('订单提交成功:', res);
        
        // 获取返回的云数据库订单ID
        const result = res.result;
        
        if (result.success) {
          const orderId = result.orderId;
          
          // 提交成功后，清空购物车
          try {
            wx.setStorageSync('cartItems', '[]');
          } catch (e) {
            console.error('清空购物车失败:', e);
          }
          
          // 结束提交状态
          this.setData({
            submitting: false
          });
          
          // 如果是微信支付，调用支付接口
          if (this.data.paymentMethod === 'wechat') {
            // 实际应用中，这里应该调用微信支付接口
            wx.showModal({
              title: '模拟支付',
              content: '实际应用中，这里会调用微信支付接口。是否模拟支付成功？',
              success: (res) => {
                if (res.confirm) {
                  // 模拟支付成功，跳转到订单详情页面
                  wx.navigateTo({
                    url: '/pages/order-detail/index?orderId=' + orderId
                  });
                }
              }
            });
          } else {
            // 如果是货到付款，直接跳转到订单详情页面
            wx.showToast({
              title: '订单提交成功',
              icon: 'success',
              duration: 1500,
              success: () => {
                setTimeout(() => {
                  wx.navigateTo({
                    url: '/pages/getOrderDetial/index?orderId=' + orderId
                  });
                }, 1500);
              }
            });
          }
        } else {
          // 订单提交失败
          wx.showToast({
            title: '订单提交失败',
            icon: 'none'
          });
          
          // 结束提交状态
          this.setData({
            submitting: false
          });
        }
      },
      fail: err => {
        console.error('调用云函数失败:', err);
        
        wx.showToast({
          title: '订单提交失败，请重试',
          icon: 'none'
        });
        
        // 结束提交状态
        this.setData({
          submitting: false
        });
      }
    });
  }
});