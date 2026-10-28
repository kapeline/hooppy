/* Просмотры по проектам и соцсетям (каждый проект отдельно).
   Данные берутся из views.json (снимок), проект/сеть/период выбираются здесь.
   Хуппи просмотры не отдаёт. */
(function(){
'use strict';
var host=document.querySelector('#viewSt');
if(!host)return;
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var pad=function(n){return String(n).padStart(2,'0')};
var iso=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
var num=function(n){return Number(n||0).toLocaleString('ru-RU')};
var dm=function(d){return d.slice(8,10)+'.'+d.slice(5,7)};
/* как называется сеть в данных -> как показываем */
var LABEL={'Instagram':'Reels','ВКонтакте':'Клипы ВК','YouTube':'Shorts','TikTok':'TikTok','Яппи':'Яппи','Likee':'Лайк'};
var ORDER=['Instagram','ВКонтакте','YouTube','TikTok','Яппи','Likee'];
var lab=function(n){return LABEL[n]||n};
var lsGet=function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
var lsSet=function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

var data=null,items=[],nets=[],projs=[];

/* старую общую статистику «Публикации по соцсетям» (все проекты вместе) прячем */
Array.prototype.slice.call(host.children).forEach(function(c){c.classList.add('hidden')});

var card=document.createElement('div');
card.id='vwCard';
card.innerHTML=
'<div class="card">'+
'<h2>Просмотры по проектам</h2>'+
'<div class="row" style="gap:12px;align-items:flex-end;flex-wrap:wrap">'+
'<label style="margin:0">Проект<br><select id="vwProj" style="min-width:220px"></select></label>'+
'<label style="margin:0">С даты<br><input type="date" id="vwFrom"></label>'+
'<label style="margin:0">По дату (включительно)<br><input type="date" id="vwTo"></label>'+
'<button id="vwGo">Посчитать</button>'+
'</div>'+
'<div class="row" style="margin-top:10px">'+
'<button class="ghost small" data-vw="7">7 дней</button>'+
'<button class="ghost small" data-vw="14">14 дней</button>'+
'<button class="ghost small" data-vw="30">30 дней</button>'+
'<button class="ghost small" data-vw="m0">Этот месяц</button>'+
'<button class="ghost small" data-vw="m1">Прошлый месяц</button>'+
'<button class="ghost small" data-vw="all">Всё время</button>'+
'</div>'+
'<div class="row" id="vwNets" style="margin-top:12px;gap:14px"></div>'+
'<div class="msg" id="vwMsg">Загружаю данные…</div>'+
'</div>'+
'<div id="vwProjects"></div>'+
'<div class="hint" id="vwNote" style="margin:0 4px 14px"></div>';
host.insertBefore(card,host.firstChild);

var $q=function(s){return card.querySelector(s)};

function setRange(k){
var to=new Date(),from=new Date();
if(k==='all'){$q('#vwFrom').value='';$q('#vwTo').value='';return}
if(k==='m0'){from.setDate(1)}
else if(k==='m1'){from.setMonth(from.getMonth()-1,1);to.setDate(0)}
else from.setDate(from.getDate()-(Number(k)-1));
$q('#vwFrom').value=iso(from);$q('#vwTo').value=iso(to);
}

function selectedNets(){
return Array.prototype.slice.call(card.querySelectorAll('#vwNets input:checked')).map(function(i){return i.value});
}

/* один проект — один отдельный блок */
function projectBlock(p,list,ns){
var withV=list.filter(function(i){return i.v!=null});
var total=withV.reduce(function(a,i){return a+i.v},0);
var h='<div class="card"><h2>'+esc(p)+'</h2>';
h+='<div class="cap" style="margin-bottom:6px">Публикаций: '+list.length+' · просмотров: <b style="color:var(--ink)">'+num(total)+'</b>'+(withV.length?' · в среднем на публикацию: '+num(Math.round(total/withV.length)):'')+'</div>';
h+='<table><thead><tr><th>Соцсеть</th><th>Публикаций</th><th>Просмотры</th><th>В среднем</th></tr></thead><tbody>';
ns.forEach(function(n){
var l=list.filter(function(i){return i.n===n});
if(!l.length){h+='<tr><td>'+esc(lab(n))+'</td><td class="cap">0</td><td class="cap">—</td><td class="cap">—</td></tr>';return}
var wv=l.filter(function(i){return i.v!=null}),s=wv.reduce(function(a,i){return a+i.v},0);
h+='<tr><td>'+esc(lab(n))+'</td><td>'+l.length+'</td><td><b>'+(wv.length?num(s):'нет данных')+'</b>'+(wv.length&&wv.length<l.length?'<span class="cap"> (без данных: '+(l.length-wv.length)+')</span>':'')+'</td><td>'+(wv.length?num(Math.round(s/wv.length)):'—')+'</td></tr>';
});
h+='</tbody></table>';
var top=withV.slice().sort(function(a,b){return b.v-a.v}).slice(0,5);
if(top.length){
h+='<div class="cap" style="margin-top:12px">Лучшие видео</div><table><tbody>';
h+=top.map(function(i){return '<tr><td>'+esc(lab(i.n))+'</td><td>'+esc(dm(i.d))+'</td><td><b>'+num(i.v)+'</b></td><td><a href="'+esc(i.u)+'" target="_blank" rel="noopener">открыть</a></td></tr>'}).join('');
h+='</tbody></table>';
}
var days={};
list.forEach(function(i){var d=days[i.d]||(days[i.d]={c:0,v:0});d.c++;d.v+=i.v||0});
h+='<details style="margin-top:10px"><summary class="cap" style="cursor:pointer">По дням выхода</summary><table><thead><tr><th>День</th><th>Публикаций</th><th>Просмотры</th></tr></thead><tbody>';
h+=Object.keys(days).sort().reverse().map(function(d){return '<tr><td>'+esc(dm(d)+'.'+d.slice(0,4))+'</td><td>'+days[d].c+'</td><td>'+num(days[d].v)+'</td></tr>'}).join('');
h+='</tbody></table></details></div>';
return h;
}

function render(){
if(!data)return;
var msg=$q('#vwMsg'),box=$q('#vwProjects');
var from=$q('#vwFrom').value,to=$q('#vwTo').value,proj=$q('#vwProj').value,ns=selectedNets();
lsSet('vwSel',{proj:proj,from:from,to:to,nets:ns});
if(from&&to&&to<from){msg.className='msg st-err';msg.textContent='Дата «по» раньше даты «с».';box.innerHTML='';return}
if(!ns.length){msg.className='msg';msg.textContent='Отметь хотя бы одну соцсеть.';box.innerHTML='';return}
var list=items.filter(function(i){
return (!from||i.d>=from)&&(!to||i.d<=to)&&(!proj||i.p===proj)&&ns.indexOf(i.n)>=0;
});
var shown=(proj?[proj]:projs).filter(function(p){return list.some(function(i){return i.p===p})});
msg.className='msg';
msg.textContent=(from||to?('Период: '+(from?from.split('-').reverse().join('.'):'начало')+' — '+(to?to.split('-').reverse().join('.'):'сейчас')):'За всё время')+'. Каждый проект посчитан отдельно.';
if(!shown.length){box.innerHTML='<div class="card"><div class="cap">За выбранный период видео в снимке нет.</div></div>';renderNote(to);return}
box.innerHTML=shown.map(function(p){return projectBlock(p,list.filter(function(i){return i.p===p}),ns)}).join('');
renderNote(to);
}

function renderNote(to){
var note='Просмотры взяты из самих соцсетей снимком на '+data.updated.split('-').reverse().join('.')+' (Хуппи просмотры не отдаёт). Видео попадает в период по дате выхода поста. Список видео берётся из Хуппи, поэтому раньше первых постов, сделанных через Заливатор, данных нет.';
if(to&&to>data.updated)note+=' Выбранный период заканчивается позже даты снимка.';
$q('#vwNote').textContent=note;
}

function init(){
var sel=lsGet('vwSel',null)||{};
/* только проектные публикации; репосты на стену ВК без проекта не считаем */
items=data.items.filter(function(r){return r[0]!=='Без проекта'}).map(function(r){return {p:r[0],n:r[1],d:r[2],v:r[3],u:r[4]}});
projs=[];nets=[];
items.forEach(function(i){if(projs.indexOf(i.p)<0)projs.push(i.p);if(nets.indexOf(i.n)<0)nets.push(i.n)});
ORDER.forEach(function(n){if(nets.indexOf(n)<0&&n!=='Likee')nets.push(n)}); /* Яппи показываем всегда */
nets.sort(function(a,b){var x=ORDER.indexOf(a),y=ORDER.indexOf(b);return (x<0?99:x)-(y<0?99:y)});
$q('#vwProj').innerHTML='<option value="">Все проекты (по отдельности)</option>'+projs.map(function(p){return '<option value="'+esc(p)+'">'+esc(p)+'</option>'}).join('');
if(sel.proj&&projs.indexOf(sel.proj)>=0)$q('#vwProj').value=sel.proj;
$q('#vwNets').innerHTML=nets.map(function(n){
var on=!sel.nets||sel.nets.indexOf(n)>=0;
return '<label class="row" style="margin:0;color:var(--ink);font-size:14px;gap:6px"><input type="checkbox" value="'+esc(n)+'"'+(on?' checked':'')+'> '+esc(lab(n))+'</label>';
}).join('');
if(sel.from!=null&&(sel.from||sel.to)){$q('#vwFrom').value=sel.from||'';$q('#vwTo').value=sel.to||''}
else if(sel.from===''&&sel.to===''){/* всё время */}
else setRange('7');
render();
}

card.querySelectorAll('[data-vw]').forEach(function(b){b.onclick=function(){setRange(b.dataset.vw);render()}});
$q('#vwGo').onclick=render;
card.addEventListener('change',function(e){if(e.target.closest&&(e.target.closest('#vwNets')||e.target.id==='vwProj'||e.target.id==='vwFrom'||e.target.id==='vwTo'))render()});

fetch('views.json?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(j){data=j;init()}).catch(function(e){
var m=$q('#vwMsg');m.className='msg st-err';m.textContent='Не удалось загрузить views.json: '+e.message;
});
})();
