import { useState, useEffect, useRef, useCallback } from "react";

const COLS = 13, ROWS = 15, CELL = 48;
const W = COLS * CELL, H = ROWS * CELL;
const FROG_START = { x: 6, y: 14 };

const LANES = [
  { y:13, type:"road",  speed:1.2, dir: 1, items:[0,4,8]  },
  { y:12, type:"road",  speed:1.8, dir:-1, items:[1,5,10] },
  { y:11, type:"road",  speed:1.4, dir: 1, items:[2,6,11] },
  { y:10, type:"road",  speed:2.2, dir:-1, items:[0,3,7]  },
  { y:9,  type:"road",  speed:1.0, dir: 1, items:[1,5,9]  },
  { y:6,  type:"water", speed:1.2, dir: 1, items:[0,5,9]  },
  { y:5,  type:"water", speed:1.6, dir:-1, items:[1,6,10] },
  { y:4,  type:"water", speed:1.0, dir: 1, items:[0,4,8]  },
  { y:3,  type:"water", speed:2.0, dir:-1, items:[2,7,11] },
  { y:2,  type:"water", speed:1.4, dir: 1, items:[1,5,9]  },
  { y:1,  type:"water", speed:0.9, dir:-1, items:[0,4,8]  },
];

const CAR_W = 2*CELL-6, CAR_H = CELL-10;
const LOG_W = 3*CELL-4, LOG_H = CELL-8;
const GOAL_SLOTS = [0,2,4,6,8,10,12];
const CAR_COLORS = ["#c0392b","#e67e22","#f1c40f","#2980b9","#8e44ad"];
const CONFETTI_COLORS = ["#39ff14","#f4a261","#e63946","#90e0ef","#c77dff","#fff700","#ff69b4"];

