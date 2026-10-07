const $=s=>document.querySelector(s),log=$('#log'),t=$('#t'),sb=$('#s'),dlg=$('#dlg'),L=k=>localStorage.getItem(k)||'';
let hist=JSON.parse(L('hist')||'[]'),ctl=null;
const save=()=>localStorage.setItem('hist',JSON.stringify(hist));
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const md=s=>esc(s).split(/```\w*\n?/).map((p,i)=>i%2?'<pre><code>'+p+'</code></pre>':p.replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/^#{1,6} (.*)$/gm,'<b>$1</b>').replace(/^([ \t]*)[*-] /gm,'$1• ').replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>')).join('');
function add(r,x,err){const d=document.createElement('div');d.className='m '+(r=='user'?'u':'b')+(err?' err':'');d.dir='auto';d.innerHTML=md(x);log.append(d);log.scrollTop=log.scrollHeight;return d}
const render=()=>{log.innerHTML='';if(!hist.length)add('model','Hi! Ask me anything.');hist.forEach(h=>add(h.role,h.parts[0].text))};
const openSet=()=>{$('#k').value=L('key');$('#m').value=L('model');dlg.showModal()};
async function send(){
  const q=t.value.trim();if(!q||ctl)return;
  if(!L('key'))return openSet();
  if(!hist.length)log.innerHTML='';
  t.value='';t.style.height='auto';hist.push({role:'user',parts:[{text:q}]});add('user',q);
  const out=add('model','…');let full='';ctl=new AbortController();sb.textContent='Stop';
  try{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(L('model')||'gemini-2.5-flash')}:streamGenerateContent?alt=sse`,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','x-goog-api-key':L('key')},body:JSON.stringify({contents:hist})});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(e.error?.message||'HTTP '+r.status)}
    const rd=r.body.getReader(),dc=new TextDecoder();let b='';
    for(;;){
      const{done,value}=await rd.read();if(done)break;
      b+=dc.decode(value,{stream:true});const ls=b.split('\n');b=ls.pop();
      for(const l of ls)if(l.startsWith('data:'))try{
        full+=(JSON.parse(l.slice(5)).candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
        out.innerHTML=md(full);log.scrollTop=log.scrollHeight;
      }catch{}
    }
    if(!full)throw Error('Empty reply (possibly blocked by safety filters).');
  }catch(e){
    if(!(e.name=='AbortError'&&full)){hist.pop();t.value=q;out.className='m b err';out.textContent=e.name=='AbortError'?'Stopped.':'Error: '+e.message;full=''}
  }
  if(full)hist.push({role:'model',parts:[{text:full}]});
  save();ctl=null;sb.textContent='Send';
}
sb.onclick=()=>ctl?ctl.abort():send();
t.oninput=()=>{t.style.height='auto';t.style.height=Math.min(t.scrollHeight,140)+'px'};
t.onkeydown=e=>{if(e.key=='Enter'&&!e.shiftKey&&matchMedia('(pointer:fine)').matches){e.preventDefault();send()}};
$('#n').onclick=()=>{if(ctl)return;hist=[];save();render()};
$('#gear').onclick=openSet;
$('#c').onclick=()=>dlg.close();
$('#ok').onclick=()=>{localStorage.setItem('key',$('#k').value.trim());localStorage.setItem('model',$('#m').value.trim())};
if(new URLSearchParams(location.search).has('new')){hist=[];save();history.replaceState(null,'',location.pathname)}
render();if(!L('key'))openSet();
