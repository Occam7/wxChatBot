// app.js


App({
  onLaunch() {
    wx.cloud.init({
      env: 'cloudbase-3g9rr1yt5a315552',
      traceUser: true,
    })

    const userInfo = wx.getStorageSync('userInfo')
    this.globalData.userInfo = userInfo || null
    this.globalData.hasUserInfo = !!userInfo
  },
  towxml: require('/towxml/index'),
  globalData: {
    userInfo: null,
    hasUserInfo: false,
    BASE_URL: 'http://121.199.174.211:8000'
  }
})
