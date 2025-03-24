const app = getApp();
const BASE_URL = app.globalData.BASE_URL;

Page({
  data: {
    messages: [], // 聊天消息
    userInput: '', // 用户输入框内容
    isThinking: false,
    scrollToView: '',
    showDoctorIntro: true, // 控制介绍卡片显示
    quickQuestions: [
      '您好医生，我想咨询一下头痛的问题',
      '我的血压一直偏高，需要吃什么药？',
      '这个检查报告结果正常吗？',
      '我的孩子发烧了，该怎么办？'
    ],
    doctors: [
      {
        id: 1,
        name: '王医生',
        title: '主任医师',
        department: '内科',
        avatar: '/assets/doctor1.png',
        online: true
      },
      {
        id: 2,
        name: '李医生',
        title: '副主任医师',
        department: '儿科',
        avatar: '/assets/doctor2.png',
        online: true
      },
      {
        id: 3,
        name: '张医生',
        title: '主治医师',
        department: '妇产科',
        avatar: '/assets/doctor3.png',
        online: false
      }
    ],
    currentDoctor: {
      id: 1,
      name: '王医生',
      title: '主任医师',
      department: '内科',
      avatar: '/assets/doctor1.png',
      online: true
    },
    showDoctorList: false,
    sessionId: '' // 当前会话ID
  },

  onLoad: function () {
    // 切换到医生服务

    this.switchToDoctorService(() => {
      // 创建新会话
      this.createNewSession();
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

  switchToDoctorService:function (callback){
    wx.request({
      url: `${BASE_URL}/service/switch`,
      method: 'POST',
      data: JSON.stringify({ service_type: 'doctor' }), // 更改为doctor服务类型
      header: {'content-type': 'application/json'},
      success: (res) => {
        if (res.statusCode === 200){
          console.log('切换到真人医生服务成功', res.data);
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

  // 创建新会话
  createNewSession: function() {
    wx.request({
      url: `${BASE_URL}/session/new`,
      method: 'POST',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            sessionId: res.data.session_id,
            showDoctorIntro: true, // 显示介绍卡片
            messages: [] // 清空消息
          });
        }
      },
      fail: (err) => console.error('创建新会话失败:', err)
    });
  },

  // 加载当前会话的消息
  loadMessages: function() {
    const sessionId = this.data.sessionId;
    if (!sessionId){
      // 如果没有当前会话ID，不执行请求
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

  // 开始新咨询
  startNewConsultation: function() {
    this.createNewSession();
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
      showDoctorIntro: false, // 发送消息后隐藏介绍卡片
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

              // 将回复包装为医生回复格式
              const doctorResponse = {
                content: response,
                towxml: towxmlData,
                role: 'assistant',
                doctorName: this.data.currentDoctor.name,
                doctorAvatar: this.data.currentDoctor.avatar
              };

              // 更新消息列表
              const newMessagesList = [...this.data.messages, doctorResponse];

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
              const doctorResponse = {
                content: response,
                role: 'assistant',
                doctorName: this.data.currentDoctor.name,
                doctorAvatar: this.data.currentDoctor.avatar
              };

              const newMessagesList = [...this.data.messages, doctorResponse];

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

  // 处理快速问题点击
  onQuickQuestionTap: function(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ userInput: question }, () => {
      this.sendMessage();
    });
  },

  // 关闭医生介绍卡片
  closeDoctorIntro: function() {
    this.setData({ showDoctorIntro: false });
  },

  // 输入框变化处理函数
  onInputChange: function(e) {
    const value = e.detail.value;
    if (typeof value === 'string') {
      this.setData({ userInput: value });
    }
  },

  // 切换医生列表显示状态
  toggleDoctorList: function() {
    this.setData({ showDoctorList: !this.data.showDoctorList });
  },

  // 选择医生
  selectDoctor: function(e) {
    const doctorId = e.currentTarget.dataset.id;
    const selectedDoctor = this.data.doctors.find(doctor => doctor.id === doctorId);

    if (selectedDoctor) {
      this.setData({
        currentDoctor: selectedDoctor,
        showDoctorList: false
      });

      // 添加系统提示消息
      const systemMessage = {
        content: `您已成功切换到${selectedDoctor.name}（${selectedDoctor.title}，${selectedDoctor.department}）`,
        role: 'system'
      };

      const updatedMessages = [...this.data.messages, systemMessage];
      this.setData({
        messages: updatedMessages,
        scrollToView: 'bottom-anchor'
      });
    }
  },

  // 返回问药页面
  navigateBack: function() {
    wx.navigateBack();
  }
});