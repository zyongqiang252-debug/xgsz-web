import {html as esc} from './content-store.js';
import './admin-navigation.css';

const openGroups=new Set();
const common=new Set(['overview','products','services','inquiries']);
const system=new Set(['settings','system','catalog-admins']);

function groupFor(id){return common.has(id)?null:system.has(id)?'system':'display';}
export function revealNavigation(section){const group=groupFor(section);if(group)openGroups.add(group);}

document.addEventListener('toggle',event=>{
  const group=event.target;
  if(!group.matches?.('details.admin-nav-group'))return;
  if(group.open)openGroups.add(group.dataset.navGroup);else openGroups.delete(group.dataset.navGroup);
},true);

export function renderNavigation({links,section,icon,pending}){
  const renderLink=([id,symbol,label])=>`<a href="#/${esc(id)}" aria-label="${esc(label)}" ${id===section?'aria-current="page"':''}>${icon(symbol)}<span>${esc(label)}</span>${id==='inquiries'&&pending?`<b>${pending}</b>`:''}</a>`;
  const renderGroup=(id,label,symbol)=>{
    const rows=links.filter(([key])=>groupFor(key)===id);
    const active=rows.some(([key])=>key===section);
    let children=rows.map(renderLink).join('');
    if(id==='display'){
      children=`<span class="admin-nav-subheading">业务模块与线上平台</span>${rows.filter(([key])=>key.startsWith('page-')).map(renderLink).join('')}<span class="admin-nav-subheading">内容模块与素材</span>${rows.filter(([key])=>!key.startsWith('page-')).map(renderLink).join('')}`;
    }
    return `<details class="admin-nav-group" data-nav-group="${id}" ${openGroups.has(id)?'open':''}><summary ${active?'data-active="true"':''}>${icon(symbol)}<span>${label}</span><svg class="admin-nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></summary><div class="admin-nav-children">${children}</div></details>`;
  };
  return `${links.filter(([id])=>common.has(id)).map(renderLink).join('')}<div class="admin-nav-divider"></div>${renderGroup('display','页面展示','file')}${renderGroup('system','系统设置','settings')}`;
}
