document.addEventListener('DOMContentLoaded', () => {
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekdaySel = document.getElementById('weekday');
  const modeSel = document.getElementById('modeSel');
  const which = document.getElementById('which');
  const editList = document.getElementById('editList');
  const newText = document.getElementById('newText');
  const addBtn = document.getElementById('addBtn');

  weekdays.forEach((d,i)=>{
    const o = document.createElement('option'); o.value = i; o.textContent = d; weekdaySel.appendChild(o);
  });
  weekdaySel.value = new Date().getDay();

  function keyFor(dayIndex, mode){ return `week_${dayIndex}_${mode}`; }
  function load(dayIndex, mode){ return JSON.parse(localStorage.getItem(keyFor(dayIndex,mode))||'[]'); }
  function save(dayIndex, mode, list){ localStorage.setItem(keyFor(dayIndex,mode), JSON.stringify(list)); }

  function render(){
    const day = Number(weekdaySel.value);
    const mode = modeSel.value;
    which.textContent = `${weekdays[day]} — ${mode}`;
    const list = load(day, mode);
    editList.innerHTML = '';
    if(list.length === 0){
      const p = document.createElement('div'); p.style.color='#94a3b8'; p.style.padding='8px'; p.textContent='No items yet.';
      editList.appendChild(p); return;
    }
    list.forEach((it,i)=>{
      const li = document.createElement('li'); li.style.display='flex'; li.style.gap='8px'; li.style.alignItems='center';
      const input = document.createElement('input'); input.type='text'; input.value = it.text;
      input.addEventListener('change', ()=>{
        const l = load(day,mode); l[i].text = input.value; save(day,mode,l);
      });
      const del = document.createElement('button'); del.textContent='Delete'; del.className='delete';
      del.addEventListener('click', ()=>{
        const l = load(day,mode); l.splice(i,1); save(day,mode,l); render();
      });
      li.appendChild(input); li.appendChild(del); editList.appendChild(li);
    });
  }

  addBtn.addEventListener('click', ()=>{
    const day = Number(weekdaySel.value), mode = modeSel.value;
    const v = newText.value.trim(); if(!v) return;
    const l = load(day,mode);
    l.push({ text: v, done: false });
    save(day,mode,l);
    newText.value = '';
    render();
  });

  weekdaySel.addEventListener('change', render);
  modeSel.addEventListener('change', render);

  render();
});
