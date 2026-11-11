# 芯光智数官网 · 微信小程序

这是官网公开页面的原生微信小程序版本，和 `frontend/` 的 Web 页面共用同一套 Spring Boot 接口与后台内容，不包含管理后台。

## 页面

| 页面 | 路径 | 内容 |
| --- | --- | --- |
| 首页 | `pages/home/index` | 首屏、业务入口、产品、服务、行业场景、合作入口 |
| 产品与解决方案 | `pages/products/index` | 四个业务方向、服务器分类与型号、交付流程、平台入口 |
| 产品详情 | `pages/product-detail/index` | 产品介绍、特性、适用方向、细节图与咨询入口 |
| 技术服务 | `pages/services/index` | 四项服务的可展开说明与服务边界 |
| 招商合作 | `pages/partners/index` | 合作方向、合作邀请与申请入口 |
| 关于我们 | `pages/about/index` | 项目动态、公司简介、核心业务、服务方式与工作原则 |
| 联系我们 | `pages/contact/index` | 电话、企业微信、邮箱、地址与咨询入口 |
| 业务咨询 | `pages/inquiry/index` | 需求表单、CSRF 提交与提交成功提示 |

底部 TabBar 为：首页 / 产品 / 服务 / 关于 / 联系。招商合作作为独立页面，可从首页、关于页和页脚进入。

## 导入微信开发者工具

1. 打开微信开发者工具，选择“导入项目”。
2. 目录选择本仓库的 `miniprogram/`。
3. 将 `project.config.json` 中的 `appid` 从 `touristappid` 替换成实际小程序 AppID。
4. 开发阶段在“详情 → 本地设置”勾选“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。
5. 直接编译即可；首次打开会从 `config.js` 配置的后端读取内容。

## 后端地址

`config.js` 按小程序环境自动选择地址：

```js
develop: 'http://127.0.0.1:8080',
trial:   'https://your-domain.example.com',
release: 'https://your-domain.example.com'
```

- 开发者工具本地调试使用 `develop`。真机调试时，`127.0.0.1` 指向手机自身，请改成电脑局域网地址，或使用已备案的 HTTPS 域名。
- 体验版和正式版必须使用 HTTPS 域名，并在微信公众平台配置：
  - request 合法域名：后端 API 域名
  - downloadFile 合法域名：后端图片/素材域名（内容中的 `/assets/...`、`/media/...` 会解析到同一域名）
- 生产后端需监听可访问地址，例如 `XGSZ_BIND=0.0.0.0`，并确保反向代理转发 `/api`、`/assets`、`/media`。

## 接口

- `GET /api/public/content`：官网页面、产品、服务、合作方向与联系方式。
- `GET /api/auth/session`：获取 CSRF token；小程序提交咨询前会先调用一次。
- `POST /api/public/inquiries`：提交业务咨询，必须携带 `X-CSRF-TOKEN` 和 `consent: true`。
- `GET /api/health`：部署后可用来检查后端状态。

小程序请求会自动保留同域 Cookie；如果提交时提示“提交校验已过期”，请检查请求域名是否与后端会话域名一致，再返回重试。

## 交互说明

- 首页业务入口会切换到产品 Tab，并自动选中对应业务方向。
- 产品页的服务器分类、业务方向与服务页展开状态都保存在页面内。
- 淘宝、抖音等外部平台链接在小程序中不能直接打开，点击后会复制链接，请在浏览器中打开。
- 电话点击调用 `wx.makePhoneCall`；邮箱、地址和企业微信链接点击后复制。
- 企业微信二维码使用官网后台返回的图片；若未配置则显示“暂未公布”。

## 校验

当前已做：

- 全部 `app.json`、页面 JSON、组件 JSON 解析通过。
- 全部 JS 通过 `node --check`。
- WXML 结构通过 XML 结构检查。
- 使用当前 `/api/public/content` 样例跑了页面数据归一化与页面逻辑测试，覆盖产品分类、业务方向、里程碑、关于页模块和咨询表单校验。

当前机器没有安装微信开发者工具，因此尚未做开发者工具视觉预览和真机请求验证；导入后需要按上面的域名配置实际跑一遍。
