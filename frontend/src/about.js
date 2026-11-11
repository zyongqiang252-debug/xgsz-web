const multiline=value=>String(value||'').replaceAll('\n','<br>');
const milestoneTag=item=>item.tag||'项目动态';
const milestoneDate=date=>{
  const [year='',month='',day='']=String(date||'').split('-');
  return [year,month,day].filter(Boolean).join('.');
};
function projectsSection(x,milestones){
  const recent=[...milestones]
    .filter(item=>item?.title)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''),'zh-CN',{numeric:true}))
    .slice(0,5);
  if(!recent.length)return '';
  const [featured,...rest]=recent;
  const image=x.introImage||'/assets/datacenter-hero.webp';
  return `<section class="about-projects" id="company-milestones" aria-labelledby="milestones-title">
    <div class="container">
      <header class="about-projects-heading">
        <div><span class="about-label">交付与服务</span><h2 id="milestones-title">${x.milestonesTitle}</h2></div>
        <p>${x.milestonesDesc}</p>
      </header>
      <div class="about-project-layout">
        <article class="about-project-feature">
          <div class="about-project-feature-media"><img src="${image}" alt="" loading="eager"><span class="about-project-badge">最新交付</span></div>
          <div class="about-project-feature-body">
            <div class="about-project-meta"><span>${milestoneTag(featured)}</span><time datetime="${featured.date}">${milestoneDate(featured.date)}</time></div>
            <h3>${featured.title}</h3>
            <p>${multiline(featured.desc)}</p>
          </div>
        </article>
        ${rest.length?`<ol class="about-project-list" aria-label="最近项目动态">${rest.map(item=>`<li><article><div class="about-project-list-meta"><time datetime="${item.date}">${milestoneDate(item.date)}</time><span>${milestoneTag(item)}</span></div><div class="about-project-list-copy"><h3>${item.title}</h3><p>${multiline(item.desc)}</p></div></article></li>`).join('')}</ol>`:''}
      </div>
    </div>
  </section>`;
}

// Values arrive escaped by the public content renderer; only layout belongs here.
export function aboutPage({page:x,images,capabilities,icon,arrow,cta,subhero}) {
  const milestones=x.milestones||[];
  const business=(capabilities||[]).slice(0,4);
  const serviceSteps=(x.supportAreas||[]).slice(0,4);
  return `<main id="main" class="about-page">
    ${subhero('',x.heroTitle,x.heroDesc)}
    ${projectsSection(x,milestones)}

    <nav class="about-anchor-nav" aria-label="关于我们页面导航"><div class="container"><a href="#company-intro" data-about-section>公司简介</a><a href="#company-business" data-about-section>核心业务</a><a href="#company-service" data-about-section>服务方式</a></div></nav>

    <section class="section about-intro-section" id="company-intro" aria-labelledby="company-intro-title"><div class="container about-intro-layout">
      <div class="about-intro-heading"><span class="about-label">我们是谁</span><h2 id="company-intro-title">${multiline(x.introTitle)}</h2><p class="about-intro-sign">${multiline(x.visualTitle)}</p></div>
      <div class="about-intro-content"><p class="company-lead">${x.introLead}</p>${x.introBody.split('\n').filter(Boolean).map(text=>`<p>${text}</p>`).join('')}<a class="text-link" href="#/contact">与我们建立联系 ${arrow}</a></div>
    </div></section>

    ${business.length?`<section class="section about-business-section" id="company-business" aria-labelledby="company-business-title"><div class="container">
      <div class="about-section-heading"><span class="about-label">核心业务</span><h2 id="company-business-title">从算力建设，到持续运行</h2><p>围绕企业 IT 基础设施与智能算力需求，提供相互衔接的产品与技术服务。</p></div>
      <div class="about-business-grid">${business.map((item,index)=>`<a href="${item.link}"><span class="about-business-number">0${index+1}</span><div class="about-business-icon">${icon(item.icon)}</div><h3>${item.title}</h3><p>${item.desc}</p><span class="about-business-more">了解业务 ${arrow}</span></a>`).join('')}</div>
    </div></section>`:''}

    <section class="section about-service-section" id="company-service" aria-labelledby="company-service-title"><div class="container about-service-layout">
      <div class="about-service-intro"><span class="about-label">服务方式</span><h2 id="company-service-title">${multiline(x.supportTitle)}</h2><p>${x.supportDesc}</p><div class="about-principle-tags">${x.principles.map(item=>`<span>${item.title}</span>`).join('')}</div></div>
      <ol class="about-service-steps">${serviceSteps.map((item,index)=>`<li><span>0${index+1}</span><div><h3>${item.label} · ${item.title}</h3><p>${item.desc}</p></div></li>`).join('')}</ol>
    </div></section>
    <section class="about-principles-section" aria-labelledby="about-principles-title"><div class="container"><div><span class="about-label">我们的工作方式</span><h2 id="about-principles-title">${x.principlesTitle}</h2></div><div class="about-principles-list">${x.principles.map(item=>`<article><h3>${item.title}</h3><p>${item.desc}</p></article>`).join('')}</div></div></section>
    ${images.length?`<section class="section"><div class="container cms-brand-grid">${images.map(item=>`<figure><img class="cms-detail-image" src="${item.imageUrl}" alt="${item.description}" loading="lazy"><figcaption>${item.description}</figcaption></figure>`).join('')}</div></section>`:''}
    ${cta()}
  </main>`;
}
