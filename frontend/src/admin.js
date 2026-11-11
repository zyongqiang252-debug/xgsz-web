import './admin.css';
import './admin-refinements.css';
import './admin-polish.css';
import {renderNavigation,revealNavigation} from './admin-navigation.js';
import { wecomFields, bindContactSettings } from './contact-admin.js';
bindContactSettings();
import { CmsAdmin,imageField } from './cms-admin.js';
let categories=[];
import { getContent, loadContent, loadInquiries, loadSystem, saveRecord, deleteRecord, saveSettings, updateInquiry, getInquiries, api, sessionState, html as esc } from './content-store.js';

const root = document.querySelector('#admin');
const cms=new CmsAdmin({modal,closeModal,notify,refresh:async()=>{await route();}});
const shapes = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  box:'<path d="m12 3 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9"/>', shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6"/>', chat:'<path d="M21 11a9 9 0 0 1-9 9H3l1-5a9 9 0 1 1 17-4ZM8 10h8M8 14h5"/>', settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>', arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', up:'<path d="M7 17 17 7M7 7h10v10"/>', plus:'<path d="M12 5v14M5 12h14"/>', file:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>', search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>', check:'<path d="m5 12 4 4L19 6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>'
};
const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[key] || shapes.box}</svg>`;
const links = [['overview','grid','网站概览'],['products','box','产品管理'],['services','shield','服务管理'],['inquiries','chat','咨询记录'],['system','database','数据库与存储'],['settings','settings','联系方式']];
let section = 'overview';
let content = getContent();
let system = null;
let filter = '';
let lastFocus;
let authenticatedUser = '';
let setupRequired = false;
function notify(message) { const toast = document.querySelector('#toast'); if(!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('show'), 3500); }
function status(published) { return `<span class="badge ${published !== false ? 'green' : 'gray'}"><i></i>${published !== false ? '已上架' : '已下架'}</span>`; }
function categoryName(id) { return categories.find(c => c.id === id)?.name || '未分类'; }
function shell() {
  const title = links.find(x => x[0] === section)?.[2] || '网站概览';
  document.title = `${title} · ${content.pages.global.name}管理后台`;
  root.innerHTML = `<aside class="sidebar"><a href="/" class="admin-brand">${content.pages.global.logo?`<img src="${esc(content.pages.global.logo)}" alt="">`:''}<span>${esc(content.pages.global.name)}<small>官网管理工作台</small></span></a><div class="nav-label">内容与运营</div><nav class="admin-sidebar-nav" aria-label="后台导航">${renderNavigation({links,section,icon,pending:getInquiries().filter(x=>x.status!=='done').length})}</nav><div class="sidebar-bottom"><span class="local-dot"></span> 数据服务已连接<p>内容与咨询保存在数据库</p><a href="/" target="_blank" rel="noopener">访问公司官网 ${icon('up')}</a></div></aside><div class="workspace"><header class="topbar"><span class="breadcrumb">管理工作台 <span>/</span> ${title}</span><div><span class="demo-pill">已连接</span><span class="avatar">芯</span><span class="account">${esc(authenticatedUser)}</span><button class="logout-button" data-logout>退出登录</button></div></header><main><div class="page-heading"><div><h1>${title}</h1><p>${{overview:'查看待处理需求，维护官网内容。',products:'维护整机产品与算力方案，让客户更快找到合适的产品。',services:'管理服务介绍、交付内容与服务边界。',inquiries:'集中查看官网提交的业务需求。',system:'检查数据库连接、内容表和初始化状态，只读展示。',settings:'维护对外联系信息，保存后刷新官网即可查看。','page-products':'维护业务方向模块，并填写淘宝、抖音线上平台入口。'}[section]||'编辑网站内容，保存后刷新官网即可查看。'}</p></div><a class="secondary" href="/" target="_blank" rel="noopener">预览官网 ${icon('up')}</a></div><div class="demo-banner"><span>i</span><p><b>数据服务已连接</b>　内容保存后将在官网生效。编辑冲突时会提示刷新，咨询记录仅登录后可见。</p></div><div id="page-content">${body()}</div><footer>© ${new Date().getFullYear()} ${esc(content.pages.global.name)} <span>网站内容管理</span></footer></main></div><div id="toast" role="status"></div>`;
}
function body() { if(cms.defs&&cms.accepts(section))return cms.render();return section === 'overview' ? overview() : section === 'products' || section === 'services' ? listing() : section === 'inquiries' ? inquiries() : section === 'system' ? systemView() : settings(); }
function overview() {
  const leads = getInquiries(); const pending = leads.filter(x => x.status !== 'done');
  return `<section class="operations-bar"><div><span class="connection-dot"></span>后台服务正常</div><p>${pending.length ? `有 <b>${pending.length}</b> 条咨询等待处理` : '暂无待处理咨询，可以继续维护产品与服务。'}</p><a class="primary" href="#/inquiries">查看咨询记录 ${icon('arrow')}</a></section><div class="stat-grid">${[['box','产品内容',content.products.length,`${content.products.filter(x => x.published !== false).length} 项已上架`],['shield','技术服务',content.services.length,'围绕部署、优化与运维'],['chat','咨询记录',leads.length,'来自官网'],['file','待处理咨询',pending.length,'让每一次连接都有回应']].map(([i,t,n,d]) => `<div class="stat-card panel"><span class="stat-icon ${i}">${icon(i)}</span><p>${t}</p><strong>${n.toString().padStart(2,'0')}</strong><small>${d}</small></div>`).join('')}</div><div class="dashboard-lower"><section class="panel"><div class="panel-head"><h2>产品内容</h2><a href="#/products">管理全部 ${icon('arrow')}</a></div><div class="compact-products">${content.products.slice(0,4).map(p => `<div><span class="product-symbol">${icon('box')}</span><span><b>${esc(p.name)}</b><small>${esc(categoryName(p.category))}</small></span>${status(p.published)}</div>`).join('') || '<p class="empty-small">尚未添加产品</p>'}</div></section><section class="panel"><div class="panel-head"><h2>最近咨询</h2><a href="#/inquiries">全部记录 ${icon('arrow')}</a></div><div class="recent-inquiries">${leads.slice(0,3).map(x=>`<button data-lead="${esc(x.id)}"><span><b>${esc(x.intent)}</b><small>${esc(x.company)} · ${esc(new Date(x.date).toLocaleDateString('zh-CN'))}</small></span><span class="badge ${x.status === 'done' ? 'green' : 'amber'}">${x.status === 'done' ? '已处理' : '待处理'}</span></button>`).join('') || `<div class="empty-state">${icon('chat')}<h3>还没有咨询记录</h3><p>官网提交的业务需求将显示在这里。</p></div>`}</div></section></div><section class="panel quick-panel"><div><h2>内容维护与官网预览</h2><p>官网内容保存后在页面展示。</p></div><a class="secondary" href="/" target="_blank" rel="noopener">打开官网 ${icon('up')}</a><a class="secondary" href="#/inquiries">查看咨询记录 ${icon('arrow')}</a></section>`;
}
function listing() {
  const isProduct = section === 'products'; const rows = content[section].filter(x => `${x.name} ${x.desc}`.toLowerCase().includes(filter.toLowerCase()));
  return `<section class="panel"><div class="list-toolbar"><div><h2>${isProduct ? '产品' : '服务'}列表 <span class="count">${content[section].length}</span></h2><p>数据库内容 · 与官网展示同步</p></div><button class="primary" data-new="${section}">${icon('plus')}新增${isProduct ? '产品' : '服务'}</button></div><div class="search-row"><label>${icon('search')}<input id="search" aria-label="搜索内容" value="${esc(filter)}" placeholder="搜索名称或简介"></label><span>共 ${rows.length} 项内容</span></div><div class="table-scroll" tabindex="0" role="region" aria-label="内容列表"><table><thead><tr><th>${isProduct ? '产品信息' : '服务信息'}</th><th>${isProduct ? '产品分类' : '服务内容'}</th><th>展示状态</th><th class="actions-head">操作</th></tr></thead><tbody>${rows.map(x => `<tr><td><div class="table-title"><span class="product-symbol">${icon(isProduct ? 'box' : 'shield')}</span><span><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span></div></td><td><span class="category-label">${isProduct ? esc(categoryName(x.category)) : `${x.items.length} 项服务内容`}</span></td><td>${status(x.published)}</td><td><div class="table-actions"><button data-edit="${esc(x.id)}">编辑</button><button data-toggle="${esc(x.id)}">${x.published === false ? '上架' : '下架'}</button><button class="danger-text" data-delete="${esc(x.id)}">删除</button></div></td></tr>`).join('') || `<tr><td colspan="4"><div class="empty-state">${icon('box')}<h3>没有找到内容</h3><p>尝试其他关键词，或添加一项新内容。</p></div></td></tr>`}</tbody></table></div></section><p class="page-note">上架内容将在官网展示；下架后保留在内容库，您可以随时重新上架。</p>`;
}
function inquiries() {
  const rows = getInquiries().filter(x => `${x.name} ${x.company || ''} ${x.intent || ''}`.toLowerCase().includes(filter.toLowerCase()));
  return `<section class="panel"><div class="list-toolbar"><div><h2>咨询列表 <span class="count">${getInquiries().length}</span></h2><p>来自官网的业务需求，按提交时间排序。</p></div><button class="secondary" data-export-leads>导出咨询记录 ${icon('file')}</button></div><div class="search-row"><label>${icon('search')}<input id="search" aria-label="搜索内容" value="${esc(filter)}" placeholder="搜索联系人、企业或咨询方向"></label><span>共 ${rows.length} 条记录</span></div><div class="table-scroll" tabindex="0" role="region" aria-label="内容列表"><table><thead><tr><th>联系人 / 企业</th><th>咨询方向</th><th>创建日期</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td><b>${esc(x.name)}</b><small class="cell-sub">${esc(x.company)}</small></td><td>${esc(x.intent)}</td><td>${esc(new Date(x.date).toLocaleString('zh-CN'))}</td><td><span class="badge ${x.status === 'done' ? 'green' : 'amber'}">${x.status === 'done' ? '已处理' : '待处理'}</span></td><td><button class="link-button" data-lead="${esc(x.id)}">查看详情</button></td></tr>`).join('') || `<tr><td colspan="5"><div class="empty-state">${icon('chat')}<h3>还没有咨询记录</h3><p>客户提交需求后，会显示在这里。您也可以从官网提交一份需求验证流程。</p><a class="secondary" href="/" target="_blank" rel="noopener">打开官网 ${icon('up')}</a></div></td></tr>`}</tbody></table></div></section>`;
}
function systemView() {
  if(!system)return `<section class="panel"><div class="panel-head"><h2>数据库与存储</h2></div><div class="settings-body"><p>正在读取数据库状态…</p></div></section>`;
  const db=system.database||{},tables=system.tables||[],checks=system.checks||[],markers=system.markers||[],pages=system.pages||[];
  const ready=tables.filter(table=>table.ready).length,table=(name)=>tables.find(item=>item.name===name)?.rows??'—';
  const cards=[
    ['数据库',`${db.product||'未知'} ${db.version||''}`.trim(),db.catalog?`当前库：${db.catalog}`:'未读取到库名'],
    ['数据表',`${ready} / ${tables.length}`,ready===tables.length?'必需数据表均可用':'有数据表不可用，请检查'],
    ['页面内容',pages.length,'页面版本与文案'],
    ['咨询记录',table('site_inquiry'),'来自官网的提交'],
    ['图片素材',table('site_media'),'数据库内图片'],
    ['管理员',table('Admins'),'可用后台账号']
  ];
  return `<section class="panel system-panel"><div class="panel-head"><div><h2>数据库与存储</h2><p class="cms-page-description">只读检查数据库连接、数据表、初始化标记和内容版本，不在这里直接修改数据库。</p></div><button class="secondary" data-system-refresh>刷新状态 ${icon('arrow')}</button></div><div class="settings-body"><div class="system-cards">${cards.map(([label,value,note])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('')}</div><div class="system-checks">${checks.map(item=>`<div class="${item.ok?'ok':'warn'}"><span>${item.ok?'通过':'需要检查'}</span><b>${esc(item.name)}</b><small>${esc(item.detail)}</small></div>`).join('')}</div><div class="system-config"><div><span>连接配置</span><b>运行时环境变量</b><small>数据库地址、账号和密码由 XGSZ_DATABASE_URL、XGSZ_DATABASE_USER、XGSZ_DATABASE_PASSWORD 提供，控制台不读取或展示密码。</small></div><div><span>修改方式</span><b>调整环境变量后重启</b><small>控制台不提供直接改库入口，避免误改生产连接；字符集、时区与版本以当前连接实际读取结果为准。</small></div></div><div class="system-columns"><section><h3>数据表</h3><div class="system-table-scroll"><table><thead><tr><th>分组</th><th>表名</th><th>记录</th></tr></thead><tbody>${tables.map(item=>`<tr><td>${esc(item.group)}</td><td><code>${esc(item.name)}</code></td><td>${item.ready?esc(item.rows):'不可用'}</td></tr>`).join('')}</tbody></table></div></section><section><h3>初始化标记</h3><ul class="system-list">${markers.map(item=>`<li><code>${esc(item.name)}</code><span>${esc(item.value)}</span></li>`).join('')||'<li><span>暂无标记</span></li>'}</ul><h3>页面版本</h3><ul class="system-list compact">${pages.map(item=>`<li><span>${esc(item.id)}</span><small>v${esc(item.version)}</small></li>`).join('')||'<li><span>暂无页面</span></li>'}</ul></section></div><p class="page-note">数据库类型：${esc(db.product||'未知')}　字符集：${esc(db.charset||'未读取')}　时区：${esc(db.timezone||'未读取')}　检查时间：${esc(system.generatedAt?new Date(system.generatedAt).toLocaleString('zh-CN'):'—')}</p></div></section>`;
}
function settings() { return `<form class="panel settings-panel" id="settings-form"><div class="panel-head"><h2>联系方式</h2><span class="badge green">${esc(content.pages.global.name)}</span></div><div class="settings-body"><p class="form-hint">这些信息会展示在官网联系页、页脚和咨询弹窗中。可暂时留空，填写并保存后对访客公开。</p>${field('咨询电话','phone',content.settings.phone,'tel')}${field('联系邮箱','email',content.settings.email,'email')}${field('联系地址','address',content.settings.address)}${wecomFields(content.settings,field)}<p class="form-error" role="alert"></p><div class="settings-brand">${content.pages.global.logo?`<img src="${esc(content.pages.global.logo)}" alt="">`:''}<div><b>${esc(content.pages.global.name)} / ${esc(content.pages.global.englishName)}</b><p>品牌名称与标志由官网项目统一维护。</p></div></div><button class="primary" type="submit">保存设置 ${icon('check')}</button></div></form><section class="panel data-panel"><div><h2>导出站点内容</h2><p>导出产品、服务与站点设置，可用于内容交接；不含咨询联系信息。</p></div><button class="secondary" data-export-content>导出内容 JSON ${icon('file')}</button></section>`; }
function field(label, name, value = '', type = 'text', required = false) { return `<label class="field">${label}${required ? '<span class="required"> *</span>' : ''}<input name="${name}" value="${esc(value)}" type="${type}" ${type==='number'?`min="0" step="${name==='stockQuantity'?1:'0.01'}"`:''} ${required ? 'required' : ''} maxlength="${({phone:100,email:200,address:500,wecomName:100,wecomUrl:500})[name]||200}" /></label>`; }
function textarea(label, name, value = '', required = false) { return `<label class="field">${label}${required ? '<span class="required"> *</span>' : ''}<textarea name="${name}" rows="3" ${required ? 'required' : ''} maxlength="2000">${esc(value)}</textarea></label>`; }
function closeModal() { document.querySelector('dialog')?.close(); }
function modal(title, body) { lastFocus = document.activeElement; const dialog = document.createElement('dialog'); dialog.className = 'admin-modal'; dialog.setAttribute('aria-labelledby','modal-title'); dialog.innerHTML = `<div class="modal-head"><h2 id="modal-title">${title}</h2><button aria-label="关闭弹窗" data-close>${icon('close')}</button></div>${body}`; document.body.append(dialog); document.body.classList.add('has-modal'); dialog.addEventListener('close', () => { dialog.remove(); document.body.classList.remove('has-modal'); if (lastFocus?.isConnected) lastFocus.focus(); }); dialog.showModal(); }
function edit(id) {
  const isProduct = section === 'products'; const x = id ? content[section].find(x => x.id === id) : {}; if (!x) return;
  modal(`${id ? '编辑' : '新增'}${isProduct ? '产品' : '服务'}`, `<form id="edit-form" data-id="${esc(id || '')}" data-version="${x.version || 0}"><div class="modal-body">${field(isProduct ? '产品名称' : '服务名称','name',x.name,'text',true)}${isProduct ? `<div class="form-columns"><label class="field">产品分类<select name="category">${categories.filter(c => c.id !== 'all').map(c => `<option value="${c.id}" ${x.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>${field('产品标签','tag',x.tag)}</div>` : ''}${field('英文名称','en',x.en)}${textarea(isProduct ? '产品简介' : '服务简介','desc',x.desc,true)}${textarea(isProduct ? '产品特点（每行一项）' : '服务内容（每行一项）',isProduct ? 'features' : 'items',(isProduct ? x.features : x.items)?.join('\n') || '')}${isProduct ? `${imageField('产品封面','coverImage',x.coverImage)}${textarea('产品详情图片（每行一个图片地址）','detailImages',(x.detailImages||[]).join('\n'))}<label class="field">产品品牌<select name="brand"><option value="">未指定品牌</option>${[...new Set([x.brand,...(content.brands||[]).map(b=>b.name)].filter(Boolean))].map(name=>`<option ${x.brand===name?'selected':''}>${esc(name)}</option>`).join('')}</select></label><div class="form-columns">${field('销售价格','salePrice',x.salePrice||0,'number')}${field('成本价格','costPrice',x.costPrice||0,'number')}${field('库存数量','stockQuantity',x.stockQuantity||0,'number')}</div>` : field('服务图标','icon',x.icon||'shield')}${field(isProduct ? '适用场景' : '服务说明',isProduct ? 'uses' : 'note',isProduct ? x.uses : x.note)}<label class="checkbox"><input type="checkbox" name="published" ${x.published !== false ? 'checked' : ''}>在官网上架展示</label><p class="form-error" role="alert"></p></div><div class="modal-footer"><button type="button" class="secondary" data-close>取消</button><button class="primary" type="submit">保存${isProduct ? '产品' : '服务'}</button></div></form>`);
}
function download(data, filename) { const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }
async function refresh() { content = await loadContent(true); categories=(content.categories||[]).filter(c=>c.enabled!==false).map(c=>({...c,id:c.key}));await loadInquiries(); }
async function handleError(error, form) {
  if(error.status === 401 && form?.id !== 'login-form') { authenticatedUser=''; closeModal(); await route(); return; }
  if(form?.querySelector('.form-error')) form.querySelector('.form-error').textContent=error.message;
  else notify(error.message);
}
function leadModal(id) {
  const x=getInquiries().find(x=>x.id===id);if(!x)return;
  modal('咨询详情',`<div class="modal-body lead-detail"><span class="eyebrow">提交时间：${esc(new Date(x.date).toLocaleString('zh-CN'))}</span><h3>${esc(x.intent)}</h3><dl>${[['联系人',x.name],['联系电话',x.phone],['公司名称',x.company]].map(([a,v])=>`<div><dt>${a}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><h4>需求描述</h4><p class="message">${esc(x.message)}</p></div><div class="modal-footer"><button class="secondary" data-close>关闭</button><button class="primary" data-done="${esc(x.id)}">${x.status==='done'?'标记待处理':'标记已处理'}</button></div>`);
}
document.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-close'))closeModal();
  if(b.dataset.new)edit();
  if(b.dataset.edit)edit(b.dataset.edit);
  if(b.dataset.lead)leadModal(b.dataset.lead);
  if(b.dataset.delete){const x=content[section].find(x=>x.id===b.dataset.delete);if(!x)return;modal('删除这项内容？',`<div class="modal-body"><p>「${esc(x.name)}」将从内容库删除，并停止在官网展示。</p><p class="form-error" role="alert"></p></div><div class="modal-footer"><button class="secondary" data-close>取消</button><button class="danger" data-confirm-delete="${esc(x.id)}">确认删除</button></div>`);}
  try {
    if(b.dataset.toggle){b.disabled=true;const x=content[section].find(x=>x.id===b.dataset.toggle);await saveRecord(section,{...x,published:x.published===false});content=getContent();shell();notify('展示状态已更新。');}
    if(b.dataset.confirmDelete){b.disabled=true;const x=content[section].find(x=>x.id===b.dataset.confirmDelete);await deleteRecord(section,x);content=getContent();closeModal();shell();notify('内容已删除。');}
    if(b.dataset.done){b.disabled=true;const x=getInquiries().find(x=>x.id===b.dataset.done);await updateInquiry(x.id,x.status==='done'?'pending':'done');closeModal();shell();notify('咨询处理状态已更新。');}
    if(b.hasAttribute('data-system-refresh')){b.disabled=true;system=await loadSystem();const panel=document.querySelector('#page-content');if(panel)panel.innerHTML=body();notify('数据库状态已刷新。');}
    if(b.hasAttribute('data-logout')){await api('/auth/logout',{method:'POST'});authenticatedUser='';await route();}
    if(b.hasAttribute('data-export-leads'))download(await loadInquiries(),`${content.pages.global.name}-咨询记录.json`);
    if(b.hasAttribute('data-export-content'))download(content,`${content.pages.global.name}-站点内容.json`);
    if(b.hasAttribute('data-retry'))await route();
  } catch(error){await handleError(error,document.querySelector('dialog'));} finally {if(b.isConnected)b.disabled=false;}
});
document.addEventListener('input',event=>{if(event.target.id!=='search')return;filter=event.target.value;const start=event.target.selectionStart;document.querySelector('#page-content').innerHTML=body();const input=document.querySelector('#search');input.focus();input.setSelectionRange(start,start);});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!['edit-form','settings-form','login-form'].includes(form.id))return;event.preventDefault();
  if(form.id==='settings-form'&&(form.dataset.saving==='true'||form.dataset.qrLoading==='true'))return;
  if(form.dataset.uploading||form.dataset.saving)return;
  const data=Object.fromEntries(new FormData(form));const b=form.querySelector('button[type="submit"]');b.disabled=true;const original=b.textContent;b.textContent='正在保存…';
  if(['settings-form','edit-form'].includes(form.id)){form.dataset.saving='true';form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=true);}
  try {
    if(form.id==='login-form'){
      const credentials={username:data.username.trim(),password:data.password};
      if(setupRequired){if(data.password!==data.confirm){form.querySelector('.form-error').textContent='两次输入的密码不一致。';return;}await api('/auth/setup',{method:'POST',body:JSON.stringify(credentials)});}
      await api('/auth/login',{method:'POST',body:JSON.stringify(credentials)});await route();return;
    }
    if(form.id==='settings-form'){const saved=await saveSettings({...content.settings,...data});if(form.elements.wecomQr)form.elements.wecomQr.value=saved.wecomQr||'';content=getContent();notify('联系信息已保存。');return;}
    if(!data.name.trim()||!data.desc.trim()){form.querySelector('.form-error').textContent='名称与简介不能为空。';return;}
    const id=form.dataset.id;const old=content[section].find(x=>x.id===id)||{};
    const item={...old,name:data.name.trim(),desc:data.desc.trim(),published:data.published==='on',version:Number(form.dataset.version),en:data.en||''};
    if(section==='products')Object.assign(item,{category:data.category,tag:data.tag.trim(),features:data.features.split('\n').map(x=>x.trim()).filter(Boolean),uses:data.uses.trim(),coverImage:data.coverImage||'',detailImages:data.detailImages.split('\n').map(x=>x.trim()).filter(Boolean),brand:data.brand||'',salePrice:Number(data.salePrice),costPrice:Number(data.costPrice),stockQuantity:Number(data.stockQuantity)});
    else Object.assign(item,{items:data.items.split('\n').map(x=>x.trim()).filter(Boolean),note:data.note.trim(),icon:data.icon||'shield'});
    await saveRecord(section,item,!id);content=getContent();closeModal();shell();notify('内容已保存，官网将显示最新版本。');
  }catch(error){await handleError(error,form);}finally{if(['settings-form','edit-form'].includes(form.id)&&form.isConnected){delete form.dataset.saving;form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=false);}if(b.isConnected){b.disabled=false;b.textContent=original;}}
});
function loginView(state){
  document.title=`${content.pages.global.name}管理后台`;
  setupRequired=state.setupRequired;
  root.innerHTML=`<main class="login-layout"><section class="login-brand"><a href="/" class="admin-brand">${content.pages.global.logo?`<img src="${esc(content.pages.global.logo)}" alt="">`:''}<span>${esc(content.pages.global.name)}<small>官网内容管理</small></span></a><div><span class="login-rule"></span><h1>${esc(content.pages.global.name)}<br>网站内容管理</h1><p>管理产品与服务，让客户找到合适的算力方案。</p></div><small>产品 · 服务 · 业务咨询</small></section><section class="login-surface"><a href="/" class="login-back">返回官网</a><div class="login-card"><span class="login-label">${esc(content.pages.global.name)}管理后台</span><h2>${setupRequired?'创建管理员账号':'欢迎回来'}</h2><p>${setupRequired?'首次使用，请设置专属管理员账号。创建后，此入口将关闭。':'登录后管理产品、服务与客户咨询。'}</p><form id="login-form"><label class="field">管理员账号<input name="username" required pattern="[a-zA-Z0-9_\\x2d]{3,40}" autocomplete="username" placeholder="3至40位字母、数字、下划线或短横线"></label><label class="field">密码<input name="password" required type="password" ${setupRequired?'minlength="12"':''} maxlength="64" autocomplete="${setupRequired?'new-password':'current-password'}" placeholder="${setupRequired?'至少12位字符':'请输入密码'}"></label>${setupRequired?'<label class="field">确认密码<input name="confirm" required type="password" minlength="12" maxlength="64" autocomplete="new-password"></label>':''}<p class="form-error" role="alert"></p><button type="submit" class="primary">${setupRequired?'创建账号并进入后台':'登录后台'}</button></form><small>账号登录使用服务器会话，密码以加密摘要存储。</small></div><p class="login-copyright">© ${new Date().getFullYear()} ${esc(content.pages.global.name)}</p></section></main><div id="toast" role="status"></div>`;
}
let routeSequence=0;
async function route(){
  const sequence=++routeSequence;closeModal();const requested=location.hash.slice(2);filter='';
  if(!root.children.length)root.innerHTML='<div class="admin-loading" role="status">正在连接管理后台…</div>';
  try{const state=await sessionState();if(sequence!==routeSequence)return;if(!state.authenticated){content=await loadContent();if(sequence!==routeSequence)return;loginView(state);return;}authenticatedUser=state.username;if(!cms.defs){await cms.definitions();if(sequence!==routeSequence)return;links.splice(6,links.length-6,...cms.links());}const target=links.some(x=>x[0]===requested)?requested:'overview';await refresh();if(sequence!==routeSequence)return;if(target==='system'){system=await loadSystem();if(sequence!==routeSequence)return;}else system=null;if(cms.accepts(target)){await cms.load(target);if(sequence!==routeSequence)return;}else cms.loadSequence=(cms.loadSequence||0)+1;if(target!==section)revealNavigation(target);section=target;shell();}
  catch(error){if(sequence!==routeSequence)return;root.innerHTML=`<main class="admin-connection-error"><h1>暂时无法连接后台</h1><p role="alert">${esc(error.message)}</p><button class="primary" data-retry>重新连接</button><a href="/">返回官网</a></main><div id="toast" role="status"></div>`;}
}
window.addEventListener('hashchange',route);
route();
