export const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let content = { products: [], services: [], settings: {phone:'',email:'',address:'',wecomName:'',wecomUrl:'',wecomQr:'',version:0} };
let inquiries = [];
let csrf = '';
const contentUpdates=typeof BroadcastChannel==='function'?new BroadcastChannel('xgsz-content-updates'):null;
export function onContentChange(listener){contentUpdates?.addEventListener('message',listener);}
export async function api(path, options = {}) {
  const method = options.method || 'GET';
  if (method !== 'GET' && !csrf) await sessionState();
  const headers = { ...(options.body && !(options.body instanceof FormData) ? {'Content-Type':'application/json'} : {}), ...(method !== 'GET' ? {'X-CSRF-TOKEN':csrf} : {}), ...options.headers };
  let response;
  try { response = await fetch(`/api${path}`, { ...options, method, headers, credentials:'same-origin' }); }
  catch { throw new Error('暂时无法连接服务，请检查网络后重试。'); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('服务响应异常，请确认后端已启动。'); }
  if (!response.ok || result.code !== 0) { const error = new Error(result.message || '操作失败，请重试。'); error.status = response.status; throw error; }
  if(method!=='GET'&&/^\/admin\/(products|services|settings|pages|catalog)(\/|$)/.test(path))contentUpdates?.postMessage('content-updated');
  return result.data;
}
export async function sessionState() { const data = await api('/auth/session'); csrf = data.csrf; return data; }
export async function loadContent(manager = false) { content = await api(manager ? '/admin/content' : '/public/content'); return content; }
export const getContent = () => content;
export async function loadInquiries() { inquiries = await api('/admin/inquiries'); return inquiries; }
export const getInquiries = () => inquiries;
export async function loadSystem() { return api('/admin/system'); }
export async function saveRecord(kind, record, fresh = false) { const saved = await api(`/admin/${kind}${fresh ? '' : `/${encodeURIComponent(record.id)}`}`, {method:fresh?'POST':'PUT',body:JSON.stringify(record)}); await loadContent(true); return saved; }
export async function deleteRecord(kind, record) { await api(`/admin/${kind}/${encodeURIComponent(record.id)}?version=${record.version}`, {method:'DELETE'}); await loadContent(true); }
export async function saveSettings(settings) { const saved = await api('/admin/settings',{method:'PUT',body:JSON.stringify(settings)}); content.settings = saved; return saved; }
export async function updateInquiry(id, status) { await api(`/admin/inquiries/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status})}); await loadInquiries(); }
export function publicRecords(rows) { return rows.filter(x => x.published !== false).map(x => Object.fromEntries(Object.entries(x).map(([k,v]) => [k, Array.isArray(v) ? v.map(html) : typeof v === 'string' ? html(v) : v]))); }
