'use strict';
/* Tg Roulette · build 3. Тайминги анимаций — оригинальные. DOM самовосстанавливающийся. */
(function () {
  const DOC = document;
  const BUILD = '3';
  const $ = (id) => DOC.getElementById(id);
  const ABORT = Symbol('abort');
  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const TG_TIMEOUT = 6000;   // предел ожидания Telegram SDK

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

  /* ===================== РАЗМЕТКА ===================== */
  const SHELL_HTML = `
  <div class="loadingScreen" id="loading_screen">
    <div class="load_brand">TG<span>ROULETTE</span></div>
    <div class="spinner"></div>
    <div class="load_bar"><i id="load_fill"></i></div>
    <div class="load_hint" id="load_hint">Loading assets… 0%</div>
  </div>
  <div class="topbar corner hidden" id="topbar">
    <div class="round_chip" id="round_chip">ROUND <b id="round_num">1</b></div>
    <button class="icon_btn" id="mute_btn" type="button" aria-label="Toggle sound">
      <svg class="ico ico_on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8c1.6 1.2 1.6 6.8 0 8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 5c3 3 3 11 0 14" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      <svg class="ico ico_off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
    </button>
    <button class="icon_btn" id="settings_btn" type="button" aria-label="Rules and settings">
      <img class="gear" id="gear" src="data/gear.svg" alt="">
    </button>
  </div>
  <section class="startScreen hidden" id="start_screen">
    <div class="particles" id="particles"></div>
    <div class="start_ui">
      <h1 class="menu_text" id="start_title">Tg Roulette</h1>
      <div class="start_panel" id="start_panel">
        <label class="field"><span class="field_label">YOUR NAME</span>
          <input id="name_input" class="name_input" type="text" maxlength="14" autocomplete="off" spellcheck="false" value="Player">
        </label>
        <div class="seg" id="diff_seg" role="group" aria-label="Difficulty">
          <button class="seg_btn" data-diff="easy" type="button">ROOKIE</button>
          <button class="seg_btn" data-diff="normal" type="button">DEALER</button>
          <button class="seg_btn" data-diff="hard" type="button">RUTHLESS</button>
        </div>
        <div class="best_line">BEST <b id="best_rounds">0</b> ROUNDS</div>
      </div>
      <button class="style_button menu_button" id="menu_button" type="button">PLAY</button>
      <div class="hint_line">Tap the dealer to shoot him · tap the bottom third to shoot yourself</div>
      <div class="get_ready" id="get_ready" aria-hidden="true">
        <div class="gr_inner">
          <div class="gr_rule"></div>
          <div class="gr_kicker">CHAMBER SEALED · SHELLS SHUFFLED</div>
          <div class="gr_title" data-text="GET READY">GET READY</div>
          <div class="gr_sub">THE DEALER IS RACKING THE SHOTGUN</div>
          <div class="gr_bar"><i></i></div>
          <div class="gr_rule"></div>
        </div>
      </div>
    </div>
  </section>
  <section class="game hidden" id="game">
    <div class="top">
      <div class="avatar" id="avatar">
        <img id="player" class="player2" src="data/opponent.jpg" alt="Dealer">
        <img id="wound" class="wound hidden" src="data/wound.gif" alt="">
      </div>
    </div>
    <div class="ui_self"><div class="names" id="own_name">You</div><div class="hearts" id="self_hearts"></div></div>
    <div class="ui_enemy"><div class="names" id="enemy_name">Dealer</div><div class="hearts right" id="enemy_hearts"></div></div>
    <button class="hit_dealer" id="hit_dealer" type="button" aria-label="Shoot the dealer"></button>
    <div id="box" class="box"></div>
    <div class="bottom"></div>
    <img id="image" class="image" src="data/still.png" alt="">
    <button class="hit_self" id="hit_self" type="button" aria-label="Shoot yourself"></button>
    <div class="controls" id="controls">
      <button class="action_btn self" id="shoot_self" type="button"><b>SHOOT</b><span>YOU</span></button>
      <button class="action_btn enemy" id="shoot_enemy" type="button"><b>SHOOT</b><span>DEALER</span></button>
    </div>
    <div class="banner" id="banner" aria-live="polite"></div>
    <div class="hit_flash" id="hit_flash"></div>
    <div class="input_shield on" id="input_shield"></div>
    <div class="lamp" id="lamp" aria-hidden="true">
      <img id="light" class="light" src="data/light.png" alt="">
    </div>
    <div class="blackout" id="blackout" aria-hidden="true">
      <img id="dark" class="dark" src="data/dark.png" alt="">
    </div>
  </section>
  <section class="endScreen hidden" id="end_screen">
    <div class="end_logo">GAME OVER</div>
    <div class="end_text" id="end_winner">YOU SURVIVED</div>
    <div class="rank" id="rank">STEADY HAND</div>
    <div class="end_stats">
      <div class="stat"><span>ROUNDS</span><b id="st_rounds">0</b></div>
      <div class="stat"><span>SHOTS</span><b id="st_shots">0</b></div>
      <div class="stat"><span>HEARTS</span><b id="st_hp">0</b></div>
      <div class="stat"><span>BEST</span><b id="st_best">0</b></div>
    </div>
    <button class="style_button restart_button" id="restart_button" type="button">RESTART</button>
    <button class="ghost_button" id="menu_return" type="button">MAIN MENU</button>
  </section>
  <div class="overlay" id="overlay"></div>
  <div class="menu" id="settings_menu" role="dialog" aria-modal="true" aria-label="Rules and settings">
    <button class="close-btn" id="close_btn" type="button" aria-label="Close">✕</button>
    <h2 class="menu_title">RULES</h2>
    <p class="info_text">The shotgun is loaded with a hidden mix of <b class="c_live">live</b> and <b class="c_blank">blank</b> shells.
      A live shell costs one heart. A blank fired at yourself gives you <b class="c_ok">another turn</b>.</p>
    <p class="info_text"><b>Controls:</b> tap the dealer or <b class="c_blank">SHOOT DEALER</b> to fire at him.
      Tap the bottom third of the table or <b class="c_live">SHOOT YOU</b> to fire at yourself.</p>
    <h2 class="menu_title">SETTINGS</h2>
    <div class="set_row"><span>Sound</span><button class="toggle" id="set_sound" type="button" aria-pressed="true"><i></i></button></div>
    <div class="set_row"><span>Volume <b id="vol_val">80%</b></span><input class="slider" id="vol_slider" type="range" min="0" max="100" step="5" value="80" aria-label="Volume"></div>
    <div class="set_row"><span>Haptics</span><button class="toggle" id="set_haptics" type="button" aria-pressed="true"><i></i></button></div>
    <div class="set_col"><span class="set_hint">Dealer skill · hearts apply next run</span>
      <div class="seg" id="set_diff" role="group" aria-label="Difficulty">
        <button class="seg_btn" data-diff="easy" type="button">ROOKIE</button>
        <button class="seg_btn" data-diff="normal" type="button">DEALER</button>
        <button class="seg_btn" data-diff="hard" type="button">RUTHLESS</button>
      </div>
    </div>
    <button class="danger_button" id="set_restart" type="button">RESTART RUN</button>
    <p class="keys_hint">Keys: <b>1</b> you · <b>2</b> dealer · <b>M</b> mute · <b>Esc</b> close</p>
  </div>`;

  const REQUIRED = ['loading_screen','load_fill','load_hint','topbar','round_chip','round_num','mute_btn',
    'settings_btn','gear','start_screen','particles','start_title','start_panel','name_input','diff_seg',
    'best_rounds','menu_button','get_ready','game','avatar','player','wound','own_name','self_hearts',
    'enemy_name','enemy_hearts','hit_dealer','box','image','hit_self','controls',
    'shoot_self','shoot_enemy','banner','hit_flash','input_shield','lamp','light','blackout','dark',
    'end_screen','end_winner','rank','st_rounds','st_shots','st_hp','st_best','restart_button','menu_return',
    'overlay','settings_menu','close_btn','set_sound','vol_val','vol_slider','set_haptics','set_diff','set_restart'];

  const CRITICAL_CSS = `
:root{--u:min(1vh,1vw)}
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
html,body{height:100%;overflow:hidden;background:#0b0908;color:#f2e3cf}
body{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
img{pointer-events:none}button{cursor:pointer;border:0;background:none;color:inherit;font:inherit}
.hidden{display:none!important}
.stage{position:relative;width:calc(var(--u)*100);height:calc(var(--u)*100);overflow:hidden;background:#14100e}
.startScreen,.endScreen,.game{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden}
.startScreen{background:url('data/start_menu.png') center/cover}
.game{background:url('data/background.png') center/cover}
.endScreen{background:url('data/end_credits.png') center/cover}
.top,.bottom{position:relative;flex:1;display:flex;justify-content:center;align-items:flex-end;height:50%}
.avatar{position:relative;width:26%;height:44%;display:flex;justify-content:center;align-items:flex-end}
.player2{width:100%;height:100%;object-fit:contain}
.wound{position:absolute;width:92%;top:-18%;left:50%;transform:translateX(-50%)}
.image{position:absolute;object-fit:contain;top:50%;right:0;width:50%;transition:all 200ms ease-in-out}
.image.changed{top:40%;right:55%;width:20%}.image.reloading{top:0;width:30%;left:-30%}
.image.expanded{width:100%;top:0;right:0;z-index:7}
.box{position:absolute;display:flex;gap:3%;padding:1.2% 1%;width:26%;height:10%;background:#c0c0c0;border-radius:8%;
 left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;opacity:0;pointer-events:none;overflow:hidden;outline:2px solid #663300}
.element{flex:1 1 0;min-width:0;display:flex;flex-direction:column;overflow:hidden;outline:1px solid #333}
.bullet_top{height:30%;background:darkgray}.bottom-true{height:70%;background:#d7263d}.bottom-false{height:70%;background:gray}
.ui_self,.ui_enemy{position:absolute;top:1.2%;width:30%;z-index:4}.ui_self{left:2%}.ui_enemy{right:2%;text-align:right}
.names{font-size:calc(var(--u)*3.8)}.hearts{display:flex;gap:calc(var(--u)*.5)}.hearts.right{justify-content:flex-end}
.heart{width:calc(var(--u)*3.6);height:calc(var(--u)*3.6);object-fit:contain}
.heart.lost{filter:grayscale(1) brightness(.35);opacity:.45}
.hit_dealer,.hit_self{position:absolute;z-index:2;padding:0;border:0;background:none;pointer-events:none}
.hit_dealer.armed,.hit_self.armed{pointer-events:auto}
.hit_dealer{left:31%;top:21%;width:38%;height:31%}
.hit_self{left:0;bottom:0;width:100%;height:33.34%}
.controls{position:absolute;left:3%;bottom:2.5%;width:44%;z-index:5;display:flex;gap:calc(var(--u)*1.2)}
.controls.idle{opacity:.45}
.action_btn{flex:1;height:calc(var(--u)*9);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f2e3cf;border:2px solid #0b0908}
.action_btn b{font-size:calc(var(--u)*2.1)}.action_btn span{font-size:calc(var(--u)*3.4)}
.action_btn.self{background:#16242e;border-color:#35c2ff}.action_btn.enemy{background:#6d1020;border-color:#ff3b4e}
.banner{position:absolute;left:3%;bottom:21%;max-width:46%;z-index:6;pointer-events:none;padding:calc(var(--u)*1.1);
 font-size:calc(var(--u)*2.7);background:rgba(11,9,8,.9);border:2px solid #3a302b;opacity:0}.banner.show{opacity:1}
.hit_flash{position:absolute;inset:0;z-index:8;pointer-events:none;opacity:0;
 background:radial-gradient(120% 100% at 50% 50%,transparent 35%,rgba(215,38,61,.85))}.hit_flash.on{opacity:.85}
.input_shield{position:absolute;inset:0;z-index:9;pointer-events:none}.input_shield.on{pointer-events:auto}
.lamp{position:absolute;inset:0;z-index:10;pointer-events:none}
.light{position:absolute;width:70%;height:62%;top:2%;left:50%;transform:translateX(-50%);object-fit:contain}
.blackout{position:absolute;inset:0;z-index:11;pointer-events:none;display:none;background:rgba(6,5,4,.6)}
.dark{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.topbar{position:absolute;top:1.2%;left:50%;transform:translateX(-50%);z-index:20;display:flex;align-items:center;gap:calc(var(--u)*.9)}
.topbar.corner{left:auto;right:2%;transform:none}.topbar.corner .round_chip{display:none}
.round_chip{font-size:calc(var(--u)*2.5);padding:calc(var(--u)*.9);background:#1d1815;border:2px solid #b5651d;color:#EDC9AF}
.icon_btn{width:calc(var(--u)*6.4);height:calc(var(--u)*6.4);display:flex;align-items:center;justify-content:center;background:#1d1815;border:2px solid #b5651d;color:#ffca18}
.ico{width:62%;height:62%;fill:currentColor}.ico_off{display:none}
#mute_btn.muted .ico_on{display:none}#mute_btn.muted .ico_off{display:block}.gear{width:62%;height:62%}
.particles{position:absolute;inset:0;z-index:1;overflow:hidden}
.moving-img{position:absolute;top:0;left:0;background-image:url('data/ggs.png');background-size:cover}
.start_ui{position:absolute;inset:0;z-index:2}
.menu_text{position:absolute;top:13%;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:calc(var(--u)*8.4);color:#ffca18}
.start_panel{position:absolute;top:35%;left:50%;transform:translateX(-50%);width:66%;display:flex;flex-direction:column;
 gap:calc(var(--u)*1.7);padding:calc(var(--u)*2.2);background:rgba(20,16,14,.3);border:1px solid rgba(255,202,24,.25)}
.field{display:flex;flex-direction:column;gap:calc(var(--u)*.7)}.field_label{font-size:calc(var(--u)*2.1);color:#c9b8a4}
.name_input{width:100%;padding:calc(var(--u)*1.1);font-size:calc(var(--u)*3.2);background:rgba(11,9,8,.4);
 border:1px solid rgba(255,202,24,.2);color:#f2e3cf;outline:none}
.seg{display:flex;gap:calc(var(--u)*.6)}
.seg_btn{flex:1;padding:calc(var(--u)*1) 0;font-size:calc(var(--u)*2.1);background:rgba(11,9,8,.35);border:1px solid rgba(255,202,24,.2);color:#c9b8a4}
.seg_btn.active{background:#ffca18;color:#14100e}
.best_line{font-size:calc(var(--u)*2.2);text-align:center;color:#b9a894}
.style_button{position:absolute;background:#b5651d;color:#fff;border:2px solid #6d3701;padding:calc(var(--u)*1.6);font-size:calc(var(--u)*4.6)}
.menu_button{width:44%;bottom:15%;right:50%;transform:translateX(50%)}
.hint_line{position:absolute;bottom:6.5%;left:50%;transform:translateX(-50%);width:92%;text-align:center;font-size:calc(var(--u)*2.2);color:#9d8d7c}
.fly_out{opacity:0!important}
.get_ready{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none}
.get_ready.show{opacity:1}
.gr_inner{width:80%;display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*1.1);text-align:center}
.gr_rule{width:100%;height:2px;background:#b5651d}.gr_kicker{font-size:calc(var(--u)*2);color:#35c2ff}
.gr_title{font-size:calc(var(--u)*8.6);color:#ffca18}.gr_sub{font-size:calc(var(--u)*2.4);color:#c9b8a4}
.gr_bar{width:62%;height:calc(var(--u)*1.3);background:#241d19;overflow:hidden}
.gr_bar i{display:block;height:100%;width:0;background:#ffca18}
.get_ready.show .gr_bar i{animation:tgrFill 2100ms linear forwards}@keyframes tgrFill{to{width:100%}}
.end_logo{position:absolute;top:14%;left:50%;transform:translateX(-50%);font-size:calc(var(--u)*7.6);color:#ffca18;z-index:2}
.end_text{position:absolute;top:35%;left:50%;transform:translateX(-50%);font-size:calc(var(--u)*4.6);z-index:2}
.rank{position:absolute;top:43.5%;left:50%;transform:translateX(-50%);font-size:calc(var(--u)*2.8);color:#8fe03a;z-index:2}
.end_stats{position:absolute;top:51%;left:50%;transform:translateX(-50%);width:78%;z-index:2;display:grid;grid-template-columns:repeat(4,1fr);gap:calc(var(--u)*1)}
.stat{display:flex;flex-direction:column;align-items:center;padding:calc(var(--u)*1.2) 0;background:rgba(11,9,8,.8);border:2px solid #3a302b}
.stat span{font-size:calc(var(--u)*1.9);color:#9d8d7c}.stat b{font-size:calc(var(--u)*4);color:#ffca18}
.restart_button{bottom:15%;right:50%;transform:translateX(50%);width:44%;z-index:2}
.ghost_button{position:absolute;bottom:6.5%;left:50%;transform:translateX(-50%);z-index:2;font-size:calc(var(--u)*2.8);color:#b9a894;padding:calc(var(--u)*1);border:2px solid #3a302b}
.overlay{position:absolute;inset:0;z-index:25;background:rgba(11,9,8,.72);opacity:0;pointer-events:none}
.overlay.open{opacity:1;pointer-events:auto}
.menu{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;max-height:84%;z-index:30;display:flex;
 flex-direction:column;gap:calc(var(--u)*1.4);overflow-y:auto;padding:calc(var(--u)*3);background:#EDC9AF;color:#2a2320;
 border:2px solid #6d3701;opacity:0;pointer-events:none}.menu.open{opacity:1;pointer-events:auto}
.menu_title{font-size:calc(var(--u)*3.4);color:#6d3701}.info_text{font-size:calc(var(--u)*2.5);line-height:1.5}
.close-btn{position:absolute;top:calc(var(--u)*1.4);right:calc(var(--u)*1.4);width:calc(var(--u)*5);height:calc(var(--u)*5);background:#14100e;color:#ffca18}
.set_row{display:flex;align-items:center;justify-content:space-between;font-size:calc(var(--u)*2.5)}
.set_col{display:flex;flex-direction:column;gap:calc(var(--u)*.8)}.set_hint{font-size:calc(var(--u)*2.1);color:#6d3701}
.toggle{width:calc(var(--u)*8);height:calc(var(--u)*4);background:#8d7460;border:2px solid #6d3701;position:relative}
.toggle i{position:absolute;top:calc(var(--u)*.3);left:calc(var(--u)*.3);width:calc(var(--u)*3);height:calc(var(--u)*3);background:#f2e3cf}
.toggle[aria-pressed="true"]{background:#3f7a12}.toggle[aria-pressed="true"] i{transform:translateX(calc(var(--u)*3.6))}
.slider{width:52%;height:calc(var(--u)*1.6)}
.danger_button{padding:calc(var(--u)*1.4);font-size:calc(var(--u)*2.8);background:#d7263d;color:#f2e3cf}
.keys_hint{font-size:calc(var(--u)*2);color:#6d3701}
.loadingScreen{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u)*2);background:#0b0908}
.load_brand{font-size:calc(var(--u)*7);color:#ffca18}
.spinner{width:calc(var(--u)*7);height:calc(var(--u)*7);border:calc(var(--u)*.7) solid rgba(255,202,24,.25);border-top-color:#ffca18;border-radius:50%;animation:tgrSpin 1s linear infinite}
@keyframes tgrSpin{to{transform:rotate(360deg)}}
.load_bar{width:52%;height:calc(var(--u)*1.6);background:#241d19;overflow:hidden}
.load_bar i{display:block;height:100%;width:0;background:#ffca18}
.load_hint{font-size:calc(var(--u)*2.6);color:#b9a894}`;

  function ensureDom(){
    let stage = $('stage');
    if (!stage){
      stage = DOC.createElement('div');
      stage.id = 'stage';
      (DOC.body || DOC.documentElement).appendChild(stage);
    }
    stage.className = 'stage';
    const missing = REQUIRED.filter(id => !$(id));
    if (missing.length){
      stage.innerHTML = SHELL_HTML;
      stage.setAttribute('data-tgr-build', BUILD);
    }
  }
  function ensureCss(){
    if (!DOC.querySelector('link[rel="stylesheet"][href*="styles.css"]')){
      const l = DOC.createElement('link'); l.rel = 'stylesheet'; l.href = 'styles.css';
      (DOC.head || DOC.documentElement).appendChild(l);
    }
    let ok = false;
    try{
      ok = getComputedStyle(DOC.documentElement).getPropertyValue('--tgr-build').replace(/["'\s]/g,'') === BUILD;
    }catch(e){}
    const fb = DOC.querySelector('style[data-tgr-fallback]');
    if (ok){ if (fb) fb.remove(); return; }
    if (!fb){
      const s = DOC.createElement('style');
      s.setAttribute('data-tgr-fallback','');
      s.textContent = CRITICAL_CSS;
      (DOC.head || DOC.documentElement).appendChild(s);
    }
  }

  const style = (id,p,v)=>{ const n=$(id); if(n) n.style[p]=v; };
  const cls   = (id,c,on)=>{ const n=$(id); if(n) n.classList.toggle(c,!!on); };
  const txt   = (id,v)=>{ const n=$(id); if(n) n.textContent=v; };
  const attr  = (id,k,v)=>{ const n=$(id); if(n) n.setAttribute(k,v); };
  const dis   = (id,v)=>{ const n=$(id); if(n) n.disabled=!!v; };
  const on    = (id,ev,fn)=>{ const n=$(id); if(n) n.addEventListener(ev,fn); };

  /* ===================== СОСТОЯНИЕ ===================== */
  const S = {
    gen:0, phase:'boot', busy:true, over:false, menuOpen:false,
    turn:'self', holder:'self', shells:[], live:0, blank:0,
    hp:{player:4, ai:4}, maxHp:4, round:1, shots:0, loadedOnce:false,
    pendingWinner:null, lastAction:0, input:null,
    name:'Player', diff:'normal', muted:false, volume:.8, haptics:true, best:0
  };
  const store = {
    get(k,d){ try{ const v=localStorage.getItem('tgr_'+k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
    set(k,v){ try{ localStorage.setItem('tgr_'+k, JSON.stringify(v)); }catch(e){} }
  };

  /* ===================== ВРЕМЯ ===================== */
  const pending = new Set(), timeouts = new Set();
  function guard(gen){ if (gen !== S.gen) throw ABORT; }
  function later(fn,ms){ const id=setTimeout(()=>{ timeouts.delete(id); fn(); },ms); timeouts.add(id); return id; }
  function delay(ms){
    return new Promise((resolve,reject)=>{
      let left=ms, last=performance.now(), done=false, raf=0, wd=0;
      const clean=()=>{ cancelAnimationFrame(raf); clearTimeout(wd); pending.delete(cancel); };
      const finish=()=>{ if(done) return; done=true; clean(); resolve(); };
      const cancel=()=>{ if(done) return; done=true; clean(); reject(ABORT); };
      const tick=(now)=>{ const dt=now-last; last=now;
        if(!DOC.hidden) left-=dt;
        if(left<=0) return finish();
        raf=requestAnimationFrame(tick); };
      const watchdog=()=>{ if(DOC.hidden) wd=setTimeout(watchdog,1000); else finish(); };
      pending.add(cancel); raf=requestAnimationFrame(tick); wd=setTimeout(watchdog, ms+3000);
    });
  }
  async function wait(gen,ms){ await delay(ms); guard(gen); }
  async function anim(gen,el,frames,opts){
    if(!el || typeof el.animate!=='function'){ await delay((opts.duration||0)*(opts.iterations||1)); guard(gen); return; }
    let a; try{ a=el.animate(frames,opts); }catch(e){ await delay(opts.duration||0); guard(gen); return; }
    const cancel=()=>{ try{ a.cancel(); }catch(e){} };
    pending.add(cancel);
    try{ await a.finished; }catch(e){}
    pending.delete(cancel); guard(gen);
  }
  function bump(){
    S.gen++;
    const arr=[...pending]; pending.clear(); arr.forEach(f=>{ try{f();}catch(e){} });
    timeouts.forEach(clearTimeout); timeouts.clear();
    S.input=null;
  }
  function run(fn){ const gen=S.gen; Promise.resolve().then(()=>fn(gen)).catch(e=>{ if(e!==ABORT) console.error(e); }); }
  const other = s => s==='self' ? 'enemy' : 'self';

  /* ===================== TELEGRAM: синхронное определение + лимит ожидания ===================== */
  let tg = null;

  function detectTelegram(){
    try{
      if (window.Telegram && window.Telegram.WebApp) return true;
      if (window.TelegramWebviewProxy || window.TelegramWebview) return true;
      const q = (location.hash || '') + '&' + (location.search || '');
      if (/tgWebApp(Data|Platform|Version|StartParam|ThemeParams|BotUsername)/i.test(q)) return true;
      if (/telegram/i.test(navigator.userAgent || '')) return true;
      if (DOC.referrer && /telegram/i.test(DOC.referrer)) return true;
    }catch(e){}
    return false;
  }

  function loadTelegramSdk(timeout){
    return new Promise(resolve=>{
      const have = ()=> (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
      if (have()) return resolve(have());
      let done = false, wd = 0, poll = 0;
      const finish = (v)=>{ if(done) return; done = true; clearTimeout(wd); clearInterval(poll); resolve(v); };
      wd = setTimeout(()=>finish(have()), timeout);
      poll = setInterval(()=>{ if(have()) finish(have()); }, 120);
      let s = DOC.querySelector('script[data-tgr-tg]') || DOC.querySelector('script[src*="telegram-web-app.js"]');
      if (!s){
        s = DOC.createElement('script');
        s.src = 'https://telegram.org/js/telegram-web-app.js';
        s.async = true;
        s.setAttribute('data-tgr-tg','');
        (DOC.head || DOC.documentElement).appendChild(s);
      }
      s.addEventListener('load', ()=>finish(have()), { once:true });
      s.addEventListener('error', ()=>finish(null), { once:true });
    });
  }

  function applyTelegram(sdk){
    tg = sdk;
    try{
      tg.ready(); tg.expand();
      tg.setHeaderColor && tg.setHeaderColor('#14100e');
      tg.setBackgroundColor && tg.setBackgroundColor('#0b0908');
      tg.disableVerticalSwipes && tg.disableVerticalSwipes();
      tg.onEvent && tg.onEvent('viewportChanged', applyViewport);
      tg.BackButton && tg.BackButton.onClick(closeMenu);
      const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
      if (u && u.first_name && store.get('name', null) === null){
        S.name = String(u.first_name).slice(0,14);
        const ni = $('name_input'); if (ni) ni.value = S.name;
        txt('own_name', S.name);
      }
      if (S.menuOpen && tg.BackButton) tg.BackButton.show();
    }catch(e){}
    applyViewport();
  }

  function bootTelegram(){
    if (!detectTelegram()) return;                 // обычный сайт: сеть не трогается, старт мгновенный
    loadTelegramSdk(TG_TIMEOUT).then(sdk=>{ if (sdk) applyTelegram(sdk); });
  }

  function haptic(kind){
    if(!S.haptics || !tg || !tg.HapticFeedback) return;
    try{
      if(kind==='light'||kind==='medium'||kind==='heavy') tg.HapticFeedback.impactOccurred(kind);
      else tg.HapticFeedback.notificationOccurred(kind);
    }catch(e){}
  }
  function applyViewport(){
    const h=(tg && tg.viewportStableHeight)?tg.viewportStableHeight:window.innerHeight;
    const w=window.innerWidth;
    DOC.documentElement.style.setProperty('--u',(Math.min(w,h)/100)+'px');
    P.h=Math.min(w,h);
  }

  /* ===================== ЗВУК ===================== */
  const VOICES={}; let ac=null, unlocked=false;
  function buildAudio(){
    Object.keys(SFX).forEach(k=>{
      const a=new Audio(SFX[k]); a.preload='auto';
      const b=new Audio(SFX[k]); b.preload='auto';
      VOICES[k]={list:[a,b],i:0};
    });
  }
  function sfx(name){
    const v=VOICES[name]; if(!v||S.muted||S.volume<=0) return;
    const a=v.list[v.i=(v.i+1)%v.list.length];
    try{ a.volume=S.volume; a.currentTime=0; const p=a.play(); if(p&&p.catch) p.catch(()=>synth(name)); }
    catch(e){ synth(name); }
  }
  function synth(name){
    if(S.muted) return;
    try{
      ac = ac || new (window.AudioContext||window.webkitAudioContext)();
      if(ac.state==='suspended') ac.resume();
      const t=ac.currentTime, g=ac.createGain(); g.connect(ac.destination);
      const heavy=(name==='self'||name==='other'||name==='game_over');
      g.gain.setValueAtTime(S.volume*(heavy?.5:.22),t);
      g.gain.exponentialRampToValueAtTime(.0001,t+(heavy?.35:.12));
      if(heavy){
        const buf=ac.createBuffer(1,ac.sampleRate*.35,ac.sampleRate), d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
        const src=ac.createBufferSource(); src.buffer=buf; src.connect(g); src.start(t);
      }else{
        const o=ac.createOscillator(); o.type='square';
        o.frequency.setValueAtTime(name==='blank'?180:520,t);
        o.frequency.exponentialRampToValueAtTime(90,t+.12);
        o.connect(g); o.start(t); o.stop(t+.14);
      }
    }catch(e){}
  }
  function unlockAudio(){
    if(unlocked) return; unlocked=true;
    Object.keys(VOICES).forEach(k=>VOICES[k].list.forEach(a=>{
      try{ a.volume=0; const p=a.play();
        if(p&&p.then) p.then(()=>{ a.pause(); a.currentTime=0; a.volume=S.volume; }).catch(()=>{}); }catch(e){}
    }));
  }

  /* ===================== UI ===================== */
  let bannerT=0;
  function banner(text,kind,ms){
    const el=$('banner'); if(!el) return;
    el.textContent=text; el.className='banner show '+(kind||'');
    clearTimeout(bannerT);
    bannerT=setTimeout(()=>{ el.className='banner '+(kind||''); }, ms||1300);
  }
  function canAct(){
    return !S.busy && S.phase==='player' && S.turn==='self' && !S.over &&
           !S.menuOpen && !DOC.hidden && S.shells.length>0 && !!S.input;
  }
  function setControls(){
    const ok=canAct();
    cls('input_shield','on',!ok);
    ['shoot_self','shoot_enemy','hit_dealer','hit_self'].forEach(id=>dis(id,!ok));
    cls('hit_dealer','armed',ok); cls('hit_self','armed',ok);
    cls('controls','idle',!ok);
    dis('settings_btn', S.busy && !S.over && S.phase!=='menu');
  }
  function buildHearts(){
    ['self_hearts','enemy_hearts'].forEach(id=>{
      const box=$(id); if(!box) return;
      box.innerHTML='';
      for(let i=0;i<S.maxHp;i++){ const im=new Image(); im.src=IMG.hp; im.className='heart'; im.alt=''; box.appendChild(im); }
    });
    renderHearts();
  }
  function renderHearts(broken){
    [['self_hearts','player'],['enemy_hearts','ai']].forEach(([id,who])=>{
      const box=$(id); if(!box) return;
      const kids=box.children, alive=S.hp[who];
      for(let i=0;i<kids.length;i++){
        kids[i].classList.toggle('lost', i>=alive);
        if(broken===who && i===alive){
          const node=kids[i]; node.classList.add('breaking');
          later(()=>node.classList.remove('breaking'),360);
        }
      }
    });
  }
  function flash(gold){
    const f=$('hit_flash');
    if(f){ f.className='hit_flash'+(gold?' gold':''); void f.offsetWidth; f.classList.add('on');
      later(()=>{ f.className='hit_flash'; },340); }
    if(!gold){
      const st=$('stage');
      if(st){ st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake');
        later(()=>st.classList.remove('shake'),260); }
    }
  }
  function restartGif(el,src){ if(!el) return; el.src=PIXEL; requestAnimationFrame(()=>{ el.src=src; }); }
  function dealerHit(){
    const w=$('wound');
    if(w){ w.classList.remove('hidden'); restartGif(w,IMG.wound); later(()=>w.classList.add('hidden'),300); }
    style('avatar','marginBottom','6%');
    later(()=>style('avatar','marginBottom','0'),200);
    flash(true); haptic('medium');
  }
  function nudge(img){ if(!img) return; img.style.transform='translateY(5%)'; later(()=>{ img.style.transform=''; },300); }
  function damage(who){
    if(S.hp[who]<=0) return;
    S.hp[who]=Math.max(0,S.hp[who]-1);
    renderHearts(who);
    if(who==='player'){ flash(false); haptic('heavy'); }
    if(S.hp[who]<=0) S.pendingWinner = who==='player' ? 'ai' : 'player';
  }

  /* ===================== ПАТРОНЫ ===================== */
  function makeShells(){
    const min=S.round>=5?3:2, max=S.round>=3?5:4;
    const live=min+Math.floor(Math.random()*(max-min+1));
    const arr=new Array(SHELLS_PER_ROUND).fill(false);
    for(let i=0;i<live;i++) arr[i]=true;
    return arr;
  }
  function shuffle(a){
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }
  function renderBox(arr){
    const box=$('box'); if(!box) return;
    box.innerHTML='';
    arr.forEach(v=>{
      const e=DOC.createElement('div'); e.className='element';
      const t=DOC.createElement('div'); t.className='bullet_top';
      const b=DOC.createElement('div'); b.className=v?'bottom-true':'bottom-false';
      e.appendChild(t); e.appendChild(b); box.appendChild(e);
    });
  }

  /* ===================== ПЕРЕЗАРЯДКА ===================== */
  async function reloadRound(gen){
    S.phase='reload'; S.busy=true; setControls();
    banner('RELOADING','info',1600);
    const img=$('image'), box=$('box');
    if(img){
      img.getAnimations && img.getAnimations().forEach(a=>a.cancel());
      img.className='image'; img.style.cssText=''; img.src=IMG.still;
    }
    if(box){ box.getAnimations && box.getAnimations().forEach(a=>a.cancel()); box.style.opacity='1'; }
    S.holder='self';

    const arr=makeShells();
    S.live=arr.filter(Boolean).length; S.blank=SHELLS_PER_ROUND-S.live;
    renderBox(arr); txt('round_num',S.round);

    await anim(gen,img,[{transform:'translate(0, 0) rotate(0deg)'},
      {transform:'translate(100%, -50%) rotate(60deg)'}],{duration:800,easing:'ease-in-out'});
    if(img) img.classList.add('reloading');

    await anim(gen,box,[{transform:'translate(-50%, -50%) rotate(0deg)'},
      {transform:'translate(50%, -50%) rotate(60deg)'}],{duration:2000,easing:'ease-in-out',fill:'forwards'});

    if(box) box.innerHTML='';
    sfx('shake');
    await anim(gen,box,[
      {transform:'translate(50%, -50%) rotate(360deg)'},
      {transform:'translate(60%, -50%) rotate(400deg)'},
      {transform:'translate(50%, -50%) rotate(440deg)'},
      {transform:'translate(50%, -50%) rotate(400deg)'},
      {transform:'translate(50%, -50%) rotate(360deg)'}
    ],{duration:300,iterations:3,easing:'ease-in-out',fill:'forwards'});

    later(()=>sfx('put'),800);
    const boxOut=anim(gen,box,[
      {transform:'translate(50%, -50%) rotate(360deg) scale(1)',opacity:1},
      {transform:'translate(-100%, -50%) rotate(0deg) scale(0.2)',opacity:0}
    ],{duration:1200,easing:'ease-in-out',fill:'forwards'}).catch(e=>{ if(e!==ABORT) throw e; });

    await anim(gen,img,[{transform:'translate(-100%, 110%) rotate(-90deg)'},
      {transform:'translate(200%, 110%) rotate(0deg)'}],{duration:1000,easing:'ease-in-out'});
    if(img) img.style.transform='translate(100%, -50%) scale(1.1)';

    await anim(gen,img,[{transform:'translate(200%, 110%) rotate(360deg)'},
      {transform:'translate(-130%, 110%) rotate(-360deg)'}],{duration:800,easing:'ease-in-out'});
    if(img) img.classList.remove('reloading');

    await boxOut; guard(gen);
    style('box','opacity','0');

    await wait(gen,400);
    if(img) img.style.cssText='';
    await anim(gen,img,[{transform:'translate(100%, -20%) rotate(80deg)'},
      {transform:'translate(0, 0) rotate(0deg)'}],{duration:400,easing:'ease-in-out'});

    S.shells=shuffle(arr);
  }

  /* ===================== ПЕРЕДАЧА ===================== */
  async function handoverTo(gen,target){
    if(S.holder===target) return;
    S.phase='handover'; S.busy=true; setControls();
    const img=$('image');
    if(img){
      img.style.transition='top 1200ms ease-in-out, right 1200ms ease-in-out, width 1200ms ease-in-out';
      img.classList.toggle('changed', target==='enemy');
    }
    await wait(gen,600);
    if(img) img.src = target==='enemy' ? IMG.enemyStill : IMG.still;
    S.holder=target;
    await wait(gen,1000);
    if(img) img.style.transition='';
  }

  /* ===================== ИИ ===================== */
  function aiChoose(){
    const n=S.shells.length; if(!n) return 'self';
    const p=S.live/n, aiHp=S.hp.ai, plHp=S.hp.player;
    if(S.diff==='easy' && Math.random()<.3) return Math.random()<.5?'self':'enemy';
    if(p===0) return 'self';
    if(p===1) return 'enemy';
    if(aiHp===1) return 'enemy';
    if(plHp===1 && p>=.34) return 'enemy';
    const tempo=S.diff==='hard'?1.15:.9, risk=aiHp<=2?1.7:1;
    return ((1-p)*tempo - p*risk) > (p*(plHp<=2?1.35:1)) ? 'self' : 'enemy';
  }

  /* ===================== ВЫСТРЕЛ ===================== */
  async function fire(gen,target){
    guard(gen);
    if(!S.shells.length) return;
    S.phase='shot'; S.busy=true; setControls();

    const isLive=S.shells.shift();
    S.shots++;
    if(isLive) S.live=Math.max(0,S.live-1); else S.blank=Math.max(0,S.blank-1);

    const holder=S.holder, img=$('image');
    const setSrc=s=>{ if(img) img.src=s; };
    const expand=()=>{ if(img) img.classList.add('expanded'); };

    if(holder==='self'){
      if(target==='self'){
        if(isLive){
          setSrc(IMG.self);
          await wait(gen,2200);
          sfx('self'); expand(); damage('player'); banner('LIVE — YOU BLEED','bad');
          await wait(gen,400);
        }else{
          setSrc(IMG.selfBlank);
          await wait(gen,2300);
          sfx('blank'); banner('BLANK — EXTRA TURN','ok');
          await wait(gen,400);
        }
      }else{
        if(isLive){
          setSrc(IMG.other); sfx('other');
          await wait(gen,250);
          dealerHit(); damage('ai'); banner('LIVE — DEALER HIT','warn');
          await wait(gen,700);
        }else{
          nudge(img); sfx('blank'); banner('BLANK — TURN PASSES','info');
          await wait(gen,600);
        }
      }
    }else{
      if(target==='self'){
        if(isLive){
          setSrc(IMG.enemySelf);
          await wait(gen,2000); sfx('other');
          await wait(gen,200);
          dealerHit(); damage('ai'); banner('DEALER HIT HIMSELF','warn');
          await wait(gen,250);
        }else{
          nudge(img); sfx('blank'); banner('DEALER CLICKED EMPTY — EXTRA TURN','ok');
          await wait(gen,600);
        }
      }else{
        /* исходная анимация: enemy_self.gif, 2000 / 2200 / 2450, без expanded */
        if(isLive){
          setSrc(IMG.enemySelf);
          await wait(gen,2000); sfx('other');
          await wait(gen,200);
          damage('player'); banner('LIVE — YOU ARE HIT','bad');
          await wait(gen,250);
        }else{
          setSrc(IMG.selfBlank);
          await wait(gen,2300);
          sfx('blank'); banner('DEALER WASTED A BLANK','info');
          await wait(gen,400);
        }
      }
    }

    if(img){
      img.classList.remove('expanded');
      img.style.transform='';
      img.classList.toggle('changed', holder==='enemy');
      img.src = holder==='enemy' ? IMG.enemyStill : IMG.still;
    }

    if(S.pendingWinner){ gameOver(S.pendingWinner); return; }
    sfx('reload');
    await wait(gen,450);
    S.turn = (target==='self' && !isLive) ? S.turn : other(S.turn);
  }

  /* ===================== ВВОД ===================== */
  function awaitPlayerInput(){
    return new Promise((resolve,reject)=>{
      let settled=false;
      const cancel=()=>{ if(settled) return; settled=true; pending.delete(cancel); S.input=null; reject(ABORT); };
      const done=v=>{ if(settled) return; settled=true; pending.delete(cancel); S.input=null; resolve(v); };
      pending.add(cancel); S.input=done;
    });
  }
  function act(target){
    const now=performance.now();
    if(now-S.lastAction<220) return;
    if(!canAct()) return;
    S.lastAction=now;
    S.busy=true; S.phase='shot'; setControls();
    haptic('light'); sfx('button');
    const fn=S.input; S.input=null;
    if(fn) fn(target);
  }

  /* ===================== ЦИКЛ ===================== */
  async function gameLoop(gen){
    while(true){
      guard(gen);
      if(S.over) return;
      if(!S.shells.length){
        if(S.loadedOnce) S.round++;
        S.loadedOnce=true;
        await reloadRound(gen);
      }
      await handoverTo(gen,S.turn);
      if(S.over) return;
      if(S.turn==='self'){
        S.phase='player'; S.busy=false;
        const inputP = awaitPlayerInput();   // S.input ставится до setControls → зоны активны сразу
        setControls();
        const t = await inputP;
        guard(gen);
        await fire(gen,t);
      }else{
        S.phase='ai'; S.busy=true; setControls();
        await wait(gen,700);
        await fire(gen,aiChoose());
      }
    }
  }

  /* ===================== СВЕТ / ЗАТЕМНЕНИЕ ===================== */
  let lampId=0;
  function setLight(onFlag){
    style('lamp','display', onFlag ? '' : 'none');
    style('blackout','display', onFlag ? 'none' : 'block');
  }
  function blink(){ setLight(false); later(()=>setLight(true),80); }
  function lightsOff(){
    if(DOC.hidden || S.over || Math.random()>.25) return;
    for(let i=0;i<3;i++) later(blink,i*300);
    later(()=>setLight(false),1200);
    later(()=>setLight(true),3500);
  }
  function startLamp(){ stopLamp(); lampId=setInterval(lightsOff,6000); }
  function stopLamp(){ clearInterval(lampId); lampId=0; setLight(true); }

  /* ===================== ЛЕТАЮЩИЕ GG ===================== */
  const P={items:[],raf:0,last:0,spawn:0,on:false,h:0,max:10};
  function spawnParticle(){
    const host=$('particles'); if(!host) return;
    const el=DOC.createElement('div'); el.className='moving-img';
    const k=.3+Math.random()*.5, top=Math.random()<.5;
    const xr=Math.random()<.5?[5,25]:[75,95], size=k*10;
    el.style.left=(xr[0]+Math.random()*(xr[1]-xr[0]))+'%';
    el.style.width=size+'%'; el.style.height=size+'%';
    host.appendChild(el);
    P.items.push({el,y:top?-10:100,dir:top?1:-1,v:(1+(1-k)*2)/16.67,rot:(Math.random()*60)-30});
  }
  function pTick(now){
    if(!P.on) return;
    const dt=Math.min(50,now-P.last); P.last=now;
    const ss=$('start_screen');
    if(!DOC.hidden && ss && !ss.classList.contains('hidden')){
      P.spawn+=dt;
      if(P.spawn>600 && P.items.length<P.max){ P.spawn=0; spawnParticle(); }
      const h=P.h||DOC.body.clientHeight||1;
      for(let i=P.items.length-1;i>=0;i--){
        const it=P.items[i];
        it.y+=it.v*dt*(it.dir?1:-1)/h*100;
        if(it.y>104||it.y<-12){ it.el.remove(); P.items.splice(i,1); continue; }
        it.el.style.transform='translate3d(0,'+(it.y/100*h)+'px,0) rotate('+it.rot+'deg)';
      }
    }
    P.raf=requestAnimationFrame(pTick);
  }
  function startParticles(){ if(P.on) return; P.on=true; P.last=performance.now(); P.raf=requestAnimationFrame(pTick); }
  function stopParticles(){ P.on=false; cancelAnimationFrame(P.raf); P.items.forEach(i=>i.el.remove()); P.items.length=0; }

  /* ===================== ЭКРАНЫ ===================== */
  function gameOver(winner){
    if(S.over) return;
    S.over=true; S.phase='over'; S.busy=true;
    const rounds=S.round, shots=S.shots;
    bump(); stopLamp();
    sfx('game_over'); haptic(winner==='player'?'success':'error');
    S.best=Math.max(S.best,rounds); store.set('best',S.best);
    cls('game','hidden',true); cls('end_screen','hidden',false); cls('topbar','corner',true);
    txt('end_winner', winner==='player'?'YOU SURVIVED':'THE DEALER WINS');
    style('end_winner','color', winner==='player'?'var(--acid)':'var(--blood-hi)');
    txt('st_rounds',rounds); txt('st_shots',shots); txt('st_hp',S.hp.player);
    txt('st_best',S.best); txt('best_rounds',S.best);
    txt('rank', rounds>=10?'LEGEND OF THE TABLE':rounds>=7?'TABLE BOSS':rounds>=5?'COLD BLOOD':rounds>=3?'STEADY HAND':'FRESH MEAT');
    setControls();
  }
  function resetTable(){
    const img=$('image'), box=$('box');
    if(img){ img.getAnimations && img.getAnimations().forEach(a=>a.cancel());
      img.className='image'; img.style.cssText=''; img.src=IMG.still; }
    if(box){ box.getAnimations && box.getAnimations().forEach(a=>a.cancel());
      box.style.opacity='0'; box.innerHTML=''; }
    cls('wound','hidden',true);
    style('avatar','marginBottom','0');
    const f=$('hit_flash'); if(f) f.className='hit_flash';
    const b=$('banner'); if(b) b.className='banner';
    setLight(true);
  }
  function startRun(){
    bump(); resetTable();
    S.over=false; S.pendingWinner=null; S.shells=[]; S.live=0; S.blank=0;
    S.round=1; S.shots=0; S.loadedOnce=false; S.turn='self'; S.holder='self';
    S.maxHp=HP_BY_DIFF[S.diff]||4; S.hp={player:S.maxHp,ai:S.maxHp};
    buildHearts(); txt('round_num',S.round);
    txt('own_name',S.name); txt('enemy_name','Dealer');
    cls('get_ready','show',false);
    cls('start_screen','hidden',true); cls('end_screen','hidden',true);
    cls('game','hidden',false); cls('topbar','corner',false);
    stopParticles(); startLamp();
    S.phase='reload'; S.busy=true; setControls();
    run(gameLoop);
  }
  function backToMenu(){
    bump(); stopLamp(); resetTable();
    S.over=false; S.phase='menu'; S.busy=false;
    cls('game','hidden',true); cls('end_screen','hidden',true);
    cls('start_screen','hidden',false); cls('topbar','corner',true);
    cls('start_panel','fly_out',false); cls('start_title','fly_out',false);
    cls('get_ready','show',false); cls('menu_button','fly_out',false);
    dis('menu_button',false);
    txt('best_rounds',S.best);
    startParticles(); setControls();
  }
  function playFromMenu(){
    if(S.phase!=='menu'||S.busy) return;
    S.busy=true; S.phase='intro'; setControls();
    const input=$('name_input');
    const raw=((input&&input.value)||'').replace(/[<>&"']/g,'').trim();
    S.name=raw?raw.slice(0,14):'Player'; store.set('name',S.name);
    sfx('button'); haptic('light'); dis('menu_button',true);
    later(()=>sfx('countdown'),400);
    run(async gen=>{
      await wait(gen,2400);
      cls('start_panel','fly_out',true); cls('start_title','fly_out',true);
      later(()=>cls('get_ready','show',true),500);
      await wait(gen,1600);
      sfx('vzuh'); cls('menu_button','fly_out',true);
      await wait(gen,1000);
      startRun();
    });
  }

  /* ===================== НАСТРОЙКИ ===================== */
  function openMenu(){
    if(S.menuOpen) return;
    S.menuOpen=true;
    cls('overlay','open',true); cls('settings_menu','open',true); cls('settings_btn','open',true);
    setControls();
    try{ tg && tg.BackButton && tg.BackButton.show(); }catch(e){}
  }
  function closeMenu(){
    if(!S.menuOpen) return;
    S.menuOpen=false;
    cls('overlay','open',false); cls('settings_menu','open',false); cls('settings_btn','open',false);
    setControls();
    try{ tg && tg.BackButton && tg.BackButton.hide(); }catch(e){}
  }
  function syncSettings(){
    cls('mute_btn','muted',S.muted);
    attr('set_sound','aria-pressed',String(!S.muted));
    attr('set_haptics','aria-pressed',String(S.haptics));
    const sl=$('vol_slider'); if(sl) sl.value=Math.round(S.volume*100);
    txt('vol_val',Math.round(S.volume*100)+'%');
    DOC.querySelectorAll('.seg_btn').forEach(b=>b.classList.toggle('active', b.dataset.diff===S.diff));
  }
  function setDiff(d){
    if(!HP_BY_DIFF[d]) return;
    S.diff=d; store.set('diff',d); syncSettings(); sfx('button'); haptic('light');
  }
  function toggleSound(){
    S.muted=!S.muted; store.set('muted',S.muted); syncSettings();
    if(!S.muted){ unlockAudio(); sfx('button'); }
    haptic('light');
  }

  /* ===================== ПРЕЛОАД ===================== */
  function preload(){
    const imgs=Object.values(IMG), snds=Object.values(SFX);
    const total=imgs.length+snds.length;
    let done=0;
    const tick=()=>{
      done++;
      const pct=Math.round(done/total*100);
      style('load_fill','width',pct+'%');
      txt('load_hint','Loading assets… '+pct+'%');
    };
    const once=fn=>{ let c=false; return ()=>{ if(c) return; c=true; tick(); fn(); }; };
    const tasks=[];
    imgs.forEach(src=>tasks.push(new Promise(res=>{
      const i=new Image(); const f=once(res); i.onload=f; i.onerror=f; i.src=src;
    })));
    snds.forEach(src=>tasks.push(new Promise(res=>{
      const a=new Audio(); const f=once(res); a.preload='auto';
      a.addEventListener('canplaythrough',f,{once:true});
      a.addEventListener('error',f,{once:true});
      a.src=src; try{ a.load(); }catch(e){}
      setTimeout(f,6000);
    })));
    return Promise.race([Promise.all(tasks), new Promise(r=>setTimeout(r,12000))]);
  }

  /* ===================== INIT ===================== */
  function init(){
    ensureDom();
    ensureCss();

    S.name=String(store.get('name','Player')).slice(0,14);
    const sd=store.get('diff','normal');
    S.diff=HP_BY_DIFF[sd]?sd:'normal';
    S.muted=!!store.get('muted',false);
    S.volume=Math.min(1,Math.max(0,Number(store.get('volume',.8))||0));
    S.haptics=store.get('haptics',true)!==false;
    S.best=Math.max(0,parseInt(store.get('best',0),10)||0);

    bootTelegram();          // не блокирует загрузку ни на сайте, ни в Telegram
    applyViewport();
    buildAudio();
    const ni=$('name_input'); if(ni) ni.value=S.name;
    txt('best_rounds',S.best);
    syncSettings();
    buildHearts();
    setLight(true);

    on('shoot_self','click',()=>act('self'));
    on('shoot_enemy','click',()=>act('enemy'));
    on('hit_self','click',()=>act('self'));
    on('hit_dealer','click',()=>act('enemy'));
    on('menu_button','click',playFromMenu);
    on('restart_button','click',()=>{ sfx('button'); startRun(); });
    on('menu_return','click',()=>{ sfx('button'); backToMenu(); });
    on('settings_btn','click',()=>{ sfx('button'); S.menuOpen?closeMenu():openMenu(); });
    on('close_btn','click',()=>{ sfx('button'); closeMenu(); });
    on('overlay','click',closeMenu);
    on('mute_btn','click',toggleSound);
    on('set_sound','click',toggleSound);
    on('set_haptics','click',()=>{ S.haptics=!S.haptics; store.set('haptics',S.haptics); syncSettings(); haptic('light'); });
    on('vol_slider','input',e=>{
      S.volume=Number(e.target.value)/100; store.set('volume',S.volume);
      txt('vol_val',e.target.value+'%');
      if(S.volume>0 && S.muted){ S.muted=false; store.set('muted',false); syncSettings(); }
    });
    on('vol_slider','change',()=>sfx('button'));
    on('set_restart','click',()=>{ closeMenu(); sfx('button'); startRun(); });
    DOC.querySelectorAll('.seg_btn').forEach(b=>b.addEventListener('click',()=>setDiff(b.dataset.diff)));
    on('name_input','keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); playFromMenu(); } });

    DOC.addEventListener('keydown',e=>{
      if(e.target && e.target.tagName==='INPUT') return;
      const k=e.key.toLowerCase();
      if(k==='escape'){ closeMenu(); return; }
      if(k==='m'){ toggleSound(); return; }
      if(S.menuOpen) return;
      if(k==='1'||k==='arrowleft') act('self');
      else if(k==='2'||k==='arrowright') act('enemy');
      else if(k==='r'&&S.over) startRun();
    });

    DOC.addEventListener('pointerdown',unlockAudio,{once:true});
    DOC.addEventListener('contextmenu',e=>e.preventDefault());
    DOC.addEventListener('dragstart',e=>e.preventDefault());
    DOC.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
    DOC.addEventListener('gesturestart',e=>e.preventDefault());
    DOC.addEventListener('visibilitychange',()=>setControls());
    let rt=0;
    window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(applyViewport,120); });
    window.addEventListener('orientationchange',()=>setTimeout(applyViewport,250));

    preload().then(()=>{
      ensureCss();
      cls('loading_screen','hidden',true);
      cls('topbar','hidden',false);
      backToMenu();
    });
  }

  if(DOC.readyState==='loading') DOC.addEventListener('DOMContentLoaded',init);
  else init();
})();