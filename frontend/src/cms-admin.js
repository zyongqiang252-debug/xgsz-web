import { api,html as esc,getContent } from './content-store.js';
import './cms-admin.css';
let fieldSequence=0;
const fieldId=()=>`cms-field-${++fieldSequence}`;

export function imageField(label,name,value='') {
  const uid=fieldId();
  return `<div class="cms-image-field" data-image-field><label class="field" for="${uid}">${esc(label)}<input id="${uid}" name="${esc(name)}" value="${esc(value)}" maxlength="1000" data-cms-value placeholder="上传图片或粘贴 HTTPS 图片地址"></label><label class="cms-upload">上传${esc(label)}<input type="file" accept="image/png,image/jpeg,image/bmp" aria-label="上传${esc(label)}" data-image-upload></label><button type="button" class="link-button" data-clear-image>移除图片</button><img class="cms-image-preview" src="${esc(value)}" alt="${esc(label)}预览" ${value?'':'hidden'}><p class="cms-field-error" aria-live="polite"></p></div>`;
}
function preview(block,value){const image=block.querySelector('.cms-image-preview');image.hidden=!value;image.src=value;}
document.addEventListener('input',event=>{const block=event.target.closest('[data-image-field]');if(block&&event.target.matches('[data-cms-value]'))preview(block,event.target.value);});
document.addEventListener('click',event=>{if(!event.target.closest('[data-clear-image]'))return;const block=event.target.closest('[data-image-field]');if(block.closest('form')?.dataset.uploading||block.closest('form')?.dataset.saving)return;block.querySelector('[data-cms-value]').value='';preview(block,'');});
document.addEventListener('change',async event=>{
  const input=event.target;if(!input.matches('[data-image-upload]')||!input.files.length)return;
  const block=input.closest('[data-image-field]'),form=input.closest('form'),button=form?.querySelector('[type=submit]');
  const error=block.querySelector('.cms-field-error');error.textContent='';
  const file=input.files[0];if(file.size>5*1024*1024){error.textContent='请选择5MB以内的图片。';input.value='';return;}
  if(form){form.dataset.uploading=String(Number(form.dataset.uploading||0)+1);if(button)button.disabled=true;}
  input.disabled=true;block.querySelector('[data-clear-image]').disabled=true;
  try {const data=new FormData();data.set('file',file);const result=await api('/admin/media',{method:'POST',body:data});if(block.isConnected){block.querySelector('[data-cms-value]').value=result.url;preview(block,result.url);}}
  catch(e){if(error.isConnected)error.textContent=e.message;}
  finally{if(form){const pending=Number(form.dataset.uploading||1)-1;if(pending)form.dataset.uploading=String(pending);else delete form.dataset.uploading;if(button?.isConnected&&!form.dataset.saving&&!pending)button.disabled=false;}if(input.isConnected){input.disabled=false;input.value='';block.querySelector('[data-clear-image]').disabled=false;}}
});

