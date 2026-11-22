'use strict';
/* Tg Roulette — single player. Длительности и позиции анимаций — как в оригинале. */
(function () {
  const DOC = document;
  const $ = (id) => DOC.getElementById(id);
  const ABORT = Symbol('abort');
  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  const IMG = {
    bg:'data/background.png', dark:'data/dark.png', end:'data/end_credits.png', ggs:'data/ggs.png',
    hp:'data/hp.png', light:'data/light.png', opponent:'data/opponent.jpg', other:'data/other.gif',
    self:'data/self.gif', menu:'data/start_menu.png', still:'data/still.png', wound:'data/wound.gif',
    selfBlank:'data/self_blank.gif', gear:'data/gear.svg',
    enemySelf:'data/enemy_self.gif', enemyStill:'data/enemy_still.png'
  };
  const SFX = {
    blank:'data/sounds/blank.ogg', button:'data/sounds/button.ogg', countdown:'data/sounds/countdown.ogg',
    game_over:'data/sounds/game_over.ogg', other:'data/sounds/other.ogg', put:'data/sounds/put.ogg',
    reload:'data/sounds/reload.ogg', self:'data/sounds/self.ogg', shake:'data/sounds/shake.ogg', vzuh:'data/sounds/vzuh.ogg'
  };
  const HP_BY_DIFF = { easy:5, normal:4, hard:3 };
  const SHELLS_PER_ROUND = 8;

  const S = {
    gen:0, phase:'boot', busy:true, over:false, menuOpen:false,
    turn:'self', holder:'self', shells:[], live:0, blank:0,
    hp:{player:4, ai:4}, maxHp:4, round:1, shots:0, loadedOnce:false,
    pendingWinner:null, lastAction:0, input:null,
    name:'Player', diff:'normal', muted:false, volume:.8, haptics:true, best:0
  };

  const store = {
    get(k, d){ try{ const v = localStorage.getItem('tgr_'+k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem('tgr_'+k, JSON.stringify(v)); }catch(e){} }
  };

  /* ---------- отменяемое время ---------- */
  const pending = new Set();
  const timeouts = new Set();
  function guard(gen){ if (gen !== S.gen) throw ABORT; }
  function later(fn, ms){ const id = setTimeout(()=>{ timeouts.delete(id); fn(); }, ms); timeouts.add(id); return id; }
  function delay(ms){
    return new Promise((resolve, reject)=>{
      let left = ms, last = performance.now(), done = false, raf = 0, wd = 0;
      const clean = ()=>{ cancelAnimationFrame(raf); clearTimeout(wd); pending.delete(cancel); };
      const finish = ()=>{ if(done) return; done = true; clean(); resolve(); };
      const cancel = ()=>{ if(done) return; done = true; clean(); reject(ABORT); };
      const tick = (now)=>{ const dt = now - last; last = now;
        if (!DOC.hidden) left -= dt;
        if (left <= 0) return finish();
        raf = requestAnimationFrame(tick); };
      const watchdog = ()=>{ if (DOC.hidden) wd = setTimeout(watchdog, 1000); else finish(); };
      pending.add(cancel);
      raf = requestAnimationFrame(tick);
      wd = setTimeout(watchdog, ms + 3000);
    });
  }
  async function wait(gen, ms){ await delay(ms); guard(gen); }
  async function anim(gen, el, frames, opts){
    if (!el || typeof el.animate !== 'function'){ await delay((opts.duration||0)*(opts.iterations||1)); guard(gen); return; }
    let a; try { a = el.animate(frames, opts); } catch(e){ await delay(opts.duration||0); guard(gen); return; }
    const cancel = ()=>{ try{ a.cancel(); }catch(e){} };
    pending.add(cancel);
    try { await a.finished; } catch(e){}
    pending.delete(cancel);
    guard(gen);
  }
  function bump(){
    S.gen++;
    const arr = [...pending]; pending.clear(); arr.forEach(f=>{ try{f();}catch(e){} });
    timeouts.forEach(clearTimeout); timeouts.clear();
    S.input = null;
  }
  function run(fn){ const gen = S.gen; Promise.resolve().then(()=>fn(gen)).catch(e=>{ if(e!==ABORT) console.error(e); }); }
  const other = (s)=> s === 'self' ? 'enemy' : 'self';

  /* ---------- telegram ---------- */
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  function haptic(kind){
    if (!S.haptics || !tg || !tg.HapticFeedback) return;
    try{
      if (kind==='light'||kind==='medium'||kind==='heavy') tg.HapticFeedback.impactOccurred(kind);
      else tg.HapticFeedback.notificationOccurred(kind);
    }catch(e){}
  }
  function applyViewport(){
    const h = (tg && tg.viewportStableHeight) ? tg.viewportStableHeight : window.innerHeight;
    const w = window.innerWidth;
    DOC.documentElement.style.setProperty('--u', (Math.min(w,h)/100)+'px');
    P.h = Math.min(w,h);
  }

  /* ---------- audio ---------- */
  const VOICES = {}; let ac = null, unlocked = false;
  function buildAudio(){
    Object.keys(SFX).forEach(k=>{
      const a = new Audio(SFX[k]); a.preload = 'auto';
      const b = new Audio(SFX[k]); b.preload = 'auto';
      VOICES[k] = { list:[a,b], i:0 };
    });
  }
  function sfx(name){
    const v = VOICES[name]; if (!v || S.muted || S.volume<=0) return;
    const a = v.list[v.i = (v.i+1) % v.list.length];
    try{ a.volume = S.volume; a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(()=>synth(name)); }
    catch(e){ synth(name); }
  }
  function synth(name){
    if (S.muted) return;
    try{
      ac = ac || new (window.AudioContext||window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
      const heavy = (name==='self'||name==='other'||name==='game_over');
      g.gain.setValueAtTime(S.volume*(heavy?.5:.22), t);
      g.gain.exponentialRampToValueAtTime(.0001, t+(heavy?.35:.12));
      if (heavy){
        const buf = ac.createBuffer(1, ac.sampleRate*.35, ac.sampleRate), d = buf.getChannelData(0);
        for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,2);
        const src = ac.createBufferSource(); src.buffer = buf; src.connect(g); src.start(t);
      } else {
        const o = ac.createOscillator(); o.type='square';
        o.frequency.setValueAtTime(name==='blank'?180:520, t);
        o.frequency.exponentialRampToValueAtTime(90, t+.12);
        o.connect(g); o.start(t); o.stop(t+.14);
      }
    }catch(e){}
  }
  function unlockAudio(){
    if (unlocked) return; unlocked = true;
    Object.keys(VOICES).forEach(k=>VOICES[k].list.forEach(a=>{
      try{ a.volume = 0; const p = a.play(); if (p && p.then) p.then(()=>{ a.pause(); a.currentTime = 0; a.volume = S.volume; }).catch(()=>{}); }catch(e){}
    }));
  }

  /* ---------- ui ---------- */
  let bannerT = 0;
  function banner(text, kind, ms){
    const el = $('banner');
    el.textContent = text; el.className = 'banner show ' + (kind||'');
    clearTimeout(bannerT);
    bannerT = setTimeout(()=>{ el.className = 'banner ' + (kind||''); }, ms||1300);
  }
  function canAct(){
    return !S.busy && S.phase==='player' && S.turn==='self' && !S.over &&
           !S.menuOpen && !DOC.hidden && S.shells.length>0 && !!S.input;
  }
  function setControls(){
    const ok = canAct();
    $('input_shield').classList.toggle('on', !ok);
    $('shoot_self').disabled = !ok;
    $('shoot_enemy').disabled = !ok;
    $('controls').classList.toggle('idle', !ok);
    $('settings_btn').disabled = S.busy && !S.over && S.phase!=='menu';
    const strip = $('turn_strip'), txt = $('turn_text');
    strip.className = 'turn_strip';
    if (S.phase==='player'){ txt.textContent = 'YOUR TURN — PICK A TARGET'; }
    else if (S.phase==='ai'){ strip.classList.add('foe'); txt.textContent = 'DEALER IS THINKING…'; }
    else if (S.phase==='reload'){ strip.classList.add('wait'); txt.textContent = 'RELOADING THE SHOTGUN'; }
    else if (S.phase==='handover'){ strip.classList.add('wait'); txt.textContent = 'PASSING THE SHOTGUN'; }
    else if (S.phase==='shot'){ strip.classList.add('wait'); txt.textContent = 'SHOT FIRED…'; }
    else { strip.classList.add('wait'); txt.textContent = 'STAND BY'; }
  }
  function buildHearts(){
    ['self_hearts','enemy_hearts'].forEach(id=>{
      const box = $(id); box.innerHTML = '';
      for (let i=0;i<S.maxHp;i++){
        const im = new Image(); im.src = IMG.hp; im.className = 'heart'; im.alt = '';
        box.appendChild(im);
      }
    });
    renderHearts();
  }
  function renderHearts(broken){
    [['self_hearts','player'],['enemy_hearts','ai']].forEach(([id,who])=>{
      const kids = $(id).children, alive = S.hp[who];
      for (let i=0;i<kids.length;i++){
        kids[i].classList.toggle('lost', i >= alive);
        if (broken===who && i===alive){
          kids[i].classList.add('breaking');
          later(()=>kids[i] && kids[i].classList.remove('breaking'), 360);
        }
      }
    });
  }
  function renderRound(){ $('round_num').textContent = S.round; }
  function flash(gold){
    const f = $('hit_flash');
    f.className = 'hit_flash' + (gold?' gold':'');
    void f.offsetWidth; f.classList.add('on');
    later(()=>{ f.className = 'hit_flash'; }, 340);
    if (!gold){
      const st = $('stage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake');
      later(()=>st.classList.remove('shake'), 260);
    }
  }
  function restartGif(el, src){ el.src = PIXEL; requestAnimationFrame(()=>{ el.src = src; }); }
  function dealerHit(){
    const w = $('wound'), av = $('avatar');
    w.classList.remove('hidden'); restartGif(w, IMG.wound);
    av.style.marginBottom = '6%';
    later(()=>{ av.style.marginBottom = '0'; }, 200);
    later(()=>{ w.classList.add('hidden'); }, 300);
    flash(true); haptic('medium');
  }
  function nudge(img){
    img.style.transform = 'translateY(5%)';
    later(()=>{ img.style.transform = ''; }, 300);
  }
  function damage(who){
    if (S.hp[who] <= 0) return;
    S.hp[who] = Math.max(0, S.hp[who]-1);
    renderHearts(who);
    if (who==='player'){ flash(false); haptic('heavy'); }
    if (S.hp[who] <= 0) S.pendingWinner = who==='player' ? 'ai' : 'player';
  }

  /* ---------- патроны ---------- */
  function makeShells(){
    const min = S.round >= 5 ? 3 : 2, max = S.round >= 3 ? 5 : 4;
    const live = min + Math.floor(Math.random()*(max-min+1));
    const arr = new Array(SHELLS_PER_ROUND).fill(false);
    for (let i=0;i<live;i++) arr[i] = true;
    return arr;
  }
  function shuffle(a){
    for (let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }
  function renderBox(arr){
    const box = $('box'); box.innerHTML = '';
    arr.forEach(v=>{
      const e = DOC.createElement('div'); e.className = 'element';
      const t = DOC.createElement('div'); t.className = 'bullet_top';
      const b = DOC.createElement('div'); b.className = v ? 'bottom-true' : 'bottom-false';
      e.appendChild(t); e.appendChild(b); box.appendChild(e);
    });
  }

  /* ---------- перезарядка (оригинальные тайминги и позы) ---------- */
  async function reloadRound(gen){
    S.phase = 'reload'; S.busy = true; setControls();
    banner('RELOADING', 'info', 1600);
    const img = $('image'), box = $('box');
    img.getAnimations && img.getAnimations().forEach(a=>a.cancel());
    box.getAnimations && box.getAnimations().forEach(a=>a.cancel());
    img.className = 'image'; img.style.cssText = ''; img.src = IMG.still;
    S.holder = 'self';

    const arr = makeShells();
    S.live = arr.filter(Boolean).length; S.blank = SHELLS_PER_ROUND - S.live;
    renderBox(arr); renderRound();
    box.style.opacity = '1';

    await anim(gen, img, [
      { transform:'translate(0, 0) rotate(0deg)' },
      { transform:'translate(100%, -50%) rotate(60deg)' }
    ], { duration:800, easing:'ease-in-out' });
    img.classList.add('reloading');

    await anim(gen, box, [
      { transform:'translate(-50%, -50%) rotate(0deg)' },
      { transform:'translate(50%, -50%) rotate(60deg)' }
    ], { duration:2000, easing:'ease-in-out', fill:'forwards' });

    box.innerHTML = ''; sfx('shake');
    await anim(gen, box, [
      { transform:'translate(50%, -50%) rotate(360deg)' },
      { transform:'translate(60%, -50%) rotate(400deg)' },
      { transform:'translate(50%, -50%) rotate(440deg)' },
      { transform:'translate(50%, -50%) rotate(400deg)' },
      { transform:'translate(50%, -50%) rotate(360deg)' }
    ], { duration:300, iterations:3, easing:'ease-in-out', fill:'forwards' });

    later(()=>sfx('put'), 800);
    const boxOut = anim(gen, box, [
      { transform:'translate(50%, -50%) rotate(360deg) scale(1)', opacity:1 },
      { transform:'translate(-100%, -50%) rotate(0deg) scale(0.2)', opacity:0 }
    ], { duration:1200, easing:'ease-in-out', fill:'forwards' }).catch(e=>{ if(e!==ABORT) throw e; });

    await anim(gen, img, [
      { transform:'translate(-100%, 110%) rotate(-90deg)' },
      { transform:'translate(200%, 110%) rotate(0deg)' }
    ], { duration:1000, easing:'ease-in-out' });
    img.style.transform = 'translate(100%, -50%) scale(1.1)';

    await anim(gen, img, [
      { transform:'translate(200%, 110%) rotate(360deg)' },
      { transform:'translate(-130%, 110%) rotate(-360deg)' }
    ], { duration:800, easing:'ease-in-out' });
    img.classList.remove('reloading');

    await boxOut; guard(gen);
    box.style.opacity = '0';

    await wait(gen, 400);
    img.style.cssText = '';
    await anim(gen, img, [
      { transform:'translate(100%, -20%) rotate(80deg)' },
      { transform:'translate(0, 0) rotate(0deg)' }
    ], { duration:400, easing:'ease-in-out' });

    S.shells = shuffle(arr);
  }

  /* ---------- передача дробовика ---------- */
  async function handoverTo(gen, target){
    if (S.holder === target) return;
    S.phase = 'handover'; S.busy = true; setControls();
    const img = $('image');
    img.style.transition = 'top 1200ms ease-in-out, right 1200ms ease-in-out, width 1200ms ease-in-out';
    img.classList.toggle('changed', target === 'enemy');
    await wait(gen, 600);
    img.src = target === 'enemy' ? IMG.enemyStill : IMG.still;
    S.holder = target;
    await wait(gen, 1000);
    img.style.transition = '';
  }

  /* ---------- ИИ ---------- */
  function aiChoose(){
    const n = S.shells.length; if (!n) return 'self';
    const p = S.live / n, aiHp = S.hp.ai, plHp = S.hp.player;
    if (S.diff === 'easy' && Math.random() < .3) return Math.random() < .5 ? 'self' : 'enemy';
    if (p === 0) return 'self';
    if (p === 1) return 'enemy';
    if (aiHp === 1) return 'enemy';
    if (plHp === 1 && p >= .34) return 'enemy';
    const tempo = S.diff === 'hard' ? 1.15 : .9;
    const risk  = aiHp <= 2 ? 1.7 : 1;
    return ((1-p)*tempo - p*risk) > (p * (plHp <= 2 ? 1.35 : 1)) ? 'self' : 'enemy';
  }

  /* ---------- выстрел: ассеты и позы как в оригинале ---------- */
  async function fire(gen, target){
    guard(gen);
    if (!S.shells.length) return;
    S.phase = 'shot'; S.busy = true; setControls();

    const isLive = S.shells.shift();
    S.shots++;
    if (isLive) S.live = Math.max(0, S.live-1); else S.blank = Math.max(0, S.blank-1);

    const holder = S.holder;
    const img = $('image');

    if (holder === 'self'){
      if (target === 'self'){
        if (isLive){
          img.src = IMG.self;                       // первый лицо, ствол в камеру
          await wait(gen, 2200);
          sfx('self');
          img.classList.add('expanded');            // ВЗРЫВ НА ВЕСЬ ЭКРАН
          damage('player'); banner('LIVE — YOU BLEED', 'bad');
          await wait(gen, 400);                     // 2600
        } else {
          img.src = IMG.selfBlank;
          await wait(gen, 2300);
          sfx('blank'); banner('BLANK — EXTRA TURN', 'ok');
          await wait(gen, 400);                     // 2700
        }
      } else {
        if (isLive){
          img.src = IMG.other; sfx('other');
          await wait(gen, 250);
          dealerHit(); damage('ai'); banner('LIVE — DEALER HIT', 'warn');
          await wait(gen, 700);                     // 950
        } else {
          nudge(img); sfx('blank'); banner('BLANK — TURN PASSES', 'info');
          await wait(gen, 600);
        }
      }
    } else {
      /* дилер: ОРИГИНАЛЬНЫЙ enemy_self.gif, оружие остаётся в его руке (.changed) */
      if (isLive){
        img.src = IMG.enemySelf;
        await wait(gen, 2000); sfx('other');
        await wait(gen, 200);
        if (target === 'self'){ dealerHit(); damage('ai'); banner('DEALER HIT HIMSELF', 'warn'); }
        else { damage('player'); banner('LIVE — YOU ARE HIT', 'bad'); }
        await wait(gen, 250);                       // 2450
      } else {
        nudge(img); sfx('blank');
        banner(target==='self' ? 'DEALER CLICKED EMPTY — EXTRA TURN' : 'DEALER WASTED A BLANK',
               target==='self' ? 'ok' : 'info');
        await wait(gen, 600);
      }
    }

    img.classList.remove('expanded');
    img.style.transform = '';
    img.classList.toggle('changed', holder === 'enemy');
    img.src = holder === 'enemy' ? IMG.enemyStill : IMG.still;

    if (S.pendingWinner){ gameOver(S.pendingWinner); return; }
    sfx('reload');
    await wait(gen, 450);
    const extra = (target === 'self' && !isLive);
    S.turn = extra ? S.turn : other(S.turn);
  }

  /* ---------- ввод ---------- */
  function awaitPlayerInput(){
    return new Promise((resolve, reject)=>{
      let settled = false;
      const cancel = ()=>{ if(settled) return; settled = true; pending.delete(cancel); S.input = null; reject(ABORT); };
      const done = (v)=>{ if(settled) return; settled = true; pending.delete(cancel); S.input = null; resolve(v); };
      pending.add(cancel); S.input = done;
    });
  }
  function act(target){
    const now = performance.now();
    if (now - S.lastAction < 220) return;
    if (!canAct()) return;
    S.lastAction = now;
    S.busy = true; S.phase = 'shot'; setControls();
    haptic('light'); sfx('button');
    const fn = S.input; S.input = null;
    if (fn) fn(target);
  }

  /* ---------- цикл ---------- */
  async function gameLoop(gen){
    while (true){
      guard(gen);
      if (S.over) return;
      if (!S.shells.length){
        if (S.loadedOnce) S.round++;
        S.loadedOnce = true;
        await reloadRound(gen);
      }
      await handoverTo(gen, S.turn);
      if (S.over) return;
      if (S.turn === 'self'){
        S.phase = 'player'; S.busy = false; setControls();
        const t = await awaitPlayerInput();
        guard(gen);
        await fire(gen, t);
      } else {
        S.phase = 'ai'; S.busy = true; setControls();
        await wait(gen, 700);
        await fire(gen, aiChoose());
      }
    }
  }

  /* ---------- лампа ---------- */
  let lampId = 0;
  function blink(){
    const l = $('light'), d = $('dark');
    d.style.display = 'block'; l.style.display = 'none';
    later(()=>{ d.style.display = 'none'; l.style.display = ''; }, 80);
  }
  function lightsOff(){
    if (DOC.hidden || S.over || Math.random() > .25) return;
    for (let i=0;i<3;i++) later(blink, i*300);
    later(()=>{ $('dark').style.display='block'; $('light').style.display='none'; }, 1200);
    later(()=>{ $('dark').style.display='none'; $('light').style.display=''; }, 3500);
  }
  function startLamp(){ stopLamp(); lampId = setInterval(lightsOff, 6000); }
  function stopLamp(){
    clearInterval(lampId); lampId = 0;
    const l = $('light'), d = $('dark');
    if (l) l.style.display = ''; if (d) d.style.display = 'none';
  }

  /* ---------- летающие GG (под слоем меню) ---------- */
  const P = { items:[], raf:0, last:0, spawn:0, on:false, h:0, max:10 };
  function spawnParticle(){
    const el = DOC.createElement('div'); el.className = 'moving-img';
    const k = .3 + Math.random()*.5, top = Math.random() < .5;
    const xr = Math.random() < .5 ? [5,25] : [75,95];
    const size = k*10;
    el.style.left = (xr[0] + Math.random()*(xr[1]-xr[0]))+'%';
    el.style.width = size+'%'; el.style.height = size+'%';
    $('particles').appendChild(el);
    P.items.push({ el, y: top ? -10 : 100, dir: top ? 1 : -1,
                   v:(1 + (1-k)*2)/16.67, rot:(Math.random()*60)-30 });
  }
  function pTick(now){
    if (!P.on) return;
    const dt = Math.min(50, now - P.last); P.last = now;
    if (!DOC.hidden && !$('start_screen').classList.contains('hidden')){
      P.spawn += dt;
      if (P.spawn > 600 && P.items.length < P.max){ P.spawn = 0; spawnParticle(); }
      const h = P.h || DOC.body.clientHeight || 1;
      for (let i=P.items.length-1;i>=0;i--){
        const it = P.items[i];
        it.y += it.v * dt * (it.dir?1:-1) / h * 100;
        if (it.y > 104 || it.y < -12){ it.el.remove(); P.items.splice(i,1); continue; }
        it.el.style.transform = 'translate3d(0,'+(it.y/100*h)+'px,0) rotate('+it.rot+'deg)';
      }
    }
    P.raf = requestAnimationFrame(pTick);
  }
  function startParticles(){ if (P.on) return; P.on = true; P.last = performance.now(); P.raf = requestAnimationFrame(pTick); }
  function stopParticles(){ P.on = false; cancelAnimationFrame(P.raf); P.items.forEach(i=>i.el.remove()); P.items.length = 0; }

  /* ---------- экраны ---------- */
  function gameOver(winner){
    if (S.over) return;
    S.over = true; S.phase = 'over'; S.busy = true;
    const rounds = S.round, shots = S.shots;
    bump(); stopLamp();
    sfx('game_over'); haptic(winner==='player' ? 'success' : 'error');
    S.best = Math.max(S.best, rounds); store.set('best', S.best);
    $('game').classList.add('hidden');
    $('end_screen').classList.remove('hidden');
    $('topbar').classList.add('corner');
    $('end_winner').textContent = winner==='player' ? 'YOU SURVIVED' : 'THE DEALER WINS';
    $('end_winner').style.color = winner==='player' ? 'var(--acid)' : 'var(--blood-hi)';
    $('st_rounds').textContent = rounds;
    $('st_shots').textContent = shots;
    $('st_hp').textContent = S.hp.player;
    $('st_best').textContent = S.best;
    $('best_rounds').textContent = S.best;
    $('rank').textContent = rounds>=10?'LEGEND OF THE TABLE':rounds>=7?'TABLE BOSS':rounds>=5?'COLD BLOOD':rounds>=3?'STEADY HAND':'FRESH MEAT';
    setControls();
  }
  function resetTable(){
    const img = $('image'), box = $('box');
    img.getAnimations && img.getAnimations().forEach(a=>a.cancel());
    box.getAnimations && box.getAnimations().forEach(a=>a.cancel());
    img.className = 'image'; img.style.cssText = ''; img.src = IMG.still;
    box.style.opacity = '0'; box.innerHTML = '';
    $('wound').classList.add('hidden');
    $('avatar').style.marginBottom = '0';
    $('hit_flash').className = 'hit_flash';
    $('banner').className = 'banner';
  }
  function startRun(){
    bump(); resetTable();
    S.over = false; S.pendingWinner = null; S.shells = []; S.live = 0; S.blank = 0;
    S.round = 1; S.shots = 0; S.loadedOnce = false; S.turn = 'self'; S.holder = 'self';
    S.maxHp = HP_BY_DIFF[S.diff] || 4; S.hp = { player:S.maxHp, ai:S.maxHp };
    buildHearts(); renderRound();
    $('own_name').textContent = S.name;
    $('enemy_name').textContent = 'Dealer';
    $('get_ready').classList.remove('show');
    $('start_screen').classList.add('hidden');
    $('end_screen').classList.add('hidden');
    $('game').classList.remove('hidden');
    $('topbar').classList.remove('corner');
    stopParticles(); startLamp();
    S.phase = 'reload'; S.busy = true; setControls();
    run(gameLoop);
  }
  function backToMenu(){
    bump(); stopLamp(); resetTable();
    S.over = false; S.phase = 'menu'; S.busy = false;
    $('game').classList.add('hidden');
    $('end_screen').classList.add('hidden');
    $('start_screen').classList.remove('hidden');
    $('topbar').classList.add('corner');
    $('start_panel').classList.remove('fly_out');
    $('start_title').classList.remove('fly_out');
    $('get_ready').classList.remove('show');
    $('menu_button').disabled = false;
    $('menu_button').classList.remove('fly_out');
    $('best_rounds').textContent = S.best;
    startParticles(); setControls();
  }
  function playFromMenu(){
    if (S.phase !== 'menu' || S.busy) return;
    S.busy = true; S.phase = 'intro'; setControls();
    const raw = ($('name_input').value || '').replace(/[<>&"']/g,'').trim();
    S.name = raw ? raw.slice(0,14) : 'Player'; store.set('name', S.name);
    sfx('button'); haptic('light');
    $('menu_button').disabled = true;
    later(()=>sfx('countdown'), 400);
    run(async (gen)=>{
      await wait(gen, 2400);
      $('start_panel').classList.add('fly_out');
      $('start_title').classList.add('fly_out');
      later(()=>$('get_ready').classList.add('show'), 500);   // появляется, когда панель ушла
      await wait(gen, 1600);
      sfx('vzuh');
      $('menu_button').classList.add('fly_out');
      await wait(gen, 1000);
      startRun();
    });
  }

  /* ---------- настройки ---------- */
  function openMenu(){
    if (S.menuOpen) return;
    S.menuOpen = true;
    $('overlay').classList.add('open');
    $('settings_menu').classList.add('open');
    $('settings_btn').classList.add('open');
    setControls();
    try{ tg && tg.BackButton && tg.BackButton.show(); }catch(e){}
  }
  function closeMenu(){
    if (!S.menuOpen) return;
    S.menuOpen = false;
    $('overlay').classList.remove('open');
    $('settings_menu').classList.remove('open');
    $('settings_btn').classList.remove('open');
    setControls();
    try{ tg && tg.BackButton && tg.BackButton.hide(); }catch(e){}
  }
  function syncSettings(){
    $('mute_btn').classList.toggle('muted', S.muted);
    $('set_sound').setAttribute('aria-pressed', String(!S.muted));
    $('set_haptics').setAttribute('aria-pressed', String(S.haptics));
    $('vol_slider').value = Math.round(S.volume*100);
    $('vol_val').textContent = Math.round(S.volume*100)+'%';
    DOC.querySelectorAll('.seg_btn').forEach(b=>b.classList.toggle('active', b.dataset.diff === S.diff));
  }
  function setDiff(d){
    if (!HP_BY_DIFF[d]) return;
    S.diff = d; store.set('diff', d); syncSettings(); sfx('button'); haptic('light');
  }

  /* ---------- прелоад ---------- */
  function preload(){
    const imgs = Object.values(IMG), snds = Object.values(SFX);
    const total = imgs.length + snds.length;
    let done = 0;
    const tick = ()=>{
      done++;
      const pct = Math.round(done/total*100);
      $('load_fill').style.width = pct+'%';
      $('load_hint').textContent = 'Loading assets… '+pct+'%';
    };
    const once = (fn)=>{ let c=false; return ()=>{ if(c) return; c=true; tick(); fn(); }; };
    const tasks = [];
    imgs.forEach(src=>tasks.push(new Promise(res=>{
      const i = new Image(); const f = once(res); i.onload = f; i.onerror = f; i.src = src;
    })));
    snds.forEach(src=>tasks.push(new Promise(res=>{
      const a = new Audio(); const f = once(res); a.preload = 'auto';
      a.addEventListener('canplaythrough', f, { once:true });
      a.addEventListener('error', f, { once:true });
      a.src = src; try{ a.load(); }catch(e){}
      setTimeout(f, 6000);
    })));
    return Promise.race([ Promise.all(tasks), new Promise(r=>setTimeout(r, 12000)) ]);
  }

  /* ---------- init ---------- */
  function init(){
    S.name = String(store.get('name','Player')).slice(0,14);
    S.diff = HP_BY_DIFF[store.get('diff','normal')] ? store.get('diff','normal') : 'normal';
    S.muted = !!store.get('muted', false);
    S.volume = Math.min(1, Math.max(0, Number(store.get('volume', .8)) || 0));
    S.haptics = store.get('haptics', true) !== false;
    S.best = Math.max(0, parseInt(store.get('best', 0), 10) || 0);

    if (tg){
      try{
        tg.ready(); tg.expand();
        tg.setHeaderColor && tg.setHeaderColor('#14100e');
        tg.setBackgroundColor && tg.setBackgroundColor('#0b0908');
        tg.disableVerticalSwipes && tg.disableVerticalSwipes();
        tg.onEvent && tg.onEvent('viewportChanged', applyViewport);
        const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
        if (u && u.first_name && store.get('name', null) === null) S.name = String(u.first_name).slice(0,14);
        tg.BackButton && tg.BackButton.onClick(closeMenu);
      }catch(e){}
    }
    applyViewport();
    buildAudio();
    $('name_input').value = S.name;
    $('best_rounds').textContent = S.best;
    syncSettings();
    buildHearts();

    $('shoot_self').addEventListener('click', ()=>act('self'));
    $('shoot_enemy').addEventListener('click', ()=>act('enemy'));
    $('menu_button').addEventListener('click', playFromMenu);
    $('restart_button').addEventListener('click', ()=>{ sfx('button'); startRun(); });
    $('menu_return').addEventListener('click', ()=>{ sfx('button'); backToMenu(); });
    $('settings_btn').addEventListener('click', ()=>{ sfx('button'); S.menuOpen ? closeMenu() : openMenu(); });
    $('close_btn').addEventListener('click', ()=>{ sfx('button'); closeMenu(); });
    $('overlay').addEventListener('click', closeMenu);
    $('mute_btn').addEventListener('click', ()=>{
      S.muted = !S.muted; store.set('muted', S.muted); syncSettings();
      if (!S.muted){ unlockAudio(); sfx('button'); }
      haptic('light');
    });
    $('set_sound').addEventListener('click', ()=>{
      S.muted = !S.muted; store.set('muted', S.muted); syncSettings(); if (!S.muted) sfx('button');
    });
    $('set_haptics').addEventListener('click', ()=>{ S.haptics = !S.haptics; store.set('haptics', S.haptics); syncSettings(); haptic('light'); });
    $('vol_slider').addEventListener('input', (e)=>{
      S.volume = Number(e.target.value)/100; store.set('volume', S.volume);
      $('vol_val').textContent = e.target.value+'%';
      if (S.volume > 0 && S.muted){ S.muted = false; store.set('muted', false); syncSettings(); }
    });
    $('vol_slider').addEventListener('change', ()=>sfx('button'));
    $('set_restart').addEventListener('click', ()=>{ closeMenu(); sfx('button'); startRun(); });
    DOC.querySelectorAll('.seg_btn').forEach(b=>b.addEventListener('click', ()=>setDiff(b.dataset.diff)));
    $('name_input').addEventListener('keydown', e=>{ if (e.key === 'Enter'){ e.preventDefault(); playFromMenu(); } });

    DOC.addEventListener('keydown', (e)=>{
      if (e.target && e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape'){ closeMenu(); return; }
      if (k === 'm'){ $('mute_btn').click(); return; }
      if (S.menuOpen) return;
      if (k === '1' || k === 'arrowleft') act('self');
      else if (k === '2' || k === 'arrowright') act('enemy');
      else if (k === 'r' && S.over) startRun();
    });

    DOC.addEventListener('pointerdown', unlockAudio, { once:true });
    DOC.addEventListener('contextmenu', e=>e.preventDefault());
    DOC.addEventListener('dragstart', e=>e.preventDefault());
    DOC.addEventListener('dblclick', e=>e.preventDefault(), { passive:false });
    DOC.addEventListener('gesturestart', e=>e.preventDefault());
    DOC.addEventListener('visibilitychange', setControls);
    let rt = 0;
    window.addEventListener('resize', ()=>{ clearTimeout(rt); rt = setTimeout(applyViewport, 120); });
    window.addEventListener('orientationchange', ()=>setTimeout(applyViewport, 250));

    preload().then(()=>{
      $('loading_screen').classList.add('hidden');
      $('topbar').classList.remove('hidden');
      backToMenu();
    });
  }

  if (DOC.readyState === 'loading') DOC.addEventListener('DOMContentLoaded', init);
  else init();
})();