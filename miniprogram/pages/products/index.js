const nav = require('../../utils/nav');

const app = getApp();

function safePlatforms(page) {
  return [
    { label: '淘宝入口', url: page.taobaoUrl },
    { label: '抖音入口', url: page.douyinUrl }
  ].filter((item) => /^https:\/\//.test(String(item.url || '')));
}

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    page: {},
    solutions: [],
    activeSolution: 'servers',
    solution: null,
    categories: [],
    activeCategory: '',
    serverProducts: [],
    groups: [],
    steps: [],
    platforms: [],
    brands: [],
    certificates: [],
    disclaimer: ''
  },

  onLoad(options) {
    this.querySolution = options.solution || '';
    this.queryCategory = options.category || '';
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
      this.setData({ loading: false, error: error.message || '暂时无法加载产品内容' });
      throw error;
    });
  },

  applyContent(content) {
    const page = content.pages.products || {};
    const solutions = page.solutionGroups || [];
    const requested = app.globalData.pendingSolution || this.querySolution || this.data.activeSolution;
    const solution = solutions.find((item) => item.key === requested) || solutions[0];
    const activeSolution = solution ? solution.key : '';
    const categories = content.categories || [];
    const requestedCategory = app.globalData.pendingCategory || this.queryCategory || this.data.activeCategory;
    const activeCategory = categories.some((item) => item.key === requestedCategory)
      ? requestedCategory
      : (categories[0] ? categories[0].key : '');
    const serverProducts = content.products.filter((item) => item.category === activeCategory);
    app.globalData.pendingSolution = '';
    app.globalData.pendingCategory = '';
    this.querySolution = '';
    this.queryCategory = '';
    this.setData({
      content,
      page,
      solutions,
      activeSolution,
      solution,
      categories,
      activeCategory,
      serverProducts,
      groups: solution ? solution.groups : [],
      steps: page.steps || [],
      platforms: safePlatforms(page),
      brands: content.brands || [],
      certificates: content.certificates || [],
      disclaimer: page.disclaimer || ''
    });
  },

  selectSolution(event) {
    const key = event.currentTarget.dataset.key;
    const solution = this.data.solutions.find((item) => item.key === key);
    if (!solution) return;
    this.setData({
      activeSolution: key,
      solution,
      groups: solution.groups || []
    });
  },

  selectCategory(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      activeCategory: key,
      serverProducts: this.data.content.products.filter((item) => item.category === key)
    });
  },

  openProduct(event) {
    nav.openProduct(event.currentTarget.dataset.id);
  },

  openInquiry(event) {
    nav.openInquiry(event.currentTarget.dataset.intent || '产品选型咨询');
  },

  copyPlatform(event) {
    nav.copy(event.currentTarget.dataset.url, '链接');
  },

  retry() {
    this.loadContent(true).catch(() => {});
  },

  onShareAppMessage() {
    return {
      title: (this.data.content.pages.global.name || '芯光智数') + '｜产品与解决方案',
      path: '/pages/products/index?solution=' + encodeURIComponent(this.data.activeSolution || 'servers')
    };
  }
});
