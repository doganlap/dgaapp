// DGA Indicators Data Extracted from HTML Documents
// Copy this data into your chart component

export const dgaIndicatorsData = {
  // Rankings data (lower is better - these are rankings)
  rankings: [
    {
      id: 'gems',
      name: 'مؤشر نضج الخدمات الإلكترونية والنقالة (GEMS)',
      nameEn: 'GEMS - ESCWA',
      rank: 1,
      year: 2024,
      source: 'لجنة الإسكوا',
      description: 'حافظت المملكة على المركز الأول للعام الثالث على التوالي'
    },
    {
      id: 'un-egdi',
      name: 'مؤشر تطور الحكومة الإلكترونية (UN EGDI)',
      nameEn: 'UN E-Government Development Index',
      rank: 6,
      year: 2024,
      source: 'الأمم المتحدة',
      description: 'ترتيب المملكة في مؤشر تطور الحكومة الإلكترونية'
    },
    {
      id: 'osi',
      name: 'مؤشر الخدمات الإلكترونية (OSI)',
      nameEn: 'Online Service Index',
      rank: 4,
      year: 2024,
      source: 'الأمم المتحدة',
      description: 'ترتيب المملكة في مؤشر الخدمات الإلكترونية'
    },
    {
      id: 'epi',
      name: 'مؤشر المشاركة الإلكترونية (EPI)',
      nameEn: 'E-Participation Index',
      rank: 7,
      year: 2024,
      source: 'الأمم المتحدة',
      description: 'ترتيب المملكة في مؤشر المشاركة الإلكترونية'
    },
    {
      id: 'ogdi',
      name: 'مؤشر البيانات الحكومية المفتوحة (OGDI)',
      nameEn: 'Open Government Data Index',
      rank: 1,
      year: 2024,
      source: 'الأمم المتحدة',
      description: 'ترتيب المملكة في مؤشر البيانات الحكومية المفتوحة'
    },
    {
      id: 'losi',
      name: 'مؤشر الخدمات الإلكترونية المحلية (LOSI)',
      nameEn: 'Local Online Service Index - Riyadh',
      rank: 3,
      year: 2024,
      source: 'الأمم المتحدة',
      description: 'ترتيب مدينة الرياض في مؤشر الخدمات الإلكترونية المحلية'
    },
    {
      id: 'dgi',
      name: 'مؤشر قياس الحكومات الرقمية (DGI)',
      nameEn: 'Digital Government Index',
      rank: 8,
      year: 2024,
      source: 'جامعة واسيدا اليابانية',
      description: 'ترتيب المملكة في مؤشر قياس الحكومات الرقمية'
    },
    {
      id: 'digital-competitiveness',
      name: 'التنافسية الرقمية',
      nameEn: 'Digital Competitiveness',
      rank: 2,
      year: 2021,
      source: 'المركز الأوربي',
      description: 'ترتيب المملكة في تقرير التنافسية الرقمية'
    },
    {
      id: 'escwa-digital',
      name: 'مؤشر الإسكو - الخدمات الرقمية',
      nameEn: 'ESCWA Digital Services',
      rank: 1,
      year: 2024,
      source: 'لجنة الإسكوا',
      description: 'ترتيب المملكة في مؤشر الإسكو في مجال توفر الخدمات الرقمية وتطورها'
    }
  ],

  // Time series data structure (for chart visualization)
  // You can generate this based on historical data if available
  timeSeries: {
    // Example structure - replace with actual historical data
    dates: [
      '2021-01', '2021-06', '2022-01', '2022-06', 
      '2023-01', '2023-06', '2024-01', '2024-06'
    ],
    gems: [2, 2, 1, 1, 1, 1, 1, 1], // GEMS ranking over time
    unEgdi: [8, 7, 7, 6, 6, 6, 6, 6], // UN EGDI ranking
    osi: [5, 5, 4, 4, 4, 4, 4, 4], // OSI ranking
    epi: [9, 8, 8, 7, 7, 7, 7, 7], // EPI ranking
    ogdi: [3, 2, 2, 1, 1, 1, 1, 1], // OGDI ranking
    dgi: [10, 9, 9, 8, 8, 8, 8, 8] // DGI ranking
  },

  // Summary statistics
  summary: {
    totalIndicators: 9,
    averageRank: 3.67, // Average of all rankings
    bestRank: 1, // Best (lowest) ranking
    worstRank: 8, // Worst (highest) ranking
    numberOfFirstPlace: 3, // Number of indicators where rank = 1
    year: 2024
  }
};

// Chart-ready data format (for direct use in Chart.js)
export const chartDataFormat = {
  labels: dgaIndicatorsData.rankings.map(ind => ind.nameEn),
  datasets: [
    {
      label: 'Ranking (Lower is Better)',
      data: dgaIndicatorsData.rankings.map(ind => ind.rank),
      backgroundColor: dgaIndicatorsData.rankings.map(ind => {
        // Color coding: Green for rank 1-3, Yellow for 4-6, Orange for 7+
        if (ind.rank <= 3) return 'rgba(16, 185, 129, 0.8)'; // Green
        if (ind.rank <= 6) return 'rgba(234, 179, 8, 0.8)'; // Yellow
        return 'rgba(239, 68, 68, 0.8)'; // Red
      }),
      borderColor: dgaIndicatorsData.rankings.map(ind => {
        if (ind.rank <= 3) return 'rgba(16, 185, 129, 1)';
        if (ind.rank <= 6) return 'rgba(234, 179, 8, 1)';
        return 'rgba(239, 68, 68, 1)';
      }),
      borderWidth: 2
    }
  ]
};

// Time series chart data (for trend visualization)
export const timeSeriesChartData = {
  labels: dgaIndicatorsData.timeSeries.dates,
  datasets: [
    {
      label: 'GEMS Ranking',
      data: dgaIndicatorsData.timeSeries.gems,
      borderColor: 'rgba(79, 70, 229, 1)',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'UN EGDI Ranking',
      data: dgaIndicatorsData.timeSeries.unEgdi,
      borderColor: 'rgba(6, 182, 212, 1)',
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'OSI Ranking',
      data: dgaIndicatorsData.timeSeries.osi,
      borderColor: 'rgba(16, 185, 129, 1)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'EPI Ranking',
      data: dgaIndicatorsData.timeSeries.epi,
      borderColor: 'rgba(234, 88, 12, 1)',
      backgroundColor: 'rgba(234, 88, 12, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'OGDI Ranking',
      data: dgaIndicatorsData.timeSeries.ogdi,
      borderColor: 'rgba(139, 92, 246, 1)',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'DGI Ranking',
      data: dgaIndicatorsData.timeSeries.dgi,
      borderColor: 'rgba(239, 68, 68, 1)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: true
    }
  ]
};

// Export as JSON for easy copy-paste
export const dgaIndicatorsJSON = JSON.stringify(dgaIndicatorsData, null, 2);

