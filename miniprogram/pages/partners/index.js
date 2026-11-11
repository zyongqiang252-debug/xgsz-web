const nav = require('../../utils/nav');

const app = getApp();

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    page: {},
    businesses: []
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
      this.setData({ loading: false, error: error.message || '暂时无法加载合作信息' });
      throw error;
    });
  },

  applyContent(content) {
    this.setData({
      content,
      page: content.pages.partners || {},
      businesses: content.businesses || []
    });
  },

  openInquiry(event) {
    nav.openInquiry(event.currentTarget.dataset.intent || '合作伙伴申请');
  },

  retry() {
    this.loadContent(true).catch(() => {});
  },

  onShareAppMessage() {
    return {
      title: (this.data.content.pages.global.name || '芯光智数') + '｜招商合作',
      path: '/pages/partners/index'
    };
  }
});
