const nav = require('../../utils/nav');

const app = getApp();

function followBusinessLink(link) {
  const value = String(link || '');
  const solution = /#\/products\?solution=([^&]+)/.exec(value);
  if (solution) {
    nav.openProducts(decodeURIComponent(solution[1]), '');
    return;
  }
  if (value.indexOf('#/products') === 0) {
    nav.openProducts('', '');
    return;
  }
  const service = /#\/services\?service=([^&]+)/.exec(value);
  if (service) {
    nav.openServices(decodeURIComponent(service[1]));
  }
}

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    page: {},
    milestones: [],
    featured: null,
    recent: [],
    capabilities: [],
    supportAreas: [],
    principles: [],
    images: []
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
      this.setData({ loading: false, error: error.message || '暂时无法加载关于我们' });
      throw error;
    });
  },

  applyContent(content) {
    const page = content.pages.about || {};
    const milestones = page.milestones || [];
    const capabilities = (content.pages.home.capabilities || []).slice(0, 4).map((item) =>
      Object.assign({}, item, {
        link: item.solutionKey ? '#/products?solution=' + item.solutionKey : ''
      })
    );
    this.setData({
      content,
      page,
      milestones,
      featured: milestones[0] || null,
      recent: milestones.slice(1, 5),
      capabilities,
      supportAreas: page.supportAreas || [],
      principles: page.principles || [],
      images: content.abouts || []
    });
  },

  openBusiness(event) {
    followBusinessLink(event.currentTarget.dataset.link);
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
      title: (this.data.content.pages.global.name || '芯光智数') + '｜关于我们',
      path: '/pages/about/index'
    };
  }
});
