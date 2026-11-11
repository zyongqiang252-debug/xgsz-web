const nav = require('../../utils/nav');

const app = getApp();

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    page: {},
    global: {},
    settings: {},
    dial: '',
    wecomEmpty: true
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
      this.setData({ loading: false, error: error.message || '暂时无法加载联系方式' });
      throw error;
    });
  },

  applyContent(content) {
    const settings = content.settings || {};
    this.setData({
      content,
      page: content.pages.contact || {},
      global: content.pages.global || {},
      settings,
      dial: String(settings.phone || '').replace(/[^\d+]/g, ''),
      wecomEmpty: !(settings.wecomName || settings.wecomQr || settings.wecomUrl)
    });
  },

  callPhone() {
    nav.callPhone(this.data.settings.phone);
  },

  copyEmail() {
    nav.copy(this.data.settings.email, '邮箱');
  },

  copyAddress() {
    nav.copy(this.data.settings.address, '地址');
  },

  copyWecom() {
    nav.copy(this.data.settings.wecomUrl, '企业微信链接');
  },

  openInquiry() {
    nav.openInquiry('业务咨询');
  },

  retry() {
    this.loadContent(true).catch(() => {});
  },

  onShareAppMessage() {
    return {
      title: (this.data.global.name || '芯光智数') + '｜联系我们',
      path: '/pages/contact/index'
    };
  }
});
