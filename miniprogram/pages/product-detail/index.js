const nav = require('../../utils/nav');

const app = getApp();

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    product: null,
    global: {}
  },

  onLoad(options) {
    this.productId = options.id || '';
    this.loadContent();
  },

  loadContent() {
    app.ensureContent().then((content) => {
      const product = (content.products || []).find((item) => item.id === this.productId);
      this.setData({
        loading: false,
        content,
        global: content.pages.global || {},
        product: product || null,
        error: product ? '' : '产品不存在或已下架'
      });
      if (product) wx.setNavigationBarTitle({ title: product.name });
    }).catch((error) => {
      this.setData({ loading: false, error: error.message || '暂时无法加载产品详情' });
    });
  },

  openInquiry() {
    if (!this.data.product) return;
    nav.openInquiry(this.data.product.name);
  },

  previewDetail(event) {
    const current = event.currentTarget.dataset.url;
    const urls = (this.data.product && this.data.product.detailImages) || [];
    if (!current || !urls.length) return;
    wx.previewImage({ current, urls });
  },

  goProducts() {
    nav.openProducts('', '');
  },

  retry() {
    this.setData({ loading: true, error: '' });
    this.loadContent();
  },

  onShareAppMessage() {
    const product = this.data.product;
    return {
      title: product ? product.name + '｜' + (this.data.global.name || '芯光智数') : '产品详情',
      path: '/pages/product-detail/index?id=' + encodeURIComponent(this.productId)
    };
  }
});
