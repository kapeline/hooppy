/* Количество видео по проектам и соцсетям за выбранный период.
   Данные берутся из Хуппи (опубликованные посты) и из расширения Яппи. Просмотров нет. */
(function(){
'use strict';
var host=document.querySelector('#viewSt');
if(!host)return;
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var pad=function(n){return String(n).padStart(2,'0')};
var iso=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
var dmy=function(s){return s.split('-').reverse().join('.')};
/* id сети в Хуппи -> как показываем */
var NET={29:'Reels',10:'Reels',7:'Reels',1:'Клипы ВК',12:'Клипы ВК',17:'Shorts',14:'TikTok',31:'TikTok',32:'Яппи'};
var ORDER=['Reels','Клипы ВК','Shorts','TikTok','Яппи'];
var NOPROJ='Без проекта';
var lsGet=function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
var lsSet=function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

/* прячем прежнюю общую статистику (все проекты вместе) */
Array.prototype.slice.call(host.children).forEach(function(c){c.classList.add('hidden')});

var card=document.createElement('div');
card.id='psCard';
card.innerHTML=
'<div class="card">'+
'<h2>Сколько видео вышло по проектам</h2>'+
'<div class="row" style="gap:12px;align-items:flex-end;flex-wrap:wrap">'+
'<label style="margin:0">Проект<br><select id="psProj" style="min-width:220px"><option value="">Все проекты (по отдельности)</option></select></label>'+
'<label style="margin:0">С даты<br><input type="date" id="psFrom"></label>'+
'<label style="margin:0">По дату (включительно)<br><input type="date" id="psTo"></label>'+
'<button id="psGo">Посчитать</button>'+
'</div>'+
'<div class="row" style="margin-top:10px">'+
'<button class="ghost small" data-ps="7">7 дней</button>'+
'<button class="ghost small" data-ps="14">14 дней</button>'+
'<button class="ghost small" data-ps="30">30 дней</button>'+
'<button class="ghost small" data-ps="m0">Этот месяц</button>'+
'<button class="ghost small" data-ps="m1">Прошлый месяц</button>'+
'</div>'+
'<div class="msg" id="psMsg">Выбери период и нажми «Посчитать».</div>'+
'</div>'+
'<div id="psProjects"></div>'+
'<div class="hint" id="psNote" style="margin:0 4px 14px"></div>';
host.insertBefore(card,host.firstChild);
var $q=function(s){return card.querySelector(s)};

function setRange(k){
var to=new Date(),from=new Date();
if(k==='m0'){from.setDate(1)}
else if(k==='m1'){from.setMonth(from.getMonth()-1,1);to.setDate(0)}
else from.setDate(from.getDate()-(Number(k)-1));
$q('#psFrom').value=iso(from);$q('#psTo').value=iso(to);
}

var result=null; /* {byProj:{name:{nets:{net:{ok,err}},days:{day:n}}}, yappyNote} */

function projectOfJob(job){
/* Яппи-ролик относим к проекту по подписи: она начинается с одной из подписей проекта */
var cap=String(job.caption||'').trim();if(!cap)return NOPROJ;
var list=(typeof projects!=='undefined'&&projects)||[],hit=null;
list.forEach(function(p){
(p.captions||[]).forEach(function(c){
if(c&&cap.indexOf(String(c).trim())===0){if(!hit||(p.yappyOn&&!hit.yappyOn))hit=p}
});
});
return hit?hit.name:NOPROJ;
}

function add(res,proj,net,ok,day){
var p=res[proj]||(res[proj]={nets:{},days:{}});
var n=p.nets[net]||(p.nets[net]={ok:0,err:0});
if(ok){n.ok++;p.days[day]=(p.days[day]||0)+1}else n.err++;
}

async function compute(){
var msg=$q('#psMsg');
var from=$q('#psFrom').value,to=$q('#psTo').value;
if(!from||!to){msg.className='msg';msg.textContent='Выбери период: обе даты.';return}
if(to<from){msg.className='msg st-err';msg.textContent='Дата «по» раньше даты «с».';return}
if(!token()){msg.className='msg';msg.textContent='Сначала вставь токен на вкладке «Доступ».';return}
var go=$q('#psGo');go.disabled=true;msg.className='msg';msg.textContent='Считаю…';
var res={},yNote='';
try{
for(var page=1;page<=80;page++){
msg.textContent='Считаю… загружено страниц списка: '+(page-1);
var j=await apiRetry('/posts?is_published=1&limit=100&page='+page);
var list=j.list||[];if(!list.length)break;
list.forEach(function(p){
var d=p.publication_date||{};
var ts=d.source_timestamp>0?d.source_timestamp:(d.timestamp>0?d.timestamp:0);
if(!ts)return;
var day=iso(new Date(ts*1000));
if(day<from||day>to)return;
var names=(p.post_projects||[]).map(function(x){return x.name});
if(!names.length)names=[NOPROJ];
var errs={};(p.errors_for_source_ids||[]).forEach(function(s){errs[Number(s)]=1});
(p.pages||[]).forEach(function(pg){
var net=NET[Number(pg.source_id)];if(!net)return;
names.forEach(function(nm){add(res,nm,net,!errs[Number(pg.source_id)],day)});
});
});
if(!j.is_has_more)break;
}
/* Яппи: из расширения (только аккаунт, открытый в этом браузере) */
try{
var yl=await yappyBridge({type:'list'},4000);
(yl.jobs||[]).forEach(function(job){
if(job.state!=='ok')return;
var t=job.doneAt||job.when;if(!t)return;
var day=iso(new Date(t));if(day<from||day>to)return;
add(res,projectOfJob(job),'Яппи',true,day);
});
yNote=' Яппи посчитан по расширению: только аккаунт, который открыт в этом браузере.';
}catch(e){yNote=' Яппи не посчитан: расширение не отвечает (включи его в Chrome и обнови страницу).'}
}catch(e){
msg.className='msg st-err';msg.textContent='Не вышло: '+e.message;go.disabled=false;return;
}
go.disabled=false;
result={res:res,from:from,to:to,yNote:yNote};
lsSet('psSel',{from:from,to:to});
/* список проектов в фильтре */
var sel=$q('#psProj'),keep=sel.value;
var names=Object.keys(res).sort();
sel.innerHTML='<option value="">Все проекты (по отдельности)</option>'+names.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join('');
if(keep&&names.indexOf(keep)>=0)sel.value=keep;
render();
}

function render(){
if(!result)return;
var msg=$q('#psMsg'),box=$q('#psProjects'),res=result.res;
var proj=$q('#psProj').value;
var names=Object.keys(res).sort(function(a,b){if(a===NOPROJ)return 1;if(b===NOPROJ)return -1;return a.localeCompare(b,'ru')});
if(proj)names=names.filter(function(n){return n===proj});
msg.className='msg';
msg.textContent='Период: '+dmy(result.from)+' — '+dmy(result.to)+'. Каждый проект посчитан отдельно.';
if(!names.length){box.innerHTML='<div class="card"><div class="cap">За этот период видео не выходило.</div></div>';$q('#psNote').textContent=result.yNote.trim();return}
box.innerHTML=names.map(function(n){
var p=res[n],total=0,errs=0;
var rows=ORDER.map(function(net){
var c=p.nets[net]||{ok:0,err:0};total+=c.ok;errs+=c.err;
return '<tr><td>'+esc(net)+'</td><td><b>'+c.ok+'</b></td><td class="'+(c.err?'st-err':'cap')+'">'+(c.err||'—')+'</td></tr>';
}).join('');
var days=Object.keys(p.days).sort().reverse().map(function(d){return '<tr><td>'+esc(dmy(d))+'</td><td>'+p.days[d]+'</td></tr>'}).join('');
return '<div class="card"><h2>'+esc(n)+'</h2>'+
'<div class="cap" style="margin-bottom:6px">Всего публикаций: <b style="color:var(--ink)">'+total+'</b>'+(errs?' · с ошибкой: <span class="st-err">'+errs+'</span>':'')+'</div>'+
'<table><thead><tr><th>Соцсеть</th><th>Видео</th><th>Ошибок</th></tr></thead><tbody>'+rows+'</tbody></table>'+
(days?'<details style="margin-top:10px"><summary class="cap" style="cursor:pointer">По дням</summary><table><thead><tr><th>День</th><th>Публикаций</th></tr></thead><tbody>'+days+'</tbody></table></details>':'')+
'</div>';
}).join('');
$q('#psNote').textContent='Публикация — один выход видео на одну страницу соцсети (так считает и Хуппи). Считаются только вышедшие без ошибки.'+result.yNote;
}

card.querySelectorAll('[data-ps]').forEach(function(b){b.onclick=function(){setRange(b.dataset.ps);compute()}});
$q('#psGo').onclick=compute;
$q('#psProj').onchange=render;
var sv=lsGet('psSel',null);
if(sv&&sv.from&&sv.to){$q('#psFrom').value=sv.from;$q('#psTo').value=sv.to}else setRange('7');
})();

