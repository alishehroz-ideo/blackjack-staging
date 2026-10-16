import {CONFIG as C} from './config.mjs';import{create,place,finish,value}from'./engine.mjs';import{POOL}from'./pool.mjs';import{setSound,startMusic,stopMusic,fx}from'./audio.mjs';
const $=s=>document.querySelector(s),app=$('#app'),suits=['♥','♦','♣','♠'],ranks=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];let g,start,mode='home',timer,busy=false,muted=false,remote=false,token,clockBase=0;
const n=x=>Math.round(x||0).toLocaleString('ja-JP');
function card(c){const xs=[56,206,356,506,657,807,957,1107,1257,1407,1558,1708,1858],ys=[410,892,651,170];const x=xs[c.r-1],y=ys[c.s];return `<div class="card heritage-card" role="img" aria-label="${suits[c.s]}${ranks[c.r]}"><span class="heritage-face" style="background-position:${x/(2048-135)*100}% ${y/(1169-190)*100}%"></span></div>`}
function notice(t){$('#notice').textContent=t;$('#notice').classList.add('show');clearTimeout(notice.id);notice.id=setTimeout(()=>$('#notice').classList.remove('show'),2100)}
async function api(path,data){const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const r=await response.json();if(!response.ok)throw Error(r.error||'通信できませんでした');return r}
function localBest(){try{return Number(localStorage.getItem('royal21-best-v1'))||0}catch{return 0}}
function home(){document.body.classList.remove('result-view','end-view');document.body.classList.add('home-view');mode='home';stopMusic();clearInterval(timer);app.innerHTML=`<section class="hero"><span class="eyebrow">THE ROYAL CARD COLLECTION</span><h1>21<span>BLACKJACK</span></h1><h2>ブラックジャック</h2><div class="hero-art">${card({r:1,s:3})}${card({r:10,s:0})}</div><p>ひとつの判断。つながる快感。<br>4つの列で、最高の21を。</p><div class="chips"><span>3分チャレンジ</span><span>4レーン</span><span>コンボ最大5倍</span></div><button class="primary" id="play">ゲームスタート <span>▸</span></button><div class="home-subtitle">ブラックジャック</div><div class="home-sparkles" aria-hidden="true">✦<i>✧</i><b>✦</b></div><p class="best">この端末のベスト<b>${n(localBest())} pt</b></p><p class="mode-note">${remote?'サーバー検証モード':'試遊モード · 得点はこの端末に保存'}</p></section>`;$('#play').onclick=begin;}
$('#close').onclick=()=>$('#help').close();$('#home').onclick=e=>{e.preventDefault();if(mode==='home'||mode==='result')home();else notice('プレイ終了後に戻れます')};$('#sound').onclick=async()=>{muted=!muted;await setSound(!muted);$('#sound').innerHTML=`♪<small>${muted?'OFF':'ON'}</small>`;$('#sound').setAttribute('aria-label',muted?'音をオンにする':'音をオフにする');if(mode==='playing'&&!muted)startMusic()};
async function begin(){if(busy)return;busy=true;if(!muted)await setSound(true);$('#play').disabled=true;try{if(remote){const r=await api('start',{});token=r.token;g=r.state;clockBase=r.elapsed}else{const random=new Uint32Array(1);crypto.getRandomValues(random);let pool=POOL;try{pool=POOL.filter(s=>s!==localStorage.getItem('royal21-last'));}catch{}const seed=pool[Math.floor(random[0]/4294967296*pool.length)];g=create(seed);try{localStorage.setItem('royal21-last',seed)}catch{}clockBase=0}start=performance.now();mode='playing';document.body.classList.remove('home-view','result-view','end-view');busy=false;render();startMusic();timer=setInterval(tick,80);window.scrollTo(0,0)}catch(e){busy=false;notice(e.message);$('#play').disabled=false}}
const elapsed=()=>Math.min(C.duration,clockBase+performance.now()-start);
function current(){return remote?g.current:g.deck[g.index]}
function render(){app.innerHTML=`<div class="topline"><h1>21 <span class="eyebrow">BLACKJACK</span></h1><span class="eyebrow">ROYAL CHALLENGE</span></div><section class="stats"><div><small>SCORE</small><strong>${n(g.score)}</strong></div><div><small>TIME LEFT</small><strong id="clock">3:00</strong></div><div><small>LIFE</small><div class="lives" aria-label="残り${C.maxBusts-g.busts}回">${'♥'.repeat(C.maxBusts-g.busts)}${'♡'.repeat(g.busts)}</div></div></section><div class="timer"><i id="timebar"></i></div><div class="combo" id="combo"><small id="comboText">連続消去でスコアアップ</small><b id="comboValue">×1</b></div><div class="lanes">${g.lanes.map((lane,i)=>`<button class="lane" data-lane="${i}" aria-label="レーン${i+1} 合計${value(lane)} ${lane.length}枚"><span class="lane-label">LANE 0${i+1}</span><span class="lane-total">${value(lane)} <em>/ 21</em></span><div class="stack">${lane.length?lane.map((c,j)=>card(c).replace('class="card','style="top:'+j*24+'px" class="card')).join(''):'<span class="lane-empty">♧</span>'}</div><span class="dots">${'●'.repeat(lane.length)}${'○'.repeat(5-lane.length)}</span></button>`).join('')}</div><div class="deal"><div class="stock-wrap"><div class="stock">♛</div><small>残り ${52-g.index} 枚</small></div><span class="arrow">→</span><div id="current" draggable="true">${current()?card(current()):''}<div class="current-label">このカードを置く</div></div></div><p class="hint">置きたいレーンをタップ</p>`;app.querySelectorAll('[data-lane]').forEach(el=>{el.onclick=()=>play(Number(el.dataset.lane));el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();play(Number(el.dataset.lane))}});$('#current').ondragstart=e=>e.dataTransfer.setData('text/plain','current');$('#current').onpointerdown=e=>{if(e.pointerType==='touch'){const origin={x:e.clientX,y:e.clientY};const end=ev=>{const lane=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-lane]');if(lane&&Math.hypot(ev.clientX-origin.x,ev.clientY-origin.y)>15)play(Number(lane.dataset.lane));document.removeEventListener('pointerup',end)};document.addEventListener('pointerup',end,{once:true})}};tick()}
async function play(lane){if(busy||mode!=='playing')return;busy=true;try{if(remote){const r=await api('move',{token,lane,expected:g.index});g=r.state;clockBase=r.elapsed;start=performance.now()}else g=place(g,lane,elapsed());const event=g.event;fx(event?.mult>1?'combo':event?.kind||'place');if(g.done){end();return}render();const el=app.querySelector(`[data-lane="${lane}"]`);if(event?.kind!=='place'){el.classList.add(event.kind==='bust'?'bustflash':'flash');notice(event.kind==='bust'?'ミス！ 残り'+(3-g.busts)+'回':({blackjack:'BLACKJACK',twentyOne:'JUST 21',charlie:'5 CARDS'}[event.kind])+`  +${n(event.gain)} pt`)} }catch(e){notice('通信を確認しています');if(remote){try{const r=await api('state',{token});g=r.state;clockBase=r.elapsed;start=performance.now();if(g.done)end();else render()}catch{notice('通信できません。復旧後にもう一度タップしてください。')}}}finally{busy=false}}
async function tick(){if(mode!=='playing')return;let t=elapsed(),left=Math.max(0,Math.ceil((C.duration-t)/1000));if($('#clock')){$('#clock').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');$('#timebar').style.width=((C.duration-t)/C.duration*100)+'%';const active=g.lastClear!==null&&t-g.lastClear<=C.comboWindow;$('#combo').classList.toggle('active',active);$('#comboText').textContent=active?'次の消去まで '+Math.max(0,(C.comboWindow-(t-g.lastClear))/1000).toFixed(1)+' 秒':'連続消去でスコアアップ';$('#comboValue').textContent=active?'NEXT ×'+C.multipliers[Math.min(3,g.combo)]:'×1'}if(t>=C.duration&&!busy){busy=true;try{if(remote){const r=await api('state',{token});g=r.state;if(!g.done){clockBase=r.elapsed;start=performance.now();return}}else g=finish(g,C.duration);end()}catch{notice('結果を確認中です。通信を確認してください。')}finally{busy=false}}}
function end(){if(mode!=='playing')return;mode='ending';document.body.classList.add('end-view');clearTimeout(notice.id);document.getElementById("notice").classList.remove('show');clearInterval(timer);stopMusic();fx(g.reason==='deck'?'complete':'end');$('#help').close();app.innerHTML=`<section class="ending ${g.reason==='deck'?'deck-finished':'game-finished'}"><div class="crest">♛</div><span class="eyebrow">ROYAL TWENTY ONE</span><h1>${g.reason==='deck'?'DECK COMPLETE':'GAME OVER'}</h1><p>${g.reason==='deck'?'52枚のチャレンジ完了':g.reason==='bust'?'3回ミスしました':'制限時間が終了しました'}</p><p>スコアを集計しています</p></section>`;setTimeout(result,1500)}
function result(){document.body.classList.remove('end-view');document.body.classList.add('result-view');mode='result';try{localStorage.setItem('royal21-best-v1',Math.max(localBest(),g.total));localStorage.setItem('royal21-last-result',JSON.stringify({score:g.total,reason:g.reason,date:new Date().toISOString()}))}catch{}app.innerHTML=`<section class="result"><div class="result-brand"><div class="crest">♛</div><strong>21</strong><span>BLACKJACK</span><i>✦</i></div><span class="eyebrow">YOUR CHALLENGE RESULT</span><h1>スコア</h1><div class="result-total">${n(g.total)} <small>pt</small></div><div class="result-summary"><span>使用カード<b>${g.index}/52</b></span><span>最大コンボ<b>${g.maxCombo}回</b></span><span>ミス<b>${g.busts}回</b></span></div><dl>${[['カードを置いた得点',g.points.placement],['カードを消した得点',g.points.clear],['コンボ',g.points.combo],['残り時間ボーナス',g.timeBonus]].map(([k,v])=>`<div><dt>${k}</dt><dd>${n(v)} pt</dd></div>`).join('')}</dl><p class="subtitle">BLACKJACK ${g.counts.blackjack} · JUST 21 ${g.counts.twentyOne} · 5 CARDS ${g.counts.charlie}</p><button class="primary" id="play">スコア登録</button></section>`;$('#play').onclick=()=>{try{localStorage.setItem('royal21-registered-score',JSON.stringify({score:g.total,date:new Date().toISOString()}));$('#play').textContent='登録しました';$('#play').disabled=true}catch{notice('保存できませんでした。もう一度お試しください')}};window.scrollTo(0,0)}

// ---- GameBull hooks (gamebull/client-hooks.mjs) ----
// Appended to the client's dist/app.mjs at build time by vite.gamebull.config.ts (their file in dist/ is never
// edited). It runs in the same module scope as their code, so their functions (begin, tick, play, end, result) are
// module bindings this block can wrap, and their `let`s (g, start, mode, timer, busy, muted, clockBase) are shared.
// The build drops their last statement `home();fetch('/api/health')...` (their TOP page with its key art, and the
// probe for their test server, which a static host does not have: their own static build runs the same "trial
// mode"). __gbPark() below is their home() without the TOP page markup, because the GameBull lobby replaces it and
// the GameBull board replaces their score page.
// The GameBull shell (main.tsx, another module) only talks to window.BJClient.
import {replay as __gbReplay,classify as __gbClassify} from './engine.mjs';

const __gbHooks={onLock:null,onZero:null,onEnd:null}; // set by the shell
let __gbRunMs=C.duration; // the run's length (the client's 180 s, or a challenge limit)
let __gbHeld=false;       // Score Challenge: board dealt, frozen under the 5..1 GO intro
let __gbTarget=0;         // Score Challenge target (early finish), 0 = none
let __gbLocked=false;     // input locked: target reached / clock at 0 / run over
let __gbZero=false;       // the 0.7 s zero hold has started
let __gbZeroDone=false;   // ...and is over: their own timeout runs
let __gbEnded=false;      // the end has been handed to the shell (once per run)
let __gbLog=[];           // the run's moves {lane, at}, for their replay() check
let __gbSoundOk=false;    // their AudioContext has been resumed in this run (see __gbAudioTap)

// A run shorter than the client's 180 s starts with the difference already used, so their own clock, timer bar,
// combo window and time bonus (remaining whole seconds x 5, deck complete only) need no change.
const __gbOffsetMs=()=>Math.max(0,C.duration-__gbRunMs);
const __gbLive=()=>mode==='playing'&&!__gbHeld&&!__gbLocked;

// Their home() without the TOP page (key art, START button, local best): music off, no clock, page empty.
function __gbPark(){document.body.classList.remove('result-view','end-view');document.body.classList.add('home-view');mode='home';busy=false;stopMusic();clearInterval(timer);clearTimeout(notice.id);$('#notice').classList.remove('show');window.scrollTo(0,0);app.innerHTML='<button id="play" hidden></button>'}

// Their sound, started the way their own code starts it: setSound(true) (create + resume their AudioContext), then
// their music. Their begin() awaits setSound(true); on an iPhone, outside a tap, that resume never settles and their
// begin() would never deal. So the shell runs their begin() with the sound step skipped and starts the sound here:
// right away (fine wherever the browser counts the earlier tap) and again on the player's next tap in the run.
function __gbStartSound(why){
 if(muted||mode!=='playing')return;
 setSound(true).then(()=>{
  if(__gbSoundOk||muted||mode!=='playing')return;
  __gbSoundOk=true;startMusic();
  console.log('[BJ-GB] Client sound running ('+why+'): their music and effects.');
 }).catch(()=>{});
}

const __gbBegin=begin;
begin=async function(){
 const m=muted;muted=true;            // skip their `await setSound(true)` (see __gbStartSound)
 try{await __gbBegin()}finally{muted=m}
 if(mode!=='playing')return;
 start=performance.now()-__gbOffsetMs();__gbLog=[];tick();
 __gbStartSound('run start');
 console.log('[BJ-GB] Client deal '+g.seed+' started: '+Math.round(__gbRunMs/1000)+' s on the clock'+(__gbHeld?' (held for the intro).':'.'));
};

// While held, the clock stays full. At 0: lock, hold "0" for 0.7 s (the shell's countdown), then their own timeout.
const __gbTick=tick;
tick=async function(){
 if(mode==='playing'){
  if(__gbHeld)start=performance.now()-__gbOffsetMs();
  else if(!__gbZeroDone&&elapsed()>=C.duration){
   if(__gbZero)return;
   __gbZero=true;__gbLocked=true;__gbHooks.onLock?.('clock');
   if(__gbHooks.onZero){__gbHooks.onZero(()=>{__gbZeroDone=true;__gbTick()});return}
   __gbZeroDone=true;
  }
 }
 return __gbTick();
};

function __gbCheckTarget(){
 if(__gbTarget<=0||!__gbLive()||g.done||g.score<__gbTarget)return;
 __gbLocked=true;
 console.log('[BJ-GB] Challenge target '+__gbTarget+' reached at '+g.score+'; ending in 0.9 s.');
 // If the clock ran out during the beat, their own timeout has ended the run already.
 setTimeout(()=>{if(mode!=='playing'||g.done)return;g=finish(g,elapsed(),'target');__gbEndTarget()},900);
}
// Target reached: no "GAME OVER" picture (their end picture is for time up / 3 misses / deck complete); their end()
// steps without it, then straight to the board.
function __gbEndTarget(){
 mode='ending';__gbHooks.onLock?.('target');clearTimeout(notice.id);$('#notice').classList.remove('show');
 clearInterval(timer);stopMusic();fx('complete');$('#help').close();result();
}

const __gbPlay=play;
play=async function(lane){
 // Nothing scores after the end: input is locked under the intro, after the target, and from the clock's 0 on
 // (a tap in the 80 ms before their tick notices the 0 is refused here too).
 if(!__gbLive()||elapsed()>=C.duration)return;
 const i=g.index;
 await __gbPlay(lane);
 if(g.index>i&&g.event)__gbLog.push({lane:g.event.lane,at:g.event.at});
 __gbCheckTarget();
};

const __gbEndFn=end;
end=function(){
 if(mode!=='playing')return;
 __gbLocked=true;__gbHooks.onLock?.(g.reason);
 return __gbEndFn();
};

// Their score page is replaced by the GameBull board: their result() hands the shell the numbers their score page
// shows (g.points, g.timeBonus, g.total), after their own replay() has re-played the run's moves.
const __gbResult=result;
result=function(){
 if(__gbEnded)return;
 if(!__gbHooks.onEnd)return __gbResult();
 __gbEnded=true;mode='result';
 let check;
 try{const v=__gbReplay(g.seed,__gbLog,g.reason==='timeout'?C.duration:0),t=v.done?v.total:v.score;check=t===g.total?'replay ok':'REPLAY MISMATCH '+t}catch(e){check='replay failed: '+e.message}
 const f={reason:g.reason,total:g.total,placement:g.points.placement,clear:g.points.clear,combo:g.points.combo,timeBonus:g.timeBonus||0,
  cards:g.index,blackjack:g.counts.blackjack,twentyOne:g.counts.twentyOne,charlie:g.counts.charlie,maxCombo:g.maxCombo,busts:g.busts,
  secondsLeft:g.reason==='deck'?Math.floor((C.duration-g.elapsed)/1000):0,elapsed:g.elapsed,seed:g.seed,moves:__gbLog.length,check};
 console.log('[BJ-GB] Client run end \''+g.reason+'\': cards '+f.cards+'/52, BLACKJACK '+f.blackjack+' · JUST 21 '+f.twentyOne+' · 5 CARDS '+f.charlie+', max combo '+f.maxCombo+', misses '+f.busts+', client score '+f.total+' ('+check+', '+f.moves+' moves, deal '+g.seed+').');
 __gbHooks.onEnd(f);
};

// iPhone / Safari: sound may only start inside a tap, and Safari (unlike Chrome) does not count an earlier tap.
// On their own site begin() runs inside the START tap; here the shell calls it after a server call, so on an iPhone
// their AudioContext stays suspended (no music, no effects; and without their music, older iPhones also put the
// GameBull countdown ticks under the silent switch). So on the player's taps during a run, start their sound exactly
// as their own code does (setSound(true), then their music), if their sound is on.
function __gbAudioTap(){
 if(muted||mode!=='playing'||__gbSoundOk)return;
 __gbStartSound('a tap in the run');
}
for(const t of ['touchend','pointerup','click','keydown'])document.addEventListener(t,__gbAudioTap,{capture:true,passive:true});

window.BJClient={
 hooks:__gbHooks,
 // Under the lobby: their TOP state without the TOP page (music off, no clock).
 park(){__gbPark()},
 // A run = their own START (begin(): a random deal from their 100-deal pool, never the previous one, music), then
 // the GameBull run length.
 async start(runMs,target,hold){
  __gbRunMs=runMs;__gbTarget=target||0;__gbHeld=!!hold;__gbLocked=false;__gbZero=false;__gbZeroDone=false;__gbEnded=false;__gbLog=[];__gbSoundOk=false;
  __gbPark();await begin();
 },
 go(){__gbHeld=false;if(mode==='playing'){start=performance.now()-__gbOffsetMs();tick()}},
 // The client's live HUD score (their SCORE panel: placement + clears + combo; the time bonus comes at the end).
 totalScore(){return g&&(mode==='playing'||mode==='ending'||mode==='result')?(g.total??g.score):0},
 remaining(){return mode==='playing'?Math.max(0,(C.duration-elapsed())/1000):0},
 isRunning(){return __gbLive()},
 muted(){return muted},
 // Localhost autoplay only (gamebull/ui/DevAuto.tsx): 1 = their own pool bot's choice (tools/build-pool.mjs:
 // the lane that clears, else the safest), 2 = always lane 1 (fast misses: the 3-miss end). Every move goes
 // through their own play(), so their rules decide everything.
 autoStep(how){
  if(!__gbLive()||busy)return;
  if(how==='2'){play(0);return}
  const c=g.deck[g.index];let best=-Infinity,lane=0;
  for(let k=0;k<4;k++){const p=[...g.lanes[k],c],kind=__gbClassify(p),v=value(p);
   let merit=kind==='bust'?-10000:kind?({blackjack:600,twentyOne:400,charlie:500}[kind]*3):p.length*20+(v<=11?30:0)-Math.abs(21-v)*2;
   if(!g.lanes[k].length)merit-=15;if(merit>best){best=merit;lane=k}}
  play(lane);
 },
};
window.dispatchEvent(new Event('bjclient-ready'));
