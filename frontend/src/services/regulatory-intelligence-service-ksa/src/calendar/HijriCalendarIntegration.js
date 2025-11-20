/**
 * Hijri Calendar Integration
 * Converts dates to Islamic calendar and handles Hijri date formatting
 */

const momentHijri = require('moment-hijri');
const logger = require('../../utils/logger');

/**
 * Convert Gregorian date to Hijri
 */
function gregorianToHijri(gregorianDate) {
  try {
    const hijriDate = momentHijri(gregorianDate, 'YYYY-MM-DD');
    return {
      hijriDate: hijriDate.format('iYYYY/iMM/iDD'),
      hijriDateArabic: hijriDate.format('iYYYY/iMM/iDD', 'ar'),
      hijriMonth: hijriDate.format('iMMMM'),
      hijriMonthArabic: hijriDate.format('iMMMM', 'ar'),
      hijriYear: hijriDate.format('iYYYY')
    };
  } catch (error) {
    logger.error('Hijri conversion error:', error);
    return null;
  }
}

/**
 * Format date in both Gregorian and Hijri
 */
function formatBilingualDate(gregorianDate) {
  const hijri = gregorianToHijri(gregorianDate);
  const gregorian = new Date(gregorianDate).toLocaleDateString('ar-SA');
  
  return {
    gregorian,
    hijri: hijri?.hijriDateArabic || null,
    display: `${gregorian} (${hijri?.hijriDateArabic || 'N/A'})`
  };
}

/**
 * Check if date falls in Ramadan
 */
function isRamadan(gregorianDate) {
  const hijri = gregorianToHijri(gregorianDate);
  return hijri && hijri.hijriMonth === 'Ramadan';
}

/**
 * Get Islamic holidays for a year
 */
function getIslamicHolidays(gregorianYear) {
  const holidays = [];
  
  // Eid al-Fitr (1 Shawwal)
  const eidFitr = momentHijri(`${gregorianYear}-10-01`, 'YYYY-iMM-iDD');
  holidays.push({
    name: 'Eid al-Fitr',
    nameArabic: 'عيد الفطر',
    date: eidFitr.format('YYYY-MM-DD'),
    hijri: eidFitr.format('iYYYY/iMM/iDD')
  });
  
  // Eid al-Adha (10 Dhul-Hijjah)
  const eidAdha = momentHijri(`${gregorianYear}-12-10`, 'YYYY-iMM-iDD');
  holidays.push({
    name: 'Eid al-Adha',
    nameArabic: 'عيد الأضحى',
    date: eidAdha.format('YYYY-MM-DD'),
    hijri: eidAdha.format('iYYYY/iMM/iDD')
  });
  
  return holidays;
}

module.exports = {
  gregorianToHijri,
  formatBilingualDate,
  isRamadan,
  getIslamicHolidays
};

