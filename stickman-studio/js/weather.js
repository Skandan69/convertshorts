// ---------- weather registry: full-canvas atmosphere overlays, drawn last (in front of everyone) ----------
// Each entry's draw(t) renders on top of the already-drawn scene (ctx/W/H/GROUND_Y come from
// render.js's module-level setup, same convention as BACKGROUNDS). To add a new weather effect:
// add one entry here — it automatically appears in the Weather dropdown via WEATHER_LIST and can be
// targeted by the prompt parser's detectWeather() in scene.js.
const WEATHER = {
  none: {
    label: 'None',
    draw: (t)=>{}
  },
  rain: {
    label: 'Rain',
    draw: (t)=>{
      ctx.save();
      ctx.strokeStyle = 'rgba(120,150,200,0.55)'; ctx.lineWidth = 1.5;
      for(let i=0;i<40;i++){
        const seed = i*53.7;
        const speed = 340 + (i%5)*40;
        const fx = (seed*3.1 + t*speed*0.3) % (W+40) - 20;
        const fy = (seed*7.3 + t*speed) % (H+30) - 15;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx-4, fy+14); ctx.stroke();
      }
      ctx.restore();
    }
  },
  snow: {
    label: 'Snow',
    draw: (t)=>{
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for(let i=0;i<34;i++){
        const seed = i*41.3;
        const speed = 24 + (i%4)*10;
        const drift = Math.sin(t*1.3 + i)*18;
        const fx = (seed*2.7 + drift + W) % W;
        const fy = (seed*6.1 + t*speed) % (H+20) - 10;
        const r = 1.4 + (i%3)*0.9;
        ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  fog: {
    label: 'Fog',
    draw: (t)=>{
      ctx.save();
      const drift = Math.sin(t*0.4)*20;
      for(let i=0;i<3;i++){
        const y = GROUND_Y - 60 + i*40;
        const grad = ctx.createLinearGradient(0, y-20, 0, y+30);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(230,235,240,0.35)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(drift*(i%2===0?1:-1), y-20, W, 50);
      }
      ctx.restore();
    }
  },
  sunny: {
    label: 'Sunny Rays',
    draw: (t)=>{
      ctx.save();
      const cx = W-90, cy = 70;
      ctx.strokeStyle = 'rgba(255,224,130,0.45)'; ctx.lineWidth = 6;
      for(let i=0;i<8;i++){
        const ang = i*(Math.PI/4) + t*0.15;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(ang)*36, cy+Math.sin(ang)*36);
        ctx.lineTo(cx+Math.cos(ang)*90, cy+Math.sin(ang)*90);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  autumn: {
    label: 'Autumn Leaves',
    draw: (t)=>{
      ctx.save();
      const colors = ['#e0453f','#e0a94c','#c98a3a','#a5714a'];
      for(let i=0;i<18;i++){
        const seed = i*61.1;
        const speed = 30 + (i%4)*8;
        const drift = Math.sin(t*1.1 + i*1.7)*24;
        const fx = (seed*3.3 + drift + W) % W;
        const fy = (seed*5.9 + t*speed) % (H+20) - 10;
        const spin = t*3 + i;
        ctx.save();
        ctx.translate(fx, fy); ctx.rotate(spin);
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.4, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }
};
const WEATHER_LIST = Object.keys(WEATHER).map(id => ({ id, label: WEATHER[id].label }));
function drawWeatherOverlay(weatherId, t){
  const entry = WEATHER[weatherId] || WEATHER.none;
  entry.draw(t);
}
