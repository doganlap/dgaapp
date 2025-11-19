// ============================================
// COPY-PASTE THIS DIRECTLY INTO YOUR CHART
// ============================================

// Replace the generateSeries function in demo_html_react.jsx with this:

function generateSeries(days) {
  const dates = generateDates(days);
  
  // DGA REAL DATA - Rankings over time (example progression)
  // Adjust these arrays to match your actual historical data
  const gems = [2, 2, 1, 1, 1, 1, 1, 1];           // GEMS ranking
  const unEgdi = [8, 7, 7, 6, 6, 6, 6, 6];         // UN EGDI ranking
  const osi = [5, 5, 4, 4, 4, 4, 4, 4];            // OSI ranking
  const epi = [9, 8, 8, 7, 7, 7, 7, 7];            // EPI ranking
  const ogdi = [3, 2, 2, 1, 1, 1, 1, 1];          // OGDI ranking
  
  // If you have more data points than days, slice to match
  const dataLength = dates.length;
  
  return {
    dates,
    svc: gems.slice(0, dataLength),      // GEMS → Digital Services
    sla: unEgdi.slice(0, dataLength),    // UN EGDI → Response Time
    sat: osi.slice(0, dataLength),       // OSI → Satisfaction
    avail: epi.slice(0, dataLength),    // EPI → Availability
    sec: ogdi.slice(0, dataLength)       // OGDI → Security
  };
}

// ============================================
// UPDATE CHART CONFIGURATION
// ============================================

// Replace the datasets array in chart config with this:

datasets: [
  { 
    type:'line', 
    label:'مؤشر GEMS (ESCWA)', 
    data: store.svc, 
    yAxisID:'y_rank', 
    borderColor:'rgba(79,70,229,1)', 
    backgroundColor:'rgba(79,70,229,0.12)', 
    tension:0.25, 
    fill:true, 
    pointRadius:2 
  },
  { 
    type:'line', 
    label:'مؤشر UN EGDI', 
    data: store.sla, 
    yAxisID:'y_rank', 
    backgroundColor:'rgba(6,182,212,0.18)', 
    borderColor:'rgba(6,182,212,1)', 
    maxBarThickness:18, 
    order:2 
  },
  { 
    type:'line', 
    label:'مؤشر OSI', 
    data: store.sat, 
    yAxisID:'y_rank', 
    borderColor:'rgba(16,185,129,1)', 
    backgroundColor:'rgba(16,185,129,0.08)', 
    tension:0.2, 
    pointRadius:3, 
    fill:false 
  },
  { 
    type:'line', 
    label:'مؤشر EPI', 
    data: store.avail, 
    yAxisID:'y_rank', 
    borderColor:'rgba(234,88,12,1)', 
    borderDash:[6,4], 
    pointRadius:0, 
    fill:false 
  },
  { 
    type:'bar', 
    label:'مؤشر OGDI', 
    data: store.sec, 
    yAxisID:'y_rank', 
    backgroundColor:'rgba(239,68,68,0.18)', 
    borderColor:'rgba(239,68,68,1)', 
    maxBarThickness:14, 
    order:3 
  }
]

// ============================================
// UPDATE Y-AXIS SCALE
// ============================================

// Replace y_percent, y_hours, etc. with this:

scales: {
  x: {
    grid: {color:'rgba(255,255,255,0.03)'}, 
    ticks: {color:'#cfe6ff'}
  },
  y_rank: {
    type:'linear',
    position:'left',
    suggestedMin:0,
    suggestedMax:10,
    reverse: true,  // Lower rank = better, so reverse the axis
    grid: {color:'rgba(255,255,255,0.03)'},
    ticks: {
      color:'#bfe0ff',
      callback: function(val) {
        return 'Rank ' + val;
      }
    }
  }
}

// ============================================
// CURRENT RANKINGS (2024) - For Bar Chart
// ============================================

const currentRankings = {
  labels: [
    'GEMS (ESCWA)',
    'UN EGDI',
    'OSI',
    'EPI',
    'OGDI',
    'LOSI (Riyadh)',
    'DGI (Waseda)',
    'Digital Competitiveness',
    'ESCWA Digital'
  ],
  data: [1, 6, 4, 7, 1, 3, 8, 2, 1]
};

// ============================================
// QUICK COPY: Just the numbers
// ============================================

// Rankings array (copy this):
[1, 6, 4, 7, 1, 3, 8, 2, 1]

// Labels array (copy this):
['GEMS', 'UN EGDI', 'OSI', 'EPI', 'OGDI', 'LOSI', 'DGI', 'Digital Comp', 'ESCWA Digital']

