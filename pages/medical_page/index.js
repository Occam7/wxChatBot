// pages/index/index.js
const app = getApp();
const BASE_URL = app.globalData.BASE_URL;

Page({
  data: {
    placement: 'left',
    sessions: [], // 存储会话列表
    currentSessionId: '', // 当前活跃会话ID
    messages: [], // 聊天消息
    userInput: '', // 用户输入框内容
    showSidebar: false, // 控制侧边栏显示状态
    selectedDept: null, // 选择的科室（可选）
    selectedDeptIndex: -1,
    isThinking: false,
    scrollToView: '',
    showDeptPopup: false,
    departments: ['内科', '外科', '儿科', '妇科', '皮肤科', '耳鼻喉科', '口腔科', '眼科'], // 示例科室列表
    quickQuestions : [
      '我有感冒症状，应该去哪个科室就诊？',
      '想了解心脏病预防，需要咨询哪个科室的医生？',
      '长期失眠多梦，应该去哪个科室就诊？',
      '经常腰背疼痛，应该挂哪个科室的号？'
    ],
    showIntroCard: true,
    serviceTypes: [], // 存储可用的服务类型
    activeServiceType: null, // 当前活跃的服务类型
    uploadingImage: false,
    messageCount: 0,
    showDoctorCard: false,
    // questionCount: 0,
    // nearbyHospitals: [],
    // hasShownHospitals: false,
  },

  onLoad: function () {
    // 获取支持的服务类型
    this.getServiceTypes();
    // 获取当前活跃的服务类型
    this.getActiveServiceType();
    // 加载会话列表
    this.loadSessions();
    // 获取当前活跃会话
    this.getActiveSession();
  },

  onUnload: function() {
    // 切换回默认服务类型
    wx.request({
      url: `${BASE_URL}/service/switch`,
      method: 'POST',
      data: JSON.stringify({ service_type: 'home' }),
      header: { 'content-type': 'application/json' }
    });
  },

  // 获取所有支持的服务类型
  getServiceTypes: function() {
    wx.request({
      url: `${BASE_URL}/service/types`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ serviceTypes: res.data.service_types });
        }
      },
      fail: (err) => console.error('获取服务类型失败:', err)
    });
  },

  // 获取当前活跃的服务类型
  getActiveServiceType: function() {
    wx.request({
      url: `${BASE_URL}/service/active`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            activeServiceType: res.data.service_type,
            activeServiceName: res.data.service_name
          });
        }
      },
      fail: (err) => console.error('获取当前服务类型失败:', err)
    });
  },

  // 切换服务类型
  switchServiceType: function(e) {
    const serviceType = e.currentTarget.dataset.type || e.detail.value;

    wx.request({
      url: `${BASE_URL}/service/switch`,
      method: 'POST',
      data: JSON.stringify({ service_type: serviceType }),
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            activeServiceType: res.data.service_type,
            activeServiceName: res.data.service_name
          }, () => {
            // 切换服务类型后重新加载会话列表
            this.loadSessions();
            // 并获取当前活跃会话
            this.getActiveSession();
          });
        }
      },
      fail: (err) => console.error('切换服务类型失败:', err)
    });
  },

  onQuickQuestionTap: function(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ userInput: question }, () => {
      this.sendMessage();
    });
  },

  // 关闭介绍卡片
  closeIntroCard: function() {
    this.setData({ showIntroCard: false });
  },

  // 加载所有会话
  loadSessions: function() {
    const serviceType = this.data.activeServiceType;
    const url = serviceType ?
        `${BASE_URL}/sessions?service_type=${serviceType}` :
        `${BASE_URL}/sessions`;

    wx.request({
      url: url,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const currentId = this.data.currentSessionId;
          const departments = this.data.departments;
          console.log("current:", res.data);

          // 添加科室映射处理
          const processedSessions = res.data.sessions.map(session => ({
            ...session,
            selectedDept: departments.findIndex(
                dept => dept === session.suggested_department
            ),
            suggested_department: session.suggested_department || null
          }));

          console.log("processed sessions", processedSessions);
          const sortedSessions = processedSessions.sort((a, b) => {
            return a.session_id === currentId ? -1 : b.session_id === currentId ? 1 : 0
          });

          this.setData({ sessions: sortedSessions });
        }
      },
      fail: (err) => console.error('加载会话失败:', err)
    });
  },

  // 获取当前活跃会话
  getActiveSession: function() {
    wx.request({
      url: `${BASE_URL}/session/active`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const { session_id, title, suggested_department } = res.data;
          // 查找科室索引
          const deptIndex = this.data.departments.findIndex(dept => dept === suggested_department);

          console.log("current", res.data);
          this.setData({
            currentSessionId: session_id,
            selectedDept: suggested_department || null,
            selectedDeptIndex: deptIndex > -1 ? deptIndex : -1
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
            selectedDept: null,
            selectedDeptIndex: -1,
            messageCount: 0,
            showDoctorCard: false
          }, () => {
            this.loadMessages();
            this.loadSessions();
            // this.resetQuestionCount();
          });
        }
      },
      fail: (err) => console.error('创建新会话失败:', err)
    });
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
          // 如果删除的是当前会话，获取新的活跃会话
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
    // 从event中获取session数据
    const session = e.currentTarget.dataset.session;
    const sessionId = session.session_id;
    const suggestedDepartment = session.suggested_department;
    const deptIndex = this.data.departments.findIndex(dept => dept === suggestedDepartment);

    wx.request({
      url: `${BASE_URL}/session/switch`,
      method: 'POST',
      data: JSON.stringify({ session_id: sessionId }),
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            currentSessionId: sessionId,
            selectedDept: suggestedDepartment || null,
            selectedDeptIndex: deptIndex > -1 ? deptIndex : -1,
            showSidebar: false
          }, () => {
            this.loadMessages();
            this.loadSessions(); // 同步最新会话列表
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
      },
      complete: () => wx.hideLoading()
    });
  },

  // 加载当前会话的消息
  loadMessages: function() {
    const sessionId = this.data.currentSessionId;
    if (!sessionId) {
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

          this.setData({
            messages: processedMessages,
            messageCount: Math.floor(res.data.messages.length / 2)
          });

          if (res.data.messages.length === 0 && !this.data.selectedDept) {
            this.appendLocalGreeting();
          }
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
      scrollToView: 'thinking-animation', // 设置滚动到思考动画
      userInput: '' // 立即清空输入框
      // questionCount: this.data.questionCount + 1
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

              const newMessageCount = this.data.messageCount + 1;
              const shouldShowDoctorCard = newMessageCount === 3 && !this.data.showDoctorCard;

              this.setData({
                isThinking: false,
                messages: newMessagesList,
                messageCount: newMessageCount,
                showDoctorCard: shouldShowDoctorCard,
                scrollToView: 'msg-' + (newMessagesList.length - 1) // 滚动到新消息
              }, () => {
                // 强制滚动到最新消息
                setTimeout(() => {
                  this.setData({
                    scrollToView: 'msg-' + (newMessagesList.length - 1)
                  });
                }, 100);
              });

              // 检查是否已经问了5个问题且没有显示过医院信息
              // if (this.data.questionCount === 5 && !this.data.hasShownHospitals) {
              //   this.getNearbyHospitals();
              // }

              // 获取更新后的会话列表以反映最新状态
              this.loadSessions();
            } catch (err) {
              console.error('解析Markdown失败:', err);
              // 如果towxml解析失败，仍然显示原始文本
              const newMessagesList = [...this.data.messages, {
                content: response,
                role: 'assistant'
              }];

              const newMessageCount = this.data.messageCount + 1;
              const shouldShowDoctorCard = newMessageCount === 3 && !this.data.showDoctorCard;

              this.setData({
                isThinking: false,
                messages: newMessagesList,
                messageCount: newMessageCount,
                showDoctorCard: shouldShowDoctorCard,
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

  // // 获取附近医院信息
  // getNearbyHospitals: function() {
  //
  //   // 先获取用户当前位置
  //   wx.getLocation({
  //     type: 'gcj02', // 返回可用于wx.openLocation的经纬度
  //     success: (res) => {
  //       const latitude = res.latitude;
  //       const longitude = res.longitude;
  //
  //       // 调用我们的后端API获取附近医院
  //       wx.request({
  //         url: `${BASE_URL}/nearby_hospitals`,
  //         method: 'POST',
  //         data: {
  //           latitude: latitude,
  //           longitude: longitude,
  //           radius: 5000,
  //           keyword: '医院',
  //           max_results: 5
  //         },
  //         success: (result) => {
  //           wx.hideLoading();
  //
  //           if (result.statusCode === 200 && result.data.hospitals) {
  //             this.showHospitalMessage(result.data.hospitals);
  //           } else {
  //             console.error('获取医院数据失败:', result);
  //           }
  //         },
  //         fail: (err) => {
  //           console.error('请求医院数据失败:', err);
  //         }
  //       });
  //     },
  //     fail: (err) => {
  //       console.error('获取位置失败:', err);
  //
  //       // 如果用户拒绝位置权限，提示用户
  //       wx.showModal({
  //         title: '提示',
  //         content: '需要获取您的地理位置才能为您推荐附近医院，请允许位置访问权限',
  //         showCancel: false
  //       });
  //     }
  //   });
  // },
  //
  // // 在聊天界面展示医院信息
  // showHospitalMessage: function(hospitals) {
  //   let hospitalMessage = '我注意到您已经咨询了几个健康问题，为了更好地服务您，这里为您推荐几家附近的医院：\n\n';
  //
  //   hospitals.forEach((hospital, index) => {
  //     hospitalMessage += `${index + 1}. ${hospital.name}\n`;
  //     hospitalMessage += `   地址：${hospital.address}\n`;
  //     hospitalMessage += `   距离：${hospital.distance}\n`;
  //     if (hospital.phone) {
  //       hospitalMessage += `   电话：${hospital.phone}\n`;
  //     }
  //     if (hospital.rating) {
  //       hospitalMessage += `   评分：${hospital.rating}星\n`;
  //     }
  //     hospitalMessage += '\n';
  //   });
  //
  //   hospitalMessage += '如需导航，请点击下方"查看地图"按钮。';
  //
  //   // 添加一条助手消息
  //   const newMessagesList = [...this.data.messages, {
  //     content: hospitalMessage,
  //     role: 'assistant',
  //     isHospitalList: true // 标记这是医院列表消息
  //   }];
  //
  //   this.setData({
  //     messages: newMessagesList,
  //     scrollToView: 'msg-' + (newMessagesList.length - 1),
  //     hasShownHospitals: true, // 标记已经展示过医院信息
  //     nearbyHospitals: hospitals // 保存医院列表
  //   });
  // },
  //
  // // 打开地图查看医院
  // openHospitalMap: function(e) {
  //   const index = e.currentTarget.dataset.index || 0;
  //   const hospital = this.data.nearbyHospitals[index];
  //
  //   if (hospital && hospital.latitude && hospital.longitude) {
  //     wx.openLocation({
  //       latitude: hospital.latitude,
  //       longitude: hospital.longitude,
  //       name: hospital.name,
  //       address: hospital.address,
  //       scale: 18
  //     });
  //   } else {
  //     wx.showToast({
  //       title: '无法获取医院位置',
  //       icon: 'none'
  //     });
  //   }
  // },
  //
  // // 重置问题计数（例如新会话时）
  // resetQuestionCount: function() {
  //   this.setData({
  //     questionCount: 0,
  //     hasShownHospitals: false
  //   });
  // },

  closeDoctorCard: function (){
    this.setData({
      showDoctorCard: false
    })
  },

  navigateToDoctor: function() {
    wx.navigateTo({
      url: '/pages/doctor/index'
    })
  },

  appendMessage: function(content, role) {
    const newMessages = [...this.data.messages, { content: content, role: role }];
    this.setData({
      messages: newMessages,
      scrollToView: 'msg-' + (newMessages.length - 1)
    });
  },

  toggleSidebar: function() {
    this.setData({ showSidebar: !this.data.showSidebar });
  },

  // 输入框变化处理函数
  onInputChange: function(e) {
    const value = e.detail.value; // 直接获取输入框的值
    if (typeof value === 'string') {
      this.setData({ userInput: value }); // 只有当值为字符串时才更新状态
    }
  },

  appendLocalGreeting: function() {
    this.setData({showIntroCard: true});
  },

  onDepartmentChange: function(e) {
    const selectedIndex = e.detail.value;
    const departmentName = this.data.departments[selectedIndex];
    const selectedSuccess = {
      content: `好的。您选择了：${departmentName} `,
      role: 'system',
      isLocal: true
    };

    this.setData({
      selectedDept: departmentName,
      selectedDeptIndex: selectedIndex
    });

    wx.request({
      url: `${BASE_URL}/session/set-department`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        department: departmentName
      },
      success:(res) => {
        if (res.statusCode === 200) {
          console.log('科室设置成功 ✅', res.data);
          this.setData({
            messages: [...this.data.messages, selectedSuccess]
          });
          this.loadSessions(); // 重新加载会话以更新科室信息
          // 设置成功后可以开始聊天
        } else {
          console.error('设置失败 ❌', res.data.detail);
          wx.showToast({
            title: res.data.detail || '设置科室失败',
            icon: 'none'
          });
        }
      },
      fail(err) {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络异常',
          icon: 'none'
        });
      }
    });
  },


  // 加号按钮点击处理函数
  onAddButtonTap: function() {
    wx.showActionSheet({
      itemList: ['上传图片','拍照'],
      success: (res) => {
        if (res.tapIndex === 0){
          this.chooseImage('album');
        }else {
          this.chooseImage('camera');
        }
      }
    });
  },

  chooseImage: function(sourceType){

    if (this.data.uploadingImage) {
      wx.showToast({
        title: '正在处理图片，请稍候',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: [sourceType],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        //显示正在上传
        wx.showLoading({
          title: '正在上传',
        });

        this.setData({ uploadingImage: true });

        //先将图片显示在聊天界面中
        const userMessage = {
          content: '图片上传中...',
          role: 'user',
          isImage: true,
          imageUrl: tempFilePath
        };

        const updatedMessages = [...this.data.messages, userMessage];
        this.setData({
          messages: updatedMessages,
          scrollToView: 'msg-' + (updatedMessages.length - 1)
        });

        this.uploadImageToServer(tempFilePath);
      },
      fail: (err) => {
        console.log('选择/拍摄图片失败', err);
      }
    });
  },

// 上传图片到服务器
uploadImageToServer: function(filePath) {
  // 简单查询提示
  const queryText = '请分析这张医疗相关图片，解读其中的关键信息';

  wx.uploadFile({
    url: `${BASE_URL}/image/analyze`,
    filePath: filePath,
    name: 'file',  // 对应后端的参数名
    formData: {
      query: queryText
    },
    success: (res) => {
      // 更新用户消息，将"图片上传中..."改为实际内容
      const messages = this.data.messages;
      const lastIndex = messages.length - 1;

      if (messages[lastIndex] && messages[lastIndex].isImage) {
        messages[lastIndex].content = '我上传了一张图片';
        this.setData({ messages });
      }

      if (res.statusCode === 200) {
        // 解析返回的数据
        try {
          const data = JSON.parse(res.data);

          // 添加系统识别结果
          this.appendMessage(data.response, 'assistant');
        } catch (e) {
          console.error('解析响应失败:', e);
          this.appendMessage('抱歉，图片分析结果解析失败，请重试', 'assistant');
        }
      } else {
        console.error('服务器返回错误:', res);
        this.appendMessage('图片分析失败，请稍后重试', 'assistant');
      }
    },
    fail: (err) => {
      console.error('图片上传失败:', err);
      this.appendMessage('图片上传失败，请检查网络连接后重试', 'assistant');
    },
    complete: () => {
      wx.hideLoading();
      this.setData({ uploadingImage: false });
    }
  });
},

  previewImage: function(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url, // 当前显示图片的http链接
      urls: [url] // 需要预览的图片http链接列表
    });
  },


// 显示科室选择弹出层
  showDeptPopup: function() {
    this.setData({ showDeptPopup: true });
  },

  // 关闭科室选择弹出层
  onCloseDeptPopup: function() {
    this.setData({ showDeptPopup: false });
  },

  // 从弹出层选择科室
  selectDepartment: function(e) {
    const selectedIndex = e.currentTarget.dataset.index;

    // 关闭弹出层
    this.setData({ showDeptPopup: false });

    // 调用原有的科室选择处理函数
    this.onDepartmentChange({ detail: { value: selectedIndex } });
  }
});