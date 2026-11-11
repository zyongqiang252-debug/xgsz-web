const nav = require('../../utils/nav');

const app = getApp();

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    global: {},
    home: {},
    categories: [],
    activeCategory: 'all',
    visibleProducts: [],
    services: [],
    industry: null,
    activeIndustry: 0,
    partners: []
  },

  onLoad() {
    this.loadContent();
  },

  onShow() {
    if (app.globalData.content) this.applyContent(app.globalData.content);
  },

  onPullDownRefresh() {
    this.loadContent(true).then(() => wx.stopPullDownRefresh()).catch(() => wx.stopPullDownRefresh());
  },

  loadContent(force) {
    this.setData({ loading: !this.data.content, error: '' });
    return app.loadContent(force).then((content) => {
      this.applyContent(content);
      this.setData({ loading: false });
      return content;
    }).catch((error) => {
      this.setData({ loading: false, error: error.message || '暂时无法加载官网内容' });
      throw error;
    });
  },

  applyContent(content) {
    const home = content.pages.home || {};
    const categories = [{ key: 'all', name: '全部' }].concat(content.categories || []);
    const activeCategory = categories.some((item) => item.key === this.data.activeCategory)
      ? this.data.activeCategory
      : 'all';
    const products = activeCategory === 'all'
      ? content.products
      : content.products.filter((item) => item.category === activeCategory);
    const industries = home.industries || [];
    const activeIndustry = industries[this.data.activeIndustry] ? this.data.activeIndustry : 0;
    this.setData({
      content,
      global: content.pages.global || {},
      home,
      categories,
      activeCategory,
      visibleProducts: products,
      services: content.services || [],
      industry: industries[activeIndustry] || null,
      activeIndustry,
      partners: (content.businesses || []).slice(0, 3)
    });
  },

  selectCategory(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      activeCategory: key,
      visibleProducts: key === 'all'
        ? this.data.content.products
        : this.data.content.products.filter((item) => item.category === key)
    });
  },

  selectIndustry(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({
      activeIndustry: index,
      industry: this.data.home.industries[index]
    });
  },

  openCapability(event) {
    nav.openProducts(event.currentTarget.dataset.solution, '');
  },

  openProducts() {
    nav.openProducts('', '');
  },

  openProduct(event) {
    nav.openProduct(event.currentTarget.dataset.id);
  },

  openService(event) {
    nav.openServices(event.currentTarget.dataset.id);
  },

  openInquiry(event) {
    nav.openInquiry(event.currentTarget.dataset.intent || '业务咨询');
  },

  openPartners() {
    nav.openPartners();
  },

  retry() {
    this.loadContent(true).catch(() => {});
  },

  onShareAppMessage() {
    return {
      title: (this.data.global.name || '芯光智数') + '｜让每一份算力释放更大价值',
      path: '/pages/home/index'
    };
  }
});
