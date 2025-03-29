// index.js
const app = getApp()

Page({
  data: {
    activeTab: 'all',
    activeCategory: 0,
    showCart: false,
    sortOrder: {
      sales: 'desc',
      popularity: 'desc',
      price: 'asc',
      newest: 'desc'
    },
    products: [
      {
        id: 1,
        categoryId: 0,
        title: '生龙骨',
        price: '12.00',
        thumb: '/images/longgu.jpg',
        sales: 142,
        popularity: 89,
        date: '2023-06-01'
      },
      {
        id: 2,
        categoryId: 0,
        title: '海马',
        price: '12.00',
        thumb: '/images/haima.jpg',
        sales: 98,
        popularity: 76,
        date: '2023-07-15'
      },
      {
        id: 3,
        categoryId: 0,
        title: '茯苓/云苓',
        price: '5.00',
        thumb: '/images/fuling.jpg',
        sales: 210,
        popularity: 95,
        date: '2023-05-20'
      },
      {
        id: 4,
        categoryId: 0,
        title: '制远志/蜜远志',
        price: '18.00',
        thumb: '/images/yuanzhi.jpg',
        sales: 65,
        popularity: 72,
        date: '2023-08-10'
      },
      {
        id: 5,
        categoryId: 0,
        title: '鸡血藤',
        price: '22.00',
        thumb: '/images/jixueteng.jpg',
        sales: 88,
        popularity: 80,
        date: '2023-07-05'
      },
      {
        id: 6,
        categoryId: 0,
        title: '黄芪',
        price: '15.00',
        thumb: '/images/huangqi.jpg',
        sales: 155,
        popularity: 92,
        date: '2023-08-15'
      },
    ],
    cartItems: [],
    categories: ['中药材大全'],
    filteredProducts: [],
    cartTotalPrice: 0
  },

  onLoad: function(options) {
    // 页面加载时计算筛选后的商品和购物车总价
    this.loadCartFromStorage();
    this.filterProducts();
    this.calculateCartTotal();
  },


  // 计算筛选后的商品
filterProducts: function() {
  // 由于只有一个分类，所以不需要按类别筛选
  let result = this.data.products;
  
  // 然后按标签页排序
  if (this.data.activeTab === 'sales') {
    result.sort((a, b) => {
      return this.data.sortOrder.sales === 'asc' 
        ? a.sales - b.sales 
        : b.sales - a.sales;
    });
  } else if (this.data.activeTab === 'popularity') {
    result.sort((a, b) => {
      return this.data.sortOrder.popularity === 'asc' 
        ? a.popularity - b.popularity 
        : b.popularity - a.popularity;
    });
  } else if (this.data.activeTab === 'price') {
    result.sort((a, b) => {
      return this.data.sortOrder.price === 'asc' 
        ? parseFloat(a.price) - parseFloat(b.price) 
        : parseFloat(b.price) - parseFloat(a.price);
    });
  } else if (this.data.activeTab === 'newest') {
    result.sort((a, b) => {
      return this.data.sortOrder.newest === 'asc' 
        ? new Date(a.date) - new Date(b.date) 
        : new Date(b.date) - new Date(a.date);
    });
  }
  
  this.setData({
    filteredProducts: result
  });
},

  // 计算购物车总价
  calculateCartTotal: function() {
    const total = this.data.cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);
    
    

    this.setData({
      cartTotalPrice: total
    });
    console.log("计算的总价:", this.data.cartTotalPrice); // 添加日志调试
  },

  // 点击左侧导航按钮
  onClickLeft: function() {
    wx.showToast({
      title: '打开分类菜单',
      icon: 'none'
    });
  },

  // 点击右侧导航按钮
  onClickRight: function() {
    wx.showToast({
      title: '打开搜索',
      icon: 'none'
    });
  },

  // 切换标签页
  onTabChange: function(event) {
    const name = event.detail.name;
    
    // 设置当前活动标签页
    this.setData({
      activeTab: name
    });
    
    // 切换排序方向
    if (name === 'sales' || name === 'popularity' || name === 'price' || name === 'newest') {
      const currentOrder = this.data.sortOrder[name];
      const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
      
      this.setData({
        [`sortOrder.${name}`]: newOrder
      });
    }
    
    // 重新筛选商品
    this.filterProducts();
  },

  // 切换分类
  onCategoryChange: function(event) {
    this.setData({
      activeCategory: event.detail
    });
    
    // 重新筛选商品
    this.filterProducts();
  },

  // 添加商品到购物车
  addToCart: function(event) {
    const product = event.currentTarget.dataset.product;
    const cartItems = this.data.cartItems;
    
    // 查找购物车中是否已有该商品
    const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
    
    if (existingItemIndex !== -1) {
      // 如果已存在，增加数量
      const updatedCartItems = cartItems.slice();
      updatedCartItems[existingItemIndex].quantity += 1;
      
      this.setData({
        cartItems: updatedCartItems
      });
      
      wx.showToast({
        title: '商品数量+1',
        icon: 'none'
      });
    } else {
      // 如果不存在，添加到购物车
      this.setData({
        cartItems: [...cartItems, {
          ...product,
          quantity: 1
        }]
      });
      
      wx.showToast({
        title: '已添加到购物车',
        icon: 'none'
      });
    }
    
    // 更新购物车总价并保存到本地存储
    this.calculateCartTotal();
    this.saveCartToStorage();
  },

  // 从购物车中移除商品
  removeFromCart: function(event) {
    const id = event.currentTarget.dataset.id;
    const cartItems = this.data.cartItems.filter(item => item.id !== id);
    
    this.setData({
      cartItems: cartItems
    });
    
    wx.showToast({
      title: '已从购物车移除',
      icon: 'none'
    });
    
    // 更新购物车总价并保存到本地存储
    this.calculateCartTotal();
    this.saveCartToStorage();
  },

// 修改购物车商品数量
  onStepperChange: function(event) {
    const id = event.currentTarget.dataset.id;
    const quantity = event.detail;
    
    // 如果数量变为0，直接从购物车中移除该商品
    if (quantity === 0) {
      const cartItems = this.data.cartItems.filter(item => item.id !== id);
      
      this.setData({
        cartItems: cartItems
      });
      
      wx.showToast({
        title: '已从购物车移除',
        icon: 'none'
      });
    } else {
      // 否则更新商品数量
      const cartItems = this.data.cartItems.map(item => {
        if (item.id === id) {
          return {
            ...item,
            quantity: quantity
          };
        }
        return item;
      });
      
      this.setData({
        cartItems: cartItems
      });
    }
    
    // 更新购物车总价并保存到本地存储
    this.calculateCartTotal();
    this.saveCartToStorage();
  },

  // 显示购物车弹出层
  showCartPopup: function() {
    this.setData({
      showCart: true
    });
  },

  // 关闭购物车弹出层
  onCloseCart: function() {
    this.setData({
      showCart: false
    });
  },

  // 保存购物车到本地存储
  saveCartToStorage: function() {
    try {
      wx.setStorageSync('cartItems', JSON.stringify(this.data.cartItems));
    } catch (e) {
      console.error('保存购物车数据失败:', e);
    }
  },

  // 从本地存储加载购物车
  loadCartFromStorage: function() {
    try {
      const cartData = wx.getStorageSync('cartItems');
      if (cartData) {
        this.setData({
          cartItems: JSON.parse(cartData)
        });
      }
    } catch (e) {
      console.error('加载购物车数据失败:', e);
    }
  },

  // 提交订单
  onSubmit: function() {
    if (this.data.cartItems.length === 0) {
      wx.showToast({
        title: '购物车空空如也~',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到结算页面
    wx.navigateTo({
      url: '/pages/checkout/index'
    });
  }
})