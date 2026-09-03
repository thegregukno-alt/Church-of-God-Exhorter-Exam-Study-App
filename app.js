(() => {
'use strict';
const BANK = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
const KEY='exhorter-gh-v1';
const $=id=>document.getElementById(id);
let state={stats:{},missed:[],flags:[],exams:[]};
try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
let session=null;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const normalize=s=>String(s??'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function stat(q){return state.stats[q.id]||(state.stats[q.id]={seen:0,right:0,wrong:0})}
function show(which){['home','session','results'].forEach(id=>$(id).classList.toggle('hidden',id!==which))}
function renderHome(){
 $('bankStatus').textContent=BANK.length===648?'648 verified study items loaded':`ERROR: expected 648 items, loaded ${BANK.length}`;
 const vals=Object.values(state.stats);$('studied').textContent=vals.filter(x=>x.seen>0).length;$('mastered').textContent=vals.filter(x=>x.right>=3&&x.right>x.wrong).length;$('avg').textContent=state.exams.length?Math.round(state.exams.reduce((n,e)=>n+e.pct,0)/state.exams.length)+'%':'—';
 const cats=[...new Set(BANK.map(q=>q.category))];$('categories').innerHTML=cats.map(c=>`<button class="card cat" data-cat="${esc(c)}"><b>${esc(c)}</b><span>${BANK.filter(q=>q.category===c).length} items</span></button>`).join('');document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>startStudy(BANK.filter(q=>q.category===b.dataset.cat),b.dataset.cat));
}
function distractors(q){let pool=shuffle(BANK.filter(x=>x.id!==q.id&&x.category===q.category&&normalize(x.answer)!==normalize(q.answer)));if(pool.length<3)pool=shuffle(BANK.filter(x=>x.id!==q.id&&normalize(x.answer)!==normalize(q.answer)));let out=[];for(const x of pool){const a=normalize(x.answer);if(a&&!out.includes(a)){out.push(a);if(out.length===3)break}}return shuffle([normalize(q.answer),...out])}
function startExam(n){if(BANK.length!==648)return alert('The full question bank did not load.');const list=shuffle(BANK).slice(0,n).map(q=>({...q,choices:distractors(q)}));session={type:'exam',title:`${n}-Question Exam`,list,i:0,answers:new Array(list.length).fill(null)};show('session');renderQuestion()}
function startStudy(pool,title){if(!pool.length)return alert('There are no questions in this list yet.');session={type:'study',title,list:shuffle(pool).slice(0,Math.min(50,pool.length)),i:0};show('session');renderQuestion()}
function renderQuestion(){const q=session.list[session.i];if(!q)return finish();$('mode').textContent=session.title;$('counter').textContent=`${session.i+1} / ${session.list.length}`;$('progressFill').style.width=`${(session.i/session.list.length)*100}%`;$('question').textContent=q.question;$('source').textContent=`${q.section} • printed page ${q.page} • item ${q.number}`;$('choices').innerHTML='';$('studyControls').classList.toggle('hidden',session.type!=='study');$('answer').classList.add('hidden');$('grade').classList.add('hidden');$('reveal').classList.remove('hidden');$('next').classList.toggle('hidden',session.type!=='exam');$('flag').textContent=state.flags.includes(q.id)?'★':'☆';
 if(session.type==='exam'){const sel=session.answers[session.i];$('choices').innerHTML=q.choices.map((a,i)=>`<button class="choice${sel===i?' selected':''}" data-i="${i}">${esc(a)}</button>`).join('');document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{session.answers[session.i]=Number(b.dataset.i);renderQuestion()});$('next').textContent=session.i===session.list.length-1?'Finish Exam':'Next Question';}
}
function next(){if(session.answers[session.i]===null)return alert('Choose an answer before continuing.');session.i++;session.i>=session.list.length?finish():renderQuestion()}
function reveal(){const q=session.list[session.i];$('answer').innerHTML=`<b>Correct answer:</b><br>${esc(q.answer)}`;$('answer').classList.remove('hidden');$('grade').classList.remove('hidden');$('reveal').classList.add('hidden')}
function selfGrade(ok){const q=session.list[session.i],s=stat(q);s.seen++;if(ok)s.right++;else{s.wrong++;if(!state.missed.includes(q.id))state.missed.push(q.id)}save();session.i++;session.i>=session.list.length?show('home'):renderQuestion();renderHome()}
function finish(){if(session.type!=='exam'){show('home');return}let right=0,by={};session.list.forEach((q,i)=>{const chosen=q.choices[session.answers[i]],ok=normalize(chosen)===normalize(q.answer);if(ok)right++;const s=stat(q);s.seen++;ok?s.right++:s.wrong++;if(!ok&&!state.missed.includes(q.id))state.missed.push(q.id);by[q.category]||={r:0,t:0};by[q.category].t++;if(ok)by[q.category].r++});const total=session.list.length,pct=Math.round(right/total*100);state.exams.push({pct,right,total,date:Date.now()});state.exams=state.exams.slice(-30);save();$('score').textContent=pct+'%';$('scoreText').textContent=`${right} of ${total} correct`;$('breakdown').innerHTML=Object.entries(by).map(([k,v])=>`<div class="break"><b>${esc(k)}</b><div>${v.r} / ${v.t} correct</div></div>`).join('');show('results');renderHome()}
function toggleFlag(){const q=session?.list?.[session.i];if(!q)return;const i=state.flags.indexOf(q.id);i>=0?state.flags.splice(i,1):state.flags.push(q.id);save();$('flag').textContent=state.flags.includes(q.id)?'★':'☆'}
document.querySelectorAll('[data-exam]').forEach(b=>b.onclick=()=>startExam(Number(b.dataset.exam)));$('studyAll').onclick=()=>startStudy(BANK,'Study All');$('missed').onclick=()=>startStudy(BANK.filter(q=>state.missed.includes(q.id)),'Missed Questions');$('scripture').onclick=()=>startStudy(BANK.filter(q=>q.section.includes('Scripture References')),'Scripture Memory');$('flagged').onclick=()=>startStudy(BANK.filter(q=>state.flags.includes(q.id)),'Flagged Questions');$('back').onclick=()=>{show('home');renderHome()};$('resultsHome').onclick=()=>{show('home');renderHome()};$('flag').onclick=toggleFlag;$('reveal').onclick=reveal;$('knew').onclick=()=>selfGrade(true);$('didnt').onclick=()=>selfGrade(false);$('next').onclick=next;$('again').onclick=()=>startExam(50);$('reviewMissed').onclick=()=>startStudy(BANK.filter(q=>state.missed.includes(q.id)),'Missed Questions');$('reset').onclick=()=>{if(confirm('Reset all saved progress on this device?')){state={stats:{},missed:[],flags:[],exams:[]};save();renderHome()}};
renderHome();
})();
