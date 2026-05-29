document.addEventListener('DOMContentLoaded', () => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (v='') => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const templateList = [
    ['minimal','Minimal Clean'], ['word','Corporate Word'], ['blue','Corporate Blue'],
    ['creative','Creative'], ['black','Executive Black'], ['gold','Premium Gold']
  ];


  // Histórico global de exportações — usado no Builder e na página Exportações.
  const getUserNameGlobal = () => (document.querySelector('.user-card strong')?.textContent || state?.personal?.cvName || 'Usuário').trim();
  const getTemplateNameGlobal = (id) => templateList.find(t=>t[0]===(id || state.selectedTemplate))?.[1] || (id || state.selectedTemplate || 'Template');
  const getExports = () => {
    try { return JSON.parse(localStorage.getItem('cvstudioExportHistory') || '[]'); }
    catch { return []; }
  };
  const setExports = (items) => localStorage.setItem('cvstudioExportHistory', JSON.stringify((items || []).slice(0, 80)));
  const watermarkHTML = () => `<div class="cv-watermarks" aria-hidden="true">${Array.from({length:18},()=>'<span>CVStudio</span>').join('')}</div>`;

  function saveExportHistoryRecord(fileName){
    const now = new Date();
    const snapshot = JSON.stringify(state);
    const item = {
      id: Date.now(), fileName,
      templateId: state.selectedTemplate,
      templateName: getTemplateNameGlobal(state.selectedTemplate),
      user: getUserNameGlobal(),
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
      createdAt: now.toISOString(),
      snapshot
    };
    try { setExports([item, ...getExports()]); }
    catch(err){
      // Se o navegador estiver com storage cheio, mantém os 15 últimos e tenta novamente.
      const compact = getExports().slice(0, 15).map(x=>({ ...x, snapshot: x.snapshot || '' }));
      setExports([item, ...compact]);
    }
  }

  function exportRowHTML(x, page=false){
    return `<article class="export-row ${page?'export-row-page':''}">
      <div class="export-icon"><i data-lucide="file-text"></i></div>
      <div class="export-info"><strong>${esc(x.templateName || 'Template')}</strong><span>${esc(x.date || '')} às ${esc(x.time || '')} · ${esc(x.user || 'Usuário')}</span></div>
      <div class="export-actions"><button type="button" class="download-again" data-redownload-export="${esc(String(x.id))}"><i data-lucide="download"></i> Baixar</button></div>
    </article>`;
  }

  function redownloadExport(id){
    const item = getExports().find(x => String(x.id) === String(id));
    if(!item || !item.snapshot){ alert('Não foi possível recuperar essa exportação.'); return; }
    sessionStorage.setItem('cvstudioState', item.snapshot);
    sessionStorage.setItem('cvstudioTemplate', item.templateId || 'minimal');
    sessionStorage.setItem('cvstudioNoHistoryOnce', '1');
    location.href = 'builder.html?autoExport=1';
  }
  document.addEventListener('click', (ev)=>{
    const btn = ev.target.closest?.('[data-redownload-export]');
    if(btn) redownloadExport(btn.dataset.redownloadExport);
  });

  const navEntry = performance.getEntriesByType?.('navigation')?.[0];
  const isReload = navEntry ? navEntry.type === 'reload' : false;
  if (isReload && location.pathname.includes('builder')) {
    sessionStorage.removeItem('cvstudioState');
    sessionStorage.removeItem('cvstudioFields');
  }

  const defaultPersonal = {
    cvName:'Rafael Oliveira', cvRole:'Desenvolvedor Frontend', cvEmail:'seuemail@gmail.com',
    cvPhone:'(11) 0000-0000', cvLocation:'São Paulo, SP', cvLinkedin:'linkedin.com/in/rafaeloliveira',
    cvWebsite:'rafael.dev', cvAbout:''
  };
  const state = Object.assign({
    personal: {...defaultPersonal}, photo:'Assets/perfil.jpg', experiences:[], educations:[], skills:[], languages:[], projects:[],
    selectedTemplate: sessionStorage.getItem('cvstudioTemplate') || localStorage.getItem('cvstudioTemplate') || 'minimal'
  }, JSON.parse(sessionStorage.getItem('cvstudioState') || '{}'));
  state.selectedTemplate = sessionStorage.getItem('cvstudioTemplate') || localStorage.getItem('cvstudioTemplate') || state.selectedTemplate || 'minimal';
  state.personal = {...defaultPersonal, ...(JSON.parse(sessionStorage.getItem('cvstudioFields') || '{}')), ...(state.personal || {})};

  function save(){
    sessionStorage.setItem('cvstudioState', JSON.stringify(state));
    sessionStorage.setItem('cvstudioFields', JSON.stringify(state.personal));
    sessionStorage.setItem('cvstudioTemplate', state.selectedTemplate);
  }
  function syncPersonalFromInputs(){
    $$('[data-target]').forEach(input => state.personal[input.dataset.target] = input.value);
    save();
  }
  function fillPersonalInputs(){
    $$('[data-target]').forEach(input => { if(state.personal[input.dataset.target] !== undefined) input.value = state.personal[input.dataset.target]; });
  }
  function monthSelect(value, attrs){ return `<select ${attrs}><option value="">Mês</option>${months.map(m=>`<option value="${m}" ${value===m?'selected':''}>${m}</option>`).join('')}</select>`; }
  function yearSelect(value, attrs){ let h='<option value="">Ano</option>'; for(let y=1900;y<=3000;y++) h+=`<option value="${y}" ${String(value)===String(y)?'selected':''}>${y}</option>`; return `<select ${attrs}>${h}</select>`; }
  function statusSelect(value, attrs){ return `<select ${attrs}><option ${value==='Concluído'?'selected':''}>Concluído</option><option ${value==='Cursando'?'selected':''}>Cursando</option><option ${value==='Incompleto'?'selected':''}>Incompleto</option></select>`; }
  function period(item, academic=false){
    const start=[item.startMonth,item.startYear].filter(Boolean).join(' ');
    let end='';
    if(!academic && item.current) end='Presente';
    else if(academic && item.status === 'Concluído') end=[item.endMonth,item.endYear].filter(Boolean).join(' ');
    else if(!academic) end=[item.endMonth,item.endYear].filter(Boolean).join(' ');
    return [start,end].filter(Boolean).join(' - ');
  }
  function balls(n){ return `<span class="dots">${[1,2,3,4,5].map(i=>`<i class="${i<=Number(n)?'on':''}"></i>`).join('')}</span>`; }

  function contactHTML(){ const p=state.personal; const items=[['mail',p.cvEmail],['phone',p.cvPhone],['map-pin',p.cvLocation],['globe',p.cvLinkedin],['globe',p.cvWebsite]].filter(x=>x[1]); return `<div class="tpl-contact">${items.map(([i,t])=>`<p><i data-lucide="${i}"></i><span>${esc(t)}</span></p>`).join('')}</div>`; }
  function section(title, html, cls=''){ return html && html.trim() ? `<section class="tpl-section ${cls}"><h4>${title}</h4>${html}</section>` : ''; }
  function expHTML(){ return state.experiences.map(e=>`<div class="tpl-item">${e.role?`<h5>${esc(e.role)}</h5>`:''}${(e.company||period(e))?`<p class="meta">${esc(e.company)}${e.company&&period(e)?' · ':''}${esc(period(e))}</p>`:''}${e.desc?`<p>${esc(e.desc)}</p>`:''}</div>`).join(''); }
  function eduHTML(){ return state.educations.map(e=>`<div class="tpl-item">${e.course?`<h5>${esc(e.course)}</h5>`:''}${e.school?`<p class="meta">${esc(e.school)}</p>`:''}${period(e,true)?`<p>${esc(period(e,true))}</p>`:''}${e.status?`<p>${esc(e.status)}</p>`:''}</div>`).join(''); }
  function skillsHTML(){ return state.skills.map(s=>`<div class="tpl-skill"><span>${esc(s.name||'Habilidade')}</span>${balls(s.level)}</div>`).join(''); }
  function langHTML(){ return state.languages.map(s=>`<div class="tpl-skill"><span>${esc(s.name||'Idioma')}</span>${balls(s.level)}</div>`).join(''); }
  function projHTML(){ return state.projects.map(p=>`<div class="tpl-item">${p.title?`<h5>${esc(p.title)}</h5>`:''}${p.desc?`<p>${esc(p.desc)}</p>`:''}</div>`).join(''); }
  function mainSections(){ const p=state.personal; return `${section('Sobre mim', p.cvAbout?`<p>${esc(p.cvAbout)}</p>`:'')}${section('Experiência', expHTML())}${section('Formação', eduHTML())}${section('Habilidades', skillsHTML())}${section('Idiomas', langHTML())}${section('Projetos', projHTML())}`; }
  function sideSections(){ return `${section('Habilidades', skillsHTML())}${section('Idiomas', langHTML())}${section('Formação', eduHTML())}`; }

  const photo = () => `<div class="tpl-photo-wrap"><img src="${esc(state.photo || 'Assets/perfil.jpg')}" alt="" class="tpl-photo" id="resumePhoto"><button type="button" class="camera-badge" data-change-photo title="Trocar foto" aria-label="Trocar foto"><i data-lucide="camera"></i></button></div>`;
  const nameRole = () => `<h2>${esc((state.personal.cvName||'').toUpperCase())}</h2>${state.personal.cvRole?`<h3>${esc((state.personal.cvRole||'').toUpperCase())}</h3>`:''}`;

  const renderers = {
    minimal: () => `<aside class="tpl-side">${photo()}${contactHTML()}${sideSections()}</aside><main class="tpl-main"><header>${nameRole()}</header>${section('Sobre mim', state.personal.cvAbout?`<p>${esc(state.personal.cvAbout)}</p>`:'')}${section('Experiência', expHTML())}${section('Projetos', projHTML())}</main>`,
    word: () => `<main class="tpl-main full"><header>${nameRole()}<div class="word-line"></div></header>${contactHTML()}${mainSections()}</main>`,
    blue: () => `<aside class="tpl-side">${photo()}${contactHTML()}${sideSections()}</aside><main class="tpl-main"><header>${nameRole()}</header>${section('Sobre mim', state.personal.cvAbout?`<p>${esc(state.personal.cvAbout)}</p>`:'')}${section('Experiência', expHTML())}${section('Projetos', projHTML())}</main>`,
    creative: () => `<header class="creative-head"><div class="creative-shape"></div>${photo()}${nameRole()}${contactHTML()}</header><main class="tpl-main full">${mainSections()}</main>`,
    black: () => `<header class="black-head">${photo()}<div>${nameRole()}</div></header><main class="black-grid"><div>${contactHTML()}${section('Habilidades', skillsHTML())}${section('Idiomas', langHTML())}</div><div>${section('Sobre mim', state.personal.cvAbout?`<p>${esc(state.personal.cvAbout)}</p>`:'')}${section('Experiência', expHTML())}${section('Formação', eduHTML())}${section('Projetos', projHTML())}</div></main>`,
    gold: () => `<aside class="tpl-side">${photo()}${contactHTML()}${section('Habilidades', skillsHTML())}${section('Idiomas', langHTML())}</aside><main class="tpl-main"><header>${nameRole()}</header>${section('Sobre mim', state.personal.cvAbout?`<p>${esc(state.personal.cvAbout)}</p>`:'')}${section('Experiência', expHTML())}${section('Formação', eduHTML())}${section('Projetos', projHTML())}</main>`
  };

  function renderResume(){
    const resume = $('#resumeToExport'); if(!resume) return;
    const tpl = renderers[state.selectedTemplate] ? state.selectedTemplate : 'minimal';
    resume.className = `live-resume real-template tpl-${tpl}`;
    resume.innerHTML = renderers[tpl]() + watermarkHTML();
    resume.querySelectorAll('[data-change-photo]').forEach(btn=>btn.addEventListener('click',()=>$('#photoInput')?.click()));
    const current = $('#templateCurrent');
    const tname = templateList.find(t=>t[0]===tpl)?.[1] || 'Minimal Clean';
    if(current) current.textContent = `Template atual: ${tname}`;
    if(window.lucide) lucide.createIcons();
  }

  function renderExperiences(){ const editor=$('#experienceEditor'); if(!editor) return; editor.innerHTML=state.experiences.map((e,i)=>`<div class="dynamic-item"><label>Cargo <input value="${esc(e.role)}" data-exp="${i}" data-key="role"></label><label>Empresa <input value="${esc(e.company)}" data-exp="${i}" data-key="company"></label><div class="period-title">Admissão:</div><div class="period-grid">${monthSelect(e.startMonth,`data-exp="${i}" data-key="startMonth"`)}${yearSelect(e.startYear,`data-exp="${i}" data-key="startYear"`)}</div><label class="check-line"><input type="checkbox" data-exp-current="${i}" ${e.current?'checked':''}> Emprego atual</label><div class="dismissal-wrap" style="${e.current?'display:none':''}"><div class="period-title">Demissão:</div><div class="period-grid">${monthSelect(e.endMonth,`data-exp="${i}" data-key="endMonth"`)}${yearSelect(e.endYear,`data-exp="${i}" data-key="endYear"`)}</div></div><label>Descrição <input value="${esc(e.desc)}" data-exp="${i}" data-key="desc"></label><button type="button" class="remove-btn" data-remove-exp="${i}">Remover</button></div>`).join(''); editor.querySelectorAll('[data-exp]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',ev=>{state.experiences[+ev.target.dataset.exp][ev.target.dataset.key]=ev.target.value; save(); renderResume();})); editor.querySelectorAll('[data-exp-current]').forEach(el=>el.addEventListener('change',ev=>{const ex=state.experiences[+ev.target.dataset.expCurrent]; ex.current=ev.target.checked; if(ex.current){ex.endMonth=''; ex.endYear='';} save(); renderExperiences(); renderResume();})); editor.querySelectorAll('[data-remove-exp]').forEach(b=>b.addEventListener('click',()=>{state.experiences.splice(+b.dataset.removeExp,1); save(); renderExperiences(); renderResume();})); }
  function renderEducation(){ const editor=$('#educationEditor'); if(!editor) return; editor.innerHTML=state.educations.map((e,i)=>`<div class="dynamic-item"><label>Curso <input value="${esc(e.course)}" data-edu="${i}" data-key="course"></label><label>Instituição <input value="${esc(e.school)}" data-edu="${i}" data-key="school"></label><label>Status ${statusSelect(e.status,`data-edu="${i}" data-key="status"`)}</label><div class="period-title">Ingresso:</div><div class="period-grid">${monthSelect(e.startMonth,`data-edu="${i}" data-key="startMonth"`)}${yearSelect(e.startYear,`data-edu="${i}" data-key="startYear"`)}</div><div class="completion-wrap" style="${e.status==='Concluído'?'':'display:none'}"><div class="period-title">Conclusão:</div><div class="period-grid">${monthSelect(e.endMonth,`data-edu="${i}" data-key="endMonth"`)}${yearSelect(e.endYear,`data-edu="${i}" data-key="endYear"`)}</div></div><button type="button" class="remove-btn" data-remove-edu="${i}">Remover</button></div>`).join(''); editor.querySelectorAll('[data-edu]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',ev=>{const ed=state.educations[+ev.target.dataset.edu]; ed[ev.target.dataset.key]=ev.target.value; if(ev.target.dataset.key==='status'){
          if(ed.status!=='Concluído'){ed.endMonth='';ed.endYear='';}
          save(); renderEducation(); renderResume();
          return;
        }
        save(); renderResume();})); editor.querySelectorAll('[data-remove-edu]').forEach(b=>b.addEventListener('click',()=>{state.educations.splice(+b.dataset.removeEdu,1); save(); renderEducation(); renderResume();})); }
  function renderRangeEditor(type, editorId, addLabel){ const arr=state[type]; const key=type==='skills'?'skill':'lang'; const editor=$(editorId); if(!editor) return; editor.innerHTML=arr.map((s,i)=>`<div class="skill-editor-row"><label>${addLabel} <input value="${esc(s.name)}" data-${key}="${i}" data-key="name"></label><label>Nível <span class="range-value">${s.level}/5</span><input type="range" min="0" max="5" step="1" value="${s.level}" data-${key}="${i}" data-key="level"></label><button type="button" class="remove-btn" data-remove-${key}="${i}">Remover</button></div>`).join(''); editor.querySelectorAll(`[data-${key}]`).forEach(el=>el.addEventListener('input',ev=>{const obj=arr[+ev.target.dataset[key]]; obj[ev.target.dataset.key]=ev.target.dataset.key==='level'?+ev.target.value:ev.target.value; const v=ev.target.closest('label')?.querySelector('.range-value'); if(v) v.textContent=`${ev.target.value}/5`; save(); renderResume();})); editor.querySelectorAll(`[data-remove-${key}]`).forEach(b=>b.addEventListener('click',()=>{arr.splice(+b.dataset[`remove${key[0].toUpperCase()+key.slice(1)}`],1); save(); renderRangeEditor(type, editorId, addLabel); renderResume();})); }
  function renderProjects(){ const editor=$('#projectsEditor'); if(!editor) return; editor.innerHTML=state.projects.map((p,i)=>`<div class="dynamic-item"><label>Título <input value="${esc(p.title)}" data-project="${i}" data-key="title"></label><label>Descrição <input value="${esc(p.desc)}" data-project="${i}" data-key="desc"></label><button type="button" class="remove-btn" data-remove-project="${i}">Remover</button></div>`).join(''); editor.querySelectorAll('[data-project]').forEach(el=>el.addEventListener('input',ev=>{state.projects[+ev.target.dataset.project][ev.target.dataset.key]=ev.target.value; save(); renderResume();})); editor.querySelectorAll('[data-remove-project]').forEach(b=>b.addEventListener('click',()=>{state.projects.splice(+b.dataset.removeProject,1); save(); renderProjects(); renderResume();})); }

  function initBuilder(){
    fillPersonalInputs();
    $$('[data-target]').forEach(i=>i.addEventListener('input',()=>{syncPersonalFromInputs(); renderResume();}));
    $$('[data-na]').forEach(box=>box.addEventListener('change',()=>{const input=box.closest('.na-row')?.querySelector('[data-target]'); if(box.checked&&input){input.value=''; syncPersonalFromInputs(); renderResume();}}));
    $('#addExperience')?.addEventListener('click',()=>{state.experiences.push({role:'',company:'',startMonth:'',startYear:'',endMonth:'',endYear:'',current:false,desc:''}); save(); renderExperiences(); renderResume();});
    $('#addEducation')?.addEventListener('click',()=>{state.educations.push({course:'',school:'',startMonth:'',startYear:'',endMonth:'',endYear:'',status:'Cursando'}); save(); renderEducation(); renderResume();});
    $('#addSkill')?.addEventListener('click',()=>{state.skills.push({name:'',level:3}); save(); renderRangeEditor('skills','#skillsEditor','Habilidade'); renderResume();});
    $('#addLanguage')?.addEventListener('click',()=>{state.languages.push({name:'',level:3}); save(); renderRangeEditor('languages','#languagesEditor','Idioma'); renderResume();});
    $('#addProject')?.addEventListener('click',()=>{state.projects.push({title:'',desc:''}); save(); renderProjects(); renderResume();});
    $('#photoInput')?.addEventListener('change', e=>{const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=ev=>{state.photo=ev.target.result; save(); renderResume();}; reader.readAsDataURL(file);});
    
    function updateDarkButton(){
      const btn = $('#darkToggle');
      if(!btn) return;
      const isDark = document.body.classList.contains('dark-mode');
      const moonIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" class="theme-icon"><path d="M21 14.2A8.4 8.4 0 0 1 9.8 3a7.3 7.3 0 1 0 11.2 11.2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const sunIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" class="theme-icon"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      btn.innerHTML = isDark ? sunIcon : moonIcon;
      btn.title = isDark ? 'Ativar modo claro' : 'Ativar dark mode';
      btn.setAttribute('aria-label', btn.title);
      btn.classList.toggle('is-dark', isDark);
    }
    if(localStorage.getItem('cvstudioDarkMode') === 'true') {
      document.body.classList.add('dark-mode');
    }
    updateDarkButton();
    $('#darkToggle')?.addEventListener('click',()=>{
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('cvstudioDarkMode', document.body.classList.contains('dark-mode') ? 'true' : 'false');
      updateDarkButton();
    });
    async function waitForImages(root){
      const imgs = Array.from(root.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 1200);
        });
      }));
    }

    function loadScriptOnce(src){
      return new Promise((resolve, reject)=>{
        const existing = document.querySelector(`script[src="${src}"]`);
        if(existing){ existing.addEventListener('load', resolve, {once:true}); existing.addEventListener('error', reject, {once:true}); if(existing.dataset.loaded === 'true') resolve(); return; }
        const sc = document.createElement('script');
        sc.src = src;
        sc.onload = ()=>{ sc.dataset.loaded = 'true'; resolve(); };
        sc.onerror = reject;
        document.head.appendChild(sc);
      });
    }
    async function ensurePdfLibs(){
      if(!window.html2canvas){
        await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      if(!(window.jspdf?.jsPDF || window.jsPDF)){
        await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      return !!(window.html2canvas && (window.jspdf?.jsPDF || window.jsPDF));
    }


    function saveExportHistory(fileName){
      saveExportHistoryRecord(fileName);
      renderExportHistory();
      renderExportsPage();
    }
    function openHelpModal(){
      let modal = document.getElementById('helpModal');
      if(!modal){
        modal = document.createElement('div');
        modal.id = 'helpModal';
        modal.innerHTML = `<div class="utility-backdrop" data-close-utility></div><section class="utility-modal help-modal"><button class="utility-close" data-close-utility type="button">×</button><div class="help-hero"><span>?</span><div><h2>Tutorial rápido</h2><p>Siga o fluxo abaixo para montar, revisar e exportar seu currículo.</p></div></div><div class="help-steps"><article><b>1</b><strong>Preencha seus dados</strong><p>Atualize informações pessoais, experiências, formação, habilidades, idiomas e projetos.</p></article><article><b>2</b><strong>Use N/A</strong><p>Marque os campos que não deseja mostrar no currículo final.</p></article><article><b>3</b><strong>Escolha o template</strong><p>Acesse Templates e selecione o modelo visual desejado. Os dados digitados permanecem salvos.</p></article><article><b>4</b><strong>Troque a foto</strong><p>Nos modelos com foto, clique no botão de câmera ao lado da imagem.</p></article><article><b>5</b><strong>Pré-visualize</strong><p>Abra o currículo inteiro antes de exportar para conferir o enquadramento.</p></article><article><b>6</b><strong>Exporte e acompanhe</strong><p>Gere o PDF e consulte depois em Exportações, com filtros e opção de baixar novamente.</p></article></div></section>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e=>{ if(e.target.matches('[data-close-utility]')) modal.classList.remove('active'); });
      }
      modal.classList.add('active');
    }
    function openExportHistory(){
      let modal = document.getElementById('exportsModal');
      if(!modal){
        modal = document.createElement('div');
        modal.id = 'exportsModal';
        modal.innerHTML = `<div class="utility-backdrop" data-close-utility></div><section class="utility-modal exports-modal"><button class="utility-close" data-close-utility type="button">×</button><div class="exports-head"><div><h2>Histórico de exportações</h2><p>Veja os PDFs gerados e baixe novamente quando precisar.</p></div><button type="button" id="clearExports" class="danger-small">Limpar histórico</button></div><div class="export-filters"><input id="filterTemplate" placeholder="Filtrar modelo"><input id="filterDate" placeholder="Data"><input id="filterTime" placeholder="Hora"><input id="filterUser" placeholder="Usuário"></div><div id="exportsList" class="exports-list"></div></section>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e=>{ if(e.target.matches('[data-close-utility]')) modal.classList.remove('active'); });
        modal.querySelector('#clearExports')?.addEventListener('click',()=>{ if(confirm('Limpar todo o histórico de exportações?')){ setExports([]); renderExportHistory(); }});
        modal.querySelectorAll('.export-filters input').forEach(i=>i.addEventListener('input', renderExportHistory));
      }
      renderExportHistory();
      modal.classList.add('active');
    }
    function renderExportHistory(){
      const modal = document.getElementById('exportsModal');
      if(!modal) return;
      const list = modal.querySelector('#exportsList');
      const ft=(modal.querySelector('#filterTemplate')?.value||'').toLowerCase();
      const fd=(modal.querySelector('#filterDate')?.value||'').toLowerCase();
      const fh=(modal.querySelector('#filterTime')?.value||'').toLowerCase();
      const fu=(modal.querySelector('#filterUser')?.value||'').toLowerCase();
      const items = getExports().filter(x=>(x.templateName||'').toLowerCase().includes(ft) && (x.date||'').toLowerCase().includes(fd) && (x.time||'').toLowerCase().includes(fh) && (x.user||'').toLowerCase().includes(fu));
      list.innerHTML = items.length ? items.map(x=>exportRowHTML(x)).join('') : '<p class="empty-history">Nenhuma exportação encontrada.</p>'; if(window.lucide) lucide.createIcons();
    }
    document.getElementById('openHelp')?.addEventListener('click', openHelpModal);
    

    function openFullPreview(){
      renderResume();
      const source = $('#resumeToExport');
      if(!source) return;
      let modal = $('#cvPreviewModal');
      if(!modal){
        modal = document.createElement('div');
        modal.id = 'cvPreviewModal';
        modal.innerHTML = `
          <div class="cv-preview-backdrop" data-close-preview></div>
          <div class="cv-preview-shell" role="dialog" aria-modal="true" aria-label="Pré-visualização do currículo">
            <button type="button" class="cv-preview-close" data-close-preview aria-label="Fechar pré-visualização">×</button>
            <div class="cv-preview-scroll"><div class="cv-preview-page"></div></div>
          </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (ev)=>{
          if(ev.target.matches('[data-close-preview]')) modal.classList.remove('active');
        });
        document.addEventListener('keydown', (ev)=>{
          if(ev.key === 'Escape') modal.classList.remove('active');
        });
      }
      const page = modal.querySelector('.cv-preview-page');
      page.innerHTML = '';
      const clone = source.cloneNode(true);
      clone.id = 'resumePreviewClone';
      clone.classList.add('preview-full-clone');
      page.appendChild(clone);
      modal.classList.add('active');
      if(window.lucide) lucide.createIcons();
    }
    $('#previewFull')?.addEventListener('click', openFullPreview);

    $('#exportPdf')?.addEventListener('click', async ()=>{
      const element = $('#resumeToExport');
      if(!element) return;

      const exportBtn = $('#exportPdf');
      const oldBtnHTML = exportBtn ? exportBtn.innerHTML : '';
      if(exportBtn){
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<span>Gerando...</span>';
      }

      const libsOk = await ensurePdfLibs().catch(()=>false);
      if(!libsOk){
        alert('Não foi possível carregar o exportador PDF. Verifique a conexão, recarregue a página e tente novamente.');
        if(exportBtn){ exportBtn.disabled = false; exportBtn.innerHTML = oldBtnHTML; }
        return;
      }

      const holder = document.createElement('div');
      holder.className = 'pdf-capture-holder';
      holder.style.cssText = [
        'position:fixed',
        'left:0',
        'top:0',
        'width:794px',
        'height:1123px',
        'overflow:hidden',
        'background:#ffffff',
        'z-index:-9999',
        'opacity:1',
        'pointer-events:none'
      ].join(';');

      const clone = element.cloneNode(true);
      clone.id = 'resumePdfClone';
      clone.classList.add('pdf-export-clone');
      clone.style.cssText = [
        'width:794px!important',
        'height:1123px!important',
        'min-height:1123px!important',
        'max-height:1123px!important',
        'margin:0!important',
        'transform:none!important',
        'box-shadow:none!important',
        'border-radius:0!important',
        'overflow:hidden!important',
        'position:relative!important',
        'left:0!important',
        'top:0!important'
      ].join(';');

      holder.appendChild(clone);
      document.body.appendChild(holder);
      try {
        if(window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 2 } });
        await waitForImages(clone);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const PDFCtor = window.jspdf?.jsPDF || window.jsPDF;
        const pdf = new PDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        while (pdf.getNumberOfPages && pdf.getNumberOfPages() > 1) {
          pdf.deletePage(pdf.getNumberOfPages());
        }
        const fileName = `curriculo-cvstudio-${Date.now()}.pdf`;
        pdf.save(fileName);
        if(sessionStorage.getItem('cvstudioNoHistoryOnce')){
          sessionStorage.removeItem('cvstudioNoHistoryOnce');
        } else {
          saveExportHistory(fileName);
        }
      } catch (err) {
        console.error(err);
        alert('Não foi possível exportar o PDF. Recarregue a página e tente novamente.');
      } finally {
        holder.remove();
        if(exportBtn){
          exportBtn.disabled = false;
          exportBtn.innerHTML = oldBtnHTML;
          if(window.lucide) lucide.createIcons();
        }
      }
    });
    renderExperiences(); renderEducation(); renderRangeEditor('skills','#skillsEditor','Habilidade'); renderRangeEditor('languages','#languagesEditor','Idioma'); renderProjects(); renderResume();
    if(new URLSearchParams(location.search).get('autoExport') === '1'){
      setTimeout(()=>document.getElementById('exportPdf')?.click(), 650);
    }
  }


  function renderExportsPage(){
    const root = document.getElementById('exportsPageList');
    if(!root) return;
    const ft=(document.getElementById('pageFilterTemplate')?.value||'').toLowerCase();
    const fd=(document.getElementById('pageFilterDate')?.value||'').toLowerCase();
    const fh=(document.getElementById('pageFilterTime')?.value||'').toLowerCase();
    const fu=(document.getElementById('pageFilterUser')?.value||'').toLowerCase();
    const items = getExports().filter(x=>(x.templateName||'').toLowerCase().includes(ft) && (x.date||'').toLowerCase().includes(fd) && (x.time||'').toLowerCase().includes(fh) && (x.user||'').toLowerCase().includes(fu));
    root.innerHTML = items.length ? items.map(x=>exportRowHTML(x, true)).join('') : '<p class="empty-history">Nenhuma exportação encontrada.</p>'; if(window.lucide) lucide.createIcons();
  }

  function initExportsPage(){
    if(!document.body.classList.contains('exports-body')) return;
    document.getElementById('clearExportsPage')?.addEventListener('click',()=>{
      if(confirm('Limpar todo o histórico de exportações?')){
        setExports([]);
        renderExportsPage();
      }
    });
    ['pageFilterTemplate','pageFilterDate','pageFilterTime','pageFilterUser'].forEach(id=>document.getElementById(id)?.addEventListener('input', renderExportsPage));
    renderExportsPage();
  }


  function collectAnalyticsData(){
    const p = state.personal || {};
    const normalize = (v) => String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9+#.\s-]/g,' ')
      .replace(/\s+/g,' ')
      .trim();

    const professionalTerms = [
      'javascript','typescript','react','next.js','next','node.js','node','html','css','tailwind','bootstrap','sass','git','github','api','rest','graphql','sql','mysql','postgresql','mongodb','firebase','supabase','python','java','php','c#','c++','excel','power bi','figma','ui','ux','scrum','agile','kanban','seo','ats','frontend','front-end','backend','back-end','fullstack','mobile','responsive','responsivo','landing page','dashboard','e-commerce','vendas','atendimento','lideranca','gestao','planejamento','comunicacao','negociacao','marketing','financeiro','administrativo','analise de dados','dados','produto','product owner','customer success','crm','erp','performance','acessibilidade','testes','jest','cypress','docker','linux','aws','azure','cloud'
    ];
    const blocked = new Set(['concluido','concluida','cursando','incompleto','feliz','diretor','empresa','universidade','faculdade','escola','curso','mes','ano','presente','janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro','dsd','sdsd','dsdsd','sdsds','teste','novo','nova','abc']);
    const looksRandom = (k) => /^([a-z])\1+$/.test(k) || /^[ds]+$/.test(k) || k.length < 2 || blocked.has(k);

    const textParts = [p.cvRole || '', p.cvAbout || ''];
    (state.experiences || []).forEach(e => textParts.push(e.role || '', e.company || '', e.desc || ''));
    (state.projects || []).forEach(pj => textParts.push(pj.title || '', pj.desc || ''));
    (state.educations || []).forEach(ed => textParts.push(ed.course || '', ed.school || ''));
    const clean = normalize(textParts.join(' '));

    const skillKeywords = (state.skills || [])
      .map(s => normalize(s.name))
      .filter(k => k && !looksRandom(k))
      .filter(k => professionalTerms.some(term => term === k || k.includes(term) || term.includes(k)) || k.length >= 4);

    const detected = professionalTerms.filter(term => clean.includes(term));
    const found = [...new Set([...skillKeywords, ...detected])].slice(0,25);

    const hasName = !!(p.cvName||'').trim();
    const hasRole = !!(p.cvRole||'').trim();
    const hasContact = !!((p.cvEmail||'').trim() && (p.cvPhone||'').trim());
    const aboutLen = (p.cvAbout||'').trim().length;
    const expQuality = (state.experiences||[]).filter(e => (e.role||'').trim() && (e.company||'').trim() && (e.desc||'').trim().length >= 30).length;
    const eduQuality = (state.educations||[]).filter(e => (e.course||'').trim() && (e.school||'').trim()).length;
    const skillsCount = (state.skills||[]).filter(s => (s.name||'').trim()).length;
    const projectsQuality = (state.projects||[]).filter(pj => (pj.title||'').trim() && (pj.desc||'').trim().length >= 20).length;
    const languagesCount = (state.languages||[]).filter(l => (l.name||'').trim()).length;

    let score = 0;
    if(hasName) score += 5;
    if(hasRole) score += 7;
    if(hasContact) score += 8;
    if(aboutLen >= 120) score += 15; else if(aboutLen >= 60) score += 10; else if(aboutLen > 0) score += 5;
    if(expQuality >= 2) score += 22; else if(expQuality === 1) score += 16; else if((state.experiences||[]).length) score += 8;
    if(eduQuality) score += 12;
    if(skillsCount >= 8) score += 14; else if(skillsCount >= 5) score += 10; else if(skillsCount > 0) score += 5;
    if(projectsQuality >= 2) score += 8; else if(projectsQuality === 1) score += 5;
    if(languagesCount) score += 4;
    if(found.length >= 10) score += 5; else score += Math.min(5, Math.floor(found.length / 2));
    score = Math.min(100, score);

    const detail = [
      ['Dados pessoais', hasName && hasRole && hasContact ? 'Excelente' : 'Incompleto'],
      ['Resumo profissional', aboutLen >= 120 ? 'Excelente' : aboutLen >= 60 ? 'Bom' : aboutLen ? 'Curto' : 'Adicionar'],
      ['Experiências', expQuality >= 2 ? 'Excelente' : expQuality === 1 ? 'Muito bom' : (state.experiences||[]).length ? 'Melhorar descrições' : 'Adicionar'],
      ['Formação', eduQuality ? 'Excelente' : 'Adicionar'],
      ['Habilidades', skillsCount >= 8 ? 'Excelente' : skillsCount >= 5 ? 'Bom' : skillsCount ? 'Poucas' : 'Adicionar'],
      ['Palavras-chave', found.length >= 10 ? 'Excelente' : found.length >= 6 ? 'Bom' : found.length ? 'Poucas' : 'Adicionar']
    ];
    const suggestions = [];
    if(!hasContact) suggestions.push('Complete e-mail e telefone para melhorar a leitura por recrutadores e ATS.');
    if(aboutLen < 60) suggestions.push('Escreva um resumo profissional com área de atuação, principais ferramentas e objetivo.');
    else if(aboutLen < 120) suggestions.push('Aumente o resumo para 3 a 5 linhas com resultados, tecnologias e senioridade.');
    if(!expQuality) suggestions.push('Inclua experiências com cargo, empresa e descrição com ações, ferramentas e resultados.');
    if(!eduQuality) suggestions.push('Preencha sua formação acadêmica com curso e instituição.');
    if(skillsCount < 5) suggestions.push('Adicione pelo menos 5 habilidades relevantes para a vaga.');
    if(found.length < 6) suggestions.push('Inclua palavras-chave profissionais reais, como tecnologias, ferramentas e competências da área.');
    if(!projectsQuality) suggestions.push('Adicione projetos com título e descrição objetiva para fortalecer o currículo.');
    if(!suggestions.length) suggestions.push('Seu currículo está bem estruturado. Revise métricas e palavras-chave antes de exportar.');
    return {score, found, detail, suggestions};
  }

  function initAnalyticsPage(){
    if(!document.body.classList.contains('analytics-body')) return;
    const data = collectAnalyticsData();
    const score = data.score;
    const label = score >= 86 ? 'Excelente' : score >= 71 ? 'Muito bom' : score >= 41 ? 'Bom' : 'Precisa melhorar';
    const ring = document.getElementById('atsRing');
    if(ring) ring.style.setProperty('--score', score);
    const scoreEl = document.getElementById('atsScore'); if(scoreEl) scoreEl.textContent = `${score}%`;
    const labelEl = document.getElementById('atsLabel'); if(labelEl) labelEl.textContent = label;
    const summary = document.getElementById('atsSummary'); if(summary) summary.textContent = score >= 86 ? 'Seu currículo está muito bem otimizado para ATS.' : 'Ajuste os pontos sugeridos para aumentar a compatibilidade com ATS.';
    const kwCount = document.getElementById('keywordCount'); if(kwCount) kwCount.textContent = `${data.found.length}/25`;
    const progress = document.getElementById('keywordProgress'); if(progress) progress.value = data.found.length;
    const details = document.getElementById('analysisDetails');
    if(details) details.innerHTML = data.detail.map(([name,status]) => `<li><span><i data-lucide="check-circle-2"></i>${esc(name)}</span><b>${esc(status)}</b></li>`).join('');
    const suggestions = document.getElementById('analysisSuggestions');
    if(suggestions) suggestions.innerHTML = data.suggestions.map(x => `<li><i data-lucide="sparkles"></i><span>${esc(x)}</span></li>`).join('');
    const chips = document.getElementById('keywordChips');
    if(chips) chips.innerHTML = data.found.length ? data.found.map(x => `<span>${esc(x)}</span>`).join('') : '<p class="empty-small">Nenhuma palavra-chave encontrada.</p>';
    if(window.lucide) lucide.createIcons();
  }

  function initTemplates(){
    $$('.template-card').forEach(card=>{
      const id=card.dataset.template || 'minimal';
      card.classList.toggle('selected', id===state.selectedTemplate);
      card.querySelector('.template-select-btn')?.addEventListener('click',()=>{
        state.selectedTemplate=id; save(); localStorage.setItem('cvstudioTemplate', id); sessionStorage.setItem('cvstudioTemplate', id);
        $$('.template-card').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); location.href='builder.html';
      });
    });
    $$('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{ $$('.filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); const f=btn.dataset.filter; $$('.template-card').forEach(c=>c.classList.toggle('hide', f!=='todos' && c.dataset.category!==f)); }));
  }

  initBuilder(); initTemplates(); initExportsPage(); initAnalyticsPage();
  if(window.lucide) lucide.createIcons();
});

document.addEventListener('DOMContentLoaded', () => {
  const demoProfiles = [
    {
      name: 'RAFAEL OLIVEIRA',
      role: 'DESENVOLVEDOR FRONTEND',
      photo: 'Assets/perfil.jpg',
      email: 'rafael@email.com', phone: '(11) 0000-0000', location: 'São Paulo, SP', linkedin: 'linkedin.com/in/rafaeloliveira', site: 'rafael.dev',
      about: 'Desenvolvedor Frontend especializado em React, Next.js e TypeScript, com foco em interfaces modernas, performance e experiências digitais escaláveis.',
      skills: [
        ['JavaScript',4], ['TypeScript',4], ['React',5], ['Next.js',4], ['Tailwind CSS',4], ['Git',4]
      ],
      education: { course:'Ciência da Computação', school:'Universidade de São Paulo', period:'2019 - 2023' },
      experiences: [
        { title:'Desenvolvedor Frontend Pleno', meta:'Empresa ABC · 2022 - Presente', bullets:['Criação de interfaces modernas com React e Next.js','Otimização de performance, acessibilidade e SEO','Integração com APIs REST e componentes reutilizáveis'] },
        { title:'Desenvolvedor Frontend Júnior', meta:'Empresa XYZ · 2020 - 2022', bullets:['Manutenção de aplicações web','Implementação de layouts responsivos','Colaboração com designers para melhorar UI/UX'] }
      ],
      project: {title:'Portfólio Pessoal', desc:'Aplicação web desenvolvida com Next.js e Tailwind CSS.'}
    },
    {
      name: 'ANA SANTOS',
      role: 'UX/UI DESIGNER',
      photo: 'Assets/perfil3.jpg',
      email: 'ana.santos@email.com', phone: '(11) 98888-0000', location: 'São Paulo, SP', linkedin: 'linkedin.com/in/anasantos', site: 'ana.design',
      about: 'Designer de produto focada em criar experiências simples, acessíveis e estratégicas, unindo pesquisa, prototipação e design system para produtos digitais.',
      skills: [
        ['Figma',5], ['UX Research',4], ['UI Design',5], ['Design System',4], ['Prototipação',5], ['Wireframe',4]
      ],
      education: { course:'Design Digital', school:'Universidade Anhembi Morumbi', period:'2018 - 2022' },
      experiences: [
        { title:'UX/UI Designer Sênior', meta:'Studio Criativo · 2021 - Presente', bullets:['Criação de jornadas, wireframes e protótipos navegáveis','Construção de design system para produtos SaaS','Pesquisa com usuários e testes de usabilidade'] },
        { title:'Product Designer', meta:'Agência Pixel · 2019 - 2021', bullets:['Redesign de interfaces mobile e web','Melhoria de fluxos de cadastro e checkout','Documentação de componentes no Figma'] }
      ],
      project: {title:'App Financeiro', desc:'Protótipo completo de aplicativo financeiro com pesquisa, fluxos e design system.'}
    },
    {
      name: 'CARLOS SILVA',
      role: 'GERENTE DE PROJETOS',
      photo: 'Assets/perfil2.jpg',
      email: 'carlos.silva@email.com', phone: '(21) 97777-0000', location: 'Rio de Janeiro, RJ', linkedin: 'linkedin.com/in/carlossilva', site: 'carlos.pm',
      about: 'Gerente de Projetos com experiência em metodologias ágeis, liderança de equipes multidisciplinares e entrega de soluções digitais com foco em prazo, qualidade e resultado.',
      skills: [
        ['Scrum',5], ['Kanban',4], ['Jira',4], ['Gestão Ágil',5], ['PMBOK',4], ['Liderança',5]
      ],
      education: { course:'Administração de Empresas', school:'FGV', period:'2016 - 2020' },
      experiences: [
        { title:'Gerente de Projetos', meta:'Tech Solutions · 2021 - Presente', bullets:['Gestão de times ágeis e planejamento de sprints','Acompanhamento de KPIs, riscos e entregas estratégicas','Comunicação com stakeholders e liderança executiva'] },
        { title:'Analista de Projetos', meta:'Consultoria Prime · 2019 - 2021', bullets:['Controle de cronogramas e documentação de projetos','Apoio na implantação de metodologias ágeis','Organização de cerimônias e relatórios gerenciais'] }
      ],
      project: {title:'Implantação CRM', desc:'Projeto de implantação de CRM corporativo com gestão de escopo, prazos e indicadores.'}
    }
  ];

  const $home = (id) => document.getElementById(id);
  const renderDots = (level) => `<b>${[1,2,3,4,5].map(i => i <= level ? '<i></i>' : '<em></em>').join('')}</b>`;
  const renderSkillsHome = (skills) => skills.map(([name, level]) => `<div class="skill"><span>${name}</span>${renderDots(level)}</div>`).join('');
  const renderExperienceHome = (items) => items.map(item => `
    <div class="job">
      <h5>${item.title}</h5>
      <p>${item.meta}</p>
      <ul>${item.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
    </div>
  `).join('');

  function applyDemoProfile(profile){
    const card = document.querySelector('.resume-card');
    if(card) card.classList.add('changing');

    setTimeout(() => {
      if($home('heroName')) $home('heroName').textContent = profile.name;
      if($home('heroRole')) $home('heroRole').textContent = profile.role;
      if($home('heroPhoto')) $home('heroPhoto').src = profile.photo;
      if($home('heroAbout')) $home('heroAbout').textContent = profile.about;
      if($home('heroSkills')) $home('heroSkills').innerHTML = renderSkillsHome(profile.skills);
      if($home('heroEducationCourse')) $home('heroEducationCourse').textContent = profile.education.course;
      if($home('heroEducationSchool')) $home('heroEducationSchool').textContent = profile.education.school;
      if($home('heroEducationPeriod')) $home('heroEducationPeriod').textContent = profile.education.period;
      if($home('heroExperience')) $home('heroExperience').innerHTML = renderExperienceHome(profile.experiences);

      const contact = $home('heroContact');
      if(contact){
        contact.innerHTML = `
          <p><i data-lucide="mail"></i> ${profile.email}</p>
          <p><i data-lucide="phone"></i> ${profile.phone}</p>
          <p><i data-lucide="map-pin"></i> ${profile.location}</p>
          <p><i data-lucide="globe"></i> ${profile.linkedin}</p>
          <p><i data-lucide="globe"></i> ${profile.site}</p>
        `;
      }

      const projectTitle = document.querySelector('.resume-main .section:last-child .job h5');
      const projectDesc = document.querySelector('.resume-main .section:last-child .job p');
      if(projectTitle) projectTitle.textContent = profile.project.title;
      if(projectDesc) projectDesc.textContent = profile.project.desc;

      if(window.lucide) lucide.createIcons();
      if(card) card.classList.remove('changing');
    }, 220);
  }

  let i = 0;
  if ($home('heroName') && $home('heroRole')) {
    applyDemoProfile(demoProfiles[0]);
    setInterval(() => {
      i = (i + 1) % demoProfiles.length;
      applyDemoProfile(demoProfiles[i]);
    }, 4200);
  }

  const cards = Array.from(document.querySelectorAll('.home-template-card'));
  if (cards.length) {
    let current = 0;
    setInterval(() => {
      cards[current]?.classList.remove('active');
      current = (current + 1) % cards.length;
      cards[current]?.classList.add('active');
    }, 2200);
  }
});