export class CmsAdmin {
  constructor({modal,closeModal,notify,refresh}){Object.assign(this,{modal,closeModal,notify,refresh});this.defs=null;this.section='';this.rows=[];this.page={};this.search='';
    document.addEventListener('click',event=>this.click(event));
    document.addEventListener('submit',event=>this.submit(event));
    document.addEventListener('input',event=>{if(event.target.id==='cms-search'){this.search=event.target.value;document.querySelector('#cms-rows').innerHTML=this.tableRows();}});
  }
  async definitions(){this.defs=await api('/admin/cms');return this.defs;}
  pageDefinition(id){return Object.hasOwn(this.defs.pages,id)&&this.defs.pages[id].adminVisible!==false?this.defs.pages[id]:null;}
  links(){return [...Object.entries(this.defs.pages).filter(([id])=>this.pageDefinition(id)).map(([id,x])=>[`page-${id}`,'file',x.label]),...Object.entries(this.defs.modules).map(([id,x])=>[`catalog-${id}`,'box',x.label]),['media','file','图片素材']];}
  accepts(section){return section==='media'||section.startsWith('page-')&&Boolean(this.pageDefinition(section.slice(5)))||section.startsWith('catalog-')&&Object.hasOwn(this.defs.modules,section.slice(8));}
  async load(section){const sequence=(this.loadSequence||0)+1;this.loadSequence=sequence;let value;if(section.startsWith('page-'))value=await api(`/admin/pages/${section.slice(5)}`);else if(section.startsWith('catalog-'))value=await api(`/admin/catalog/${section.slice(8)}`);else if(section==='media')value=await api('/admin/media');if(sequence!==this.loadSequence)return false;this.section=section;this.search='';if(section.startsWith('page-'))this.page=value;else this.rows=value;return true;}
  definition(){return this.section.startsWith('page-')?this.defs.pages[this.section.slice(5)]:this.defs.modules[this.section.slice(8)];}
  hint(def,extra=''){const text=[def.hint,extra].filter(Boolean).join(' ');return text?`<p class="cms-field-hint">${esc(text)}</p>`:'';}
  field(def,value,path){
    const name=esc(path),required=def.required?'required':'';const label=esc(def.label),uid=fieldId();
    if(def.type==='list')return `<fieldset class="cms-repeater" data-repeater data-path="${name}"><legend>${label}</legend>${this.hint(def,'每项均可编辑、调整顺序或移除，保存页面后生效。')}<div class="cms-repeater-rows">${(value||[]).map((row,i)=>this.repeatRow(def,row,path,i)).join('')}</div><button type="button" class="secondary" data-cms-add="${name}">添加${label}</button></fieldset>`;
    if(def.type==='image')return `<div data-field="${esc(def.key)}">${imageField(def.label,path,value)}${this.hint(def)}</div>`;
    if(def.type==='checkbox')return `<div data-field="${esc(def.key)}"><label class="checkbox"><input type="checkbox" name="${name}" data-cms-value ${value!==false?'checked':''}>${label}</label>${this.hint(def)}</div>`;
    if(def.type==='products')return `<fieldset class="cms-product-select" data-field="${esc(def.key)}"><legend>${label}</legend>${this.hint(def)}${getContent().products.map(p=>`<label class="checkbox"><input type="checkbox" data-product-id="${p.productId}" ${value?.includes(p.productId)?'checked':''}>${esc(p.name)}</label>`).join('')||'<p>请先添加产品。</p>'}</fieldset>`;
    if(def.type==='textarea'||path.endsWith('Title')||path.endsWith('Desc'))return `<div class="field" data-field="${esc(def.key)}"><label for="${uid}">${label}</label><textarea id="${uid}" name="${name}" rows="3" maxlength="8000" data-cms-value ${required}>${esc(value)}</textarea>${this.hint(def)}</div>`;
    const type=def.type==='password'?'password':['number','money','latitude','longitude'].includes(def.type)?'number':'text';
    return `<div class="field" data-field="${esc(def.key)}"><label for="${uid}">${label}</label><input id="${uid}" name="${name}" type="${type}" data-cms-value value="${esc(value??(type==='number'?0:''))}" ${required} ${type==='number'?`step="${def.type==='number'?1:'any'}" ${['number','money'].includes(def.type)?'min="0"':''}`:'maxlength="1000"'} ${type==='password'?'autocomplete="new-password"':''}>${type==='password'?'<small>新增时至少12个字符；编辑时留空保留原密码。</small>':''}${this.hint(def)}</div>`;
  }
  editableFields(def){const keys=Array.isArray(def.adminFields)?new Set(def.adminFields):null;return keys?def.fields.filter(field=>keys.has(field.key)):def.fields;}
  pageFieldSections(def,value){
    const editableFields=this.editableFields(def),editableKeys=new Set(editableFields.map(field=>field.key));
    const sections=Array.isArray(def.sections)?def.sections:[];
    if(!sections.length)return this.fields(editableFields,value);
    const fields=new Map(editableFields.map(field=>[field.key,field]));
    const used=new Set();
    const html=sections.map((section,index)=>{
      const rows=(section.fields||[]).map(key=>fields.get(key)).filter(Boolean);
      rows.forEach(field=>used.add(field.key));
      if(!rows.length)return '';
      return `<div class="cms-section-head" id="cms-section-${index}"><h3>${esc(section.title)}</h3>${section.desc?`<p>${esc(section.desc)}</p>`:''}</div>${rows.map(field=>this.field(field,value[field.key]??'',field.key)).join('')}`;
    }).join('');
    const rest=editableFields.filter(field=>!used.has(field.key)&&editableKeys.has(field.key));
    return html+(rest.length?`<div class="cms-section-head"><h3>其他字段</h3><p>未归入手工分组的字段，仍会保存并在官网使用。</p></div>${rest.map(field=>this.field(field,value[field.key]??'',field.key)).join('')}`:'');
  }
  pageSectionNav(def){
    const editableKeys=new Set(this.editableFields(def).map(field=>field.key));
    const sections=(Array.isArray(def.sections)?def.sections:[]).map((section,index)=>({section,index})).filter(({section})=>(section.fields||[]).some(key=>editableKeys.has(key)));
    if(sections.length<2)return '';
    return `<nav class="cms-section-nav" aria-label="页面内容区块"><span>页面结构</span>${sections.map(({section,index})=>`<button type="button" data-cms-section="cms-section-${index}">${esc(section.title)}</button>`).join('')}</nav>`;
  }
  repeatRow(def,value,path,i){const summary=def.fields.filter(field=>field.key!=='key').map(field=>value[field.key]).find(value=>String(value||'').trim());return `<details class="cms-repeat-row" data-repeat-row ${summary?'':'open'}><summary><span>${esc(summary||`新增${def.label}`)}</span><small>第 ${i+1} 项</small><span class="cms-repeat-chevron" aria-hidden="true">⌄</span></summary><div class="cms-repeat-body"><div class="cms-repeat-actions"><span>调整此内容</span><button type="button" class="link-button" data-cms-up aria-label="上移此项">上移</button><button type="button" class="link-button" data-cms-down aria-label="下移此项">下移</button><button type="button" class="danger-text" data-cms-remove aria-label="移除此项">移除</button></div><div class="cms-repeat-fields">${def.fields.map(field=>this.field(field,value[field.key]??'',`${path}.${i}.${field.key}`)).join('')}</div></div></details>`;}
  fields(fields,value,prefix=''){return fields.map(def=>this.field(def,value[def.key]??'',prefix?`${prefix}.${def.key}`:def.key)).join('');}
  read(fields,container){const data={};for(const def of fields){
    const fields=container.matches('[data-repeat-row]')?container.querySelector(':scope > .cms-repeat-body > .cms-repeat-fields'):container;
    const block=[...fields.children].find(x=>x.dataset.field===def.key||x.dataset.path?.split('.').at(-1)===def.key);
    if(def.type==='list'){data[def.key]=[...block.querySelector(':scope > .cms-repeater-rows').children].map(row=>this.read(def.fields,row));continue;}
    if(def.type==='products'){data[def.key]=[...block.querySelectorAll('input:checked')].map(x=>Number(x.dataset.productId));continue;}
    const input=block.querySelector('[data-cms-value]');data[def.key]=def.type==='checkbox'?input.checked:['number','money','latitude','longitude'].includes(def.type)?Number(input.value):input.value;
  }return data;}
  render(){if(this.section==='media')return `<section class="panel"><div class="panel-head"><h2>图片素材</h2></div><div class="settings-body"><p>上传后可在产品、轮播、品牌和业务模块中使用。支持5MB以内的 PNG、JPG、BMP。</p>${imageField('素材图片','media','')}<div class="cms-media-grid">${this.rows.map(x=>`<figure><img src="${esc(x.url)}" alt="${esc(x.name)}" loading="lazy"><figcaption>${esc(x.name)}</figcaption><button type="button" class="secondary" data-copy-url="${esc(x.url)}">复制图片地址</button></figure>`).join('')}</div></div></section>`;
    const def=this.definition();
    if(this.section.startsWith('page-'))return `<form class="panel cms-page-form" id="cms-page-form" data-section="${esc(this.section)}" data-version="${this.page.version}"><div class="panel-head"><div><h2>${esc(def.label)}</h2>${def.description?`<p class="cms-page-description">${esc(def.description)}</p>`:''}</div><div class="cms-page-actions">${def.preview?`<a class="secondary" href="${esc(def.preview)}" target="_blank" rel="noopener">查看官网</a>`:''}<button class="primary" type="submit">保存页面</button></div></div>${this.pageSectionNav(def)}<div class="cms-fields">${this.pageFieldSections(def,this.page)}</div><div class="cms-save-bar"><p class="form-error" role="alert"></p><button class="primary" type="submit">保存页面</button></div></form>`;
    return `<section class="panel"><div class="list-toolbar"><div><h2>${esc(def.label)}</h2><p>保存后刷新官网即可查看更新。</p></div><button type="button" class="primary" data-cms-new>新增${esc(def.label)}</button></div><div class="search-row"><label><input id="cms-search" aria-label="搜索记录" placeholder="搜索名称或说明"></label><span>共 ${this.rows.length} 条</span></div><div class="table-scroll" role="region" aria-label="${esc(def.label)}列表" tabindex="0"><table><thead><tr><th>内容</th><th>说明 / 状态</th><th>操作</th></tr></thead><tbody id="cms-rows">${this.tableRows()}</tbody></table></div></section>`;
  }
  title(row){if(this.section==='catalog-productCarousels')return `推荐产品组 ${row.id}`;return row.name||row.title||row.userName||row.description||row.icp||`记录 ${row.id}`;}
  tableRows(){return this.rows.filter(x=>JSON.stringify(x).toLowerCase().includes(this.search.toLowerCase())).map(x=>`<tr><td><b>${esc(this.title(x))}</b></td><td>${esc(x.description||x.contactInfo||x.status||(x.products?`${x.products.length} 项推荐产品`:x.enabled===false||x.enable===false?'已停用':''))}</td><td><div class="table-actions"><button type="button" data-cms-edit="${x.id}">编辑</button><button type="button" class="danger-text" data-cms-delete="${x.id}">删除</button></div></td></tr>`).join('')||'<tr><td colspan="3"><div class="empty-state"><h3>暂无记录</h3><p>点击新增添加内容。</p></div></td></tr>';}
  async click(event){const b=event.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-cms-add')){const path=b.dataset.cmsAdd;let fields=this.definition().fields,def;for(const key of path.split('.').filter(part=>!/^\d+$/.test(part))){def=fields.find(field=>field.key===key);fields=def?.fields||[];}if(!def)return;const wrapper=b.closest('[data-repeater]').querySelector(':scope > .cms-repeater-rows');wrapper.insertAdjacentHTML('beforeend',this.repeatRow(def,{},path,wrapper.children.length));return;}
    if(b.dataset.cmsSection){document.getElementById(b.dataset.cmsSection)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(b.hasAttribute('data-cms-remove')){b.closest('[data-repeat-row]').remove();return;}
    if(b.hasAttribute('data-cms-up')||b.hasAttribute('data-cms-down')){const row=b.closest('[data-repeat-row]');if(b.hasAttribute('data-cms-up')&&row.previousElementSibling)row.previousElementSibling.before(row);else if(b.hasAttribute('data-cms-down')&&row.nextElementSibling)row.nextElementSibling.after(row);this.refreshRepeatLabels(row.parentElement);return;}
    if(b.hasAttribute('data-copy-url')){try{await navigator.clipboard.writeText(b.dataset.copyUrl);this.notify('图片地址已复制。');}catch{this.notify('图片地址：'+b.dataset.copyUrl);}return;}
    if(b.hasAttribute('data-cms-new')||b.dataset.cmsEdit){
      const row=this.rows.find(x=>String(x.id)===b.dataset.cmsEdit)||{};
      this.modal(row.id?'编辑记录':`新增${this.definition().label}`,`<form id="cms-record-form" data-id="${row.id||''}" data-version="${row.version||0}" data-section="${esc(this.section)}"><div class="modal-body cms-fields">${this.fields(this.definition().fields,row)}</div><div class="modal-footer"><p class="form-error" role="alert"></p><button type="button" class="secondary" data-close>取消</button><button class="primary" type="submit">保存记录</button></div></form>`);return;
    }
    if(b.dataset.cmsDelete){const row=this.rows.find(x=>String(x.id)===b.dataset.cmsDelete);this.modal('删除这条记录？',`<div class="modal-body"><p>「${esc(this.title(row))}」将从当前列表中删除。</p><p class="form-error" role="alert"></p></div><div class="modal-footer"><button type="button" class="secondary" data-close>取消</button><button type="button" class="danger" data-cms-confirm="${row.id}" data-version="${row.version}">确认删除</button></div>`);return;}
    if(b.dataset.cmsConfirm){b.disabled=true;try{await api(`/admin/catalog/${this.section.slice(8)}/${b.dataset.cmsConfirm}?version=${b.dataset.version}`,{method:'DELETE'});this.closeModal();await this.refresh();this.notify('记录已删除。');}catch(e){const error=b.closest('dialog')?.querySelector('.form-error');if(error)error.textContent=e.message;}finally{if(b.isConnected)b.disabled=false;}}
  }
  refreshRepeatLabels(container){[...container.children].filter(row=>row.matches('[data-repeat-row]')).forEach((row,index)=>{const label=row.querySelector(':scope > summary small');if(label)label.textContent=`第 ${index+1} 项`;});}
  async submit(event){const form=event.target;if(!['cms-page-form','cms-record-form'].includes(form.id))return;event.preventDefault();if(form.dataset.saving||form.dataset.uploading)return;
    const section=form.dataset.section,definition=this.definition(),fields=form.id==='cms-page-form'?this.editableFields(definition):definition.fields;const value=form.id==='cms-page-form'?{...this.page,...this.read(fields,form.querySelector('.cms-fields'))}:this.read(fields,form.querySelector('.cms-fields'));value.version=Number(form.dataset.version);
    form.dataset.saving='true';form.querySelectorAll('button,input,textarea,select').forEach(x=>x.disabled=true);
    try {const path=form.id==='cms-page-form'?`/admin/pages/${section.slice(5)}`:`/admin/catalog/${section.slice(8)}${form.dataset.id?'/'+form.dataset.id:''}`;
      const result=await api(path,{method:form.id==='cms-record-form'&&!form.dataset.id?'POST':'PUT',body:JSON.stringify(value)});
      if(!form.isConnected||this.section!==section)return;
      if(form.id==='cms-page-form'){this.page=result;form.dataset.version=result.version;this.notify('页面已保存，刷新官网即可查看。');}
      else{this.closeModal();await this.refresh();this.notify('内容已保存。');}
    }catch(e){const error=form.querySelector('.form-error');if(error)error.textContent=e.message;}
    finally{delete form.dataset.saving;if(form.isConnected)form.querySelectorAll('button,input,textarea,select').forEach(x=>x.disabled=false);}
  }
}
