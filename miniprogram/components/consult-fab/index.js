const nav = require('../../utils/nav');

Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    intent: {
      type: String,
      value: '业务咨询'
    }
  },

  methods: {
    open() {
      nav.openInquiry(this.data.intent);
    }
  }
});
