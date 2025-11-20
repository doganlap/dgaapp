/**
 * Sector Mapping Engine
 * Maps regulatory changes to affected industry sectors
 */

const logger = require('../../utils/logger');

const SECTOR_KEYWORDS = {
  'Banking': ['bank', 'banking', 'financial institution', 'sama', 'central bank', 'deposit', 'lending'],
  'Financial Services': ['finance', 'investment', 'asset management', 'wealth', 'trading', 'securities'],
  'Healthcare': ['health', 'hospital', 'clinic', 'medical', 'patient', 'pharmacy', 'pharmaceutical'],
  'Insurance': ['insurance', 'takaful', 'underwriting', 'coverage', 'policy holder'],
  'Telecommunications': ['telecom', 'communication', 'network', 'mobile', 'internet', 'broadband'],
  'E-commerce': ['e-commerce', 'online shopping', 'marketplace', 'digital payment', 'retail online'],
  'Technology': ['technology', 'software', 'data', 'ai', 'artificial intelligence', 'cloud'],
  'Manufacturing': ['manufacturing', 'production', 'factory', 'industrial'],
  'Oil & Gas': ['oil', 'gas', 'petroleum', 'energy', 'upstream', 'downstream'],
  'Construction': ['construction', 'building', 'contractor', 'real estate development'],
  'Retail': ['retail', 'shop', 'store', 'commercial', 'consumer goods'],
  'Education': ['education', 'school', 'university', 'training', 'learning'],
  'Government': ['government', 'public sector', 'ministry', 'authority', 'municipal'],
  'Transportation': ['transportation', 'logistics', 'shipping', 'freight', 'delivery'],
  'Hospitality': ['hotel', 'restaurant', 'tourism', 'hospitality', 'catering']
};

/**
 * Map regulatory change to affected sectors
 */
function mapToSectors(regulatoryChange) {
  const text = `${regulatoryChange.title} ${regulatoryChange.description || ''}`.toLowerCase();
  const mappedSectors = [];

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    const matches = keywords.some(keyword => text.includes(keyword.toLowerCase()));
    if (matches) {
      mappedSectors.push(sector);
    }
  }

  // Default to 'All Sectors' if no specific match or if explicitly stated
  if (mappedSectors.length === 0 || text.includes('all sector') || text.includes('general')) {
    mappedSectors.push('All Sectors');
  }

  logger.info(`📊 Mapped regulation to sectors: ${mappedSectors.join(', ')}`);
  return mappedSectors;
}

/**
 * Check if organization should be notified based on sector
 */
function shouldNotifyOrganization(regulatoryChange, organizationSector) {
  const affectedSectors = regulatoryChange.affected_sectors || [];
  
  // If 'All Sectors' is included, notify all organizations
  if (affectedSectors.includes('All Sectors')) {
    return true;
  }
  
  // Check if organization's sector matches
  return affectedSectors.includes(organizationSector);
}

module.exports = {
  mapToSectors,
  shouldNotifyOrganization,
  SECTOR_KEYWORDS
};

