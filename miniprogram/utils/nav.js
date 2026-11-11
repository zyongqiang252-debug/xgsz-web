const app = () => getApp();

function openProducts(solutionKey, categoryKey) {
  const instance = app();
  if (solutionKey) instance.globalData.pendingSolution = solutionKey;
  if (categoryKey) instance.globalData.pendingCategory = categoryKey;
  wx.switchTab({ url: '/pages/products/index' });
}

function openServices(serviceId) {
  if (serviceId) app().globalData.pendingService = serviceId;
  wx.switchTab({ url: '/pages/services/index' });
}

function openContact() {
  wx.switchTab({ url: '/pages/contact/index' });
}

function openPartners() {
  wx.navigateTo({ url: '/pages/partners/index' });
}

function openProduct(productId) {
  if (!productId) return;
  wx.navigateTo({ url: '/pages/product-detail/index?id=' + encodeURIComponent(productId) });
}

function openInquiry(intent) {
  wx.navigateTo({
    url: '/pages/inquiry/index?intent=' + encodeURIComponent(intent || '业务咨询')
  });
}

function callPhone(phone) {
  const value = String(phone || '').replace(/[^\d+]/g, '');
  if (!value) {
    wx.showToast({ title: '暂未公布联系电话', icon: 'none' });
    return;
  }
  wx.makePhoneCall({
    phoneNumber: value,
    fail() {
      wx.showToast({ title: '当前环境无法拨号', icon: 'none' });
    }
  });
}

function copy(value, label) {
  if (!value) {
    wx.showToast({ title: '暂无可复制内容', icon: 'none' });
    return;
  }
  wx.setClipboardData({
    data: String(value),
    success() {
      wx.showToast({ title: (label || '内容') + '已复制', icon: 'none' });
    }
  });
}

module.exports = {
  openProducts,
  openServices,
  openContact,
  openPartners,
  openProduct,
  openInquiry,
  callPhone,
  copy
};
