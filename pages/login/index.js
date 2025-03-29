// login/index.js
Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    phoneNumber: '',
    isLoading: false,
    loginType: 'wechat', // 'wechat' 或 'phone'
    // 新增字段
    showConfirmPopup: false,
    tempUserInfo: null,
    useWechatInfo: true // 默认使用微信信息
  },

  onLoad() {
    // 判断是否可以使用 wx.getUserProfile
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
    
    // 检查用户是否已登录
    this.checkLoginStatus();
  },

  // 检查用户登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
      // 已登录，跳转到首页
      wx.navigateTo({
        url: '/pages/index/index'
      });
    }
  },

  // 切换登录方式
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      loginType: type
    });
  },

  // 微信登录步骤1：获取用户信息
  wechatLogin() {
    this.setData({ isLoading: true });
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        
        // 保存临时用户信息并显示确认弹窗
        this.setData({
          tempUserInfo: userInfo,
          showConfirmPopup: true,
          isLoading: false
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        this.setData({ isLoading: false });
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 切换是否使用微信信息
  toggleUseWechatInfo() {
    this.setData({
      useWechatInfo: !this.data.useWechatInfo
    });
  },
  
  // 关闭确认弹窗
  closeConfirmPopup() {
    this.setData({
      showConfirmPopup: false
    });
  },

  // 微信登录步骤2：确认并执行登录
  confirmWechatLogin() {
    this.setData({ isLoading: true });
    
    const finalUserInfo = this.data.useWechatInfo 
      ? this.data.tempUserInfo 
      : {
          // 如果不使用微信信息，提供默认值
          nickName: '用户' + Math.floor(Math.random() * 10000),
          avatarUrl: '/images/default-avatar.png', // 确保你有这个默认头像
          gender: 0,
          country: '',
          province: '',
          city: ''
        };
    
    // 调用云函数进行登录
    wx.cloud.callFunction({
      name: 'login',
      data: {
        userInfo: finalUserInfo,
        loginType: 'wechat',
        useWechatInfo: this.data.useWechatInfo
      },
      success: (result) => {
        const { openid, userId } = result.result;
        
        // 保存登录信息到本地
        wx.setStorageSync('userInfo', {
          ...finalUserInfo,
          openid: openid,
          userId: userId
        });
        
        this.setData({
          userInfo: finalUserInfo,
          hasUserInfo: true,
          isLoading: false,
          showConfirmPopup: false
        });
        
        // 登录成功，跳转到首页
        wx.navigateTo({
          url: '/pages/index/index'
        });
      },
      fail: (err) => {
        console.error('微信登录失败', err);
        this.setData({ 
          isLoading: false,
          showConfirmPopup: false 
        });
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      phoneNumber: e.detail
    });
  },

  // 手机号登录
  phoneLogin() {
    if (!this.data.phoneNumber || this.data.phoneNumber.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isLoading: true });
    
    // 调用云函数进行手机号登录
    wx.cloud.callFunction({
      name: 'login',
      data: {
        phoneNumber: this.data.phoneNumber,
        loginType: 'phone'
      },
      success: (result) => {
        const { userId } = result.result;
        
        // 保存登录信息到本地
        wx.setStorageSync('userInfo', {
          phoneNumber: this.data.phoneNumber,
          userId: userId,
          nickName: '用户' + Math.floor(Math.random() * 10000),
          avatarUrl: '/images/default-avatar.png' // 确保你有这个默认头像
        });
        
        this.setData({
          hasUserInfo: true,
          isLoading: false
        });
        
        // 登录成功，跳转到首页
        wx.navigateTo({
          url: '/pages/index/index'
        });
      },
      fail: (err) => {
        console.error('手机号登录失败', err);
        this.setData({ isLoading: false });
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 通过手机号获取验证码
  getVerifyCode() {
    if (!this.data.phoneNumber || this.data.phoneNumber.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    wx.showToast({
      title: '验证码已发送',
      icon: 'success'
    });
    
    // 实际应用中这里应该调用云函数发送验证码
  }
})