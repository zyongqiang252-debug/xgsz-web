const api = require('../../utils/api');
const nav = require('../../utils/nav');

const app = getApp();

Page({
  data: {
    loading: true,
    error: '',
    content: null,
    settings: {},
    intents: [],
    intentIndex: 0,
    form: {
      name: '',
      phone: '',
      company: '',
      message: ''
    },
    consent: false,
    submitting: false,
    formError: '',
    submitted: false
  },

  onLoad(options) {
    this.requestedIntent = options.intent ? decodeURIComponent(options.intent) : '业务咨询';
    this.loadContent();
  },

  onShow() {
    if (app.globalData.content) this.applyContent(app.globalData.content);
  },

  loadContent() {
    app.ensureContent().then((content) => {
      this.applyContent(content);
      this.setData({ loading: false });
    }).catch((error) => {
      this.setData({ loading: false, error: error.message || '暂时无法加载咨询表单' });
    });
  },

  applyContent(content) {
    const intents = ['业务咨询', '产品选型咨询', '技术服务咨询', '合作伙伴申请', '其他业务咨询'];
    (content.products || []).forEach((item) => intents.push(item.name));
    (content.services || []).forEach((item) => intents.push(item.name));
    if (this.requestedIntent && intents.indexOf(this.requestedIntent) < 0) {
      intents.unshift(this.requestedIntent);
    }
    const unique = intents.filter((item, index) => item && intents.indexOf(item) === index);
    const knownIntent = this.data.intents[this.data.intentIndex];
    const target = this.requestedIntent || knownIntent || '业务咨询';
    const intentIndex = Math.max(0, unique.indexOf(target));
    this.setData({
      content,
      settings: content.settings || {},
      intents: unique,
      intentIndex,
      'form.intent': unique[intentIndex] || '业务咨询'
    });
    this.requestedIntent = '';
  },

  bindInput(event) {
    const field = event.currentTarget.dataset.field;
    const update = {};
    update['form.' + field] = event.detail.value;
    this.setData(update);
    if (this.data.formError) this.setData({ formError: '' });
  },

  changeIntent(event) {
    const index = Number(event.detail.value);
    this.setData({
      intentIndex: index,
      'form.intent': this.data.intents[index]
    });
  },

  toggleConsent() {
    this.setData({ consent: !this.data.consent });
  },

  validate() {
    const form = this.data.form;
    const name = String(form.name || '').trim();
    const phone = String(form.phone || '').trim();
    const company = String(form.company || '').trim();
    const message = String(form.message || '').trim();
    if (!name) return '请填写您的称呼。';
    if (!/^[+]?[0-9]{7,20}$/.test(phone)) return '请填写 7 至 20 位联系电话，可在开头添加国际区号。';
    if (!company) return '请填写公司或团队名称。';
    if (!message) return '请简单描述您的业务需求。';
    if (!this.data.consent) return '请先同意将填写的信息用于本次业务联系。';
    return '';
  },

  submit() {
    if (this.data.submitting || this.data.submitted) return;
    const message = this.validate();
    if (message) {
      this.setData({ formError: message });
      return;
    }
    const form = this.data.form;
    const payload = {
      name: String(form.name).trim(),
      phone: String(form.phone).trim(),
      company: String(form.company).trim(),
      intent: form.intent || '业务咨询',
      message: String(form.message).trim(),
      consent: true
    };
    this.setData({ submitting: true, formError: '' });
    api.submitInquiry(payload).then(() => {
      this.setData({ submitting: false, submitted: true });
      wx.pageScrollTo({ scrollTop: 0, duration: 250 });
    }).catch((error) => {
      this.setData({ submitting: false, formError: error.message || '提交失败，请稍后重试。' });
    });
  },

  callPhone() {
    nav.callPhone(this.data.settings.phone);
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  retry() {
    this.setData({ loading: true, error: '' });
    this.loadContent();
  },

  onShareAppMessage() {
    return {
      title: (this.data.content && this.data.content.pages.global.name || '芯光智数') + '｜业务咨询',
      path: '/pages/inquiry/index?intent=' + encodeURIComponent(this.data.form.intent || '业务咨询')
    };
  }
});
