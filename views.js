/* Просмотры по проектам и соцсетям. Данные берутся из views.json (снимок),
   проект/сеть/период выбираются здесь. Хуппи просмотры не отдаёт. */
(function(){
'use strict';
var host=document.querySelector('#viewSt');
if(!host)return;
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var pad=function(n){return String(n).padStart(2,'0')};
var iso=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
var num=function(n){return Number(n||0).toLocaleString('ru-RU')};
var ORDER=['YouTube','Instagram','TikTok','ВКонтакте','Яппи'];
var lsGet=function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
var lsSet=function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

var data=null,items=[],nets=[],projs=[];

var card=document.createElement('div');
card.className='card';card.id='vwCard';
card.innerHTML=
'<h2>Просмотры по проектам и соцсетям</h2>'+
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
'<div id="vwBox" class="hidden">'+
'<div style="overflow-x:auto"><table style="margin-top:12px" id="vwPivot"></table></div>'+
'<h2 style="margin-top:18px;font-size:15px">Лучшие видео за период</h2>'+
'<table><thead><tr><th>Проект</th><th>Сеть</th><th>Вышло</th><th>Просмотры</th><th></th></tr></thead><tbody id="vwTop"></tbody></table>'+
'<h2 style="margin-top:18px;font-size:15px">По дням выхода</h2>'+
'<table><thead><tr><th>День</th><th>Публикаций</th><th>Просмотры</th></tr></thead><tbody id="vwDays"></tbody></table>'+
'</div>'+
'<div class="hint" id="vwNote"></div>';
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

function render(){
if(!data)return;
var msg=$q('#vwMsg'),box=$q('#vwBox');
var from=$q('#vwFrom').value,to=$q('#vwTo').value,proj=$q('#vwProj').value,ns=selectedNets();
lsSet('vwSel',{proj:proj,from:from,to:to,nets:ns});
if(from&&to&&to<from){msg.className='msg st-err';msg.textContent='Дата «по» раньше даты «с».';box.classList.add('hidden');return}
if(!ns.length){msg.className='msg';msg.textContent='Отметь хотя бы одну соцсеть.';box.classList.add('hidden');return}
var list=items.filter(function(i){
return (!from||i.d>=from)&&(!to||i.d<=to)&&(!proj||i.p===proj)&&ns.indexOf(i.n)>=0;
});
if(!list.length){msg.className='msg';msg.textContent='За выбранный период видео в снимке нет.';box.classList.add('hidden');renderNote(to);return}
var withV=list.filter(function(i){return i.v!=null});
var total=withV.reduce(function(a,i){return a+i.v},0);
var missing=list.length-withV.length;
msg.className='msg';
msg.textContent='Публикаций: '+list.length+', просмотров: '+num(total)+(withV.length?', в среднем на публикацию: '+num(Math.round(total/withV.length)):'')+(missing?'. Без данных по просмотрам: '+missing+' (помечены *).':'.');
box.classList.remove('hidden');

// сводная: проекты x сети
var pj=[];list.forEach(function(i){if(pj.indexOf(i.p)<0)pj.push(i.p)});
var cell={},rowT={},colT={},cnt={},miss={};
list.forEach(function(i){
var k=i.p+'\u0001'+i.n;
cell[k]=(cell[k]||0)+(i.v||0);cnt[k]=(cnt[k]||0)+1;if(i.v==null)miss[k]=(miss[k]||0)+1;
rowT[i.p]=(rowT[i.p]||0)+(i.v||0);colT[i.n]=(colT[i.n]||0)+(i.v||0);
});
pj.sort(function(a,b){return (rowT[b]||0)-(rowT[a]||0)});
var cols=ns.filter(function(n){return colT[n]!==undefined});
var h='<thead><tr><th>Проект</th>'+cols.map(function(n){return '<th>'+esc(n)+'</th>'}).join('')+'<th>Итого</th></tr></thead><tbody>';
pj.forEach(function(p){
h+='<tr><td>'+esc(p)+'</td>'+cols.map(function(n){
var k=p+'\u0001'+n;
if(!cnt[k])return '<td class="cap">—</td>';
if(miss[k]===cnt[k])return '<td class="cap">нет данных<div class="cap">'+cnt[k]+' шт.</div></td>';
return '<td><b>'+num(cell[k])+(miss[k]?'*':'')+'</b><div class="cap">'+cnt[k]+' шт.</div></td>';
}).join('')+'<td><b>'+num(rowT[p])+'</b></td></tr>';
});
if(pj.length>1){
h+='<tr><td><b>Итого</b></td>'+cols.map(function(n){return '<td><b>'+num(colT[n])+'</b></td>'}).join('')+'<td><b>'+num(total)+'</b></td></tr>';
}
h+='</tbody>';
$q('#vwPivot').innerHTML=h;

// лучшие видео
var top=withV.slice().sort(function(a,b){return b.v-a.v}).slice(0,10);
$q('#vwTop').innerHTML=top.map(function(i){
return '<tr><td>'+esc(i.p)+'</td><td>'+esc(i.n)+'</td><td>'+esc(i.d.slice(8,10)+'.'+i.d.slice(5,7))+'</td><td><b>'+num(i.v)+'</b></td><td><a href="'+esc(i.u)+'" target="_blank" rel="noopener">открыть</a></td></tr>';
}).join('');

// по дням
var days={};
list.forEach(function(i){var d=days[i.d]||(days[i.d]={c:0,v:0});d.c++;d.v+=i.v||0});
$q('#vwDays').innerHTML=Object.keys(days).sort().reverse().map(function(d){
return '<tr><td>'+esc(d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4))+'</td><td>'+days[d].c+'</td><td>'+num(days[d].v)+'</td></tr>';
}).join('');
renderNote(to);
}

function renderNote(to){
var note='Просмотры взяты из самих соцсетей снимком на '+data.updated.split('-').reverse().join('.')+' (Хуппи просмотры не отдаёт). Видео попадает в период по дате выхода поста. Список видео берётся из Хуппи, поэтому старше первых постов, сделанных через Заливатор, данных нет.';
if(to&&to>data.updated)note+=' Выбранный период заканчивается позже даты снимка: чтобы обновить цифры, попроси Claude пересобрать просмотры.';
$q('#vwNote').textContent=note;
}

function init(){
var sel=lsGet('vwSel',null)||{};
items=data.items.map(function(r){return {p:r[0],n:r[1],d:r[2],v:r[3],u:r[4]}});
projs=[];nets=[];
items.forEach(function(i){if(projs.indexOf(i.p)<0)projs.push(i.p);if(nets.indexOf(i.n)<0)nets.push(i.n)});
nets.sort(function(a,b){var x=ORDER.indexOf(a),y=ORDER.indexOf(b);return (x<0?99:x)-(y<0?99:y)});
$q('#vwProj').innerHTML='<option value="">Все проекты</option>'+projs.map(function(p){return '<option value="'+esc(p)+'">'+esc(p)+'</option>'}).join('');
if(sel.proj&&projs.indexOf(sel.proj)>=0)$q('#vwProj').value=sel.proj;
$q('#vwNets').innerHTML=nets.map(function(n){
var on=!sel.nets||sel.nets.indexOf(n)>=0;
return '<label class="row" style="margin:0;color:var(--ink);font-size:14px;gap:6px"><input type="checkbox" value="'+esc(n)+'"'+(on?' checked':'')+'> '+esc(n)+'</label>';
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
