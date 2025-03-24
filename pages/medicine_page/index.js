const app = getApp();
const BASE_URL = app.globalData.BASE_URL;

Page({
  data: {
    placement: 'left',
    messages: [], // 聊天消息
    userInput: '', // 用户输入框内容
    showSidebar: false, // 控制侧边栏显示状态
    isThinking: false,
    scrollToView: '',
    showMedicineIntro: true, // 控制介绍卡片显示
    quickQuestions: [
      '这个药有什么副作用？',
      '感冒药可以和咳嗽药一起吃吗？',
      '高血压患者应该避免什么药？',
      '如何正确服用抗生素？'
    ],
    sessions: [], // 存储会话列表
    currentSessionId: ''
  },

  onLoad: function () {
    this.switchToMedicineService(()=>{
      this.loadSessions();
      this.getActiveSession();
    });
  },

  onUnload:function() {
    //页面卸载时切回默认服务类型
    wx.request({
      url: `${BASE_URL}/service/switch`,
      method: 'POST',
      data: JSON.stringify({ service_type: 'home' }),
      header: { 'content-type': 'application/json' }
    });
  },

  switchToMedicineService:function (callback){
    wx.request({
      url: `${BASE_URL}/service/switch`,
      method: 'POST',
      data: JSON.stringify({ service_type: 'medicine' }),
      header: {'content-type': 'application/json'},
      success: (res) => {
        if (res.statusCode === 200){
          console.log('切换到问药服务成功', res.data);
          if(callback && typeof callback === 'function'){
            callback();
          }
        } else {
          console.error('切换服务类型失败', res.data);
          wx.showToast({
            title: '切换服务类型失败',
            icon: 'none'
          });
        }
      },
      fail:(err)=> {
        console.error('切换服务类型请求失败:', err);
        wx.showToast({
          title: '网络异常',
          icon: 'none'
        });
      }
    });
  },

  // 加载所有会话
  loadSessions: function() {
    wx.request({
      url: `${BASE_URL}/sessions`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ sessions: res.data.sessions });
        }
      },
      fail: (err) => console.error('加载会话列表失败:', err)
    });
  },

  // 获取当前活跃会话
  getActiveSession: function() {
    wx.request({
      url: `${BASE_URL}/session/active`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            currentSessionId: res.data.session_id
          }, () => this.loadMessages());
        }
      },
      fail: (err) => console.error('获取当前会话失败:', err)
    });
  },

  // 创建新会话
  createNewSession: function() {
    wx.request({
      url: `${BASE_URL}/session/new`,
      method: 'POST',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            currentSessionId: res.data.session_id,
            showMedicineIntro: true, // 显示介绍卡片
            messages: [] // 清空消息
          }, () => {
            this.loadMessages();
            this.loadSessions();
          });
        }
      },
      fail: (err) => console.error('创建新会话失败:', err)
    });
  },

  // 加载当前会话的消息
  loadMessages: function() {
    const sessionId = this.data.currentSessionId;
    if (!sessionId){
      return;
    }

    wx.request({
      url: `${BASE_URL}/messages?session_id=${sessionId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          // 处理消息数据，为助手消息添加towxml渲染
          const processedMessages = res.data.messages.map(msg => {
            if (msg.role === 'assistant' && msg.content) {
              try {
                // 使用towxml转换Markdown
                const towxmlData = app.towxml(
                    msg.content,
                    'markdown',
                    {
                      base: '',
                      theme: 'light'
                    }
                );
                return {...msg, towxml: towxmlData};
              } catch (err) {
                console.error('解析历史消息Markdown失败:', err);
                return msg;
              }
            }
            return msg;
          });

          this.setData({ messages: processedMessages });
        }
      },
      fail: (err) => console.error('加载消息失败:', err)
    });
  },

  // 发送消息
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
    const messageIndex = updatedMessages.length - 1;

    this.setData({
      messages: updatedMessages,
      isThinking: true,
      scrollToView: 'thinking-animation',
      showMedicineIntro: false, // 发送消息后隐藏介绍卡片
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
                scrollToView: 'msg-' + (newMessagesList.length - 1)
              }, () => {
                // 强制滚动到最新消息
                setTimeout(() => {
                  this.setData({
                    scrollToView: 'msg-' + (newMessagesList.length - 1)
                  });
                }, 100);
              });

              // 获取更新后的会话列表
              this.loadSessions();
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
                scrollToView: 'msg-' + (newMessagesList.length - 1)
              });

              // 获取更新后的会话列表
              this.loadSessions();
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
              scrollToView: 'msg-' + (newMessagesList.length - 1)
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
              scrollToView: 'msg-' + (newMessagesList.length - 1)
            });
          }
        }
      });
    };

    // 开始发送
    sendWithRetry();
  },

  // 处理快速问题点击
  onQuickQuestionTap: function(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ userInput: question }, () => {
      this.sendMessage();
    });
  },

  // 关闭介绍卡片
  closeMedicineIntro: function() {
    this.setData({ showMedicineIntro: false });
  },

  // 输入框变化处理函数
  onInputChange: function(e) {
    const value = e.detail.value;
    if (typeof value === 'string') {
      this.setData({ userInput: value });
    }
  },

  toggleSidebar: function() {
    this.setData({ showSidebar: !this.data.showSidebar });
  },

  // 删除会话
  deleteSession: function(e) {
    const sessionId = e.currentTarget.dataset.id;
    wx.request({
      url: `${BASE_URL}/session/delete`,
      method: 'POST',
      data: JSON.stringify({ session_id: sessionId }),
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.loadSessions();
          // 如果删除的是当前会话，需要获取新的活跃会话
          if (sessionId === this.data.currentSessionId) {
            this.getActiveSession();
          }
        }
      },
      fail: (err) => console.error('删除会话失败:', err)
    });
  },

  // 切换会话
  onSessionChange: function(e) {
    const sessionId = e.currentTarget.dataset.id;
    wx.request({
      url: `${BASE_URL}/session/switch`,
      method: 'POST',
      data: JSON.stringify({ session_id: sessionId }),
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            currentSessionId: sessionId,
            showSidebar: false
          }, () => {
            this.loadMessages();
            this.loadSessions();
          });
        } else if (res.statusCode === 404) {
          wx.showToast({
            title: '该会话不存在',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('切换会话失败:', err);
        wx.showToast({
          title: err.errMsg.includes('timeout') ? '请求超时' : '网络异常',
          icon: 'none'
        });
      }
    });
  },



})