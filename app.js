import { guides } from './guide-data.js';
import { helpVideos, findVideos } from './video-data.js';
import { categories, searchGuides, readStored, validProgress, escapeHtml as e } from './guide-utils.js';

const paths = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  orders:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  candidates:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  timesheets:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-14 5 3 3 6-6"/>',
  saved:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  support:'<circle cx="12" cy="12" r="9"/><path d="M9.8 8.7a2.4 2.4 0 0 1 4.6 1c0 1.8-2.4 2-2.4 4M12 17h.01"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  account:'<path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M12 14v3"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  tip:'<path d="M8 16c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8M9 19h6M10 22h4M8 16h8"/>'
};
const icon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.orders}</svg>`;
const categoryIcon = category => ({Orders:'orders',Candidates:'candidates',Timesheets:'timesheets',Account:'account','Finding records':'search'}[category]);
const main = document.querySelector('main');
const nav = document.querySelector('#nav');
let storage; try { storage = window.localStorage; } catch { storage = {getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}}; }
const savedValue = readStored(storage,'vertage-saved',[]);
let saved = Array.isArray(savedValue) ? savedValue.filter(id => guides.some(g => g.id === id)) : [];
let progress = validProgress(readStored(storage,'vertage-progress',{}),guides);
let query = '';
let category = 'All';
let page = 'home';
let deferredInstall;
let toastTimer;
let vidyardLoad;

function toast(message) {
  const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3000);
}
function persist(key,value) { try { storage.setItem(key,JSON.stringify(value)); } catch { toast('Changes are available for this visit. Browser storage is unavailable.'); } }
function navRender() {
  const active = guides.find(g => g.id === page)?.category?.toLowerCase() || page;
  nav.innerHTML = [['home','Overview','home'],['orders','Orders','orders'],['bookings','Bookings','timesheets'],['candidates','Candidates & interviews','candidates'],['timesheets','Timesheets','timesheets'],['account','Account','account'],['saved','Saved guides','saved'],['support','Support & access','support']].map(([id,label,img]) => `<a href="#${id}" ${active===id?'class="active" aria-current="page"':''}>${icon(img)}<span>${label}</span></a>`).join('');
}
function card(g) {
  return `<article class="guide-card" data-category="${e(g.category)}"><div class="card-top"><span class="category-icon">${icon(categoryIcon(g.category))}</span><span class="card-code">PROCESS ${e(g.code.toUpperCase())}</span></div><button class="save-card ${saved.includes(g.id)?'saved':''}" data-save="${g.id}" aria-label="${saved.includes(g.id)?'Remove':'Save'} ${e(g.title)}" aria-pressed="${saved.includes(g.id)}">${icon('saved')}</button><a class="card-link" href="#${g.id}"><h3>${e(g.title)}</h3><p>${e(g.summary)}</p><div class="card-bottom"><span>${g.steps.length} steps · ${e(g.category)}</span><span class="arrow" aria-hidden="true">↗</span></div></a></article>`;
}
function searchBox() {
  return `<div class="search-wrap">${icon('search')}<label class="sr-only" for="guide-search">Search manager guides</label><input id="guide-search" type="search" placeholder="Search a task, keyword or process…" value="${e(query)}" autocomplete="off"><button class="clear-search" id="clear-search" aria-label="Clear search" ${query?'':'hidden'}>×</button></div>`;
}
function chips() {
  return `<div class="chips" role="group" aria-label="Filter by topic">${['All',...categories].map(c=>`<button class="chip ${category===c?'active':''}" data-category="${e(c)}" aria-pressed="${category===c}">${c==='All'?'All guides':e(c)}</button>`).join('')}</div>`;
}
function collection() {
  if (page === 'bookings') return renderVideos({category:'Bookings', query});
  const results = searchGuides(guides,query,category,page==='saved',saved);
  const info = query ? `${results.length} ${results.length===1?'guide':'guides'} matching “${query}”` : `${results.length} ${results.length===1?'guide':'guides'}${category==='All'?'':' in '+category.toLowerCase()}`;
  return `<p class="count-label" role="status">${e(info)}</p><div class="cards">${results.length ? results.map(card).join('') : `<div class="empty">${icon(page==='saved'?'saved':'search')}<h3>${page==='saved'&&!query?'Keep your useful guides close.':'No guides found.'}</h3><p>${page==='saved'&&!query?'Select the bookmark on any guide to save it here.':'Try a shorter search or choose another topic.'}</p><button id="reset-filter">${page==='saved'&&!query?'Browse all guides':'Clear filters'}</button></div>`}</div>${videoArea()}`;
}
function loadVidyard() {
  if (window.VidyardV4?.api) return Promise.resolve(window.VidyardV4);
  if (!vidyardLoad) {
    vidyardLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://play.vidyard.com/embed/v4.js';
      script.async = true;
      script.onload = () => window.VidyardV4?.api ? resolve(window.VidyardV4) : reject(new Error('Video player unavailable'));
      script.onerror = () => reject(new Error('Video player could not be loaded'));
      document.head.append(script);
    }).catch(error => { vidyardLoad = undefined; throw error; });
  }
  return vidyardLoad;
}
function disposeVideoPlayers() {
  const api = window.VidyardV4?.api;
  if (!api) return;
  for (const video of helpVideos) {
    for (const player of api.getPlayersByUUID(video.uuid) || []) {
      try { api.destroyPlayer(player); } catch {}
    }
  }
}
function renderVideos({category: topic, guideId, query: videoQuery = ''} = {}) {
  const videos = findVideos({category: topic, guideId, query: videoQuery});
  if (!videos.length) return videoQuery ? '<p class="video-empty" role="status">No video guides match this search.</p>' : '';
  return `<section class="help-videos" aria-label="Cnet video guides"><div class="video-section-heading"><h2>${guideId?'Videos for this process':'Video guides'}</h2><span>${videos.length} ${videos.length===1?'video':'videos'}</span></div><p class="section-description">Select a video to watch it here. An internet connection is required.</p><div class="video-grid">${videos.map(video=>`<details class="help-video" data-video-uuid="${e(video.uuid)}"><summary><span class="video-play-icon" aria-hidden="true">▶</span><span>${e(video.title)}</span></summary><div class="video-content"><div class="video-player" role="region" aria-label="${e(video.title)}"><p class="video-load">Select the heading to load this video.</p></div><a class="video-watch-link" href="${e(video.watchUrl)}" target="_blank" rel="noopener noreferrer">Open video in a new tab ↗</a></div></details>`).join('')}</div></section>`;
}
function videoArea() {
  if (page === 'saved') return '';
  if (page === 'home' && category === 'All' && !query) {
    return `<section class="help-videos" aria-label="Video guide topics"><h2>Watch a Cnet walkthrough</h2><p class="section-description">Video guides for orders, bookings, interviews, timesheets and account tasks.</p><div class="video-topic-links">${['Orders','Bookings','Candidates','Timesheets','Account'].map(topic=>`<a href="#${topic.toLowerCase()}">${e(topic==='Candidates'?'Candidates & interviews':topic)} <span>${findVideos({category:topic}).length} videos ↗</span></a>`).join('')}</div></section>`;
  }
  const topic = category === 'All' || category === 'Finding records' ? undefined : category;
  return renderVideos({category:topic, query});
}
function catalogue() {
  disposeVideoPlayers();
  const titles = {bookings:['Bookings','Video guidance for finding, updating and managing bookings.'],account:['Account','Find users, reset your password and arrange delegation.'],orders:['Orders','Create requirements, make approval decisions and arrange cover.'],candidates:['Candidates & interviews','Review talent and move interviews forward with confidence.'],timesheets:['Timesheets','Check submitted time, approve accurately and set up leave cover.'],saved:['Saved guides','Your go-to processes, ready when you need them.']};
  const head = page==='home' ? `<section class="hero hero-brand"><div class="hero-media"><video id="hero-video" poster="assets/hero-vertage.webp" ${window.matchMedia('(prefers-reduced-motion: reduce)').matches?'':'autoplay'} muted loop playsinline preload="metadata" aria-label="Vertage brand animation"><source src="assets/hero-vertage.webm" type="video/webm"><source src="assets/hero-vertage.mp4" type="video/mp4"></video><img class="hero-video-fallback" src="assets/hero-vertage.webp" alt="Vertage — Rewire how work gets done" hidden><button class="video-toggle" id="video-toggle" aria-label="Play opening video">Play video</button></div><div class="hero-content"><div class="eyebrow">Your guide to Cnet</div><h1>Workflows<br>made simple.</h1><p>From your first order to the final timesheet. Clear guidance, every step of the way.</p><a class="primary" href="#process-03a">Create an order <span aria-hidden="true">↗</span></a></div></section>` : `<div class="page-intro"><div class="eyebrow">Your manager workspace</div><h1>${titles[page][0]}</h1><p>${titles[page][1]}</p></div>`;
  main.innerHTML = `${head}<section aria-label="Guide library"><div class="search-section"><div><h2>${page==='home'?'What would you like to do?':'Find your process'}</h2><p class="section-description">Step-by-step guidance for client managers.</p></div>${searchBox()}</div>${page==='bookings'?'':chips()}<div id="collection">${collection()}</div></section><div class="tips-banner">${icon('tip')}<div><h3>A shortcut worth knowing</h3><p>Start typing in a Cnet field to find an option, or enter <strong>%%%</strong> to see the full dropdown.</p></div><a href="#support">Quick checks & support ↗</a></div><p class="small-info">Saved guides and checklist ticks stay in this browser. They do not submit or approve anything in Cnet.</p>`;
  setupHeroVideo();
  document.querySelector('#guide-search').addEventListener('input',event=>{
    query = event.target.value; disposeVideoPlayers(); document.querySelector('#collection').innerHTML = collection();
    document.querySelector('#clear-search').hidden = !query;
  });
}
function setupHeroVideo() {
  const video = document.querySelector('#hero-video');
  const toggle = document.querySelector('#video-toggle');
  if (!video || !toggle) return;
  video.muted = true;
  const update = () => {
    toggle.textContent = video.paused ? 'Play video' : 'Pause video';
    toggle.setAttribute('aria-label', video.paused ? 'Play opening video' : 'Pause opening video');
  };
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  video.addEventListener('error', () => {
    video.hidden = true;
    document.querySelector('.hero-video-fallback').hidden = false;
    toggle.hidden = true;
  });
  toggle.addEventListener('click', () => {
    if (video.paused) video.play().catch(update);
    else video.pause();
  });
  update();
}
function detail(g) {
  disposeVideoPlayers();
  const completed = progress[g.id] || [];
  main.innerHTML = `<div class="breadcrumb"><a href="#home">Overview</a><span aria-hidden="true">/</span><a href="#${g.category==='Account'||g.category==='Finding records'?'home':g.category.toLowerCase()}">${e(g.category)}</a><span aria-hidden="true">/</span><span>Process ${e(g.code)}</span></div><div class="detail-heading"><div class="eyebrow">Process ${e(g.code.toUpperCase())} · ${e(g.category)}</div><h1>${e(g.title)}</h1><p>${e(g.summary)}</p><div class="path" aria-label="Cnet navigation path">${e(g.path)}</div><div class="detail-actions"><button class="secondary ${saved.includes(g.id)?'saved':''}" data-save="${g.id}" aria-pressed="${saved.includes(g.id)}">${saved.includes(g.id)?'✓ Saved guide':'Save guide'}</button><button class="secondary" id="print-guide">Print this guide</button></div><p class="small-info">Tick each step as you work through Cnet. This checklist is stored in your browser and does not perform actions in Cnet.</p></div><div class="detail-layout"><div><section class="steps-panel" aria-label="Step-by-step process"><div class="steps-header"><div><h2>Your step-by-step guide</h2><div class="progress-text" role="status">${completed.length} of ${g.steps.length} steps checked</div></div><button class="reset-steps" data-reset="${g.id}">Reset checklist</button></div><div class="progress-track"><div class="progress-fill" style="width:${Math.round(completed.length/g.steps.length*100)}%"></div></div>${g.steps.map(s=>`<div class="step ${completed.includes(s.number)?'completed':''}"><button class="step-toggle" data-step="${s.number}" data-guide="${g.id}" aria-label="${completed.includes(s.number)?'Uncheck':'Check'} step ${s.number}: ${e(s.title)}" aria-pressed="${completed.includes(s.number)}">${completed.includes(s.number)?'✓':s.number}</button><div><h3>${e(s.title)}</h3><p>${e(s.body)}</p></div></div>`).join('')}</section><div class="outcome">${icon('check')}<div><h3>Expected outcome</h3><p>${e(g.outcome)}</p></div></div></div><aside class="detail-side" aria-label="Process notes"><div class="side-box manager-note"><div class="note-label">MANAGER CHECK</div><p>${e(g.tip)}</p></div><div class="side-box"><h3>See the reference screen</h3><button class="screenshot-button" data-image="${g.id}" aria-label="Enlarge reference screenshot for ${e(g.title)}"><img src="${g.image}" alt="Cnet reference screen for ${e(g.title)}" loading="lazy"></button><div class="screenshot-caption">Select to enlarge. Screens are examples from the supplied Cnet5 guide; layouts and available options may vary.</div></div><div class="side-box"><h3>Need a hand?</h3><p>Contact the Support team with the relevant order, candidate or timesheet reference.</p><a class="secondary" style="display:inline-block;margin-top:14px" href="mailto:stephen.molloy@comensura.co.uk">Email Support team ↗</a></div></aside></div>${g.related.length?`<section class="related"><h2>Keep moving</h2><div class="related-links">${g.related.map(id=>{const x=guides.find(g=>g.id===id);return `<a href="#${x.id}">${e(x.title)} ↗</a>`;}).join('')}</div></section>`:''}`;
  main.insertAdjacentHTML('beforeend', renderVideos({guideId:g.id}));
  if (g.id==='process-03a') main.insertAdjacentHTML('beforeend','<div class="related-links" style="margin-top:16px"><a class="primary" href="#process-03b">Continue to selection & submission →</a></div>');
}
const checks = [
  ['Using dropdowns in Cnet','Start typing an option in a Cnet field and matching options will populate, or enter %%% for the full dropdown of available options.','tip'],
  ['Before submitting an order','Check job title, location, cost codes, compliance, skills and work pattern. Select the intended review and interview options.','orders'],
  ['Before the interview','Review the candidate details and complete the mandatory request fields. Check that the supplier has confirmed the interview before it takes place.','candidates'],
  ['Before approving time','Check the worker, week and submitted hours. For bulk approval, check every selected timesheet and remove any needing correction.','timesheets'],
  ['Before taking leave','Set the correct delegation role, colleague and start/end dates. Order Approval and Timesheet Approver are separate roles.','account'],
  ['If a screen or option differs','Contact the Support team. Provide the order, candidate or timesheet reference, the screen you are using and a short description of the issue.','support']
];
function support() {
  disposeVideoPlayers();
  main.innerHTML = `<div class="page-intro"><div class="eyebrow">We're here to help</div><h1>Support & access</h1><p>The right links, the right team and a few checks to keep work moving.</p></div><div class="support-grid"><section class="support-card support-primary"><div class="eyebrow">General enquiries</div><h2>Support team</h2><p>For help with Cnet, orders, candidates or timesheets, contact our Support team.</p><a class="support-email" href="mailto:Stephen.Molloy@comensura.co.uk">Stephen.Molloy@Comensura.co.uk</a><p>Include the relevant reference, the screen you are using and a short description of the issue.</p><div class="support-actions"><a class="primary" href="mailto:Stephen.molloy@comensura.co.uk?subject=Cnet%20support%20query">Email Support team ↗</a><button class="secondary" id="copy-email">Copy email address</button></div></section><section class="support-card"><div class="eyebrow">Your Cnet login</div><h2>Choose your region</h2><p>Use the Cnet link for your client programme. Sign in with your existing Cnet details.</p><a class="region-link" href="https://ie.comensura.net/CNET5/Account/SSOLogin/VeoliaIreland" target="_blank" rel="noopener noreferrer"><span><strong>Cnet Ireland</strong><small>Ireland single sign-on</small></span><span aria-hidden="true">↗</span></a><a class="region-link" href="https://uk.comensura.net/CNET5/Account/SSOLogin/Veolia" target="_blank" rel="noopener noreferrer"><span><strong>Cnet UK</strong><small>UK single sign-on</small></span><span aria-hidden="true">↗</span></a><p><a href="https://www.vertage.com/" target="_blank" rel="noopener noreferrer">Visit the Vertage website ↗</a></p></section></div><section class="quick-checks"><h2>A quick check before you act</h2><div class="check-grid">${checks.map(([title,body,img])=>`<article class="check-item">${icon(img)}<div><h3>${e(title)}</h3><p>${e(body)}</p></div></article>`).join('')}</div></section><section class="faq-list" aria-label="Common questions"><details><summary>Why can't I request an interview?</summary><p>Request Interview is available only when Review and Interview Required was selected at order creation. <a href="#process-03b">Check the order-selection guidance</a> or contact the Support team.</p></details><details><summary>How do I arrange cover while I'm away?</summary><p>Set up a delegate in My Account → Delegates, choose the correct approval role and add the cover dates. <a href="#process-05">Order Approval</a> and <a href="#process-11">Timesheet Approver</a> are separate roles.</p></details><details><summary>Can I use this as an app on my phone?</summary><p>In a supported browser, use Install app when offered. On iPhone or iPad, open this site in Safari, choose Share, then Add to Home Screen. Guides are available offline after your first complete online visit; Cnet login and sending email require a connection.</p></details></section><p class="source-note">Based on the supplied Client Manager Cnet Guide, October 2026 edition. This hub provides guidance; Cnet remains the system for submitting orders and approving timesheets. Programme settings and screen layouts may vary. No Cnet credentials or worker data are collected by this app.</p><button class="clear-progress" id="clear-local">Clear saved guides and checklist ticks</button>`;
}
function route({focus=true}={}) {
  const requested = location.hash.slice(1) || 'home';
  const g = guides.find(g=>g.id===requested);
  const next = g ? requested : ['home','orders','bookings','candidates','timesheets','account','saved','support'].includes(requested)?requested:'home';
  if (page!==next) { query=''; category={orders:'Orders',candidates:'Candidates',timesheets:'Timesheets',account:'Account',bookings:'Bookings'}[next] || 'All'; }
  page = next; navRender();
  if (g) detail(g); else if(page==='support') support(); else catalogue();
  document.title = `${g?g.title:page==='home'?'Cnet Manager Hub':page==='support'?'Support & access':page==='saved'?'Saved guides':page==='candidates'?'Candidates & interviews':page[0].toUpperCase()+page.slice(1)} | Vertage`;
  closeMenu();
  if(focus) { window.scrollTo({top:0,behavior:'instant'}); main.focus({preventScroll:true}); }
}
function closeMenu() { document.querySelector('#sidebar').classList.remove('open');document.querySelector('#mobile-shade').classList.remove('open');document.querySelector('#menu-button').setAttribute('aria-expanded','false'); }
document.querySelector('#menu-button').addEventListener('click',()=>{document.querySelector('#sidebar').classList.add('open');document.querySelector('#mobile-shade').classList.add('open');document.querySelector('#menu-button').setAttribute('aria-expanded','true');document.querySelector('#close-menu').focus();});
document.querySelector('#close-menu').addEventListener('click',()=>{closeMenu();document.querySelector('#menu-button').focus();});
document.querySelector('#mobile-shade').addEventListener('click',closeMenu);
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();}if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){const search=document.querySelector('#guide-search');if(search){event.preventDefault();search.focus();}}});
main.addEventListener('toggle',async event=>{
  const details=event.target;
  if (!details.matches('details.help-video')) return;
  const uuid=details.dataset.videoUuid;
  const container=details.querySelector('.video-player');
  if (!details.open) {
    for (const player of window.VidyardV4?.api.getPlayersByUUID(uuid) || []) {
      try { player.pause(); } catch {}
    }
    return;
  }
  if (container.dataset.loaded === 'true' || container.dataset.loading === 'true') return;
  container.dataset.loading='true';
  container.innerHTML='<p class="video-load" role="status">Loading video…</p>';
  try {
    const embed=await loadVidyard();
    if (!details.isConnected || !details.open) return;
    container.replaceChildren();
    embed.api.renderPlayer({uuid,container,type:'inline',aspect:'landscape',disable_analytics:1});
    container.dataset.loaded='true';
  } catch {
    container.innerHTML='<p class="video-load" role="status">Unable to load the player. Please use the video link below.</p>';
  } finally {
    delete container.dataset.loading;
  }
},true);
main.addEventListener('click',async event=>{
  const btn = event.target.closest('button'); if(!btn)return;
  if(btn.dataset.save){
    const id=btn.dataset.save;const was=saved.includes(id);saved=was?saved.filter(x=>x!==id):[...saved,id];persist('vertage-saved',saved);
    if(guides.some(g=>g.id===page)){btn.classList.toggle('saved',!was);btn.setAttribute('aria-pressed',String(!was));btn.textContent=was?'Save guide':'✓ Saved guide';}
    else { disposeVideoPlayers(); document.querySelector('#collection').innerHTML=collection(); const replacement=main.querySelector(`[data-save="${id}"]`); replacement?.focus(); }
    toast(was?'Guide removed from saved':'Guide saved');
  }
  if(btn.dataset.category){disposeVideoPlayers();category=btn.dataset.category;document.querySelector('.chips').outerHTML=chips();document.querySelector('#collection').innerHTML=collection();main.querySelector(`[data-category="${category}"]`)?.focus();}
  if(btn.id==='reset-filter'){if(page==='saved'&&!query){location.hash='home';}else{query='';category='All';catalogue();document.querySelector('#guide-search').focus();}}
  if(btn.id==='clear-search'){query='';catalogue();document.querySelector('#guide-search').focus();}
  if(btn.dataset.step){
    const id=btn.dataset.guide,n=Number(btn.dataset.step),list=progress[id]||[];progress[id]=list.includes(n)?list.filter(x=>x!==n):[...list,n];persist('vertage-progress',progress);
    const g=guides.find(g=>g.id===id);const top=window.scrollY;detail(g);window.scrollTo({top,behavior:'instant'});main.querySelector(`[data-step="${n}"]`).focus({preventScroll:true});
    if(progress[id].length===g.steps.length)toast('All steps checked. Verify the outcome in Cnet.');
  }
  if(btn.dataset.reset){progress[btn.dataset.reset]=[];persist('vertage-progress',progress);const top=window.scrollY;detail(guides.find(g=>g.id===btn.dataset.reset));window.scrollTo({top,behavior:'instant'});main.querySelector('[data-reset]').focus({preventScroll:true});toast('Checklist reset');}
  if(btn.id==='print-guide')window.print();
  if(btn.dataset.image){const g=guides.find(g=>g.id===btn.dataset.image);const img=document.querySelector('#dialog-image');img.src=g.image;img.alt=`Cnet reference screen for ${g.title}`;document.querySelector('#image-dialog').showModal();}
  if(btn.id==='copy-email'){try{await navigator.clipboard.writeText('support@comensura.co.uk');toast('Support email copied');}catch{toast('Select support@comensura.co.uk above to copy it.');}}
  if(btn.id==='clear-local'){if(confirm('Clear your saved guides and all checklist ticks in this browser?')){saved=[];progress={};persist('vertage-saved',saved);persist('vertage-progress',progress);toast('Saved guides and checklist ticks cleared');}}
});
document.querySelector('#close-image').addEventListener('click',()=>document.querySelector('#image-dialog').close());
document.querySelector('#image-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
window.addEventListener('hashchange',()=>route());
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;document.querySelector('#install-button').hidden=false;});
document.querySelector('#install-button').addEventListener('click',async()=>{if(!deferredInstall)return;await deferredInstall.prompt();deferredInstall=null;document.querySelector('#install-button').hidden=true;});
window.addEventListener('appinstalled',()=>{deferredInstall=null;document.querySelector('#install-button').hidden=true;});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
route({focus:false});
