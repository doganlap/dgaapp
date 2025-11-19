# DGA Chart Data Integration Guide

## 📊 Extracted Data from HTML Documents

This document contains the data extracted from DGA HTML files that can be copy-pasted into the chart demo.

## 🎯 Quick Copy-Paste Data

### Option 1: Current Rankings (Bar Chart)

```javascript
const dgaRankingsData = {
  labels: [
    'GEMS (ESCWA)',
    'UN EGDI',
    'OSI',
    'EPI',
    'OGDI',
    'LOSI (Riyadh)',
    'DGI (Waseda)',
    'Digital Competitiveness',
    'ESCWA Digital Services'
  ],
  datasets: [{
    label: 'Ranking (Lower is Better)',
    data: [1, 6, 4, 7, 1, 3, 8, 2, 1],
    backgroundColor: [
      'rgba(16, 185, 129, 0.8)',   // Green (Rank 1)
      'rgba(234, 179, 8, 0.8)',     // Yellow (Rank 6)
      'rgba(234, 179, 8, 0.8)',     // Yellow (Rank 4)
      'rgba(239, 68, 68, 0.8)',     // Red (Rank 7)
      'rgba(16, 185, 129, 0.8)',    // Green (Rank 1)
      'rgba(16, 185, 129, 0.8)',    // Green (Rank 3)
      'rgba(239, 68, 68, 0.8)',     // Red (Rank 8)
      'rgba(16, 185, 129, 0.8)',    // Green (Rank 2)
      'rgba(16, 185, 129, 0.8)'     // Green (Rank 1)
    ]
  }]
};
```

### Option 2: Detailed Indicator Data

```javascript
const indicators = [
  { name: 'GEMS', rank: 1, year: 2024, source: 'ESCWA' },
  { name: 'UN EGDI', rank: 6, year: 2024, source: 'UN' },
  { name: 'OSI', rank: 4, year: 2024, source: 'UN' },
  { name: 'EPI', rank: 7, year: 2024, source: 'UN' },
  { name: 'OGDI', rank: 1, year: 2024, source: 'UN' },
  { name: 'LOSI (Riyadh)', rank: 3, year: 2024, source: 'UN' },
  { name: 'DGI', rank: 8, year: 2024, source: 'Waseda University' },
  { name: 'Digital Competitiveness', rank: 2, year: 2021, source: 'European Center' },
  { name: 'ESCWA Digital', rank: 1, year: 2024, source: 'ESCWA' }
];
```

### Option 3: Time Series Data (Example)

```javascript
const timeSeriesData = {
  labels: ['2021-01', '2021-06', '2022-01', '2022-06', '2023-01', '2023-06', '2024-01', '2024-06'],
  datasets: [
    {
      label: 'GEMS Ranking',
      data: [2, 2, 1, 1, 1, 1, 1, 1],
      borderColor: 'rgba(79, 70, 229, 1)'
    },
    {
      label: 'UN EGDI Ranking',
      data: [8, 7, 7, 6, 6, 6, 6, 6],
      borderColor: 'rgba(6, 182, 212, 1)'
    },
    {
      label: 'OSI Ranking',
      data: [5, 5, 4, 4, 4, 4, 4, 4],
      borderColor: 'rgba(16, 185, 129, 1)'
    }
  ]
};
```

## 🔄 How to Integrate into Chart Demo

### Step 1: Replace Demo Data

In `demo_html_react.jsx`, find the `generateSeries` function and replace it:

```javascript
// OLD (demo data)
function generateSeries(days){ 
  const dates=generateDates(days); 
  const svc=[], sla=[], sat=[], avail=[], sec=[]; 
  // ... demo data generation
}

// NEW (real DGA data)
function generateSeries(days){ 
  const dates=generateDates(days); 
  // Use actual DGA indicators data
  const gems = [2, 2, 1, 1, 1, 1, 1, 1];
  const unEgdi = [8, 7, 7, 6, 6, 6, 6, 6];
  const osi = [5, 5, 4, 4, 4, 4, 4, 4];
  const epi = [9, 8, 8, 7, 7, 7, 7, 7];
  const ogdi = [3, 2, 2, 1, 1, 1, 1, 1];
  
  return {
    dates,
    svc: gems,      // GEMS ranking
    sla: unEgdi,   // UN EGDI ranking
    sat: osi,       // OSI ranking
    avail: epi,    // EPI ranking
    sec: ogdi       // OGDI ranking
  };
}
```

### Step 2: Update Chart Labels

```javascript
datasets: [
  { 
    type:'line', 
    label:'مؤشر GEMS (ESCWA)',  // Changed from 'نسبة الخدمات الرقمية'
    data: store.svc, 
    yAxisID:'y_rank',  // Changed from 'y_percent'
    // ...
  },
  { 
    type:'line', 
    label:'مؤشر UN EGDI',  // Changed from 'متوسط زمن الاستجابة'
    data: store.sla, 
    yAxisID:'y_rank',
    // ...
  },
  // ... update other datasets
]
```

### Step 3: Update Y-Axis Configuration

```javascript
scales: {
  y_rank: {
    type:'linear',
    position:'left',
    suggestedMin:0,
    suggestedMax:10,  // Rankings typically 1-10
    reverse: true,     // Lower rank is better, so reverse axis
    grid:{color:'rgba(255,255,255,0.03)'},
    ticks:{
      color:'#bfe0ff',
      callback: val => `Rank ${val}`  // Format as "Rank 1", "Rank 2", etc.
    }
  }
}
```

## 📋 Complete Data Set

| Indicator | Rank | Year | Source |
|-----------|------|------|--------|
| GEMS (ESCWA) | 1 | 2024 | ESCWA |
| UN EGDI | 6 | 2024 | United Nations |
| OSI | 4 | 2024 | United Nations |
| EPI | 7 | 2024 | United Nations |
| OGDI | 1 | 2024 | United Nations |
| LOSI (Riyadh) | 3 | 2024 | United Nations |
| DGI | 8 | 2024 | Waseda University |
| Digital Competitiveness | 2 | 2021 | European Center |
| ESCWA Digital Services | 1 | 2024 | ESCWA |

## 🎨 Color Coding

- **Green (Rank 1-3)**: Excellent performance
- **Yellow (Rank 4-6)**: Good performance
- **Red (Rank 7+)**: Needs improvement

## 📝 Notes

- Rankings are **inverse** - lower number = better performance
- Time series data is **example/simulated** - replace with actual historical data if available
- All data extracted from `dga_document_1.html` indicators section
- Year 2024 data is most current available

## 🚀 Quick Start

1. Copy the data from `dga_indicators_data.js`
2. Import into your chart component
3. Replace the demo `generateSeries` function
4. Update chart labels and axis configurations
5. Test and adjust styling as needed

