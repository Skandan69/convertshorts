// ---------- animals registry: decorative scene creatures (not full stickman characters) ----------
// Animals are simpler than stickmen: no skeleton/IK, just a handful of procedural canvas shapes
// with a small idle animation (bob/hop + tail wag/ear twitch/wing flap), positioned along the
// stage like furniture/props. To add a new animal: add one entry here with a draw(x,faceDir,t,
// sizeScale) function — it automatically appears in the "Add an animal" dropdown via ANIMAL_LIST.
const ANIMALS = {
  dog: {
    label: 'Dog',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.5*s;
      const bx = x, by = gy - 22*s - bob;
      const swing = Math.sin(t*5)*4*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-14,swing],[6,-swing],[-6,-swing],[14,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+10*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const wag = Math.sin(t*8)*10*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*24*s, by);
      ctx.quadraticCurveTo(bx-faceDir*34*s, by-14*s+wag, bx-faceDir*30*s, by-22*s);
      ctx.stroke();
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath(); ctx.ellipse(bx, by, 24*s, 13*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*22*s, hy = by-8*s;
      ctx.beginPath(); ctx.arc(hx, hy, 11*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*9*s, hy+3*s, 6*s, 4*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx-faceDir*4*s, hy-8*s);
      ctx.quadraticCurveTo(hx-faceDir*14*s, hy-2*s, hx-faceDir*10*s, hy+10*s);
      ctx.quadraticCurveTo(hx-faceDir*4*s, hy+4*s, hx-faceDir*2*s, hy-6*s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-2*s, 1.5*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  cat: {
    label: 'Cat',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.2*s;
      const bx = x, by = gy - 20*s - bob;
      const swing = Math.sin(t*5)*3*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-12,swing],[5,-swing],[-5,-swing],[12,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+9*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const sway = Math.sin(t*2)*6*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*20*s, by);
      ctx.quadraticCurveTo(bx-faceDir*30*s, by-20*s, bx-faceDir*20*s+sway, by-34*s);
      ctx.stroke();
      ctx.fillStyle = '#666';
      ctx.beginPath(); ctx.ellipse(bx, by, 20*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*18*s, hy = by-9*s;
      ctx.beginPath(); ctx.arc(hx, hy, 9*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx-faceDir*6*s, hy-7*s); ctx.lineTo(hx-faceDir*9*s, hy-15*s); ctx.lineTo(hx-faceDir*2*s, hy-9*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx+faceDir*2*s, hy-9*s); ctx.lineTo(hx+faceDir*5*s, hy-16*s); ctx.lineTo(hx+faceDir*7*s, hy-7*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-1*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  bird: {
    label: 'Bird',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const hop = Math.abs(Math.sin(t*4))*4*s;
      const bx = x, by = gy - 14*s - hop;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.moveTo(bx-3*s, by+8*s); ctx.lineTo(bx-3*s, gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx+3*s, by+8*s); ctx.lineTo(bx+3*s, gy); ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.ellipse(bx, by, 12*s, 9*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const flap = Math.sin(t*8)*2*s;
      ctx.beginPath(); ctx.ellipse(bx-faceDir*2*s, by+flap, 7*s, 4*s, 0.3*faceDir, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*11*s, hy = by-6*s;
      ctx.beginPath(); ctx.arc(hx, hy, 6*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(hx+faceDir*5*s, hy); ctx.lineTo(hx+faceDir*11*s, hy+1*s); ctx.lineTo(hx+faceDir*5*s, hy+3*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*2*s, hy-2*s, 1.2*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  rabbit: {
    label: 'Rabbit',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const hop = Math.abs(Math.sin(t*4))*6*s;
      const bx = x, by = gy - 20*s - hop;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [-10,8].forEach(ox=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+9*s); ctx.lineTo(bx+ox*s, gy-hop*0.3); ctx.stroke();
      });
      ctx.fillStyle = '#f3f4f6';
      ctx.beginPath(); ctx.arc(bx-faceDir*18*s, by, 4*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath(); ctx.ellipse(bx, by, 18*s, 12*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*16*s, hy = by-10*s;
      ctx.beginPath(); ctx.arc(hx, hy, 9*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const twitch = Math.sin(t*3)*0.15;
      [-1,1].forEach(dir=>{
        ctx.save();
        ctx.translate(hx+dir*3*s, hy-8*s);
        ctx.rotate(dir*0.15+twitch*dir);
        ctx.beginPath(); ctx.ellipse(0,-10*s,3*s,10*s,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-1*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  horse: {
    label: 'Horse',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.2*s;
      const bx = x, by = gy - 36*s - bob;
      const swing = Math.sin(t*5)*6*s;
      ctx.save();
      ctx.lineWidth = 3.5; ctx.strokeStyle = INK;
      [[-18,swing],[8,-swing],[-8,-swing],[18,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+16*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const tailSway = Math.sin(t*2.5)*8*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*30*s, by-4*s);
      ctx.quadraticCurveTo(bx-faceDir*40*s+tailSway, by+14*s, bx-faceDir*36*s+tailSway, by+30*s);
      ctx.stroke();
      ctx.fillStyle = '#8b5e3c';
      ctx.beginPath(); ctx.ellipse(bx, by, 32*s, 16*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const neckX = bx+faceDir*26*s, neckY = by-18*s;
      ctx.beginPath(); ctx.moveTo(bx+faceDir*18*s, by-8*s); ctx.lineTo(neckX, neckY); ctx.lineTo(neckX-faceDir*10*s, by-6*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      const hx = neckX+faceDir*6*s, hy = neckY-6*s;
      ctx.beginPath(); ctx.ellipse(hx, hy, 9*s, 7*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*9*s, hy+3*s, 6*s, 3.5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      ctx.moveTo(neckX-faceDir*4*s, neckY-10*s);
      ctx.quadraticCurveTo(neckX+faceDir*2*s, neckY, neckX-faceDir*2*s, by-6*s);
      ctx.lineTo(neckX-faceDir*8*s, by-8*s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-2*s, 1.5*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  cow: {
    label: 'Cow',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2.5)*1*s;
      const bx = x, by = gy - 26*s - bob;
      const swing = Math.sin(t*4)*3*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-16,swing],[6,-swing],[-6,-swing],[16,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+13*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const wag = Math.sin(t*6)*8*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*26*s, by);
      ctx.quadraticCurveTo(bx-faceDir*32*s, by+16*s+wag, bx-faceDir*28*s, by+28*s);
      ctx.stroke();
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath(); ctx.ellipse(bx, by, 26*s, 15*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222';
      [[-6,-2,7,5],[8,3,6,4]].forEach(([ox,oy,rx,ry])=>{
        ctx.beginPath(); ctx.ellipse(bx+ox*s, by+oy*s, rx*s, ry*s, 0.4, 0, Math.PI*2); ctx.fill();
      });
      const hx = bx+faceDir*24*s, hy = by-6*s;
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath(); ctx.ellipse(hx, hy, 10*s, 8*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath(); ctx.ellipse(hx+faceDir*8*s, hy+4*s, 5*s, 3.5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eee';
      ctx.beginPath(); ctx.ellipse(hx-faceDir*4*s, hy-9*s, 3*s, 4*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-3*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  sheep: {
    label: 'Sheep',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1*s;
      const bx = x, by = gy - 20*s - bob;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [-11,-4,4,11].forEach(ox=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+10*s); ctx.lineTo(bx+ox*s, gy); ctx.stroke();
      });
      ctx.fillStyle = '#fafafa';
      [[0,0,20,13],[-12,-6,9,8],[10,-6,9,8],[-4,-10,8,7],[6,-10,8,7]].forEach(([ox,oy,rx,ry])=>{
        ctx.beginPath(); ctx.ellipse(bx+ox*s, by+oy*s, rx*s, ry*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      });
      const hx = bx+faceDir*20*s, hy = by-3*s;
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.ellipse(hx, hy, 7*s, 6*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-4*s, 2.5*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx-faceDir*4*s, hy-4*s, 2.5*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eee';
      ctx.beginPath(); ctx.arc(hx+faceDir*2*s, hy+3*s, 1.6*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  elephant: {
    label: 'Elephant',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2)*1*s;
      const bx = x, by = gy - 38*s - bob;
      const swing = Math.sin(t*3)*3*s;
      ctx.save();
      ctx.lineWidth = 3.5; ctx.strokeStyle = INK;
      [[-20,swing],[10,-swing],[-10,-swing],[20,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+18*s); ctx.lineTo(bx+ox*s+sw*0.2, gy); ctx.stroke();
      });
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath(); ctx.ellipse(bx, by, 36*s, 20*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*32*s, by-6*s);
      ctx.quadraticCurveTo(bx-faceDir*44*s, by, bx-faceDir*34*s, by+14*s);
      ctx.stroke();
      const hx = bx+faceDir*28*s, hy = by-14*s;
      ctx.beginPath(); ctx.ellipse(hx, hy, 13*s, 12*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx-faceDir*10*s, hy-6*s, 10*s, 12*s, 0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const trunkSway = Math.sin(t*2)*6*s;
      ctx.beginPath();
      ctx.moveTo(hx+faceDir*10*s, hy+6*s);
      ctx.quadraticCurveTo(hx+faceDir*16*s+trunkSway, hy+22*s, hx+faceDir*8*s+trunkSway, hy+34*s);
      ctx.lineWidth = 5*s; ctx.stroke();
      ctx.lineWidth = 3.5;
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*5*s, hy-2*s, 1.6*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  fish: {
    label: 'Fish',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.abs(Math.sin(t*3))*6*s;
      const bx = x, by = gy - 14*s - bob;
      const wag = Math.sin(t*6)*0.4;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.ellipse(bx, by, 16*s, 9*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(bx-faceDir*15*s, by); ctx.rotate(wag*faceDir);
      ctx.beginPath(); ctx.moveTo(0,-8*s); ctx.lineTo(-faceDir*12*s,0); ctx.lineTo(0,8*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(bx, by-8*s); ctx.lineTo(bx+faceDir*4*s, by-14*s); ctx.lineTo(bx+faceDir*8*s, by-7*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(bx+faceDir*10*s, by-2*s, 1.6*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  snake: {
    label: 'Snake',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const w = t*4;
      ctx.save();
      ctx.lineWidth = 8*s; ctx.lineCap = 'round'; ctx.strokeStyle = '#16a34a';
      ctx.beginPath();
      for(let i=0;i<=24;i++){
        const px = x - faceDir*(i*2.2*s) + faceDir*24*s;
        const py = gy - 6*s + Math.sin(i*0.5+w)*7*s;
        if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.stroke();
      const hx = x + faceDir*24*s, hy = gy - 6*s + Math.sin(w)*7*s;
      ctx.fillStyle = '#16a34a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, 6*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx+faceDir*5*s, hy); ctx.lineTo(hx+faceDir*11*s, hy); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-2*s, 1.2*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  chicken: {
    label: 'Chicken',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.abs(Math.sin(t*5))*3*s;
      const bx = x, by = gy - 16*s - bob;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [-3,3].forEach(ox=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+9*s); ctx.lineTo(bx+ox*s, gy); ctx.stroke();
      });
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(bx, by, 12*s, 10*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*11*s, hy = by-8*s;
      ctx.beginPath(); ctx.arc(hx, hy, 6*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.arc(hx, hy-6*s, 2.5*s, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.moveTo(hx+faceDir*5*s, hy); ctx.lineTo(hx+faceDir*11*s, hy+1*s); ctx.lineTo(hx+faceDir*5*s, hy+3*s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*2*s, hy-2*s, 1.2*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  pig: {
    label: 'Pig',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1*s;
      const bx = x, by = gy - 18*s - bob;
      const swing = Math.sin(t*5)*3*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-10,swing],[4,-swing],[-4,-swing],[10,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+9*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const curl = Math.sin(t*6)*4*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*18*s, by);
      ctx.quadraticCurveTo(bx-faceDir*24*s, by-8*s+curl, bx-faceDir*20*s, by-2*s);
      ctx.stroke();
      ctx.fillStyle = '#f9a8d4';
      ctx.beginPath(); ctx.ellipse(bx, by, 18*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*17*s, hy = by-3*s;
      ctx.beginPath(); ctx.ellipse(hx, hy, 8*s, 7*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath(); ctx.ellipse(hx+faceDir*7*s, hy+2*s, 4*s, 3*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-4*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  monkey: {
    label: 'Monkey',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const swing = Math.sin(t*5)*0.5;
      const bx = x, by = gy - 26*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = '#8b5e3c';
      [-6,6].forEach(ox=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+8*s); ctx.lineTo(bx+ox*s, gy); ctx.stroke();
      });
      ctx.save(); ctx.translate(bx-10*s, by-2*s); ctx.rotate(swing);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,16*s); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(bx+10*s, by-2*s); ctx.rotate(-swing);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,16*s); ctx.stroke(); ctx.restore();
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*14*s, by-4*s);
      ctx.quadraticCurveTo(bx-faceDir*22*s, by+8*s, bx-faceDir*16*s, by+18*s);
      ctx.stroke();
      ctx.fillStyle = '#a5714a';
      ctx.beginPath(); ctx.ellipse(bx, by, 13*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*11*s, hy = by-10*s;
      ctx.beginPath(); ctx.arc(hx, hy, 9*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2b98f';
      ctx.beginPath(); ctx.ellipse(hx+faceDir*2*s, hy+2*s, 5*s, 5.5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx-6*s, hy-3*s, 3.5*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx+6*s, hy-3*s, 3.5*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  lion: {
    label: 'Lion',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2.5)*1.2*s;
      const bx = x, by = gy - 28*s - bob;
      const swing = Math.sin(t*4)*4*s;
      ctx.save();
      ctx.lineWidth = 3.5; ctx.strokeStyle = INK;
      [[-14,swing],[6,-swing],[-6,-swing],[14,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+14*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const tailWag = Math.sin(t*4)*10*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*22*s, by-2*s);
      ctx.quadraticCurveTo(bx-faceDir*32*s, by+8*s+tailWag, bx-faceDir*28*s, by+20*s);
      ctx.stroke();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx-faceDir*32*s-2*s, by+16*s, 6*s, 6*s);
      ctx.fillStyle = '#d4a017';
      ctx.beginPath(); ctx.ellipse(bx, by, 24*s, 13*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*20*s, hy = by-6*s;
      ctx.fillStyle = '#a16207';
      ctx.beginPath(); ctx.arc(hx, hy, 13*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.ellipse(hx, hy, 8*s, 7*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*7*s, hy+4*s, 4*s, 3*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-3*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  turtle: {
    label: 'Turtle',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.abs(Math.sin(t*2))*1.5*s;
      const bx = x, by = gy - 11*s - bob;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [[-10,4],[10,4],[-8,-3],[8,-3]].forEach(([ox,oy])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+6*s); ctx.lineTo(bx+ox*s+oy*s*0.3, gy); ctx.stroke();
      });
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.ellipse(bx, by, 18*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#065f46'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx, by-8*s); ctx.lineTo(bx, by+8*s); ctx.moveTo(bx-9*s, by); ctx.lineTo(bx+9*s, by); ctx.stroke();
      ctx.fillStyle = '#4ade80';
      const hx = bx+faceDir*17*s, hy = by+3*s;
      ctx.beginPath(); ctx.ellipse(hx, hy, 6*s, 4.5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-1*s, 1.2*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  frog: {
    label: 'Frog',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const hop = Math.abs(Math.sin(t*3))*10*s;
      const bx = x, by = gy - 12*s - hop;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [[-10,4],[10,4]].forEach(([ox])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+7*s); ctx.lineTo(bx+ox*s, gy-hop*0.4); ctx.stroke();
      });
      ctx.fillStyle = '#4ade80';
      ctx.beginPath(); ctx.ellipse(bx, by, 15*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      [-7,7].forEach(ox=>{
        ctx.beginPath(); ctx.arc(bx+ox*s, by-9*s, 4*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(bx+ox*s, by-9*s, 1.4*s, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#4ade80';
      });
      ctx.restore();
    }
  },
  deer: {
    label: 'Deer',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.2*s;
      const bx = x, by = gy - 30*s - bob;
      const swing = Math.sin(t*5)*5*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-13,swing],[6,-swing],[-6,-swing],[13,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+13*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(bx-faceDir*24*s, by+2*s, 4*s, 5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a5714a';
      ctx.beginPath(); ctx.ellipse(bx, by, 20*s, 12*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const neckX = bx+faceDir*20*s, neckY = by-14*s;
      ctx.beginPath(); ctx.moveTo(bx+faceDir*14*s, by-6*s); ctx.lineTo(neckX, neckY); ctx.lineTo(neckX-faceDir*8*s, by-4*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      const hx = neckX+faceDir*5*s, hy = neckY-4*s;
      ctx.beginPath(); ctx.ellipse(hx, hy, 7*s, 6*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7c4a2d'; ctx.lineWidth = 2;
      [-1,1].forEach(side=>{
        ctx.beginPath();
        ctx.moveTo(hx+side*3*s, hy-5*s);
        ctx.lineTo(hx+side*8*s, hy-14*s);
        ctx.lineTo(hx+side*4*s, hy-11*s);
        ctx.stroke();
      });
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-1*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  bear: {
    label: 'Bear',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2)*1.5*s;
      const bx = x, by = gy - 24*s - bob;
      const swing = Math.sin(t*3.5)*4*s;
      ctx.save();
      ctx.lineWidth = 3.5; ctx.strokeStyle = INK;
      [[-14,swing],[6,-swing],[-6,-swing],[14,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+14*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      ctx.fillStyle = '#6b4a30';
      ctx.beginPath(); ctx.ellipse(bx, by, 24*s, 15*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*20*s, hy = by-8*s;
      ctx.beginPath(); ctx.arc(hx, hy, 12*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx-6*s, hy-9*s, 4*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx+6*s, hy-9*s, 4*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a5714a';
      ctx.beginPath(); ctx.ellipse(hx+faceDir*8*s, hy+4*s, 5*s, 4*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*10*s, hy+4*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-2*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  penguin: {
    label: 'Penguin',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const waddle = Math.sin(t*6)*3*s;
      const bx = x + waddle*0.3, by = gy - 20*s;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      ctx.fillStyle = '#f97316';
      [-4,4].forEach(ox=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+16*s); ctx.lineTo(bx+ox*s+faceDir*4*s, gy); ctx.lineTo(bx+ox*s-faceDir*2*s, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.ellipse(bx, by, 13*s, 18*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(bx+faceDir*2*s, by+4*s, 8*s, 13*s, 0, 0, Math.PI*2); ctx.fill();
      const hx = bx+faceDir*3*s, hy = by-16*s;
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.moveTo(hx+faceDir*4*s, hy); ctx.lineTo(hx+faceDir*11*s, hy+2*s); ctx.lineTo(hx+faceDir*4*s, hy+4*s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*2*s, hy-2*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  owl: {
    label: 'Owl',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2.5)*1.5*s;
      const bx = x, by = gy - 22*s - bob;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      ctx.fillStyle = '#92400e';
      [-4,4].forEach(ox=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+14*s); ctx.lineTo(bx+ox*s, gy); ctx.stroke();
      });
      ctx.fillStyle = '#a5714a';
      ctx.beginPath(); ctx.ellipse(bx, by, 15*s, 17*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const flap = Math.sin(t*3)*3*s;
      ctx.fillStyle = '#7c4a2d';
      ctx.beginPath(); ctx.ellipse(bx-faceDir*13*s, by+2*s+flap, 6*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      [-6,6].forEach(ox=>{
        ctx.beginPath(); ctx.arc(bx+ox*s, by-6*s, 5*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = INK;
      [-6,6].forEach(ox=>{ ctx.beginPath(); ctx.arc(bx+ox*s, by-6*s, 2*s, 0, Math.PI*2); ctx.fill(); });
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.moveTo(bx-2*s, by-2*s); ctx.lineTo(bx+2*s, by-2*s); ctx.lineTo(bx, by+3*s); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
  giraffe: {
    label: 'Giraffe',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2)*1*s;
      const bx = x, by = gy - 50*s - bob;
      const swing = Math.sin(t*4)*4*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-11,swing],[5,-swing],[-5,-swing],[11,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+12*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      ctx.fillStyle = '#f2c879';
      ctx.beginPath(); ctx.ellipse(bx, by, 18*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const neckX = bx+faceDir*14*s, neckTopY = by-38*s;
      ctx.beginPath(); ctx.moveTo(bx+faceDir*10*s, by-6*s); ctx.lineTo(neckX, neckTopY); ctx.lineTo(neckX-faceDir*8*s, neckTopY+2*s); ctx.lineTo(bx-faceDir*2*s, by-4*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      const hx = neckX+faceDir*2*s, hy = neckTopY-8*s;
      ctx.beginPath(); ctx.ellipse(hx, hy, 7*s, 8*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#a5714a'; ctx.lineWidth = 2;
      [-1,1].forEach(side=>{ ctx.beginPath(); ctx.moveTo(hx+side*3*s, hy-7*s); ctx.lineTo(hx+side*3*s, hy-13*s); ctx.stroke();
        ctx.fillStyle='#a5714a'; ctx.beginPath(); ctx.arc(hx+side*3*s, hy-13*s, 1.8*s, 0, Math.PI*2); ctx.fill(); });
      ctx.fillStyle = '#a5714a';
      [[-6,-8],[6,-4],[-3,2],[4,6]].forEach(([ox,oy])=>{ ctx.beginPath(); ctx.ellipse(bx+ox*s, by+oy*s, 3*s, 2.4*s, 0.3, 0, Math.PI*2); ctx.fill(); });
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-1*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  zebra: {
    label: 'Zebra',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.2*s;
      const bx = x, by = gy - 26*s - bob;
      const swing = Math.sin(t*5)*5*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-13,swing],[6,-swing],[-6,-swing],[13,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+13*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      ctx.fillStyle = '#fafafa';
      ctx.beginPath(); ctx.ellipse(bx, by, 22*s, 13*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(bx+i*7*s, by-11*s); ctx.lineTo(bx+i*7*s-4*s, by+11*s); ctx.stroke(); }
      const hx = bx+faceDir*22*s, hy = by-10*s;
      ctx.fillStyle = '#fafafa';
      ctx.beginPath(); ctx.arc(hx, hy, 9*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*8*s, hy+3*s, 5*s, 3.5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx-2*s, hy-6*s); ctx.lineTo(hx-1*s, hy+6*s); ctx.moveTo(hx+2*s, hy-7*s); ctx.lineTo(hx+3*s, hy+5*s); ctx.stroke();
      ctx.fillStyle = '#1f2937'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx-faceDir*4*s, hy-8*s); ctx.lineTo(hx-faceDir*8*s, hy-14*s); ctx.lineTo(hx-faceDir*2*s, hy-9*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-1*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  kangaroo: {
    label: 'Kangaroo',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const hop = Math.abs(Math.sin(t*4))*10*s;
      const bx = x, by = gy - 30*s - hop;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath(); ctx.ellipse(bx, by, 15*s, 20*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*10*s, by+16*s);
      ctx.quadraticCurveTo(bx-faceDir*30*s, by+20*s-hop*0.4, bx-faceDir*32*s, gy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx+faceDir*6*s, by+18*s); ctx.lineTo(bx+faceDir*10*s, gy); ctx.lineTo(bx+faceDir*22*s, gy);
      ctx.stroke();
      const hx = bx+faceDir*10*s, hy = by-20*s;
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath(); ctx.ellipse(hx, hy, 7*s, 8*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      [-1,1].forEach(side=>{ ctx.beginPath(); ctx.ellipse(hx+side*4*s, hy-8*s, 2.5*s, 5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*6*s, hy+4*s, 1.6*s, 1.1*s, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  panda: {
    label: 'Panda',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2)*1.3*s;
      const bx = x, by = gy - 22*s - bob;
      const swing = Math.sin(t*3)*3*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#1f2937';
      [[-13,swing],[6,-swing],[-6,-swing],[13,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.rect(bx+ox*s-2*s, by+8*s, 4*s, 12*s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+13*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      ctx.fillStyle = '#f9fafb';
      ctx.beginPath(); ctx.ellipse(bx, by, 22*s, 14*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*20*s, hy = by-9*s;
      ctx.beginPath(); ctx.arc(hx, hy, 11*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(hx-6*s, hy-9*s, 4*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+6*s, hy-9*s, 4*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx-faceDir*3*s, hy, 3.6*s, 4.4*s, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*3*s, hy, 3.6*s, 4.4*s, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+faceDir*9*s, hy+5*s, 1.6*s, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx-faceDir*3*s, hy, 1.6*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy, 1.6*s, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx-faceDir*3*s, hy, 0.8*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy, 0.8*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  fox: {
    label: 'Fox',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.3*s;
      const bx = x, by = gy - 18*s - bob;
      const swing = Math.sin(t*5)*4*s;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [[-11,swing],[5,-swing],[-5,-swing],[11,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+9*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const sway = Math.sin(t*3)*6*s;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*18*s, by);
      ctx.quadraticCurveTo(bx-faceDir*32*s, by-8*s, bx-faceDir*30*s+sway, by-2*s);
      ctx.quadraticCurveTo(bx-faceDir*22*s, by+6*s, bx-faceDir*16*s, by+4*s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(bx-faceDir*26*s+sway, by-2*s, 4*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.beginPath(); ctx.ellipse(bx, by, 18*s, 10*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*17*s, hy = by-7*s;
      ctx.beginPath(); ctx.arc(hx, hy, 8*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx-5*s, hy-6*s); ctx.lineTo(hx-8*s, hy-14*s); ctx.lineTo(hx-2*s, hy-8*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx+5*s, hy-6*s); ctx.lineTo(hx+8*s, hy-14*s); ctx.lineTo(hx+2*s, hy-8*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(hx+faceDir*7*s, hy+3*s, 4*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*10*s, hy+3*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-1*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  wolf: {
    label: 'Wolf',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.4*s;
      const bx = x, by = gy - 22*s - bob;
      const swing = Math.sin(t*5)*4.5*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-13,swing],[6,-swing],[-6,-swing],[13,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+11*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const wag = Math.sin(t*4)*6*s;
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*20*s, by);
      ctx.quadraticCurveTo(bx-faceDir*32*s, by-8*s+wag, bx-faceDir*28*s, by-16*s);
      ctx.quadraticCurveTo(bx-faceDir*22*s, by-6*s, bx-faceDir*16*s, by+2*s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(bx, by, 22*s, 12*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*20*s, hy = by-9*s;
      ctx.beginPath(); ctx.arc(hx, hy, 9*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx-5*s, hy-7*s); ctx.lineTo(hx-8*s, hy-15*s); ctx.lineTo(hx-2*s, hy-9*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx+5*s, hy-7*s); ctx.lineTo(hx+8*s, hy-15*s); ctx.lineTo(hx+2*s, hy-9*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*9*s, hy+4*s, 5*s, 3.5*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*11*s, hy+4*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-1*s, 1.4*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
};
const ANIMAL_LIST = Object.keys(ANIMALS).map(id => ({ id, label: ANIMALS[id].label }));
function drawAnimalProp(x, faceDir, type, t, sizeScale){
  const entry = ANIMALS[type] || ANIMALS.dog;
  entry.draw(x, faceDir, t, sizeScale);
}
