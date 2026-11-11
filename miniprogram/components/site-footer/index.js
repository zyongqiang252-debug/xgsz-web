const nav = require('../../utils/nav');

Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    content: {
      type: Object,
      value: {}
    }
  },

  data: {
    basic: {},
    copyright: '',
    year: new Date().getFullYear()
  },

  observers: {
    content(content) {
      const list = (content && content.basicInformation) || [];
      const basic = list[0] || {};
      const name = content && content.pages && content.pages.global ? content.pages.global.name : '芯光智数';
      this.setData({
        basic,
        copyright: basic.copyright || '© ' + this.data.year + ' ' + name
      });
    }
  },

  methods: {
    goHome() {
      wx.switchTab({ url: '/pages/home/index' });
    },
    openProducts(event) {
      nav.openProducts('', event.currentTarget.dataset.key);
    },
    openServices(event) {
      nav.openServices(event.currentTarget.dataset.id);
    },
    openAbout() {
      wx.switchTab({ url: '/pages/about/index' });
    },
    openPartners() {
      nav.openPartners();
    },
    openContact() {
      nav.openContact();
    },
    callPhone() {
      nav.callPhone(this.data.content.settings && this.data.content.settings.phone);
    },
    copyEmail() {
      nav.copy(this.data.content.settings && this.data.content.settings.email, '邮箱');
    },
    copyAddress() {
      nav.copy(this.data.content.settings && this.data.content.settings.address, '地址');
    },
    copyRecord(event) {
      nav.copy(event.currentTarget.dataset.value, event.currentTarget.dataset.label || '内容');
    }
  }
});
