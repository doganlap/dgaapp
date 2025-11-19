# Shahin AI — Advanced Chart Demo (HTML + React)

This canvas contains **two deliverables** in one file for easy download/viewing:

1. `demo.html` — a standalone HTML file, **Arabic RTL only**, with full advanced features (pan/zoom without modifier key, annotations, data labels, benchmark lines, heatmap sidebar, export PNG/CSV/PDF). Ready to save and open in a browser.
2. `ChartDemo.jsx` — a React component (Next.js / React) using Chart.js + plugins, styled with Tailwind-ready classes. Includes instructions for installation and usage.

---

## 1) demo.html

Save the following content exactly as `demo.html` and open in Chrome/Edge/Firefox. It is RTL Arabic-only and includes pan/zoom (drag to pan, wheel to zoom), benchmark lines, an inline heatmap-like sidebar (comparative buckets), annotations, data labels, and export buttons.

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>عرض Shahin AI — متقدم (عربي)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    :root{--bg:#071022;--card:#081227;--muted:#9fb6d8;--accent:#4f46e5;--glass:rgba(255,255,255,0.03)}
    html,body{height:100%;margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial}
    body{background:linear-gradient(180deg,#061426,#071424);color:#e6eef8;padding:20px;box-sizing:border-box}
    .wrap{max-width:1250px;margin:0 auto}
    header{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:12px}
    h1{margin:0;font-weight:800;font-size:18px}
    .sub{color:var(--muted);font-size:13px}
    .card{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));padding:14px;border-radius:12px;box-shadow:0 6px 24px rgba(2,6,23,0.6);border:1px solid rgba(255,255,255,0.03)}
    .controls{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
    button, select{background:var(--glass);border:1px solid rgba(255,255,255,0.04);color:var(--muted);padding:8px 10px;border-radius:8px;cursor:pointer}
    .grid{display:grid;grid-template-columns:1fr 340px;gap:14px}
    .legend-list{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.02);min-height:420px}
    .legend-item{display:flex;gap:8px;align-items:center}
    .swatch{width:14px;height:14px;border-radius:3px;display:inline-block}
    .muted{color:var(--muted);font-size:13px}
    footer{margin-top:12px;color:var(--muted);font-size:13px}
    .heatmap{display:grid;grid-template-columns:repeat(1,1fr);gap:6px;margin-top:10px}
    .heat-row{display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;background:rgba(255,255,255,0.02)}
    @media (max-width:900px){ .grid{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>شاشِن AI — عرض بياني متقدم (عربي)</h1>
        <div class="sub">تجريبي: كل السلاسل · سحب للمزاحة · تمرير للعجلة للتكبير · خطوط مرجعية · خريطة حرارة مقارنة</div>
      </div>

      <div class="row">
        <div class="muted">نسخة RTL عربية جاهزة للعرض الرسمي</div>
      </div>
    </header>

    <div class="card">
      <div class="controls">
        <div style="display:flex;gap:8px;align-items:center">
          <button id="exportPng">تصدير PNG</button>
          <button id="exportPdf">تصدير PDF</button>
          <button id="exportCsv">تصدير CSV</button>
        </div>

        <div style="display:flex;gap:8px;align-items:center">
          <label class="muted">نافذة زمنية</label>
          <select id="timeWindow">
            <option value="30">آخر 30 يوم</option>
            <option value="90" selected>آخر 90 يوم</option>
            <option value="365">آخر 365 يوم</option>
          </select>
        </div>

        <div style="display:flex;gap:8px;align-items:center">
          <button id="resetZoom">إعادة الضبط</button>
          <button id="fitData">عرض كامل</button>
        </div>

        <div style="display:flex;gap:8px;align-items:center">
          <label class="muted">عرض قيم</label>
          <input id="toggleDataLabels" type="checkbox" checked>
        </div>
      </div>

      <div class="grid">
        <div>
          <canvas id="advancedChart" height="460"></canvas>
          <div class="muted" style="margin-top:8px">استخدم عجلة الماوس للتكبير. اسحب (Drag) للمزاحة. / Wheel to zoom, drag to pan.</div>
        </div>

        <aside class="legend-list" id="sidePanel">
          <div style="font-weight:700">السلاسل · Series</div>

          <div class="legend-item"><span class="swatch" id="swatch-service"></span>
            <div><strong>نسبة الخدمات الرقمية</strong><br><span class="muted">Digital Services (%)</span></div>
          </div>

          <div class="legend-item"><span class="swatch" id="swatch-sla"></span>
            <div><strong>متوسط زمن الاستجابة (ساعات)</strong><br><span class="muted">Avg Response Time (hrs)</span></div>
          </div>

          <div class="legend-item"><span class="swatch" id="swatch-sat"></span>
            <div><strong>مقياس رضا المستخدم</strong><br><span class="muted">User Satisfaction</span></div>
          </div>

          <div class="legend-item"><span class="swatch" id="swatch-avail"></span>
            <div><strong>التوافر (%)</strong><br><span class="muted">Availability (%)</span></div>
          </div>

          <div class="legend-item"><span class="swatch" id="swatch-sec"></span>
            <div><strong>الحوادث الأمنية</strong><br><span class="muted">Security Incidents</span></div>
          </div>

          <div style="margin-top:10px" class="muted">ميزات متقدمة: خطوط معيارية (benchmarks)، تعليقات تنظيمية، وتصدير جاهز.</div>

          <div style="margin-top:8px">
            <button id="addRegAnnotation">أضف ملاحظة تنظيمية</button>
          </div>

          <div style="margin-top:12px">
            <div style="font-weight:700">مقارنة سريعة — Benchmark heatmap</div>
            <div class="heatmap" id="heatmap">
              <!-- heat rows populated by JS -->
            </div>
          </div>
        </aside>
      </div>

    </div>

    <footer>Shahin AI • عرض جاهز لمسئول حكومي</footer>
  </div>

  <!-- Chart.js and plugins -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.1.1/dist/chartjs-plugin-zoom.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.2.1/dist/chartjs-plugin-annotation.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>

  <script>
  // Demo data generation
  function generateDates(days){ const dates=[]; const now=new Date(); for(let i=days-1;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); dates.push(d.toISOString().slice(0,10)); } return dates; }
  function generateSeries(days){ const dates=generateDates(days); const svc=[], sla=[], sat=[], avail=[], sec=[]; for(let i=0;i<dates.length;i++){ const t=i/(dates.length-1); svc.push(Math.round(30 + 60*t + (Math.random()*8-4))); sla.push(Math.max(1.2, 48 - 45*t + (Math.random()*5-2.5))); sat.push(Math.round((2.1 + 2.9*t + (Math.random()*0.6-0.3))*10)/10); avail.push(Math.round(80 + 18*t + (Math.random()*6-3))); sec.push((Math.random()<0.06)? Math.round(3+Math.random()*6) : Math.round(Math.random()*2)); } return {dates, svc, sla, sat, avail, sec}; }

  let currentDays=90; let store=generateSeries(currentDays);
  const colors={service:'rgba(79,70,229,1)',sla:'rgba(6,182,212,1)',sat:'rgba(16,185,129,1)',avail:'rgba(234,88,12,1)',sec:'rgba(239,68,68,1)'};
  document.getElementById('swatch-service').style.background = colors.service;
  document.getElementById('swatch-sla').style.background = colors.sla;
  document.getElementById('swatch-sat').style.background = colors.sat;
  document.getElementById('swatch-avail').style.background = colors.avail;
  document.getElementById('swatch-sec').style.background = colors.sec;

  // create chart
  Chart.register(ChartDataLabels);

  const ctx = document.getElementById('advancedChart').getContext('2d');
  const cfg = {
    type:'bar', data:{ labels: store.dates, datasets: [
      { type:'line', label:'نسبة الخدمات الرقمية', data: store.svc, yAxisID:'y_percent', borderColor:colors.service, backgroundColor:'rgba(79,70,229,0.12)', tension:0.25, fill:true, pointRadius:2 },
      { type:'bar', label:'متوسط زمن الاستجابة (ساعات)', data: store.sla, yAxisID:'y_hours', backgroundColor:'rgba(6,182,212,0.18)', borderColor:colors.sla, maxBarThickness:18, order:2 },
      { type:'line', label:'مقياس رضا المستخدم', data: store.sat, yAxisID:'y_score', borderColor:colors.sat, backgroundColor:'rgba(16,185,129,0.08)', tension:0.2, pointRadius:3, fill:false },
      { type:'line', label:'التوافر (%)', data: store.avail, yAxisID:'y_percent', borderColor:colors.avail, borderDash:[6,4], pointRadius:0, fill:false },
      { type:'bar', label:'الحوادث الأمنية', data: store.sec, yAxisID:'y_inc', backgroundColor:'rgba(239,68,68,0.18)', borderColor:colors.sec, maxBarThickness:14, order:3 }
    ]},
    options:{ maintainAspectRatio:false, interaction:{mode:'nearest',intersect:false},
      plugins:{ legend:{display:true,labels:{color:'#cfe6ff'}}, tooltip:{callbacks:{ label:function(ctx){ const raw=ctx.raw; return ctx.dataset.label + ': ' + (Number.isInteger(raw)? raw : raw.toFixed(2)); } } },
        annotation: { annotations: {
          benchmark_line: { type:'line', xMin:store.dates[Math.max(0,Math.floor(store.dates.length*0.5))], xMax:store.dates[Math.max(0,Math.floor(store.dates.length*0.5))], borderColor:'rgba(255,206,86,0.9)', borderWidth:2, label:{enabled:true,content:'الهدف المرجعي',position:'start',backgroundColor:'rgba(255,206,86,0.9)',color:'#000'}, display:true }
        } },
        zoom:{ pan:{ enabled:true, mode:'x', modifierKey:null }, zoom:{ wheel:{enabled:true}, pinch:{enabled:true}, mode:'x' } },
        datalabels:{ display: function(){ return !!window._showDataLabels; }, color:'#fff', formatter:function(value,ctx){ const axis=ctx.dataset.yAxisID; if(axis==='y_percent') return value + '%'; if(axis==='y_hours') return Number(value).toFixed(1) + 'h'; return value; }, font:{weight:'600',size:10}, anchor:'end', align:'top' }
      },
      scales:{ x:{ grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#cfe6ff'} }, y_percent:{type:'linear',position:'left',suggestedMin:0,suggestedMax:110,grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#bfe0ff',callback:val=>val + '%'} }, y_hours:{type:'linear',position:'right',suggestedMin:0,suggestedMax:50,grid:{display:false},ticks:{color:'#bfe0ff'} }, y_score:{type:'linear',position:'right',suggestedMin:0,suggestedMax:5.5,grid:{display:false},ticks:{color:'#bfe0ff'} }, y_inc:{type:'linear',position:'right',suggestedMin:0,suggestedMax:12,grid:{display:false},ticks:{color:'#bfe0ff'} }
      }, animation:{duration:600} }, plugins:[ChartDataLabels] };

  const advancedChart = new Chart(ctx, cfg);

  window._showDataLabels = true;

  function updateData(days){ currentDays=days; store = generateSeries(days); advancedChart.data.labels = store.dates; advancedChart.data.datasets[0].data = store.svc; advancedChart.data.datasets[1].data = store.sla; advancedChart.data.datasets[2].data = store.sat; advancedChart.data.datasets[3].data = store.avail; advancedChart.data.datasets[4].data = store.sec; // update benchmark line position
    const idx = Math.max(0, Math.floor(store.dates.length*0.5)); if(advancedChart.options.plugins.annotation.annotations.benchmark_line){ advancedChart.options.plugins.annotation.annotations.benchmark_line.xMin = store.dates[idx]; advancedChart.options.plugins.annotation.annotations.benchmark_line.xMax = store.dates[idx]; }
    advancedChart.update(); updateHeatmap(); }

  document.getElementById('timeWindow').addEventListener('change',(e)=> updateData(parseInt(e.target.value,10)) );
  document.getElementById('resetZoom').addEventListener('click', ()=> advancedChart.resetZoom() );
  document.getElementById('fitData').addEventListener('click', ()=> { advancedChart.resetZoom(); advancedChart.options.scales.x.min = undefined; advancedChart.options.scales.x.max = undefined; advancedChart.update(); });
  document.getElementById('toggleDataLabels').addEventListener('change',(e)=>{ window._showDataLabels = e.target.checked; advancedChart.update(); });

  document.getElementById('addRegAnnotation').addEventListener('click', ()=>{ const idx=Math.max(0,Math.floor(store.dates.length*0.85)); const x = store.dates[idx]; const id='reg_'+Date.now(); advancedChart.options.plugins.annotation.annotations[id] = { type:'label', xValue:x, yValue: store.svc[Math.min(store.svc.length-1, idx)], backgroundColor:'rgba(255,255,255,0.95)', borderColor:'#000', borderWidth:1, content:['ملاحظة تنظيمية'], color:'#000', font:{size:11,weight:'700'}, display:true }; advancedChart.update(); });

  // exports
  function downloadBlob(filename, blob){ const link=document.createElement('a'); link.href = URL.createObjectURL(blob); link.download=filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
  document.getElementById('exportPng').addEventListener('click', ()=>{ const img = new Image(); img.onload = function(){ const temp = document.createElement('canvas'); temp.width = advancedChart.width; temp.height = advancedChart.height; const c = temp.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0,0,temp.width,temp.height); c.drawImage(img,0,0); temp.toBlob(b=> downloadBlob('shahin-chart.png', b), 'image/png', 1); }; img.src = advancedChart.toBase64Image(); });

  document.getElementById('exportCsv').addEventListener('click', ()=>{ const labels = advancedChart.data.labels; const datasets = advancedChart.data.datasets; const header = ['date', ...datasets.map(d=>`"${d.label.replace(/"/g,'""')}"`)]; const rows=[header.join(',')]; for(let i=0;i<labels.length;i++){ const r=[labels[i]]; for(const ds of datasets){ const v=ds.data[i]; r.push(v===null||v===undefined? '': v); } rows.push(r.join(',')); } const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8;'}); downloadBlob('shahin-chart-data.csv', blob); });

  document.getElementById('exportPdf').addEventListener('click', async ()=>{ const { jsPDF } = window.jspdf; const imgData = advancedChart.toBase64Image(); const pdf = new jsPDF({ orientation:'landscape', unit:'pt', format:[advancedChart.width+120, advancedChart.height+160] }); pdf.setFontSize(16); pdf.text('Shahin AI — Export', 40, 40); pdf.addImage(imgData, 'PNG', 40, 60, advancedChart.width, advancedChart.height); pdf.save('shahin-chart.pdf'); });

  // Heatmap/baseline benchmark simulation
  function updateHeatmap(){ const container = document.getElementById('heatmap'); container.innerHTML=''; const orgs = [
    {name:'الجهة أ', score: Math.round(60 + Math.random()*30)},
    {name:'الجهة ب', score: Math.round(40 + Math.random()*40)},
    {name:'الجهة ج', score: Math.round(55 + Math.random()*35)},
    {name:'الجهة د', score: Math.round(20 + Math.random()*60)}
  ];
  orgs.sort((a,b)=> b.score-a.score);
  orgs.forEach(o=>{
    const el = document.createElement('div'); el.className='heat-row'; el.innerHTML = `<div><strong>${o.name}</strong></div><div>${o.score}%</div>`; container.appendChild(el);
  }); }

  updateHeatmap();

  // expose chart
  window.advancedChart = advancedChart;
  </script>
</body>
</html>
```

---

## 2) React component — `ChartDemo.jsx` (Next.js / React)

**Notes**: This component is self-contained and designed for a Next.js page or React app. It uses **chart.js**, **chartjs-plugin-zoom**, **chartjs-plugin-annotation**, and **chartjs-plugin-datalabels**. Styling uses Tailwind-compatible class names (you can adapt). It also includes an inline heatmap sidebar, benchmark lines, pan/zoom without modifier, annotations, and export buttons.

### Install dependencies (run in your project):

```bash
npm install chart.js chartjs-plugin-zoom chartjs-plugin-annotation chartjs-plugin-datalabels jspdf
```

### `components/ChartDemo.jsx`

```jsx
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { jsPDF } from 'jspdf';

Chart.register(zoomPlugin, annotationPlugin, ChartDataLabels);

export default function ChartDemo(){
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [days, setDays] = useState(90);
  const [showLabels, setShowLabels] = useState(true);
  const [store, setStore] = useState(generateSeries(90));

  useEffect(()=>{
    if(chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext('2d');

    const cfg = {
      type: 'bar',
      data: {
        labels: store.dates,
        datasets: [
          { type:'line', label:'نسبة الخدمات الرقمية', data:store.svc, yAxisID:'y_percent', borderColor:'rgba(79,70,229,1)', backgroundColor:'rgba(79,70,229,0.12)', tension:0.25, fill:true, pointRadius:2 },
          { type:'bar', label:'متوسط زمن الاستجابة (ساعات)', data:store.sla, yAxisID:'y_hours', backgroundColor:'rgba(6,182,212,0.18)', borderColor:'rgba(6,182,212,1)', maxBarThickness:18 },
          { type:'line', label:'مقياس رضا المستخدم', data:store.sat, yAxisID:'y_score', borderColor:'rgba(16,185,129,1)', backgroundColor:'rgba(16,185,129,0.08)', tension:0.2, pointRadius:3 },
          { type:'line', label:'التوافر (%)', data:store.avail, yAxisID:'y_percent', borderColor:'rgba(234,88,12,1)', borderDash:[6,4], pointRadius:0 },
          { type:'bar', label:'الحوادث الأمنية', data:store.sec, yAxisID:'y_inc', backgroundColor:'rgba(239,68,68,0.18)', borderColor:'rgba(239,68,68,1)', maxBarThickness:14 }
        ]
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { labels: { color: '#cfe6ff' } },
          tooltip: { callbacks: { label(ctx){ const raw = ctx.raw; return ctx.dataset.label + ': ' + (Number.isInteger(raw) ? raw : raw.toFixed(2)); } } },
          annotation: { annotations: { benchmark_line: { type:'line', xMin: store.dates[Math.floor(store.dates.length*0.5)], xMax: store.dates[Math.floor(store.dates.length*0.5)], borderColor:'rgba(255,206,86,0.9)', borderWidth:2, label:{enabled:true,content:['الهدف المرجعي'],position:'start',backgroundColor:'rgba(255,206,86,0.9)',color:'#000'} } } },
          zoom: { pan:{ enabled:true, mode:'x', modifierKey:null }, zoom:{ wheel:{ enabled:true }, pinch:{ enabled:true }, mode:'x' } },
          datalabels: { display: () => showLabels, color:'#fff', formatter: (v, ctx) => { const axis = ctx.dataset.yAxisID; if(axis==='y_percent') return v+'%'; if(axis==='y_hours') return Number(v).toFixed(1)+'h'; return v; }, font:{ weight:'600', size:10 } }
        },
        scales: {
          x: { grid: { color:'rgba(255,255,255,0.03)' }, ticks: { color:'#cfe6ff' } },
          y_percent: { type:'linear', position:'left', suggestedMin:0, suggestedMax:110, grid:{ color:'rgba(255,255,255,0.03)' }, ticks:{ color:'#bfe0ff', callback: v => v + '%' } },
          y_hours: { type:'linear', position:'right', suggestedMin:0, suggestedMax:50, grid:{ display:false }, ticks:{ color:'#bfe0ff' } },
          y_score: { type:'linear', position:'right', suggestedMin:0, suggestedMax:5.5, grid:{ display:false }, ticks:{ color:'#bfe0ff' } },
          y_inc: { type:'linear', position:'right', suggestedMin:0, suggestedMax:12, grid:{ display:false }, ticks:{ color:'#bfe0ff' } }
        }
      }
    };

    chartRef.current = new Chart(ctx, cfg);
    // expose chart for debugging
    window._shahinChart = chartRef.current;

    return () => chartRef.current?.destroy();
  }, [store, showLabels]);

  function handleDaysChange(e){ const d = Number(e.target.value); setDays(d); setStore(generateSeries(d)); }

  function exportPNG(){ const dataUrl = chartRef.current.toBase64Image(); const link = document.createElement('a'); link.href = dataUrl; link.download = 'shahin-chart.png'; link.click(); }
  function exportCSV(){ const labels = chartRef.current.data.labels; const datasets = chartRef.current.data.datasets; const rows = [['date', ...datasets.map(ds => ds.label)]]; for(let i=0;i<labels.length;i++){ const r=[labels[i]]; datasets.forEach(ds => r.push(ds.data[i] ?? '')); rows.push(r); } const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'); const blob = new Blob([csv],{type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shahin-chart-data.csv'; a.click(); }
  async function exportPDF(){ const dataUrl = chartRef.current.toBase64Image(); const pdf = new jsPDF({ orientation:'landscape' }); pdf.setFontSize(16); pdf.text('Shahin AI — Export', 20, 20); pdf.addImage(dataUrl, 'PNG', 20, 40, 750, 300); pdf.save('shahin-chart.pdf'); }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-surface rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">شاشِن AI — عرض بياني متقدم</h2>
        <div className="space-x-2">
          <button onClick={exportPNG} className="btn">تصدير PNG</button>
          <button onClick={exportPDF} className="btn">تصدير PDF</button>
          <button onClick={exportCSV} className="btn">تصدير CSV</button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div style={{height:420}}>
            <canvas ref={canvasRef}></canvas>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="muted">نافذة زمنية</label>
            <select value={days} onChange={handleDaysChange} className="px-2 py-1 rounded">
              <option value={30}>آخر 30 يوم</option>
              <option value={90}>آخر 90 يوم</option>
              <option value={365}>آخر 365 يوم</option>
            </select>

            <label className="muted">عرض القيم</label>
            <input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)} />
          </div>
        </div>

        <aside style={{width:260}} className="bg-gray-50/5 p-3 rounded">
          <div className="font-semibold mb-2">مقارنة سريعة — Benchmark</div>
          {generateOrgs().map(o => (
            <div key={o.name} className="flex justify-between items-center p-2 rounded mb-2" style={{background:o.score>75? 'rgba(16,185,129,0.08)' : o.score>50? 'rgba(79,70,229,0.06)' : 'rgba(234,88,12,0.04)'}}>
              <div>{o.name}</div>
              <div className="font-bold">{o.score}%</div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

// Utility functions used above
function generateDates(days){ const dates=[]; const now=new Date(); for(let i=days-1;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); dates.push(d.toISOString().slice(0,10)); } return dates; }
function generateSeries(days){ const dates=generateDates(days); const svc=[], sla=[], sat=[], avail=[], sec=[]; for(let i=0;i<dates.length;i++){ const t=i/(dates.length-1); svc.push(Math.round(30 + 60*t + (Math.random()*8-4))); sla.push(Math.max(1.2, 48 - 45*t + (Math.random()*5-2.5))); sat.push(Math.round((2.1 + 2.9*t + (Math.random()*0.6-0.3))*10)/10); avail.push(Math.round(80 + 18*t + (Math.random()*6-3))); sec.push((Math.random()<0.06)? Math.round(3+Math.random()*6) : Math.round(Math.random()*2)); } return {dates, svc, sla, sat, avail, sec}; }
function generateOrgs(){ return [ {name:'الجهة أ', score: Math.round(60 + Math.random()*30)}, {name:'الجهة ب', score: Math.round(40 + Math.random()*40)}, {name:'الجهة ج', score: Math.round(55 + Math.random()*35)} ]; }
```

---

### How I delivered:
- Standalone `demo.html` is Arabic-only RTL, with pan/zoom (no modifier), annotations, benchmark line, heatmap sidebar, and exports. Ready to open in a browser.
- `ChartDemo.jsx` is a reusable React component for Next.js, with the same feature set and Tailwind-compatible classes.

If you'd like, I can now:
- Produce a downloadable ZIP containing `demo.html` and `ChartDemo.jsx`.
- Convert the React component to TypeScript.
- Make a short speaker script (Arabic) for your governmental presentation highlighting the features.

Tell me which of the follow-ups you want and I'll add them right here.