/* Слежка и ручной перенос: если ты сама передвинула пост в Хуппи на другое время,
   Заливатор подхватывает новое время и не пищит. Сигнал остаётся только для постов,
   которые стоят на своём времени и всё равно не вышли. */
(function () {
  if (typeof window.checkWatch !== 'function') return;
  var orig = window.checkWatch;
  window.checkWatch = async function (w, final) {
    try {
      var e = await api('/posts/' + w.postId + '/edit');
      var d = e && e.publication_date;
      if (e && Number(e.publication_when_type) === 2 && d && d.date) {
        var p = String(d.date).split('.');
        var t = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]), Number(d.hours), Number(d.minutes)).getTime();
        if (t && Math.abs(t - w.at) > 2 * 60000 && t > Date.now() - 60000) {
          w.at = t; w.k = 0; w.st = {}; w.fail = {}; w.state = 'watch';
          w.note = 'время перенесено в Хуппи — слежу по новому';
          return;
        }
      }
    } catch (err) { if (err && err.status === 401) throw err; }
    return orig(w, final);
  };
  /* уже поднятые сигналы «за час не подтвердилась» перепроверяем: возможно, пост просто перенесли */
  try {
    watch.forEach(function (w) {
      if (w.state === 'alarm' && String(w.note || '').indexOf('не подтвердилась') >= 0) { w.state = 'watch'; w.k = 0; w.st = {}; w.fail = {}; w.note = ''; }
    });
    if (typeof saveWatch === 'function') saveWatch();
    if (typeof renderWatch === 'function') renderWatch();
  } catch (err) {}
})();

/* быстрая перевыкладка на постоянные ошибки (не ждать 3 проверки) */
(function () {
  if (typeof window.checkWatch !== 'function') return;
  var prev = window.checkWatch;
  var PERM = /Too long encoding|storeShort/i;
  window.checkWatch = async function (w, final) {
    await prev(w, final);
    try {
      if (w.state !== 'watch' || typeof window.repost !== 'function') return;
      if (!PERM.test(String(w.errText || ''))) return;
      var failing = Object.keys(w.st).filter(function (k) { return w.st[k] === 'err' && (w.fail[k] || 0) >= 1; });
      if (failing.length) await window.repost(w, failing);
    } catch (err) { if (err && err.status === 401) throw err; }
  };
})();
