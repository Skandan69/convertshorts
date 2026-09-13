// ---------- backgrounds registry ----------
// Each entry's draw() renders onto the already-cleared canvas (ctx/W/H/GROUND_Y come from render.js's
// module-level setup). To add a new background: add one entry here — it automatically appears in the
// Background dropdown (via BACKGROUND_LIST, read by ui.js) and can be targeted by the prompt parser's
// detectBackground() in scene.js.
const BACKGROUNDS = {
  white: {
    label: 'Plain whiteboard',
    draw: ()=>{ ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H); }
  },
  sky: {
    label: 'Sky / park',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#bfe3ff'); g.addColorStop(1,'#eaf7ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(700,70,32,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      [[120,70,26],[160,80,20],[95,85,18],[400,50,22],[440,60,18]].forEach(c=>{
        ctx.beginPath(); ctx.arc(c[0],c[1],c[2],0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#cdeccb'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  grid: {
    label: 'Graph paper',
    draw: ()=>{
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = '#e5e9f2'; ctx.lineWidth = 1;
      for(let x=0;x<=W;x+=25){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for(let y=0;y<=H;y+=25){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    }
  },
  cafe: {
    label: 'Cafe (indoor)',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#f3e0c8'); g.addColorStop(1,'#f8ecd9');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#cfe8f0'; ctx.fillRect(60,50,150,110);
      ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 6; ctx.strokeRect(60,50,150,110);
      ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(135,50); ctx.lineTo(135,160); ctx.moveTo(60,105); ctx.lineTo(210,105); ctx.stroke();
      ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(650,0); ctx.lineTo(650,36); ctx.stroke();
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath(); ctx.moveTo(628,36); ctx.lineTo(672,36); ctx.lineTo(662,62); ctx.lineTo(638,62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9a877'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  office: {
    label: 'Office',
    draw: ()=>{
      ctx.fillStyle = '#eef1f5'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#cfe3f2'; ctx.fillRect(600,40,150,100);
      ctx.strokeStyle = '#8a94a3'; ctx.lineWidth = 4; ctx.strokeRect(600,40,150,100);
      ctx.beginPath(); ctx.moveTo(675,40); ctx.lineTo(675,140); ctx.moveTo(600,90); ctx.lineTo(750,90); ctx.stroke();
      ctx.fillStyle = '#8b5e3c'; ctx.fillRect(80, GROUND_Y-50, 160, 12);
      ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(90, GROUND_Y-38); ctx.lineTo(90, GROUND_Y); ctx.moveTo(230, GROUND_Y-38); ctx.lineTo(230, GROUND_Y); ctx.stroke();
      ctx.fillStyle = '#333'; ctx.fillRect(120, GROUND_Y-95, 60, 40);
      ctx.fillStyle = '#7fd0ff'; ctx.fillRect(125, GROUND_Y-90, 50, 30);
      ctx.fillStyle = '#333'; ctx.fillRect(145, GROUND_Y-55, 10, 6);
      ctx.fillStyle = '#e6e9ee'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  bedroom: {
    label: 'Bedroom',
    draw: ()=>{
      ctx.fillStyle = '#f6e9ee'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#c9a0ad'; ctx.fillRect(600, GROUND_Y-70, 170, 70);
      ctx.strokeStyle = '#8a5b68'; ctx.lineWidth = 3; ctx.strokeRect(600, GROUND_Y-70, 170, 70);
      ctx.fillStyle = '#fff'; ctx.fillRect(608, GROUND_Y-64, 40, 24);
      ctx.strokeRect(608, GROUND_Y-64, 40, 24);
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(60, GROUND_Y); ctx.lineTo(60, GROUND_Y-90); ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.moveTo(35,GROUND_Y-90); ctx.lineTo(85,GROUND_Y-90); ctx.lineTo(75,GROUND_Y-120); ctx.lineTo(45,GROUND_Y-120); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8d3c5'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  street: {
    label: 'City street',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#c9d6e3'); g.addColorStop(1,'#e8eef4');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#9aa8bb';
      [[20,120,60,160],[100,90,70,190],[190,140,50,140],[560,100,70,180],[650,130,60,150],[720,80,60,200]].forEach(b=>{
        ctx.fillRect(b[0], b[1], b[2], b[3]);
      });
      ctx.fillStyle = '#b7bec9'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
      ctx.strokeStyle = '#9aa1ad'; ctx.lineWidth = 1.5;
      for(let x=20;x<W;x+=60){ ctx.beginPath(); ctx.moveTo(x,GROUND_Y); ctx.lineTo(x-10,H); ctx.stroke(); }
    }
  },
  beach: {
    label: 'Beach',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,GROUND_Y-40);
      g.addColorStop(0,'#bdeaff'); g.addColorStop(1,'#e7f8ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,GROUND_Y-40);
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(700,60,30,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4fb3d9'; ctx.fillRect(0,GROUND_Y-40,W,40);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,GROUND_Y-20); ctx.quadraticCurveTo(W/2,GROUND_Y-10,W,GROUND_Y-20); ctx.stroke();
      ctx.fillStyle = '#f2e2b6'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  forest: {
    label: 'Forest',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#cdeccb'); g.addColorStop(1,'#eafaf0');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      [[60,260],[150,240],[600,250],[700,270],[500,230]].forEach(([tx,ty])=>{
        ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(tx,GROUND_Y); ctx.lineTo(tx,ty); ctx.stroke();
        ctx.fillStyle = '#4a8f4f';
        ctx.beginPath(); ctx.arc(tx,ty-10,34,0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#8fce6a'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  gym: {
    label: 'Gym',
    draw: ()=>{
      ctx.fillStyle = '#e9ecf1'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = '#c3c9d4'; ctx.lineWidth = 4;
      for(let x=100;x<720;x+=100){ ctx.beginPath(); ctx.moveTo(x,60); ctx.lineTo(x,GROUND_Y-20); ctx.stroke(); }
      ctx.fillStyle = '#333'; ctx.fillRect(560, GROUND_Y-50, 90, 12);
      [568,588,608,628].forEach(x=>{ ctx.beginPath(); ctx.arc(x,GROUND_Y-44,10,0,Math.PI*2); ctx.fill(); });
      const g = ctx.createLinearGradient(0,GROUND_Y,0,H);
      g.addColorStop(0,'#c98a4b'); g.addColorStop(1,'#a5713a');
      ctx.fillStyle = g; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  school: {
    label: 'Classroom',
    draw: ()=>{
      ctx.fillStyle = '#fdf6e9'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#2f5233'; ctx.fillRect(60,40,220,120);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 6; ctx.strokeRect(60,40,220,120);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(90,90); ctx.lineTo(180,90); ctx.moveTo(90,120); ctx.lineTo(220,120); ctx.stroke();
      ctx.fillStyle = '#cfe3f2'; ctx.fillRect(620,50,110,90);
      ctx.strokeStyle = '#8a94a3'; ctx.lineWidth = 3; ctx.strokeRect(620,50,110,90);
      ctx.fillStyle = '#e6d8bd'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  space: {
    label: 'Outer Space',
    draw: ()=>{
      ctx.fillStyle = '#0b1026'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff';
      for(let i=0;i<60;i++){
        const sx = (i*97) % W, sy = (i*53) % (GROUND_Y-10);
        ctx.beginPath(); ctx.arc(sx, sy, (i%3===0)?1.6:0.9, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#f4a261';
      ctx.beginPath(); ctx.arc(650,90,36,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(650,90,54,14,-0.3,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#3a3f5a'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  restaurant: {
    label: 'Restaurant',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#3a2a2a'); g.addColorStop(1,'#5a3f3a');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#f2c879';
      [[150,90],[400,70],[620,100]].forEach(([lx,ly])=>{
        ctx.beginPath(); ctx.arc(lx,ly,20,0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#6b4a30'; ctx.fillRect(60, GROUND_Y-30, 120, 8);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(75, GROUND_Y-22); ctx.lineTo(75, GROUND_Y); ctx.moveTo(165, GROUND_Y-22); ctx.lineTo(165, GROUND_Y); ctx.stroke();
      ctx.fillStyle = '#4a3530'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  farm: {
    label: 'Farm',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#bfe3ff'); g.addColorStop(1,'#eaf7ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#b91c1c'; ctx.fillRect(580, GROUND_Y-110, 130, 90);
      ctx.beginPath(); ctx.moveTo(570,GROUND_Y-110); ctx.lineTo(645,GROUND_Y-160); ctx.lineTo(720,GROUND_Y-110); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(625, GROUND_Y-70, 30, 50);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3;
      for(let x=20;x<300;x+=40){ ctx.beginPath(); ctx.moveTo(x,GROUND_Y); ctx.lineTo(x,GROUND_Y-24); ctx.lineTo(x+40,GROUND_Y-24); ctx.stroke(); }
      ctx.fillStyle = '#e0a94c';
      ctx.beginPath(); ctx.ellipse(400,GROUND_Y-14,26,14,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c9a877'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  mountain: {
    label: 'Mountains',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#bfe3ff'); g.addColorStop(1,'#eaf7ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(150,140); ctx.lineTo(320,GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(150,140); ctx.lineTo(175,175); ctx.lineTo(125,175); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7d8ba1';
      ctx.beginPath(); ctx.moveTo(280,GROUND_Y); ctx.lineTo(480,90); ctx.lineTo(680,GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(480,90); ctx.lineTo(510,135); ctx.lineTo(450,135); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#cdeccb'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  lake: {
    label: 'Lake',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,GROUND_Y);
      g.addColorStop(0,'#bfe3ff'); g.addColorStop(1,'#eaf7ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,GROUND_Y);
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(680,60,26,0,Math.PI*2); ctx.fill();
      const lg = ctx.createLinearGradient(0,GROUND_Y-30,0,H);
      lg.addColorStop(0,'#7ec8e3'); lg.addColorStop(1,'#4fa9d4');
      ctx.fillStyle = lg; ctx.fillRect(0,GROUND_Y-30,W,H-GROUND_Y+30);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for(let x=20;x<W;x+=90){ ctx.beginPath(); ctx.moveTo(x,GROUND_Y-10); ctx.quadraticCurveTo(x+30,GROUND_Y-4,x+60,GROUND_Y-10); ctx.stroke(); }
    }
  },
  desert: {
    label: 'Desert',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#ffe1a8'); g.addColorStop(1,'#fff3d6');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#ffcf6b'; ctx.beginPath(); ctx.arc(680,70,30,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e0a94c';
      [[100,GROUND_Y-8,26,10],[560,GROUND_Y-14,34,16],[300,GROUND_Y-6,20,8]].forEach(c=>{
        ctx.beginPath(); ctx.ellipse(c[0],c[1],c[2],c[3],0,Math.PI,0); ctx.fill();
      });
      ctx.fillStyle = '#edc27a'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  castle: {
    label: 'Castle',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#c9d6e3'); g.addColorStop(1,'#e8eef4');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#9aa1ad';
      ctx.fillRect(560,120,180,140);
      for(let i=0;i<5;i++){ ctx.fillRect(560+i*36,110,20,16); }
      ctx.fillRect(590,90,30,60);
      for(let i=0;i<2;i++){ ctx.fillRect(590+i*22,80,12,14); }
      ctx.fillStyle = '#7a5230';
      ctx.beginPath(); ctx.moveTo(630,220); ctx.lineTo(650,190); ctx.lineTo(670,220); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8fce6a'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  stadium: {
    label: 'Stadium',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#bfe3ff'); g.addColorStop(1,'#eaf7ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.ellipse(W/2, GROUND_Y-40, 380, 90, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e11d48';
      for(let i=0;i<8;i++){ ctx.fillRect(60+i*90, GROUND_Y-90+i%2*4, 60, 30); }
      ctx.fillStyle = '#4a8f4f'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W/2, GROUND_Y+40, 30, 0, Math.PI*2); ctx.stroke();
    }
  },
  underwater: {
    label: 'Underwater',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#0369a1'); g.addColorStop(1,'#083344');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for(let i=0;i<20;i++){
        const bx = (i*67)%W, by = H - ((i*113)%H);
        ctx.beginPath(); ctx.arc(bx,by,2,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.ellipse(200,150,14,8,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(550,220,10,6,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0f2e3f'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
      ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 6;
      [80,260,480,660].forEach(sx=>{
        ctx.beginPath(); ctx.moveTo(sx,GROUND_Y); ctx.quadraticCurveTo(sx+10,GROUND_Y-30,sx,GROUND_Y-60); ctx.stroke();
      });
    }
  },
  airport: {
    label: 'Airport',
    draw: ()=>{
      ctx.fillStyle = '#e7edf5'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#cfe0ee'; ctx.fillRect(40,40,700,140);
      ctx.strokeStyle = '#8a94a3'; ctx.lineWidth = 4;
      for(let x=80;x<700;x+=110){ ctx.beginPath(); ctx.moveTo(x,40); ctx.lineTo(x,180); ctx.stroke(); }
      ctx.fillStyle = '#9aa1ad';
      ctx.beginPath(); ctx.moveTo(120,150); ctx.lineTo(280,140); ctx.lineTo(300,150); ctx.lineTo(280,160); ctx.lineTo(120,158); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9d2dc'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for(let x=20;x<W;x+=60){ ctx.beginPath(); ctx.moveTo(x,GROUND_Y+16); ctx.lineTo(x+30,GROUND_Y+16); ctx.stroke(); }
    }
  },
  hospital: {
    label: 'Hospital',
    draw: ()=>{
      ctx.fillStyle = '#f2f7fa'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff'; ctx.fillRect(500,40,220,150);
      ctx.strokeStyle = '#c3d2de'; ctx.lineWidth = 3; ctx.strokeRect(500,40,220,150);
      ctx.fillStyle = '#e0453f';
      ctx.fillRect(595,60,30,10); ctx.fillRect(605,50,10,30);
      ctx.fillStyle = '#cfe3f2'; ctx.fillRect(520,110,60,50); ctx.fillRect(650,110,60,50);
      ctx.strokeRect(520,110,60,50); ctx.strokeRect(650,110,60,50);
      ctx.fillStyle = '#dbe6ee'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  library: {
    label: 'Library',
    draw: ()=>{
      ctx.fillStyle = '#f3ede0'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#7a5230';
      for(let row=0; row<3; row++){ ctx.fillRect(60, 40+row*55, 260, 40); }
      const colors = ['#b91c1c','#1d4ed8','#16a34a','#ca8a04','#7c3aed'];
      for(let row=0; row<3; row++){
        for(let i=0;i<10;i++){ ctx.fillStyle = colors[i%colors.length]; ctx.fillRect(64+i*25, 44+row*55, 18, 32); }
      }
      ctx.fillStyle = '#8b5e3c'; ctx.fillRect(580, GROUND_Y-30, 140, 8);
      ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(595,GROUND_Y-22); ctx.lineTo(595,GROUND_Y); ctx.moveTo(705,GROUND_Y-22); ctx.lineTo(705,GROUND_Y); ctx.stroke();
      ctx.fillStyle = '#e6d8bd'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  jungle: {
    label: 'Jungle',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#2f5233'); g.addColorStop(1,'#4a8f4f');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      [[40,260,30],[130,230,42],[600,240,38],[700,270,30],[480,220,36],[240,250,26]].forEach(([tx,ty,r])=>{
        ctx.strokeStyle = '#3e2a17'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(tx,GROUND_Y); ctx.lineTo(tx,ty); ctx.stroke();
        ctx.fillStyle = '#1f6b2f';
        ctx.beginPath(); ctx.arc(tx,ty-8,r,0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#3d6b2f'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  volcano: {
    label: 'Volcano',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#7a3b2e'); g.addColorStop(1,'#c9714a');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#4a2e22';
      ctx.beginPath(); ctx.moveTo(340,GROUND_Y); ctx.lineTo(470,100); ctx.lineTo(600,GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e0453f';
      ctx.beginPath(); ctx.moveTo(440,110); ctx.lineTo(470,100); ctx.lineTo(500,110); ctx.lineTo(470,130); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath(); ctx.arc(470,80,22,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3a2018'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  carnival: {
    label: 'Carnival',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#8b5fbf'); g.addColorStop(1,'#c9a0dd');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(650,150,80,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#e0453f';
      for(let i=0;i<8;i++){ const ang = i*Math.PI/4; ctx.beginPath(); ctx.arc(650+Math.cos(ang)*80, 150+Math.sin(ang)*80, 8, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.moveTo(120,GROUND_Y); ctx.lineTo(160,120); ctx.lineTo(200,GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(160,120); ctx.lineTo(160,GROUND_Y); ctx.stroke();
      ctx.fillStyle = '#7c5aa6'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  custom: {
    label: 'Custom photo…',
    draw: ()=>{
      if(state.scene.customBgImage){
        ctx.drawImage(state.scene.customBgImage, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#f4f5f7'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = '#9aa1ad'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Upload a background image to see it here', W/2, H/2);
        ctx.textAlign = 'left';
      }
    }
  }
};
const BACKGROUND_LIST = Object.keys(BACKGROUNDS).map(id => ({ id, label: BACKGROUNDS[id].label }));
