// app.js — polished, full-featured single-file behavior
document.addEventListener('DOMContentLoaded', () => {
  const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayBtn = document.getElementById('dayBtn');
  const nightBtn = document.getElementById('nightBtn');
  const prompt = document.getElementById('prompt');
  const checklistSection = document.getElementById('checklistSection');
  const title = document.getElementById('title');
  const subtext = document.getElementById('subtext');
  const listEl = document.getElementById('list');
  const changeMode = document.getElementById('changeMode');
  const quickInput = document.getElementById('quickInput');
  const addQuick = document.getElementById('addQuick');
  const toast = document.getElementById('toast');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const optWeeklyReset = document.getElementById('optWeeklyReset');
  const optHaptics = document.getElementById('optHaptics');
  const undoBtn = document.getElementById('undoBtn');

  const todayIndex = new Date().getDay();
  const todayStr = new Date().toISOString().split('T')[0];
  let mode = localStorage.getItem('wc_selected_mode') || '';
  let listData = [];
  let lastDeleted = null; // for undo

  // settings default
  if(localStorage.getItem('wc_settings') === null) {
    localStorage.setItem('wc_settings', JSON.stringify({ weeklyReset: true, haptics: true }));
  }
  const settings = JSON.parse(localStorage.getItem('wc_settings'));
  // reflect settings in modal elements
  if(optWeeklyReset) optWeeklyReset.checked = !!settings.weeklyReset;
  if(optHaptics) optHaptics.checked = !!settings.haptics;

  // weekly auto-reset
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }
  const currentWeek = getWeekNumber(new Date());
  const lastWeek = Number(localStorage.getItem('wc_last_week') || 0);
  if(settings.weeklyReset && lastWeek !== currentWeek){
    // clear all saved lists
    ['day','night'].forEach(m=>{
      for(let i=0;i<7;i++) localStorage.removeItem(`week_${i}_${m}`);
    });
    localStorage.setItem('wc_last_week', currentWeek);
    localStorage.removeItem('wc_selected_mode');
    mode = '';
  }

  // storage helpers
  function keyFor(dIdx, m){ return `week_${dIdx}_${m}`; }
  function loadList(){ return JSON.parse(localStorage.getItem(keyFor(todayIndex, mode)) || '[]'); }
  function saveList(list){ localStorage.setItem(keyFor(todayIndex, mode), JSON.stringify(list)); }

  // haptics helper
  function vibrate(pattern=20){ if(settings.haptics && navigator.vibrate) navigator.vibrate(pattern); }

  // UI helpers
  function showPrompt(){ prompt.classList.remove('hidden'); checklistSection.classList.add('hidden'); }
  function showChecklist(){
    prompt.classList.add('hidden'); checklistSection.classList.remove('hidden');
    title.textContent = `${weekdays[todayIndex]} — ${mode.toUpperCase()}`;
    subtext.textContent = `Checklist for ${weekdays[todayIndex]} (${mode})`;
    render();
  }

  function startMode(m){
    mode = m;
    localStorage.setItem('wc_selected_mode', m);
    listData = loadList();
    showChecklist();
  }

  dayBtn.addEventListener('click', ()=> startMode('day'));
  nightBtn.addEventListener('click', ()=> startMode('night'));
  changeMode.addEventListener('click', ()=> {
    localStorage.removeItem('wc_selected_mode');
    location.reload();
  });

  // add quick entry
  addQuick.addEventListener('click', ()=> {
    const v = quickInput.value.trim(); if(!v) return;
    listData = loadList();
    listData.push({ text: v, done: false });
    saveList(listData);
    quickInput.value = '';
    render();
    vibrate(15);
  });
  quickInput.addEventListener('keydown', (e)=> { if(e.key === 'Enter') addQuick.click(); });

  // render
  function createItemElement(item, index){
    const li = document.createElement('li'); li.dataset.index = index;
    // checkbox wrap
    const cbWrap = document.createElement('div'); cbWrap.className = 'checkboxWrap';
    if(item.done) cbWrap.classList.add('checked');
    // SVG check
    const checkSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    checkSvg.setAttribute('viewBox','0 0 24 24'); checkSvg.classList.add('checkmark');
    checkSvg.innerHTML = `<use href="#icon-check"></use>`;
    cbWrap.appendChild(checkSvg);
    cbWrap.addEventListener('click', ()=> {
      item.done = !item.done;
      if(item.done) cbWrap.classList.add('checked'); else cbWrap.classList.remove('checked');
      saveList(listData);
      render();
      vibrate(18);
    });

    const text = document.createElement('div'); text.className='text'; text.textContent = item.text;
    if(item.done) li.classList.add('done');

    li.appendChild(cbWrap); li.appendChild(text);
    attachDragAndSwipe(li, index);
    return li;
  }

  function render(){
    listData = loadList();
    listEl.innerHTML = '';
    if(!listData || listData.length === 0){
      const p = document.createElement('div'); p.className='muted'; p.style.padding='10px'; p.textContent='No items yet — add some in the editor or quick-add above.';
      listEl.appendChild(p); return;
    }
    listData.forEach((it, idx)=> listEl.appendChild(createItemElement(it, idx)));
  }

  // drag + swipe functions
  function attachDragAndSwipe(li, index){
    // DRAG
    li.draggable = true;
    li.addEventListener('dragstart', (e)=>{
      li.classList.add('dragging');
      e.dataTransfer?.setData('text/plain', index.toString());
      // subtle spring animation
      li.animate([{ transform:'scale(1)' }, { transform:'scale(1.02)' }, { transform:'scale(1)' }], { duration: 260, easing:'cubic-bezier(.2,.9,.25,1)'});
    });
    li.addEventListener('dragend', ()=>{
      li.classList.remove('dragging');
      const nodes = Array.from(listEl.querySelectorAll('li'));
      const newList = nodes.map(n => {
        const txt = n.querySelector('.text').textContent;
        const done = n.querySelector('.checkboxWrap')?.classList.contains('checked');
        return { text: txt, done: !!done };
      });
      listData = newList;
      saveList(listData);
      render();
      vibrate(10);
    });
    li.addEventListener('dragover', (e)=>{
      e.preventDefault();
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height/2;
      const dragging = listEl.querySelector('.dragging');
      if(!dragging || dragging === target) return;
      if(before) listEl.insertBefore(dragging, target);
      else listEl.insertBefore(dragging, target.nextSibling);
    });

    // SWIPE (touch)
    let startX = 0, currentX = 0;
    const threshold = 60;
    li.addEventListener('touchstart', (e)=> { startX = e.touches[0].clientX; li.style.transition = ''; }, { passive: true });
    li.addEventListener('touchmove', (e)=> {
      currentX = e.touches[0].clientX - startX;
      li.style.transform = `translateX(${currentX}px)`;
      if(currentX > threshold) li.classList.add('swipe-right'); else li.classList.remove('swipe-right');
      if(currentX < -threshold) li.classList.add('swipe-left'); else li.classList.remove('swipe-left');
    }, { passive: true });
    li.addEventListener('touchend', ()=> {
      li.style.transition = 'transform 300ms cubic-bezier(.2,.9,.25,1)';
      if(currentX > threshold){
        // complete
        listData[index].done = true;
        saveList(listData);
        vibrate(30);
      } else if(currentX < -threshold){
        // delete with undo capability
        lastDeleted = { items: JSON.parse(JSON.stringify(listData)), index: index };
        listData.splice(index, 1); saveList(listData);
        showToast('Item deleted', 'Undo', () => {
          if(lastDeleted){ listData = lastDeleted.items; saveList(listData); lastDeleted = null; render(); }
        });
        vibrate([40]);
      } else {
        li.style.transform = 'translateX(0)';
      }
      setTimeout(()=>{ li.classList.remove('swipe-left','swipe-right'); render(); }, 260);
      startX = 0; currentX = 0;
    });
  }

  // toast
  function showToast(text, actionText, action) {
    toast.classList.remove('hidden'); toast.textContent = '';
    const span = document.createElement('span'); span.textContent = text; toast.appendChild(span);
    if(actionText && action){
      const btn = document.createElement('button'); btn.className='btn small'; btn.textContent = actionText; btn.style.marginLeft='12px';
      btn.addEventListener('click', ()=> { action(); toast.classList.add('hidden'); });
      toast.appendChild(btn);
    }
    setTimeout(()=> { if(!toast.classList.contains('hidden')) toast.classList.add('hidden'); }, 5000);
  }

  // undo button uses lastDeleted
  undoBtn.addEventListener('click', ()=> {
    if(!lastDeleted) { showToast('Nothing to undo'); return; }
    listData = lastDeleted.items; saveList(listData); lastDeleted = null; render(); showToast('Restored'); vibrate(20);
  });

  // settings modal
  if(settingsBtn) settingsBtn.addEventListener('click', ()=> settingsModal.classList.remove('hidden'));
  if(closeSettings) closeSettings.addEventListener('click', ()=> {
    settingsModal.classList.add('hidden');
    // save settings
    settings.weeklyReset = !!optWeeklyReset.checked;
    settings.haptics = !!optHaptics.checked;
    localStorage.setItem('wc_settings', JSON.stringify(settings));
  });

  // initial
  if(mode) showChecklist(); else showPrompt();
});
