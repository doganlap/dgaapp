/**
 * Seed: GRC Regulators and Sectors
 * 
 * Seeds 50+ KSA Regulators and 15 Sectors
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Delete existing data
  await knex('grc_regulators').del();
  await knex('grc_sectors').del();

  // 15 Sectors
  const sectors = [
    { sector_code: 'HEALTH', sector_name_en: 'Health', sector_name_ar: 'الصحة', priority: 1 },
    { sector_code: 'EDUCATION', sector_name_en: 'Education', sector_name_ar: 'التعليم', priority: 2 },
    { sector_code: 'FINANCE', sector_name_en: 'Finance & Banking', sector_name_ar: 'المالية والمصرفية', priority: 3 },
    { sector_code: 'TELECOM', sector_name_en: 'Telecommunications', sector_name_ar: 'الاتصالات', priority: 4 },
    { sector_code: 'ENERGY', sector_name_en: 'Energy', sector_name_ar: 'الطاقة', priority: 5 },
    { sector_code: 'TRANSPORT', sector_name_en: 'Transport & Logistics', sector_name_ar: 'النقل والخدمات اللوجستية', priority: 6 },
    { sector_code: 'TOURISM', sector_name_en: 'Tourism & Hospitality', sector_name_ar: 'السياحة والضيافة', priority: 7 },
    { sector_code: 'REAL_ESTATE', sector_name_en: 'Real Estate & Construction', sector_name_ar: 'العقارات والبناء', priority: 8 },
    { sector_code: 'RETAIL', sector_name_en: 'Retail & Commerce', sector_name_ar: 'التجارة والتجزئة', priority: 9 },
    { sector_code: 'MANUFACTURING', sector_name_en: 'Manufacturing', sector_name_ar: 'التصنيع', priority: 10 },
    { sector_code: 'AGRICULTURE', sector_name_en: 'Agriculture', sector_name_ar: 'الزراعة', priority: 11 },
    { sector_code: 'MEDIA', sector_name_en: 'Media & Entertainment', sector_name_ar: 'الإعلام والترفيه', priority: 12 },
    { sector_code: 'TECHNOLOGY', sector_name_en: 'Technology & IT', sector_name_ar: 'التقنية وتقنية المعلومات', priority: 13 },
    { sector_code: 'GOVERNMENT', sector_name_en: 'Government Services', sector_name_ar: 'الخدمات الحكومية', priority: 14 },
    { sector_code: 'OTHER', sector_name_en: 'Other Sectors', sector_name_ar: 'قطاعات أخرى', priority: 15 },
  ];

  await knex('grc_sectors').insert(sectors);

  // 50+ KSA Regulators - All regulator_type values must match enum: 'Government Authority', 'Ministry', 'Commission', 'Center', 'Agency', 'Council', 'Committee'
  const regulators = [
    // Cybersecurity & Data
    { regulator_code: 'NCA', regulator_name_en: 'National Cybersecurity Authority', regulator_name_ar: 'الهيئة الوطنية للأمن السيبراني', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'SDAIA', regulator_name_en: 'Saudi Data & AI Authority', regulator_name_ar: 'الهيئة السعودية للبيانات والذكاء الاصطناعي', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'PDPL', regulator_name_en: 'Personal Data Protection Authority', regulator_name_ar: 'هيئة حماية البيانات الشخصية', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Financial Regulators
    { regulator_code: 'SAMA', regulator_name_en: 'Saudi Central Bank', regulator_name_ar: 'البنك المركزي السعودي', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'CMA', regulator_name_en: 'Capital Market Authority', regulator_name_ar: 'هيئة السوق المالية', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'ZATCA', regulator_name_en: 'Zakat, Tax & Customs Authority', regulator_name_ar: 'هيئة الزكاة والضريبة والجمارك', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Communications & IT
    { regulator_code: 'CITC', regulator_name_en: 'Communications & IT Commission', regulator_name_ar: 'هيئة الاتصالات وتقنية المعلومات', regulator_type: 'Commission', jurisdiction: 'National' },
    { regulator_code: 'MOC', regulator_name_en: 'Ministry of Communications', regulator_name_ar: 'وزارة الاتصالات', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Health Regulators
    { regulator_code: 'MOH', regulator_name_en: 'Ministry of Health', regulator_name_ar: 'وزارة الصحة', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'SFDA', regulator_name_en: 'Saudi Food & Drug Authority', regulator_name_ar: 'الهيئة العامة للغذاء والدواء', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'SBC', regulator_name_en: 'Saudi Blood Bank', regulator_name_ar: 'بنك الدم السعودي', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Education Regulators
    { regulator_code: 'MOE', regulator_name_en: 'Ministry of Education', regulator_name_ar: 'وزارة التعليم', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'ETEC', regulator_name_en: 'Education & Training Evaluation Commission', regulator_name_ar: 'هيئة تقويم التعليم والتدريب', regulator_type: 'Commission', jurisdiction: 'National' },
    { regulator_code: 'TVTC', regulator_name_en: 'Technical & Vocational Training Corporation', regulator_name_ar: 'المؤسسة العامة للتدريب التقني والمهني', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Energy Regulators
    { regulator_code: 'MOE_ENERGY', regulator_name_en: 'Ministry of Energy', regulator_name_ar: 'وزارة الطاقة', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'ECRA', regulator_name_en: 'Electricity & Cogeneration Regulatory Authority', regulator_name_ar: 'الهيئة التنظيمية للكهرباء والإنتاج المزدوج', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'WEC', regulator_name_en: 'Water & Electricity Company', regulator_name_ar: 'شركة المياه والكهرباء', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Transport Regulators
    { regulator_code: 'MOT', regulator_name_en: 'Ministry of Transport', regulator_name_ar: 'وزارة النقل', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'GACA', regulator_name_en: 'General Authority of Civil Aviation', regulator_name_ar: 'الهيئة العامة للطيران المدني', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'MAWANI', regulator_name_en: 'Saudi Ports Authority', regulator_name_ar: 'هيئة الموانئ', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Tourism & Culture
    { regulator_code: 'MOCULTURE', regulator_name_en: 'Ministry of Culture', regulator_name_ar: 'وزارة الثقافة', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'SCTH', regulator_name_en: 'Saudi Commission for Tourism & Heritage', regulator_name_ar: 'هيئة السياحة والتراث الوطني', regulator_type: 'Commission', jurisdiction: 'National' },
    { regulator_code: 'GAEU', regulator_name_en: 'General Authority for Entertainment', regulator_name_ar: 'الهيئة العامة للترفيه', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Labor & Social
    { regulator_code: 'MHRSD', regulator_name_en: 'Ministry of Human Resources & Social Development', regulator_name_ar: 'وزارة الموارد البشرية والتنمية الاجتماعية', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'GOSI', regulator_name_en: 'General Organization for Social Insurance', regulator_name_ar: 'المؤسسة العامة للتأمينات الاجتماعية', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'HRDF', regulator_name_en: 'Human Resources Development Fund', regulator_name_ar: 'صندوق تنمية الموارد البشرية', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Environment & Agriculture
    { regulator_code: 'MEWA', regulator_name_en: 'Ministry of Environment, Water & Agriculture', regulator_name_ar: 'وزارة البيئة والمياه والزراعة', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'NCM', regulator_name_en: 'National Center of Meteorology', regulator_name_ar: 'المركز الوطني للأرصاد', regulator_type: 'Center', jurisdiction: 'National' },
    
    // Justice & Legal
    { regulator_code: 'MOJ', regulator_name_en: 'Ministry of Justice', regulator_name_ar: 'وزارة العدل', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'PPA', regulator_name_en: 'Public Prosecution Authority', regulator_name_ar: 'النيابة العامة', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'BIPA', regulator_name_en: 'Board of Grievances', regulator_name_ar: 'ديوان المظالم', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Interior & Security
    { regulator_code: 'MOI', regulator_name_en: 'Ministry of Interior', regulator_name_ar: 'وزارة الداخلية', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'PSD', regulator_name_en: 'Public Security Directorate', regulator_name_ar: 'الإدارة العامة للأمن العام', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Commerce & Investment
    { regulator_code: 'MOCIT', regulator_name_en: 'Ministry of Commerce & Investment', regulator_name_ar: 'وزارة التجارة والاستثمار', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'SAGIA', regulator_name_en: 'Saudi Arabian General Investment Authority', regulator_name_ar: 'الهيئة العامة للاستثمار', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'SASO', regulator_name_en: 'Saudi Standards, Metrology & Quality Organization', regulator_name_ar: 'الهيئة السعودية للمواصفات والمقاييس والجودة', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Municipal & Urban
    { regulator_code: 'MOM', regulator_name_en: 'Ministry of Municipalities', regulator_name_ar: 'وزارة الشؤون البلدية', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'MODA', regulator_name_en: 'Ministry of Municipal & Rural Affairs', regulator_name_ar: 'وزارة الشؤون البلدية والقروية', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Statistics & Planning
    { regulator_code: 'GAM', regulator_name_en: 'General Authority for Statistics', regulator_name_ar: 'الهيئة العامة للإحصاء', regulator_type: 'Government Authority', jurisdiction: 'National' },
    { regulator_code: 'MEP', regulator_name_en: 'Ministry of Economy & Planning', regulator_name_ar: 'وزارة الاقتصاد والتخطيط', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Media & Information
    { regulator_code: 'MCIT', regulator_name_en: 'Ministry of Media', regulator_name_ar: 'وزارة الإعلام', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'SPA', regulator_name_en: 'Saudi Press Agency', regulator_name_ar: 'وكالة الأنباء السعودية', regulator_type: 'Agency', jurisdiction: 'National' },
    
    // Hajj & Umrah
    { regulator_code: 'MOHU', regulator_name_en: 'Ministry of Hajj & Umrah', regulator_name_ar: 'وزارة الحج والعمرة', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Foreign Affairs
    { regulator_code: 'MOFA', regulator_name_en: 'Ministry of Foreign Affairs', regulator_name_ar: 'وزارة الخارجية', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Defense
    { regulator_code: 'MOD', regulator_name_en: 'Ministry of Defense', regulator_name_ar: 'وزارة الدفاع', regulator_type: 'Ministry', jurisdiction: 'National' },
    { regulator_code: 'SANG', regulator_name_en: 'Saudi Arabian National Guard', regulator_name_ar: 'الحرس الوطني السعودي', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Finance
    { regulator_code: 'MOF', regulator_name_en: 'Ministry of Finance', regulator_name_ar: 'وزارة المالية', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Additional Sector-Specific Regulators
    { regulator_code: 'SIDF', regulator_name_en: 'Saudi Industrial Development Fund', regulator_name_ar: 'الصندوق الصناعي', regulator_type: 'Government Authority', jurisdiction: 'Sector-Specific' },
    { regulator_code: 'RCJY', regulator_name_en: 'Royal Commission for Riyadh City', regulator_name_ar: 'الهيئة الملكية لمدينة الرياض', regulator_type: 'Commission', jurisdiction: 'Regional' },
    { regulator_code: 'NEOM', regulator_name_en: 'NEOM Authority', regulator_name_ar: 'هيئة نيوم', regulator_type: 'Government Authority', jurisdiction: 'Regional' },
    { regulator_code: 'REDSEA', regulator_name_en: 'Red Sea Global', regulator_name_ar: 'الشركة السعودية للمشاريع السياحية', regulator_type: 'Government Authority', jurisdiction: 'Regional' },
    
    // Health Specialties
    { regulator_code: 'SCFHS', regulator_name_en: 'Saudi Commission for Health Specialties', regulator_name_ar: 'الهيئة السعودية للتخصصات الصحية', regulator_type: 'Commission', jurisdiction: 'National' },
    
    // Roads & Infrastructure
    { regulator_code: 'RGA', regulator_name_en: 'General Authority for Roads', regulator_name_ar: 'الهيئة العامة للطرق', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Sports
    { regulator_code: 'MOS', regulator_name_en: 'Ministry of Sport', regulator_name_ar: 'وزارة الرياضة', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Industry & Mineral Resources
    { regulator_code: 'MIMR', regulator_name_en: 'Ministry of Industry & Mineral Resources', regulator_name_ar: 'وزارة الصناعة والثروة المعدنية', regulator_type: 'Ministry', jurisdiction: 'National' },
    
    // Water Resources
    { regulator_code: 'NWC', regulator_name_en: 'National Water Company', regulator_name_ar: 'الشركة الوطنية للمياه', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Real Estate Development
    { regulator_code: 'REDF', regulator_name_en: 'Real Estate Development Fund', regulator_name_ar: 'صندوق التنمية العقارية', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Public Investment Fund
    { regulator_code: 'PIF', regulator_name_en: 'Public Investment Fund', regulator_name_ar: 'صندوق الاستثمارات العامة', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // King Salman Humanitarian Aid & Relief Center
    { regulator_code: 'KSRELIEF', regulator_name_en: 'King Salman Humanitarian Aid & Relief Center', regulator_name_ar: 'مركز الملك سلمان للإغاثة والأعمال الإنسانية', regulator_type: 'Center', jurisdiction: 'National' },
    
    // Saudi Red Crescent Authority
    { regulator_code: 'SRCA', regulator_name_en: 'Saudi Red Crescent Authority', regulator_name_ar: 'هيئة الهلال الأحمر السعودي', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // General Authority for Competition
    { regulator_code: 'GAC', regulator_name_en: 'General Authority for Competition', regulator_name_ar: 'الهيئة العامة للمنافسة', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // General Authority for Small & Medium Enterprises
    { regulator_code: 'MONSME', regulator_name_en: 'General Authority for Small & Medium Enterprises', regulator_name_ar: 'الهيئة العامة للمنشآت الصغيرة والمتوسطة', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // Communications, Space and Technology Commission (CST - Updated name)
    { regulator_code: 'CST', regulator_name_en: 'Communications, Space and Technology Commission', regulator_name_ar: 'هيئة الاتصالات والفضاء والتقنية', regulator_type: 'Commission', jurisdiction: 'National' },
    
    // Saudi Authority for Intellectual Property
    { regulator_code: 'SAIP', regulator_name_en: 'Saudi Authority for Intellectual Property', regulator_name_ar: 'الهيئة السعودية للملكية الفكرية', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // General Authority for Endowments
    { regulator_code: 'GAE', regulator_name_en: 'General Authority for Endowments', regulator_name_ar: 'الهيئة العامة للأوقاف', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // King Abdullah City for Atomic and Renewable Energy
    { regulator_code: 'KACARE', regulator_name_en: 'King Abdullah City for Atomic and Renewable Energy', regulator_name_ar: 'مدينة الملك عبدالله للطاقة الذرية والمتجددة', regulator_type: 'Center', jurisdiction: 'National' },
    
    // Saudi Export Development Authority
    { regulator_code: 'SEDA', regulator_name_en: 'Saudi Export Development Authority', regulator_name_ar: 'الهيئة السعودية لتطوير الصادرات', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // General Authority for Military Industries
    { regulator_code: 'GAMI', regulator_name_en: 'General Authority for Military Industries', regulator_name_ar: 'الهيئة العامة للصناعات العسكرية', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // National Center for Performance Measurement
    { regulator_code: 'ADAA', regulator_name_en: 'National Center for Performance Measurement', regulator_name_ar: 'المركز الوطني لقياس أداء الأجهزة العامة', regulator_type: 'Center', jurisdiction: 'National' },
    
    // National Anti-Corruption Commission
    { regulator_code: 'NAZAHA', regulator_name_en: 'National Anti-Corruption Commission', regulator_name_ar: 'الهيئة الوطنية لمكافحة الفساد', regulator_type: 'Government Authority', jurisdiction: 'National' },
    
    // General Authority for Survey and Geospatial Information
    { regulator_code: 'GASGI', regulator_name_en: 'General Authority for Survey and Geospatial Information', regulator_name_ar: 'الهيئة العامة للمساحة والمعلومات الجيومكانية', regulator_type: 'Government Authority', jurisdiction: 'National' },
  ];

  await knex('grc_regulators').insert(regulators);

  console.log(`✅ Seeded ${sectors.length} sectors and ${regulators.length} regulators`);
};
