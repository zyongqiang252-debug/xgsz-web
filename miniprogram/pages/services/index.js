const nav = require('../../utils/nav');

const app = getApp();

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    page: {},
    services: [],
    openId: ''
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
      this.setData({ loading: false, error: error.message || '暂时无法加载技术服务' });
      throw error;
    });
  },

  applyContent(content) {
    const services = content.services || [];
    const pending = app.globalData.pendingService;
    const openId = pending || this.data.openId || (services[0] ? services[0].id : '');
    app.globalData.pendingService = '';
    this.setData({
      content,
      page: content.pages.services || {},
      services,
      openId
    });
  },

  toggleService(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ openId: this.data.openId === id ? '' : id });
  },

  consultService(event) {
    nav.openInquiry(event.currentTarget.dataset.intent || '技术服务咨询');
  },

  openProducts() {
    nav.openProducts('', '');
  },

  retry() {
    this.loadContent(true).catch(() => {});
  },

  onShareAppMessage() {
    return {
      title: (this.data.content.pages.global.name || '芯光智数') + '｜技术服务',
      path: '/pages/services/index'
    };
  }
});
