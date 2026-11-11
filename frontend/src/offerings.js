import {html} from './content-store.js';

export function platformLinks(page){
  const links=[['淘宝入口',page.taobaoUrl],['抖音入口',page.douyinUrl]].flatMap(([label,value])=>{
    try{
      const url=new URL(value);
      if(url.protocol!=='https:'||url.username||url.password)return [];
      return [`<a href="${html(url.href)}" target="_blank" rel="noopener noreferrer">${label}<span aria-hidden="true">↗</span></a>`];
    }catch{return [];}
  });
  return links.length?`<nav class="platform-links" aria-label="线上平台">${links.join('')}</nav>`:'';
}

const solutionIcons={servers:'server',deployment:'layers',inference:'activity',cluster:'network'};
const solutionGuidance={
  deployment:'从现有设备、模型规模与数据要求出发，明确部署边界和交付内容。',
  inference:'结合模型、硬件和业务负载评估瓶颈，先验证，再确定优化路径。',
  cluster:'围绕设备现状、集群规模和保障目标，组合交付、运维与维保服务。'
};
const serviceItemDetails={
  '裸金属交付':['server','完成硬件、基础软件与运行环境的集成交付。'],
  '整体 Token 输出方案':['layers','结合模型、硬件和业务目标规划输出能力。'],
  '专业 Agent 工具':['tool','围绕实际业务流程适配工具和应用方式。'],
  'Token 平台优化':['layers','梳理平台配置、调用链路和资源使用情况。'],
  '推理产出优化':['activity','评估延迟、吞吐与精度要求，确定验证路径。'],
  '集群性能优化':['chip','结合业务负载、网络与调度定位性能瓶颈。'],
  '集群交付':['network','衔接设备上架、环境配置、联调测试与交付。'],
  '集群运维':['activity','覆盖日常巡检、变更管理、故障定位与扩容。'],
  '集群 GPU 维保':['chip','开展 GPU 健康检查、故障分析与维护支持。'],
  '液冷维保':['shield','围绕液冷设备和运行状态提供维护支持。']
};

export function offeringsPage({page,identifiers,platforms,subhero,icon,arrow,hardware,brands,cta}){
  const solutions=(page.solutionGroups||[]).map((solution,index)=>({
    ...solution,
    identifier:encodeURIComponent(String(identifiers[index]??solution.key??''))
  }));
  const selected=solutions.find(solution=>solution.identifier===encodeURIComponent(String(page.selectedSolution||'')))||solutions[0];
  const groups=selected?.groups||[];
  const guidance=solutionGuidance[selected?.key]||'结合实际业务需求，明确工作内容、交付边界与后续支持方式。';
  return `<main id="main" class="offerings-page">${subhero('',page.heroTitle,page.heroDesc,platforms)}
    <div class="container offering-catalog">
      <aside class="offering-sidebar"><h2>${page.solutionsTitle||'产品与解决方案'}</h2><nav class="offering-nav" aria-label="业务方向">${solutions.map(solution=>`<button type="button" data-solution="${solution.identifier}" aria-pressed="${solution===selected}">${icon(solutionIcons[solution.key]||solution.icon)}<span>${solution.title}</span>${icon('chevron')}</button>`).join('')}</nav>
        <p class="offering-nav-hint">左右滑动查看全部业务方向</p>
        <section class="offering-consultation">${icon('chat')}<h3>需求还不明确？</h3><p>告诉我们业务场景、设备现状和计划，先从一次需求梳理开始。</p><button data-inquiry="产品选型咨询">咨询产品选型 ${arrow}</button></section>
      </aside>
      <div class="offering-content">${selected?`<section class="offering-section" id="offering-${selected.identifier}"><div class="offering-heading"><h2>${selected.title}</h2><p>${selected.desc}</p></div>
        ${selected.key==='servers'?hardware:`<div class="offering-group-grid">${groups.map(group=>`<article><h3>${group.title}</h3><ul class="offering-items">${String(group.items||'').split('\n').map(item=>item.trim()).filter(Boolean).map(item=>{const [itemIcon,desc]=serviceItemDetails[item]||['check','按实际业务环境沟通服务内容和交付边界。'];return `<li>${icon(itemIcon)}<div><strong>${item}</strong><p>${desc}</p></div><button type="button" data-inquiry="${item}" aria-label="咨询${item}">${icon('chevron')}</button></li>`;}).join('')}</ul></article>`).join('')}</div><div class="offering-next-step"><p>${guidance}</p><button class="text-link" data-inquiry="${selected.title}">沟通这项业务 ${arrow}</button></div>`}
      </section>`:'<p>产品与解决方案正在整理中，请直接联系我们。</p>'}
        <p class="offering-disclaimer">${page.disclaimer}</p>
      </div>
    </div>
    <section class="offering-delivery"><div class="container"><div class="offering-delivery-head"><h2>${page.deliveryTitle}</h2><p>从需求沟通到持续支持，让方案选择与后续交付保持衔接。</p></div><div class="steps">${page.steps.map((step,index)=>`<div><span>${String(index+1).padStart(2,'0')}</span><h3>${step.title}</h3><p>${step.desc}</p></div>`).join('')}</div></div></section>
    ${brands}${cta}
  </main>`;
}
