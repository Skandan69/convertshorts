// ---------- vehicles registry: static scene props (like furniture, but placeable as a list) ----------
// Simpler than animals: no legs/limbs, just a body + spinning wheels for a bit of life. To add a
// new vehicle: add one entry here with a draw(x,faceDir,t,sizeScale) function — it automatically
// appears in the "Add a vehicle" dropdown via VEHICLE_LIST.
const VEHICLES = {
  car: {
    label: 'Car',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bx = x, by = gy - 14*s;
      const wheelR = 9*s, spin = t*4;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#e0453f';
      ctx.beginPath();
      ctx.moveTo(bx-32*s, by+6*s);
      ctx.lineTo(bx-32*s, by-4*s);
      ctx.quadraticCurveTo(bx-20*s, by-20*s, bx-6*s, by-20*s);
      ctx.lineTo(bx+10*s, by-20*s);
      ctx.quadraticCurveTo(bx+20*s, by-20*s, bx+26*s, by-6*s);
      ctx.lineTo(bx+34*s, by-4*s);
      ctx.lineTo(bx+34*s, by+6*s);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.beginPath();
      ctx.moveTo(bx-16*s, by-18*s);
      ctx.lineTo(bx-8*s, by-6*s);
      ctx.lineTo(bx+22*s, by-6*s);
      ctx.lineTo(bx+16*s, by-18*s);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      [-18, 18].forEach(ox=>{
        const wx = bx+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(bx+faceDir*33*s, by, 3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  bicycle: {
    label: 'Bicycle',
    // Reworked from a thin wireframe (bare wheel outlines + single-pixel stick lines) into something
    // that actually reads as a bicycle: filled rubber tires with a rim and hub, thick colored frame
    // tubing with a dark edge for the bold-cartoon look, a real fork, a handlebar with a grip, a
    // rotating crank/pedal, a chain line, and a saddle — same overall wheel spacing/seat/handle
    // positions as before (so a character already posed for "riding" still lines up), just far more
    // detailed art.
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const wheelR = 15*s, spin = t*6;
      const wy = gy, backX = x-17*s, frontX = x+17*s;
      const pedalX = x-2*s, pedalY = wy-wheelR*0.55;
      const seatX = x-9*s, seatY = wy-wheelR*1.85;
      const handleX = x+15*s, handleY = wy-wheelR*1.55;
      const frameColor = '#dc2626';
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // tires: filled black rubber ring + a lighter rim, not just a bare outline circle
      [backX, frontX].forEach(wx=>{
        ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f4f4f5';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR*0.6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1;
        for(let i=0;i<8;i++){
          const ang = spin + i*Math.PI/4;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.58, wy+Math.sin(ang)*wheelR*0.58); ctx.stroke();
        }
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(wx, wy, 2.3*s, 0, Math.PI*2); ctx.fill();
      });

      // frame tubes: thick colored tubing with a dark edge pass, instead of thin plain lines
      const tubes = [[backX,wy,pedalX,pedalY],[pedalX,pedalY,seatX,seatY],[seatX,seatY,backX,wy],[seatX,seatY,handleX-2*s,handleY+4*s]];
      ctx.strokeStyle = frameColor; ctx.lineWidth = 5*s;
      tubes.forEach(([x1,y1,x2,y2])=>{ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); });
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      tubes.forEach(([x1,y1,x2,y2])=>{ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); });

      // fork + stem
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3.5*s;
      ctx.beginPath(); ctx.moveTo(handleX, handleY); ctx.lineTo(frontX, wy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(handleX-2*s, handleY+4*s); ctx.lineTo(handleX, handleY); ctx.stroke();

      // handlebar + grip
      ctx.strokeStyle = INK; ctx.lineWidth = 3*s;
      ctx.beginPath(); ctx.moveTo(handleX-7*s, handleY-1*s); ctx.lineTo(handleX+6*s, handleY-3*s); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(handleX-7*s, handleY-1*s, 2*s, 0, Math.PI*2); ctx.fill();

      // chain ring + rotating crank/pedal + chain
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2*s;
      ctx.beginPath(); ctx.arc(pedalX, pedalY, 5*s, 0, Math.PI*2); ctx.stroke();
      const crankAng = t*8;
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5*s;
      ctx.beginPath(); ctx.moveTo(pedalX, pedalY); ctx.lineTo(pedalX+Math.cos(crankAng)*7*s, pedalY+Math.sin(crankAng)*7*s); ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.rect(pedalX+Math.cos(crankAng)*7*s-2.5*s, pedalY+Math.sin(crankAng)*7*s-1.5*s, 5*s, 3*s); ctx.fill();
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.setLineDash([2,2]);
      ctx.beginPath(); ctx.moveTo(pedalX, pedalY+4*s); ctx.lineTo(backX, wy-1*s); ctx.stroke();
      ctx.setLineDash([]);

      // saddle
      ctx.fillStyle = '#222'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(seatX-2*s*faceDir, seatY-2.5*s, 7*s, 3*s, -0.15, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  jeep: {
    label: 'Jeep',
    // Open-top off-roader: boxy khaki body, a roll bar arching over the seating area (so a character
    // drawn "in" it still reads clearly, same idea as the bicycle's open seat), chunky wheels, and a
    // front grille — deliberately open-top rather than a full sedan cabin/roof.
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bx = x, by = gy - 20*s;
      const wheelR = 12*s, spin = t*4;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 3; ctx.strokeStyle = INK;

      // boxy body
      ctx.fillStyle = '#6b7a4f';
      ctx.beginPath();
      ctx.moveTo(bx-34*s, by+14*s);
      ctx.lineTo(bx-34*s, by-8*s);
      ctx.lineTo(bx-26*s, by-8*s);
      ctx.lineTo(bx-22*s, by-2*s);
      ctx.lineTo(bx+22*s, by-2*s);
      ctx.lineTo(bx+30*s, by-8*s);
      ctx.lineTo(bx+36*s, by-8*s);
      ctx.lineTo(bx+36*s, by+14*s);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // hood/grille at the front
      ctx.fillStyle = '#556b2f';
      ctx.beginPath(); ctx.rect(bx+30*s, by-6*s, 8*s, 20*s); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
      for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(bx+31*s, by-3*s+i*5*s); ctx.lineTo(bx+37*s, by-3*s+i*5*s); ctx.stroke(); }

      // roll bar over the open seating area
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx-22*s, by-2*s); ctx.lineTo(bx-22*s, by-22*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx+18*s, by-2*s); ctx.lineTo(bx+18*s, by-22*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx-22*s, by-22*s); ctx.quadraticCurveTo(bx-2*s, by-30*s, bx+18*s, by-22*s); ctx.stroke();

      // seat hint
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.rect(bx-20*s, by-4*s, 38*s, 4*s); ctx.fill();

      // chunky off-road wheels
      [-24, 22].forEach(ox=>{
        const wx = bx+ox*s, wy = gy;
        ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR*0.42, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2;
        for(let i=0;i<5;i++){
          const ang = spin + i*Math.PI*2/5;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.4, wy+Math.sin(ang)*wheelR*0.4); ctx.stroke();
        }
      });

      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(bx+faceDir*35*s, by+2*s, 3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  bus: {
    label: 'Bus',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bx = x, by = gy - 16*s;
      const wheelR = 9*s, spin = t*3;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.rect(bx-46*s, by-30*s, 92*s, 40*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      for(let i=0;i<4;i++){
        ctx.fillRect(bx-38*s+i*22*s, by-24*s, 16*s, 14*s);
        ctx.strokeRect(bx-38*s+i*22*s, by-24*s, 16*s, 14*s);
      }
      [-28, 28].forEach(ox=>{
        const wx = bx+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  },
  truck: {
    label: 'Truck',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 16*s, wheelR = 10*s, spin = t*3.5;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.rect(x-44*s, by-18*s, 60*s, 34*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(x+16*s, by-30*s); ctx.lineTo(x+40*s, by-30*s);
      ctx.lineTo(x+44*s, by-6*s); ctx.lineTo(x+16*s, by-6*s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(x+20*s, by-26*s, 16*s, 12*s); ctx.strokeRect(x+20*s, by-26*s, 16*s, 12*s);
      [[-26,wheelR],[26,wheelR]].forEach(([ox])=>{
        const wx = x+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  },
  motorcycle: {
    label: 'Motorcycle',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const wheelR = 12*s, spin = t*7;
      const wy = gy, backX = x-14*s, frontX = x+14*s;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [backX, frontX].forEach(wx=>{
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.stroke();
        for(let i=0;i<6;i++){
          const ang = spin + i*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR, wy+Math.sin(ang)*wheelR); ctx.stroke();
        }
      });
      const seatX = x-2*s, seatY = wy-wheelR-16*s;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(backX, wy-wheelR*0.6); ctx.lineTo(seatX-6*s, seatY+4*s); ctx.lineTo(seatX+14*s, seatY);
      ctx.lineTo(frontX, wy-wheelR*0.6); ctx.lineTo(seatX+2*s, wy-wheelR*0.3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      const handleX = x+14*s, handleY = wy-wheelR-14*s;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(handleX-6*s, handleY); ctx.lineTo(handleX+6*s, handleY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(handleX, handleY); ctx.lineTo(frontX, wy-wheelR*0.5); ctx.stroke();
      ctx.restore();
    }
  },
  train: {
    label: 'Train',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 20*s, wheelR = 9*s, spin = t*3;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.rect(x-56*s, by-24*s, 112*s, 40*s); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x-50*s, by-38*s, 26*s, 16*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      for(let i=0;i<5;i++){
        ctx.fillRect(x-34*s+i*20*s, by-16*s, 12*s, 12*s);
        ctx.strokeRect(x-34*s+i*20*s, by-16*s, 12*s, 12*s);
      }
      [-40,-14,14,40].forEach(ox=>{
        const wx = x+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  },
  airplane: {
    label: 'Airplane',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 12*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(x-44*s, by); ctx.quadraticCurveTo(x, by-14*s, x+50*s, by-2*s);
      ctx.lineTo(x+44*s, by+4*s); ctx.quadraticCurveTo(x, by+8*s, x-44*s, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.moveTo(x-10*s, by-4*s); ctx.lineTo(x-30*s, by-24*s); ctx.lineTo(x-14*s, by-24*s); ctx.lineTo(x+4*s, by-4*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath(); ctx.moveTo(x+30*s, by-2*s); ctx.lineTo(x+48*s, by-16*s); ctx.lineTo(x+52*s, by-16*s); ctx.lineTo(x+44*s, by); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      [-30,-16,-2,12].forEach(ox=>{
        ctx.beginPath(); ctx.arc(x+ox*s, by-3*s, 3*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      });
      ctx.restore();
    }
  },
  boat: {
    label: 'Boat',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2)*3*s;
      const by = gy - 6*s - bob;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#8b5e3c';
      ctx.beginPath();
      ctx.moveTo(x-40*s, by); ctx.lineTo(x-30*s, by+16*s); ctx.lineTo(x+30*s, by+16*s); ctx.lineTo(x+40*s, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x-48*s, by+3*s); ctx.quadraticCurveTo(x, by+10*s, x+48*s, by+3*s); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by-40*s); ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.moveTo(x, by-38*s); ctx.lineTo(x+26*s, by-14*s); ctx.lineTo(x, by-14*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  helicopter: {
    label: 'Helicopter',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 60*s + Math.sin(t*2)*4*s;
      const spin = t*20;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.ellipse(x, by, 22*s, 13*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-faceDir*22*s, by+2*s); ctx.lineTo(x-faceDir*40*s, by-2*s); ctx.lineTo(x-faceDir*40*s, by+4*s); ctx.lineTo(x-faceDir*22*s, by+7*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, by-12*s); ctx.lineTo(x, by-18*s); ctx.stroke();
      ctx.save(); ctx.translate(x, by-18*s); ctx.rotate(spin);
      ctx.strokeStyle = 'rgba(20,20,20,0.6)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-42*s,0); ctx.lineTo(42*s,0); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x-8*s, by+12*s); ctx.lineTo(x-8*s, by+20*s); ctx.moveTo(x+8*s, by+12*s); ctx.lineTo(x+8*s, by+20*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-14*s, by+20*s); ctx.lineTo(x+14*s, by+20*s); ctx.stroke();
      ctx.restore();
    }
  },
  scooter: {
    label: 'Scooter',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const wheelR = 7*s, spin = t*8;
      const wy = gy, backX = x-14*s, frontX = x+14*s;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [backX, frontX].forEach(wx=>{
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.stroke();
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
      });
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(backX-6*s, wy-wheelR); ctx.lineTo(frontX+4*s, wy-wheelR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(frontX, wy-wheelR); ctx.lineTo(frontX, wy-wheelR-22*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(frontX-7*s, wy-wheelR-22*s); ctx.lineTo(frontX+7*s, wy-wheelR-22*s); ctx.stroke();
      ctx.restore();
    }
  },
  tractor: {
    label: 'Tractor',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const spin = t*3;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.rect(x-26*s, gy-32*s, 34*s, 20*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath(); ctx.rect(x-20*s, gy-52*s, 20*s, 22*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.beginPath(); ctx.rect(x-16*s, gy-48*s, 12*s, 12*s); ctx.fill(); ctx.stroke();
      const bigR = 15*s, smallR = 8*s;
      ctx.fillStyle = '#222'; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(x+2*s, gy, bigR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      for(let i=0;i<5;i++){ const ang = spin+i*Math.PI*2/5; ctx.beginPath(); ctx.moveTo(x+2*s,gy); ctx.lineTo(x+2*s+Math.cos(ang)*bigR*0.7, gy+Math.sin(ang)*bigR*0.7); ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x-20*s, gy, smallR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  ambulance: {
    label: 'Ambulance',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 16*s, wheelR = 10*s, spin = t*4;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.rect(x-44*s, by-24*s, 88*s, 40*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.beginPath(); ctx.rect(x+18*s, by-18*s, 20*s, 14*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x-16*s, by-14*s, 24*s, 6*s); ctx.fillRect(x-8*s, by-22*s, 8*s, 22*s);
      const flash = Math.sin(t*20) > 0;
      ctx.fillStyle = flash ? '#f87171' : '#93c5fd';
      ctx.beginPath(); ctx.rect(x-6*s, by-32*s, 12*s, 6*s); ctx.fill(); ctx.stroke();
      [-24,26].forEach(ox=>{
        const wx = x+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){ const ang = spin+i*Math.PI/2; ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  },
  submarine: {
    label: 'Submarine',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*1.5)*4*s;
      const by = gy - 30*s + bob;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.ellipse(x, by, 50*s, 16*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x-8*s, by-26*s, 16*s, 14*s); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, by-26*s); ctx.lineTo(x, by-34*s); ctx.stroke();
      ctx.fillStyle = '#0f2e3f';
      [-24,-6,12,30].forEach(ox=>{ ctx.beginPath(); ctx.arc(x+ox*s, by, 4.5*s, 0, Math.PI*2); ctx.fill(); ctx.stroke(); });
      ctx.restore();
    }
  },
  hotairballoon: {
    label: 'Hot Air Balloon',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*1.2)*5*s;
      const by = gy - 90*s + bob;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#e0453f';
      ctx.beginPath(); ctx.ellipse(x, by, 34*s, 42*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.moveTo(x-34*s,by); ctx.quadraticCurveTo(x,by+18*s,x+34*s,by); ctx.lineTo(x+34*s,by+2*s); ctx.quadraticCurveTo(x,by+20*s,x-34*s,by+2*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-14*s, by+38*s); ctx.lineTo(x-10*s, by+56*s); ctx.moveTo(x+14*s, by+38*s); ctx.lineTo(x+10*s, by+56*s); ctx.stroke();
      ctx.fillStyle = '#a16207';
      ctx.beginPath(); ctx.rect(x-10*s, by+56*s, 20*s, 14*s); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
};
const VEHICLE_LIST = Object.keys(VEHICLES).map(id => ({ id, label: VEHICLES[id].label }));
function drawVehicleProp(x, faceDir, type, t, sizeScale){
  const entry = VEHICLES[type] || VEHICLES.car;
  entry.draw(x, faceDir, t, sizeScale);
}

// ---------- Driver POV camera: first-person cockpit view (windshield + scrolling road + rearview
// mirror), swapped in for the whole normal scene render when a segment has "Driver POV camera" ticked
// and a character is actually in a ride/drive clip (js/scene.js evaluateScene sets frame.povDriver).
// This is a genuinely different way to sell "traveling" than the side-view stickman: looking OUT of
// the vehicle at a road rushing toward you, rather than watching the vehicle move across the stage.
const POV_SKY = { rain:'#7d8694', snow:'#c7d2df', fog:'#b7bec7', sunny:'#7fc4ff', autumn:'#d9a86c', none:'#8fc7ff' };
function drawPerspectiveRoad(cx, horizonY, floorY, roadHalfW, offsetNorm){
  // Road is a simple trapezoid (1-point perspective): narrow at the horizon, wide at the bottom edge.
  ctx.fillStyle = '#4b5259';
  ctx.beginPath();
  ctx.moveTo(cx - 10, horizonY); ctx.lineTo(cx + 10, horizonY);
  ctx.lineTo(cx + roadHalfW, floorY); ctx.lineTo(cx - roadHalfW, floorY);
  ctx.closePath(); ctx.fill();
  // shoulder strips
  ctx.fillStyle = '#3a3f45';
  ctx.beginPath(); ctx.moveTo(cx-10,horizonY); ctx.lineTo(cx-14,horizonY); ctx.lineTo(cx-roadHalfW-16,floorY); ctx.lineTo(cx-roadHalfW,floorY); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx+10,horizonY); ctx.lineTo(cx+14,horizonY); ctx.lineTo(cx+roadHalfW+16,floorY); ctx.lineTo(cx+roadHalfW,floorY); ctx.closePath(); ctx.fill();
  // dashed center line, scrolling toward the camera: each dash's normalized depth (0=horizon,
  // 1=floor) cycles with offsetNorm, and perspective-foreshortens via depth^2.2 like the road edges.
  ctx.fillStyle = '#f4d35e';
  const dashCount = 7;
  for(let i=0;i<dashCount;i++){
    let depth = ((i/dashCount) + offsetNorm) % 1;
    const shaped = Math.pow(depth, 2.2);
    const y = horizonY + shaped*(floorY-horizonY);
    const halfW = 2 + shaped*6;
    const h = 4 + shaped*16;
    ctx.fillRect(cx-halfW, y, halfW*2, h);
  }
}
function drawDriverPOV(t, speedPxPerSec, faceDir, weatherId){
  const cx = W/2, horizonY = 195, floorY = H;
  // The sky/pillars/road/dashboard shapes below don't opaquely cover every pixel (there are small gaps
  // near the side edges, between where the A-pillars stop and the road/dashboard start) — without an
  // explicit clear here, whatever was drawn on a PREVIOUS frame (e.g. the normal side-view characters,
  // rendered right up until POV mode was switched on) stays stuck in those gaps forever, since nothing
  // ever paints over them again. Clearing the whole canvas first guarantees a clean cockpit view.
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  // sky
  ctx.fillStyle = POV_SKY[weatherId] || POV_SKY.none;
  ctx.fillRect(0, 0, W, horizonY);
  // sun/glow hint
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.arc(cx + 180*faceDir, 70, 30, 0, Math.PI*2); ctx.fill();
  // scrolling road (offset driven by distance actually traveled, matching the character's real speed)
  const offsetNorm = ((t * (speedPxPerSec||40) * 0.006) % 1 + 1) % 1;
  drawPerspectiveRoad(cx, horizonY, floorY, 340, offsetNorm);
  // windshield pillars (A-pillars) framing the view, dark like real interior trim
  ctx.fillStyle = '#1b1f27';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(70,0); ctx.lineTo(15,H*0.62); ctx.lineTo(0,H*0.62); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W-70,0); ctx.lineTo(W-15,H*0.62); ctx.lineTo(W,H*0.62); ctx.closePath(); ctx.fill();
  // dashboard + steering wheel
  ctx.fillStyle = '#20242c';
  ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(0,H*0.74); ctx.quadraticCurveTo(cx,H*0.66,W,H*0.74); ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  const wheelX = cx - 90*faceDir, wheelY = H*0.87;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(wheelX, wheelY, 46, Math.PI*1.15, Math.PI*1.85); ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(wheelX, wheelY); ctx.lineTo(wheelX, wheelY-40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wheelX, wheelY); ctx.lineTo(wheelX-32, wheelY+22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wheelX, wheelY); ctx.lineTo(wheelX+32, wheelY+22); ctx.stroke();
  // rearview mirror: small inset showing a mini receding-road view (opposite perspective — narrows
  // toward the TOP since it represents the road shrinking away behind), plus a following-car dot.
  const mx = cx-70, my = 18, mw = 140, mh = 46;
  ctx.fillStyle = '#12151a'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx-6,my-6,mw+12,mh+16,6) : ctx.rect(mx-6,my-6,mw+12,mh+16); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
  ctx.fillStyle = POV_SKY[weatherId] || POV_SKY.none; ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#565d64';
  ctx.beginPath(); ctx.moveTo(mx+mw/2-3, my); ctx.lineTo(mx+mw/2+3, my); ctx.lineTo(mx+mw*0.85, my+mh); ctx.lineTo(mx+mw*0.15, my+mh); ctx.closePath(); ctx.fill();
  const behindBob = Math.sin(t*3)*1.5;
  ctx.fillStyle = '#e0453f';
  ctx.beginPath(); ctx.ellipse(mx+mw/2, my+mh*0.55+behindBob, 7, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, mw, mh);
  ctx.restore();
}

// ---------- rideable car variants: purpose-built for a character actually SITTING in them (unlike
// VEHICLES.car above, which is a small decorative background prop). Open-top/convertible silhouette
// so the seated character's torso+head are naturally visible above the door line with no window cutout
// needed, sized against poseRide's known geometry (js/poses.js: reuses poseSit's leg angles, so feet
// land at roughly x + 37*faceDir, right at GROUND_Y) — the footwell and both wheels are deliberately
// positioned clear of that point so feet never overlap a wheel the way the old tiny car did.
const RIDE_CAR_VARIANTS = {
  sedan: { body:'#e0453f', trim:'#7a1f1c', backSpan:58, frontSpan:98, doorTop:46, hoodTop:30, trunkTop:34, wheelR:19, spoiler:false, windows:0 },
  sports:{ body:'#f59e0b', trim:'#7a4a08', backSpan:44, frontSpan:82, doorTop:36, hoodTop:22, trunkTop:26, wheelR:20, spoiler:true,  windows:0 },
  limo:  { body:'#1f2430', trim:'#000000', backSpan:72, frontSpan:170, doorTop:46, hoodTop:30, trunkTop:34, wheelR:19, spoiler:false, windows:4 }
};
function drawRideCarProp(x, faceDir, t, sizeScale, variant){
  const v = RIDE_CAR_VARIANTS[variant] || RIDE_CAR_VARIANTS.sedan;
  const s = sizeScale || 1, INK = '#111', gy = GROUND_Y, fd = faceDir || 1;
  const backX = x - v.backSpan*s*fd, frontX = x + v.frontSpan*s*fd;
  const floorY = gy - 4*s, doorY = gy - v.doorTop*s, hoodY = gy - v.hoodTop*s, trunkY = gy - v.trunkTop*s;
  const spin = t*4;
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = INK;
  // body: open-top convertible profile (no roof/windshield to draw around) — back bumper up over the
  // trunk, along the door top (this is the "seat back" height the character's hip sits just above),
  // down the sloped hood, and along the floor back to the start.
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.moveTo(backX, floorY);
  ctx.lineTo(backX, trunkY);
  ctx.quadraticCurveTo(backX + 10*s*fd, doorY, backX + 26*s*fd, doorY);
  ctx.lineTo(frontX - 30*s*fd, doorY);
  ctx.quadraticCurveTo(frontX - 6*s*fd, doorY, frontX - 2*s*fd, hoodY);
  ctx.quadraticCurveTo(frontX + 6*s*fd, hoodY + 4*s, frontX, floorY);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // low dashboard hint just ahead of the seat, roughly where the character's forward-reaching hands
  // land (poseRide's arms reach forward-and-down from the shoulder) — purely decorative detail.
  ctx.strokeStyle = v.trim; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x + 20*s*fd, doorY + 4*s); ctx.lineTo(x + 32*s*fd, doorY - 10*s); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  if(v.spoiler){
    ctx.beginPath(); ctx.moveTo(backX, trunkY); ctx.lineTo(backX, trunkY - 14*s); ctx.lineTo(backX + 16*s*fd, trunkY - 14*s); ctx.stroke();
  }
  if(v.windows > 0){
    ctx.fillStyle = '#93c5fd';
    const span = (frontX - 30*s*fd - (backX + 26*s*fd));
    for(let i=0;i<v.windows;i++){
      const wx = backX + 26*s*fd + fd*(Math.abs(span)/(v.windows+1))*(i+1) - 6*s*fd;
      ctx.fillRect(wx, doorY - 16*s, 10*s, 10*s);
      ctx.strokeRect(wx, doorY - 16*s, 10*s, 10*s);
    }
  }
  // headlight/taillight accents
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(frontX - 4*s*fd, floorY - 6*s, 3*s, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f87171';
  ctx.beginPath(); ctx.arc(backX + 2*s*fd, floorY - 6*s, 3*s, 0, Math.PI*2); ctx.fill();
  // wheels: rear sits behind the seat, front sits well beyond where the seated character's feet land
  // (~37px*s forward of x), so neither wheel ever visually overlaps a foot.
  const wheelXs = variant === 'limo' ? [x - 40*s*fd, x + 20*s*fd, frontX - 30*s*fd] : [x - 32*s*fd, frontX - 26*s*fd];
  wheelXs.forEach(wx=>{
    ctx.fillStyle = '#222'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(wx, gy, v.wheelR*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    for(let i=0;i<4;i++){
      const ang = spin + i*Math.PI/2;
      ctx.beginPath(); ctx.moveTo(wx, gy); ctx.lineTo(wx+Math.cos(ang)*v.wheelR*s*0.65, gy+Math.sin(ang)*v.wheelR*s*0.65); ctx.stroke();
    }
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(wx, gy, v.wheelR*s*0.25, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

// ---------- rideable flying vehicles (plane/helicopter): open-cockpit, purpose-built for a seated
// character the same way drawRideCarProp is for cars — poseFly reuses poseSit's leg angles, so feet
// land at roughly hip.x + 37*faceDir, and hip.y is shifted up by `altitude` (js/render.js computeSkeleton
// subtracts pose.altitude from GROUND_Y). Everything here is drawn from an "effective ground" of
// GROUND_Y - altitude so the character stays seated in the cockpit at any height, and a shrinking
// ground-shadow ellipse (fixed at the real GROUND_Y) sells the sense of climbing higher.
function drawFlyShadow(x, altitude, sizeScale){
  if(altitude <= 1) return;
  const shrink = clamp(1 - altitude/MAX_ALTITUDE_HINT, 0.12, 1);
  ctx.save();
  ctx.globalAlpha = 0.22 * shrink;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 2, 55*sizeScale*shrink, 10*sizeScale*shrink, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
const MAX_ALTITUDE_HINT = 180; // mirrors scene.js's MAX_ALTITUDE — kept local since vehicles.js loads standalone

function drawRidePlaneProp(x, faceDir, t, altitude, sizeScale){
  const s = sizeScale || 1, INK = '#111', gy = GROUND_Y - altitude, fd = faceDir || 1;
  drawFlyShadow(x, altitude, s);
  const propSpin = t*26;
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = INK;
  // tail fin, drawn behind the cockpit
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.moveTo(x-68*s*fd, gy-2*s); ctx.lineTo(x-98*s*fd, gy-32*s); ctx.lineTo(x-86*s*fd, gy-32*s); ctx.lineTo(x-58*s*fd, gy-8*s);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // fuselage with an open cockpit well (character sits in the gap between the two curves) — nose out
  // front carries the spinning propeller, matching poseFly/poseSit's forward-reaching arm geometry.
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.moveTo(x-68*s*fd, gy+6*s);
  ctx.lineTo(x-68*s*fd, gy-12*s);
  ctx.quadraticCurveTo(x-38*s*fd, gy-28*s, x-2*s*fd, gy-28*s);
  ctx.lineTo(x+38*s*fd, gy-28*s);
  ctx.quadraticCurveTo(x+80*s*fd, gy-26*s, x+90*s*fd, gy-2*s);
  ctx.quadraticCurveTo(x+94*s*fd, gy+6*s, x+88*s*fd, gy+8*s);
  ctx.lineTo(x-68*s*fd, gy+8*s);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // wing straight through the fuselage
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath(); ctx.ellipse(x-4*s*fd, gy+8*s, 88*s, 8*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // spinning propeller (blurred cross)
  ctx.strokeStyle = 'rgba(30,30,30,0.5)'; ctx.lineWidth = 3;
  ctx.save(); ctx.translate(x+92*s*fd, gy-2*s); ctx.rotate(propSpin);
  ctx.beginPath(); ctx.moveTo(-26*s,0); ctx.lineTo(26*s,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,-26*s); ctx.lineTo(0,26*s); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.arc(x+92*s*fd, gy-2*s, 4*s, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawRideHelicopterPropRide(x, faceDir, t, altitude, sizeScale){
  const s = sizeScale || 1, INK = '#111', gy = GROUND_Y - altitude, fd = faceDir || 1;
  drawFlyShadow(x, altitude, s);
  const spin = t*22;
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = INK;
  // tail boom + rotor
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(x-38*s*fd, gy-6*s); ctx.lineTo(x-98*s*fd, gy-18*s); ctx.lineTo(x-98*s*fd, gy-10*s); ctx.lineTo(x-38*s*fd, gy+4*s);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,30,30,0.5)';
  ctx.save(); ctx.translate(x-98*s*fd, gy-14*s); ctx.rotate(spin*1.3);
  ctx.beginPath(); ctx.moveTo(0,-12*s); ctx.lineTo(0,12*s); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = INK;
  // open-cockpit body — wide ellipse the character visibly sits inside of
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(x+4*s*fd, gy-4*s, 66*s, 28*s, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  // bubble windshield hint
  ctx.fillStyle = 'rgba(191,227,255,0.55)';
  ctx.beginPath(); ctx.ellipse(x+52*s*fd, gy-2*s, 18*s, 16*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // skids
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x-44*s*fd, gy+24*s); ctx.lineTo(x+52*s*fd, gy+24*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-36*s*fd, gy+12*s); ctx.lineTo(x-36*s*fd, gy+24*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+44*s*fd, gy+12*s); ctx.lineTo(x+44*s*fd, gy+24*s); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  // main rotor mast + spinning blades — must clear the seated character's head, not just the body
  // shell: the character's hip sits at gy-44*s (HIP_HEIGHT+bounce above effective ground) and their
  // head extends roughly another 130*s above that, so the mast/blades are placed well past that,
  // around gy-190*s, rather than just above the fuselage the way a real (unoccupied) toy model would be.
  ctx.beginPath(); ctx.moveTo(x, gy-30*s); ctx.lineTo(x, gy-190*s); ctx.stroke();
  ctx.save(); ctx.translate(x, gy-190*s); ctx.rotate(spin);
  ctx.strokeStyle = 'rgba(30,30,30,0.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-76*s,0); ctx.lineTo(76*s,0); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// Dispatcher used by renderFrame (js/scene.js) — picks plane vs helicopter art for the RIDE_VEHICLES
// 'fly' kind, mirroring how drawRideCarProp is dispatched for the 'car' kind.
function drawRideFlyProp(x, faceDir, t, type, altitude){
  if(type === 'helicopter') drawRideHelicopterPropRide(x, faceDir, t, altitude, 1);
  else drawRidePlaneProp(x, faceDir, t, altitude, 1);
}
