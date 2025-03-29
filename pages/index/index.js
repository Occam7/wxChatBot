// home_page.js
const app = getApp();
const BASE_URL = app.globalData.BASE_URL;

Page({
  data: {
    messages: [],       // 聊天消息
    userInput: '',      // 用户输入内容
    isThinking: false,  // 思考状态
    scrollToView: '',   // 滚动定位标识
    showWelcome: true,  // 显示欢迎卡片
    quickQuestions: [   // 快捷问题列表
      '什么是高血压？',
      '如何保持健康的作息？',
      '感冒了应该注意什么？',
      '饮食健康有哪些建议？'
    ],
    serviceType: 'HEALTH' // 当前服务类型
  },

  onLoad: function() {
    this.showWelcomeMessage();
    this.getActiveServiceType();
    this.test();
  },
  test:function (){
    wx.request({
      url: `${BASE_URL}/service/active`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          console.log(res.data.service_type);
        }
      },
      fail: (err) => {
        console.error('获取服务类型失败:', err);
      }
    })
  },
  // 获取当前服务类型
  getActiveServiceType: function() {
    wx.request({
      url: `${BASE_URL}/service/active`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ serviceType: res.data.service_type });
        }
      },
      fail: (err) => {
        console.error('获取服务类型失败:', err);
      }
    });
  },

  // 切换服务类型
  switchServiceType: function(e) {
    const serviceType = e.currentTarget.dataset.type;
    wx.request({
      url: `${BASE_URL}/service/switch`,
      method: 'POST',
      data: JSON.stringify({ service_type: serviceType }),
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ serviceType: res.data.service_type });
          wx.showToast({
            title: `已切换到${res.data.service_name}服务`,
            icon: 'success'
          });
        }
      },
      fail: (err) => {
        console.error('切换服务类型失败:', err);
        wx.showToast({
          title: '切换服务类型失败',
          icon: 'none'
        });
      }
    });
  },

  // 显示欢迎信息
  showWelcomeMessage: function() {
    // 欢迎卡片逻辑保持不变
  },

  // 处理快捷问题点击
  onQuickQuestionTap: function(e) {
    const question = e.currentTarget.dataset.question || '';
    this.setData({ userInput: question }, () => {
      this.sendMessage();
    });
  },

  // 关闭欢迎卡片
  closeWelcomeCard: function() {
    this.setData({ showWelcome: false });
  },

  // 输入框内容变化处理
  onInputChange: function(e) {
    const value = e.detail.value || ''; // 添加空字符串作为默认值
    this.setData({ userInput: e.detail.value });
  },

// 发送消息核心逻辑
  sendMessage: function() {
    // 添加防御性检查确保userInput存在
    if (!this.data || typeof this.data.userInput === 'undefined') {
      console.error('userInput是undefined');
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
      return;
    }

    const query = this.data.userInput.trim();
    if (!query) return;

    // 更新消息列表
    const newMessage = { content: query, role: 'user' };
    const updatedMessages = [...this.data.messages, newMessage];

    this.setData({
      messages: updatedMessages,
      isThinking: true,
      scrollToView: 'thinking-animation',
      showWelcome: false,
      userInput: ''
    });

    // 发送请求到后端
    const sendWithRetry = (retryCount = 0, maxRetries = 2) => {
      wx.request({
        url: `${BASE_URL}/chat`,
        method: 'POST',
        data: JSON.stringify({ query: query }),
        header: { 'content-type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 200) {
            const response = res.data.response;
            try {
              // 使用towxml转换Markdown
              const towxmlData = app.towxml(
                  response,
                  'markdown',
                  {
                    base: '',
                    theme: 'light'
                  }
              );

              // 更新消息列表
              const newMessagesList = [...this.data.messages, {
                content: response,
                towxml: towxmlData,
                role: 'assistant'
              }];

              this.setData({
                isThinking: false,
                messages: newMessagesList,
                scrollToView: 'bottom-anchor'
              }, () => {
                // 强制滚动到最新消息
                setTimeout(() => {
                  this.setData({
                    scrollToView: 'bottom-anchor'
                  });
                }, 100);
              });
            } catch (err) {
              console.error('解析Markdown失败:', err);
              // 如果towxml解析失败，仍然显示原始文本
              const newMessagesList = [...this.data.messages, {
                content: response,
                role: 'assistant'
              }];

              this.setData({
                isThinking: false,
                messages: newMessagesList,
                scrollToView: 'bottom-anchor'
              });
            }
          } else if (res.statusCode === 500 && retryCount < maxRetries) {
            // 服务器错误时尝试重试
            console.log(`服务器错误，正在重试 (${retryCount + 1}/${maxRetries})...`);
            setTimeout(() => {
              sendWithRetry(retryCount + 1, maxRetries);
            }, 1000); // 等待1秒后重试
          } else {
            // 所有重试失败或其他错误
            console.error('请求失败:', res);
            const errorMessage = {
              content: "抱歉，我现在无法回答您的问题。请稍后再试。",
              role: 'system'
            };
            const newMessagesList = [...this.data.messages, errorMessage];
            this.setData({
              isThinking: false,
              messages: newMessagesList,
              scrollToView: 'bottom-anchor'
            });
          }
        },
        fail: (err) => {
          if (retryCount < maxRetries) {
            // 网络错误时尝试重试
            console.log(`网络错误，正在重试 (${retryCount + 1}/${maxRetries})...`);
            setTimeout(() => {
              sendWithRetry(retryCount + 1, maxRetries);
            }, 1000); // 等待1秒后重试
          } else {
            // 所有重试失败
            console.error('发送消息失败:', err);
            const errorMessage = {
              content: "网络连接异常，请检查您的网络后重试。",
              role: 'system'
            };
            const newMessagesList = [...this.data.messages, errorMessage];
            this.setData({
              isThinking: false,
              messages: newMessagesList,
              scrollToView: 'bottom-anchor'
            });
          }
        }
      });
    };

    // 开始发送
    sendWithRetry();
  },

  // 页面跳转方法
  navigateToMedical: function() {
    this.switchServiceAndNavigate('medical', '/pages/medical_page/index');
  },

  navigateToMedicine: function() {
    this.switchServiceAndNavigate('medicine', '/pages/medicine_page/index');
  },

  navigateToHealth: function() {
    this.switchServiceAndNavigate('health', '/pages/health_page/index')
  },

  navigateToUserCenter: function() {
    wx.navigateTo({ 
      url: '/pages/personalCenter/index'
    });
  },

  navigateToHerbalShop: function() {
    wx.navigateTo({ 
      url: '/pages/shop/index'
    });
  },

  // 通用服务切换导航方法
  switchServiceAndNavigate: function(serviceType, path) {
    const type = serviceType.toLowerCase();
    wx.request({
      url: `${BASE_URL}/service/switch`,
      method: 'POST',
      data: JSON.stringify({ service_type: serviceType }),
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.navigateTo({ url: path });
        }
      },
      fail: (err) => {
        console.error('服务切换失败:', err);
        wx.navigateTo({ url: path }); // 失败时仍尝试跳转
      }
    });
  }
});
