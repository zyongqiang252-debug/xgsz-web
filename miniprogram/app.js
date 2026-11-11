const api = require('./utils/api');
const contentUtil = require('./utils/content');

App({
  globalData: {
    content: null,
    contentError: '',
    loadedAt: 0,
    pendingSolution: '',
    pendingCategory: '',
    pendingService: ''
  },

  onLaunch() {
    this.loadContent();
  },

  loadContent(force) {
    if (this._loadingContent) return this._loadingContent;
    this._loadingContent = api.getContent(force).then((raw) => {
      const content = contentUtil.normalize(raw);
      this.globalData.content = content;
      this.globalData.contentError = '';
      this.globalData.loadedAt = Date.now();
      this._loadingContent = null;
      return content;
    }).catch((error) => {
      this.globalData.contentError = error.message || '暂时无法加载官网内容';
      this._loadingContent = null;
      throw error;
    });
    return this._loadingContent;
  },

  ensureContent() {
    if (this.globalData.content) return Promise.resolve(this.globalData.content);
    return this.loadContent();
  }
});
