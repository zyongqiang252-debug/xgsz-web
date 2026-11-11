const config = require('../config');

let contentCache = null;

function request(path, options) {
  const settings = options || {};
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.baseUrl + path,
      method: settings.method || 'GET',
      data: settings.data,
      timeout: config.requestTimeout,
      header: Object.assign({ 'content-type': 'application/json' }, settings.header || {}),
      success(response) {
        const body = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300 && body.code === 0) {
          resolve(body.data);
          return;
        }
        const error = new Error(body.message || '请求失败，请稍后重试。');
        error.status = response.statusCode;
        error.code = body.code;
        reject(error);
      },
      fail() {
        reject(new Error('暂时无法连接服务，请检查网络或稍后重试。'));
      }
    });
  });
}

function getContent(force) {
  if (contentCache && !force) return Promise.resolve(contentCache);
  return request('/api/public/content').then((data) => {
    contentCache = data;
    return data;
  });
}

function clearContent() {
  contentCache = null;
}

function getSession() {
  return request('/api/auth/session');
}

function postInquiry(payload, csrf) {
  return request('/api/public/inquiries', {
    method: 'POST',
    header: { 'X-CSRF-TOKEN': csrf },
    data: JSON.stringify(payload)
  });
}

function submitInquiry(payload) {
  return getSession().then((session) =>
    postInquiry(payload, session.csrf).catch((error) => {
      if (error.status !== 403) throw error;
      return getSession().then((fresh) => postInquiry(payload, fresh.csrf)).catch((freshError) => {
        if (freshError.status === 403) throw new Error('提交校验已过期，请返回重试。');
        throw freshError;
      });
    })
  );
}

function assetUrl(path) {
  const value = String(path || '');
  if (!value) return '';
  if (/^(https?:|data:|wxfile:)/.test(value)) return value;
  return config.baseUrl + (value.charAt(0) === '/' ? '' : '/') + value;
}

module.exports = {
  request,
  getContent,
  clearContent,
  getSession,
  submitInquiry,
  assetUrl,
  baseUrl: config.baseUrl
};