function buildLanes() {
  return LANES.map(l => ({
    ...l,
    objects: l.items.map(col => ({ x: col * CELL })),
  }));
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function createAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const tone = (freq, type, dur, gain=0.18, t=0) => {
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type=type;
      o.frequency.setValueAtTime(freq, ctx.currentTime+t);
      g.gain.setValueAtTime(gain, ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+t+dur);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+dur+0.01);
    };
    return {
      resume(){ if(ctx.state==="suspended") ctx.resume(); },
      hop()    { tone(220,"square",0.08,0.12); tone(330,"square",0.08,0.08,0.04); },
      splat()  { tone(80,"sawtooth",0.3,0.25); tone(60,"sawtooth",0.3,0.20,0.05); tone(120,"sawtooth",0.2,0.15,0.10); },
      goal()   { [523,659,784,1047].forEach((f,i)=>tone(f,"square",0.15,0.15,i*0.1)); },
      levelUp(){ [523,659,784,1047,1319,1047,784,659,523].forEach((f,i)=>tone(f,"square",0.18,0.2,i*0.08)); },
      gameOver(){ [440,370,311,262,220].forEach((f,i)=>tone(f,"sawtooth",0.3,0.25,i*0.15)); },
    };
  } catch { const n=()=>{}; return {resume:n,hop:n,splat:n,goal:n,levelUp:n,gameOver:n}; }
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawCar(ctx, x, y, w, h, color, dir) {
  ctx.fillStyle="rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(x+w/2,y+h+3,w*0.42,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.roundRect(x,y+h*0.38,w,h*0.62,5); ctx.fill();
  const rx=x+w*0.18, rw=w*0.64;
  ctx.beginPath(); ctx.roundRect(rx,y+2,rw,h*0.46,5); ctx.fill();
  ctx.fillStyle="rgba(160,220,255,0.55)";
  if(dir===1){
    ctx.beginPath(); ctx.moveTo(rx+rw-2,y+4); ctx.lineTo(x+w-4,y+h*0.42); ctx.lineTo(x+w-4,y+h*0.5); ctx.lineTo(rx+rw-2,y+h*0.46); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(rx+2,y+4);    ctx.lineTo(x+6,y+h*0.42);   ctx.lineTo(x+6,y+h*0.5);   ctx.lineTo(rx+2,y+h*0.46);    ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(rx+2,y+4);    ctx.lineTo(x+4,y+h*0.42);   ctx.lineTo(x+4,y+h*0.5);   ctx.lineTo(rx+2,y+h*0.46);    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(rx+rw-2,y+4); ctx.lineTo(x+w-6,y+h*0.42); ctx.lineTo(x+w-6,y+h*0.5); ctx.lineTo(rx+rw-2,y+h*0.46); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle="rgba(0,0,0,0.18)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x+w*0.5,y+h*0.38); ctx.lineTo(x+w*0.5,y+h); ctx.stroke();
  const wr=h*0.19, wy=y+h-wr+1;
  [[x+w*0.18,wy],[x+w*0.78,wy]].forEach(([wx,wy2])=>{
    ctx.fillStyle="#1a1a1a"; ctx.beginPath(); ctx.ellipse(wx,wy2,wr+1,wr,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#c0c0c0"; ctx.beginPath(); ctx.ellipse(wx,wy2,wr*0.55,wr*0.52,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#888";    ctx.beginPath(); ctx.arc(wx,wy2,wr*0.18,0,Math.PI*2); ctx.fill();
  });
  const fx=dir===1?x+w-5:x+2, bx=dir===1?x+2:x+w-5;
  ctx.fillStyle="#fffde7";
  ctx.beginPath(); ctx.ellipse(fx,y+h*0.52,3,4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(fx,y+h*0.78,3,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(255,253,180,0.22)";
  ctx.beginPath(); ctx.ellipse(fx+(dir===1?4:-4),y+h*0.65,7,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#e74c3c";
  ctx.beginPath(); ctx.ellipse(bx,y+h*0.52,3,4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx,y+h*0.78,3,4,0,0,Math.PI*2); ctx.fill();
}

function drawLog(ctx, x, y, w, h) {
  ctx.fillStyle="rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(x+w/2,y+h+3,w*0.45,4,0,0,Math.PI*2); ctx.fill();
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,"#a0673a"); g.addColorStop(0.3,"#8B5E3C"); g.addColorStop(0.7,"#6b4226"); g.addColorStop(1,"#4a2e17");
  ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(x,y,w,h,6); ctx.fill();
  const cw=10;
  [x, x+w-cw].forEach((cx,side)=>{
    const cg=ctx.createRadialGradient(cx+cw/2,y+h/2,1,cx+cw/2,y+h/2,cw);
    cg.addColorStop(0,"#c4864a"); cg.addColorStop(0.5,"#8B5E3C"); cg.addColorStop(1,"#5a3820");
    ctx.fillStyle=cg;
    ctx.beginPath(); ctx.roundRect(cx,y,cw,h,side===0?[6,0,0,6]:[0,6,6,0]); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=0.7;
    [0.25,0.5,0.75].forEach(t=>{ ctx.beginPath(); ctx.ellipse(cx+cw/2,y+h/2,cw*0.3*t,h*0.35*t,0,0,Math.PI*2); ctx.stroke(); });
  });
  ctx.strokeStyle="rgba(0,0,0,0.15)"; ctx.lineWidth=1;
  for(let i=1;i<Math.floor(w/18);i++){
    const gx=x+cw+(w-cw*2)*(i/Math.floor(w/18));
    ctx.beginPath(); ctx.moveTo(gx,y+3); ctx.bezierCurveTo(gx-3,y+h*0.4,gx+3,y+h*0.6,gx,y+h-3); ctx.stroke();
  }
  ctx.fillStyle="rgba(255,255,255,0.07)";
  ctx.beginPath(); ctx.roundRect(x+cw,y+2,w-cw*2,h*0.3,3); ctx.fill();
}

function drawFrog(ctx, cx, cy) {
  const S=CELL*0.82;
  ctx.fillStyle="rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(cx,cy+S*0.38,S*0.38,S*0.1,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#2d6a2d"; ctx.lineWidth=S*0.13; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(cx-S*0.18,cy+S*0.12); ctx.quadraticCurveTo(cx-S*0.44,cy+S*0.28,cx-S*0.36,cy+S*0.40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+S*0.18,cy+S*0.12); ctx.quadraticCurveTo(cx+S*0.44,cy+S*0.28,cx+S*0.36,cy+S*0.40); ctx.stroke();
  ctx.fillStyle="#2d6a2d";
  ctx.beginPath(); ctx.ellipse(cx-S*0.36,cy+S*0.44,S*0.10,S*0.06,-0.4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+S*0.36,cy+S*0.44,S*0.10,S*0.06, 0.4,0,Math.PI*2); ctx.fill();
  const bg=ctx.createRadialGradient(cx-S*0.06,cy+S*0.02,S*0.04,cx,cy+S*0.08,S*0.32);
  bg.addColorStop(0,"#5cd65c"); bg.addColorStop(0.6,"#3aaa3a"); bg.addColorStop(1,"#1f6b1f");
  ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(cx,cy+S*0.1,S*0.30,S*0.26,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.ellipse(cx,cy+S*0.08,S*0.16,S*0.12,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#2d8a2d"; ctx.lineWidth=S*0.10;
  ctx.beginPath(); ctx.moveTo(cx-S*0.22,cy+S*0.04); ctx.quadraticCurveTo(cx-S*0.40,cy+S*0.12,cx-S*0.34,cy+S*0.26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+S*0.22,cy+S*0.04); ctx.quadraticCurveTo(cx+S*0.40,cy+S*0.12,cx+S*0.34,cy+S*0.26); ctx.stroke();
  ctx.fillStyle="#2d8a2d";
  ctx.beginPath(); ctx.ellipse(cx-S*0.34,cy+S*0.29,S*0.08,S*0.05,-0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+S*0.34,cy+S*0.29,S*0.08,S*0.05, 0.3,0,Math.PI*2); ctx.fill();
  const hg=ctx.createRadialGradient(cx,cy-S*0.14,S*0.02,cx,cy-S*0.10,S*0.26);
  hg.addColorStop(0,"#6de06d"); hg.addColorStop(0.7,"#3aaa3a"); hg.addColorStop(1,"#1f6b1f");
  ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(cx,cy-S*0.10,S*0.28,S*0.20,0,0,Math.PI*2); ctx.fill();
  const ey=cy-S*0.24;
  [cx-S*0.17, cx+S*0.17].forEach(ex=>{
    ctx.fillStyle="#2d8a2d"; ctx.beginPath(); ctx.arc(ex,ey,S*0.115,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#f0f0e0"; ctx.beginPath(); ctx.arc(ex,ey,S*0.088,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#c8a228"; ctx.beginPath(); ctx.arc(ex,ey+S*0.01,S*0.055,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#111";    ctx.beginPath(); ctx.ellipse(ex,ey+S*0.01,S*0.018,S*0.044,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.arc(ex-S*0.025,ey-S*0.025,S*0.022,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle="#1a5c1a";
  ctx.beginPath(); ctx.arc(cx-S*0.07,cy-S*0.06,S*0.022,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+S*0.07,cy-S*0.06,S*0.022,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#1a5c1a"; ctx.lineWidth=S*0.025; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(cx-S*0.14,cy-S*0.02); ctx.quadraticCurveTo(cx,cy+S*0.04,cx+S*0.14,cy-S*0.02); ctx.stroke();
}

function drawLilyPad(ctx, cx, cy, filled) {
  const r=CELL*0.40;
  ctx.save();
  ctx.fillStyle=filled?"#27ae60":"#1a6b35";
  ctx.beginPath(); ctx.arc(cx,cy,r,0.35,Math.PI*2-0.35); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=filled?"rgba(0,0,0,0.15)":"rgba(255,255,255,0.08)"; ctx.lineWidth=0.8;
  for(let a=0.6;a<Math.PI*1.9;a+=0.38){ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*r*0.9,cy+Math.sin(a)*r*0.9); ctx.stroke(); }
  ctx.strokeStyle=filled?"rgba(100,255,120,0.5)":"rgba(80,180,80,0.3)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(cx,cy,r-1,0.35,Math.PI*2-0.35); ctx.stroke();
  if(filled){
    ctx.fillStyle="#f39c12"; ctx.beginPath(); ctx.arc(cx,cy-r*0.3,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff";
    for(let a=0;a<Math.PI*2;a+=Math.PI/3){ ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*6,cy-r*0.3+Math.sin(a)*6,3,2,a,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();
}

function drawRoad(ctx, y) {
  const g=ctx.createLinearGradient(0,y,0,y+CELL);
  g.addColorStop(0,"#2c2c2c"); g.addColorStop(0.5,"#1e1e1e"); g.addColorStop(1,"#2c2c2c");
  ctx.fillStyle=g; ctx.fillRect(0,y,W,CELL);
  ctx.strokeStyle="#5a5a2a"; ctx.lineWidth=2; ctx.setLineDash([18,14]);
  ctx.beginPath(); ctx.moveTo(0,y+CELL-1); ctx.lineTo(W,y+CELL-1); ctx.stroke();
  ctx.setLineDash([]);
}

function drawWater(ctx, y, tick) {
  const g=ctx.createLinearGradient(0,y,0,y+CELL);
  g.addColorStop(0,"#0a3a6a"); g.addColorStop(0.5,"#0d4f8c"); g.addColorStop(1,"#092e57");
  ctx.fillStyle=g; ctx.fillRect(0,y,W,CELL);
  ctx.strokeStyle="rgba(100,180,255,0.12)"; ctx.lineWidth=1;
  for(let wx=(tick*0.4)%30-30;wx<W+30;wx+=30){
    ctx.beginPath(); ctx.moveTo(wx,y+CELL*0.35); ctx.quadraticCurveTo(wx+8,y+CELL*0.28,wx+16,y+CELL*0.35); ctx.quadraticCurveTo(wx+24,y+CELL*0.42,wx+32,y+CELL*0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx+6,y+CELL*0.65); ctx.quadraticCurveTo(wx+14,y+CELL*0.58,wx+22,y+CELL*0.65); ctx.quadraticCurveTo(wx+30,y+CELL*0.72,wx+38,y+CELL*0.65); ctx.stroke();
  }
}

function drawGrass(ctx, y) {
  const g=ctx.createLinearGradient(0,y,0,y+CELL);
  g.addColorStop(0,"#1a5c20"); g.addColorStop(0.5,"#206b28"); g.addColorStop(1,"#174d1c");
  ctx.fillStyle=g; ctx.fillRect(0,y,W,CELL);
  ctx.fillStyle="rgba(255,255,255,0.04)";
  for(let gx=6;gx<W;gx+=14){ ctx.beginPath(); ctx.arc(gx,y+CELL*0.5,2,0,Math.PI*2); ctx.fill(); }
}

function useScale() {
  const [scale,setScale]=useState(1);
  useEffect(()=>{
    function calc(){
      const aH=window.innerHeight-280, aW=window.innerWidth-24;
      setScale(Math.min(1, aH/H, aW/W));
    }
    calc();
    window.addEventListener("resize",calc);
    return ()=>window.removeEventListener("resize",calc);
  },[]);
  return scale;
}

export default function FroggerGame({ onBack }) {
  const canvasRef    = useRef(null);
  const frameRef     = useRef(null);
  const lastFrameRef = useRef(null);
  const debounceRef  = useRef(0);
  const audioRef     = useRef(null);
  const tickRef      = useRef(0);
  const scale        = useScale();

  const stateRef = useRef({
    frog: { ...FROG_START, onLog:false, logVelX:0 },
    lanes: buildLanes(),
    lives:3, score:0, level:1,
    goals: Array(7).fill(false),
    phase: "playing",
    deadTimer:0, winTimer:0, winFlash:0,
    particles:[], confetti:[], highScore:0,
  });

  const [ui,setUi] = useState({ lives:3,score:0,level:1,phase:"playing",highScore:0 });

  const audio = useCallback(()=>{
    if(!audioRef.current) audioRef.current=createAudio();
    audioRef.current.resume();
    return audioRef.current;
  },[]);

  const syncUi = useCallback(()=>{
    const s=stateRef.current;
    setUi({lives:s.lives,score:s.score,level:s.level,phase:s.phase,highScore:s.highScore});
  },[]);

  const resetFrog = useCallback(()=>{
    stateRef.current.frog={...FROG_START,onLog:false,logVelX:0};
  },[]);

  const spawnConfetti = useCallback((cx,cy,n=30)=>{
    const s=stateRef.current;
    for(let i=0;i<n;i++){
      const a=(Math.PI*2*i)/n+Math.random()*0.4, sp=3+Math.random()*5;
      s.confetti.push({ x:cx,y:cy, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-4,
        life:80+Math.random()*40, maxLife:120,
        color:CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)],
        size:4+Math.random()*5, rot:Math.random()*Math.PI*2, rotV:(Math.random()-0.5)*0.3 });
    }
  },[]);

  const killFrog = useCallback(()=>{
    const s=stateRef.current;
    if(s.phase!=="playing") return;
    audio().splat();
    for(let i=0;i<16;i++) s.particles.push({ x:s.frog.x*CELL+CELL/2,y:s.frog.y*CELL+CELL/2, vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7, life:50,color:"#4caf50" });
    s.lives--;
    if(s.lives<=0){ s.phase="gameover"; s.highScore=Math.max(s.highScore,s.score); audio().gameOver(); }
    else { s.phase="dead"; s.deadTimer=70; }
    syncUi();
  },[audio,syncUi]);

  const triggerLevelWin = useCallback(()=>{
    const s=stateRef.current;
    s.score+=500; s.phase="levelwin"; s.winTimer=180; s.winFlash=0;
    for(let i=0;i<8;i++) spawnConfetti(Math.random()*W,Math.random()*H*0.5,20);
    audio().levelUp(); syncUi();
  },[audio,spawnConfetti,syncUi]);

  const nextLevel = useCallback(()=>{
    const s=stateRef.current;
    s.level++; s.goals=Array(7).fill(false);
    s.lanes=buildLanes();
    s.lanes.forEach(l=>{ l.speed*=1+(s.level-1)*0.08; });
    s.confetti=[]; s.particles=[]; s.phase="playing";
    resetFrog(); syncUi();
  },[resetFrog,syncUi]);

  const restartGame = useCallback(()=>{
    const s=stateRef.current;
    s.lives=3; s.score=0; s.level=1;
    s.goals=Array(7).fill(false);
    s.lanes=buildLanes();
    s.particles=[]; s.confetti=[]; s.phase="playing";
    resetFrog(); syncUi();
  },[resetFrog,syncUi]);

  const draw = useCallback((ctx)=>{
    const s=stateRef.current, t=tickRef.current;
    ctx.fillStyle="#0a1a0a"; ctx.fillRect(0,0,W,H);
    drawGrass(ctx,0); drawGrass(ctx,7*CELL); drawGrass(ctx,14*CELL);
    s.lanes.filter(l=>l.type==="road").forEach(l=>drawRoad(ctx,l.y*CELL));
    s.lanes.filter(l=>l.type==="water").forEach(l=>drawWater(ctx,l.y*CELL,t));
    GOAL_SLOTS.forEach((col,i)=>drawLilyPad(ctx,col*CELL+CELL/2,CELL/2,s.goals[i]));
    s.lanes.forEach(lane=>{
      lane.objects.forEach((obj,i)=>{
        if(lane.type==="road") drawCar(ctx,obj.x+3,lane.y*CELL+5,CAR_W,CAR_H,CAR_COLORS[i%CAR_COLORS.length],lane.dir);
        else drawLog(ctx,obj.x+2,lane.y*CELL+4,LOG_W,LOG_H);
      });
    });
    s.particles.forEach(p=>{
      const a=Math.floor((p.life/50)*255).toString(16).padStart(2,"0");
      ctx.fillStyle=p.color+a; ctx.beginPath(); ctx.arc(p.x,p.y,3.5,0,Math.PI*2); ctx.fill();
    });
    s.confetti.forEach(c=>{
      const a=Math.floor((c.life/c.maxLife)*255).toString(16).padStart(2,"0");
      ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.rot);
      ctx.fillStyle=c.color+a; ctx.fillRect(-c.size/2,-c.size/2,c.size,c.size*0.5); ctx.restore();
    });
    if(s.phase==="playing"||s.phase==="levelwin"||s.phase==="dead"){
      drawFrog(ctx, s.frog.x*CELL+CELL/2, s.frog.y*CELL+CELL/2);
    }
    if(s.phase==="levelwin"){
      const fa=Math.abs(Math.sin(s.winFlash*0.12))*0.15;
      ctx.fillStyle=`rgba(50,220,80,${fa})`; ctx.fillRect(0,0,W,H);
    }
  },[]);

  const update = useCallback(()=>{
    const s=stateRef.current;
    const now=performance.now();
    const dt=Math.min((now-(lastFrameRef.current||now))/16.67,3);
    lastFrameRef.current=now; tickRef.current++;

    if(s.phase==="levelwin"){
      s.winTimer--; s.winFlash++;
      s.confetti.forEach(c=>{c.x+=c.vx;c.y+=c.vy;c.vy+=0.15;c.vx*=0.99;c.rot+=c.rotV;c.life--;});
      s.confetti=s.confetti.filter(c=>c.life>0);
      return;
    }
    if(s.phase==="dead"){
      s.deadTimer--;
      s.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.life--;});
      s.particles=s.particles.filter(p=>p.life>0);
      if(s.deadTimer<=0){resetFrog();s.phase="playing";syncUi();}
      return;
    }
    if(s.phase!=="playing") return;

    s.lanes.forEach(lane=>{
      lane.objects.forEach(obj=>{
        obj.x+=lane.speed*lane.dir*dt;
        const ow=lane.type==="road"?CAR_W:LOG_W;
        if(lane.dir===1&&obj.x>W) obj.x=-ow;
        if(lane.dir===-1&&obj.x<-ow) obj.x=W;
      });
    });
    s.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;});
    s.particles=s.particles.filter(p=>p.life>0);

    if(s.frog.onLog){
      s.frog.x+=s.frog.logVelX/CELL*dt;
      if(s.frog.x<0||s.frog.x>COLS-1){killFrog();return;}
    }

    const fy=s.frog.y, fxPx=s.frog.x*CELL+CELL/2, fyPx=fy*CELL+CELL/2;

    if(fy===0){
      const slot=GOAL_SLOTS.findIndex(c=>Math.abs(s.frog.x-c)<0.8);
      if(slot!==-1&&!s.goals[slot]){
        s.goals[slot]=true; s.score+=230; audio().goal();
        spawnConfetti(GOAL_SLOTS[slot]*CELL+CELL/2,CELL/2,18);
        if(s.goals.every(Boolean)){triggerLevelWin();return;}
        resetFrog();
      } else {killFrog();return;}
    }

    s.frog.onLog=false; s.frog.logVelX=0;
    const lane=s.lanes.find(l=>l.y===fy);
    if(lane){
      if(lane.type==="road"){
        if(lane.objects.some(o=>fxPx>o.x+4&&fxPx<o.x+CAR_W-4&&fyPx>lane.y*CELL+5&&fyPx<lane.y*CELL+CELL-5)){killFrog();return;}
      } else {
        const log=lane.objects.find(o=>fxPx>o.x+4&&fxPx<o.x+LOG_W-4);
        if(log){s.frog.onLog=true;s.frog.logVelX=lane.speed*lane.dir;}
        else{killFrog();return;}
      }
    }
  },[killFrog,triggerLevelWin,resetFrog,syncUi,spawnConfetti,audio]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const loop=()=>{ update(); draw(ctx); frameRef.current=requestAnimationFrame(loop); };
    frameRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(frameRef.current);
  },[update,draw]);

  useEffect(()=>{
    const onKey=e=>{
      const s=stateRef.current;
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) e.preventDefault();
      if(s.phase!=="playing") return;
      const now=Date.now(); if(now-debounceRef.current<150) return; debounceRef.current=now;
      audio().hop();
      const f=s.frog, py=f.y;
      if(e.key==="ArrowUp"||e.key==="w")    f.y=Math.max(0,f.y-1);
      else if(e.key==="ArrowDown"||e.key==="s")  f.y=Math.min(14,f.y+1);
      else if(e.key==="ArrowLeft"||e.key==="a")  f.x=Math.max(0,f.x-1);
      else if(e.key==="ArrowRight"||e.key==="d") f.x=Math.min(12,f.x+1);
      else return;
      if(f.y<py) s.score+=10;
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[audio]);

  const dpad = useCallback((dir)=>{
    const s=stateRef.current; if(s.phase!=="playing") return;
    audio().hop();
    const f=s.frog, py=f.y;
    if(dir==="up")    f.y=Math.max(0,f.y-1);
    else if(dir==="down")  f.y=Math.min(14,f.y+1);
    else if(dir==="left")  f.x=Math.max(0,f.x-1);
    else if(dir==="right") f.x=Math.min(12,f.x+1);
    if(f.y<py) s.score+=10;
  },[audio]);

  const btnD = { width:56,height:56,borderRadius:12,background:"#0d1f0d",border:"2px solid #39ff14",color:"#39ff14",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",userSelect:"none",WebkitUserSelect:"none",fontFamily:"'Press Start 2P',monospace" };
  const oBtn = { background:"transparent",border:"2px solid #39ff14",color:"#39ff14",fontFamily:"'Press Start 2P',monospace",fontSize:9,padding:"10px 20px",cursor:"pointer",borderRadius:6,letterSpacing:1 };

  return (
    <div style={{minHeight:"100vh",background:"#060e06",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"16px 8px",fontFamily:"'Press Start 2P',monospace"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes pulse{from{opacity:.7;transform:scale(1)}to{opacity:1;transform:scale(1.06)}}`}
      </style>

      <div style={{width:"100%",maxWidth:W*scale,display:"flex",alignItems:"center",marginBottom:8,gap:8}}>
        {onBack && <button onClick={onBack} style={{background:"#1a2e1a",border:"1px solid #39ff1488",color:"#39ff14",fontFamily:"'Press Start 2P',monospace",fontSize:7,padding:"6px 14px",cursor:"pointer",borderRadius:4,letterSpacing:1}}>← BACK</button>}
        <div style={{flex:1,textAlign:"center",color:"#39ff14",fontSize:18,letterSpacing:3,textShadow:"0 0 16px #39ff14"}}>🐸 FROGGER</div>
      </div>

      <div style={{display:"flex",gap:16,marginBottom:8,color:"#fff",fontSize:9,letterSpacing:1,flexWrap:"wrap",justifyContent:"center"}}>
        <span>SCORE <span style={{color:"#39ff14"}}>{ui.score}</span></span>
        <span>HI <span style={{color:"#f4a261"}}>{ui.highScore}</span></span>
        <span>LVL <span style={{color:"#90e0ef"}}>{ui.level}</span></span>
        <span>{"🐸".repeat(Math.max(0,ui.lives))}</span>
      </div>

      <div style={{position:"relative",width:W*scale,height:H*scale,flexShrink:0}}>
        <canvas ref={canvasRef} width={W} height={H} style={{display:"block",border:"2px solid #39ff1444",boxShadow:"0 0 40px rgba(30,120,30,0.3)",borderRadius:4,width:W*scale,height:H*scale}}/>

        {ui.phase==="levelwin" && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16*scale,pointerEvents:"none"}}>
            <div style={{color:"#39ff14",fontSize:22*scale,textShadow:"0 0 24px #39ff14,0 0 48px #39ff14",animation:"pulse 0.4s infinite alternate"}}>LEVEL {ui.level-1}</div>
            <div style={{color:"#fff700",fontSize:13*scale,letterSpacing:2,textShadow:"0 0 12px #fff700"}}>COMPLETE!</div>
            <div style={{color:"#ffffff88",fontSize:8*scale}}>+500 BONUS</div>
          </div>
        )}

        {ui.phase==="gameover" && (
          <div style={{position:"absolute",inset:0,background:"#000000cc",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16*scale}}>
            <div style={{color:"#e63946",fontSize:18*scale,textShadow:"0 0 16px #e63946"}}>GAME OVER</div>
            <div style={{color:"#fff",fontSize:8*scale}}>SCORE: {ui.score}</div>
            {ui.score>0&&ui.score>=ui.highScore&&<div style={{color:"#f4a261",fontSize:8*scale}}>★ NEW HIGH SCORE ★</div>}
            <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
              <button onClick={restartGame} style={oBtn}>PLAY AGAIN</button>
              {onBack&&<button onClick={onBack} style={{...oBtn,borderColor:"#ffffff44",color:"#ffffff66"}}>← GAMES</button>}
            </div>
          </div>
        )}
      </div>

      {ui.phase==="levelwin" && (
        <button onClick={nextLevel} style={{marginTop:14,background:"#39ff1422",border:"2px solid #39ff14",color:"#39ff14",fontFamily:"'Press Start 2P',monospace",fontSize:10,padding:"12px 28px",cursor:"pointer",borderRadius:8,letterSpacing:1,boxShadow:"0 0 20px #39ff1466"}}>
          NEXT LEVEL ▶
        </button>
      )}

      {ui.phase==="playing" && (
        <div style={{marginTop:16,display:"grid",gridTemplateColumns:"56px 56px 56px",gap:6}}>
          <div/><button style={btnD} onPointerDown={()=>dpad("up")}>▲</button><div/>
          <button style={btnD} onPointerDown={()=>dpad("left")}>◀</button><div/><button style={btnD} onPointerDown={()=>dpad("right")}>▶</button>
          <div/><button style={btnD} onPointerDown={()=>dpad("down")}>▼</button><div/>
        </div>
      )}

      <div style={{marginTop:10,color:"#ffffff33",fontSize:7,letterSpacing:1}}>
        ARROW KEYS OR WASD • D-PAD ON MOBILE
      </div>
    </div>
  );
}
