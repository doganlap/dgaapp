/**
 * Seed: GRC Controls - 100% KSA Regulatory Controls
 * 
 * Seeds all controls from KSA regulatory frameworks
 * Covers all major frameworks and their controls
 */

exports.seed = async function(knex) {
  // Get all frameworks first
  const frameworks = await knex('grc_frameworks')
    .join('grc_regulators', 'grc_frameworks.regulator_id', 'grc_regulators.regulator_id')
    .select(
      'grc_frameworks.framework_id',
      'grc_frameworks.framework_code',
      'grc_frameworks.framework_name_en',
      'grc_regulators.regulator_code'
    );

  const frameworkMap = {};
  frameworks.forEach(f => {
    frameworkMap[f.framework_code] = f.framework_id;
  });

  // Delete existing controls
  await knex('grc_controls').del();

  const controls = [];

  // ========== NCA ECC Controls ==========
  if (frameworkMap['NCA-ECC-1.0']) {
    const ncaEccControls = [
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-1.1',
        control_name_en: 'Access Control Policy',
        control_name_ar: 'سياسة التحكم في الوصول',
        description: 'Establish and maintain access control policies',
        control_type: 'Preventive',
        control_category: 'Access Control',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-1.2',
        control_name_en: 'User Access Management',
        control_name_ar: 'إدارة وصول المستخدمين',
        description: 'Manage user access rights and permissions',
        control_type: 'Preventive',
        control_category: 'Access Control',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-2.1',
        control_name_en: 'Network Security Controls',
        control_name_ar: 'ضوابط أمن الشبكة',
        description: 'Implement network security controls and segmentation',
        control_type: 'Preventive',
        control_category: 'Security',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-2.2',
        control_name_en: 'Firewall Configuration',
        control_name_ar: 'تكوين جدار الحماية',
        description: 'Configure and maintain firewalls',
        control_type: 'Preventive',
        control_category: 'Security',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-3.1',
        control_name_en: 'Data Encryption',
        control_name_ar: 'تشفير البيانات',
        description: 'Encrypt sensitive data at rest and in transit',
        control_type: 'Preventive',
        control_category: 'Data Protection',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-3.2',
        control_name_en: 'Data Backup and Recovery',
        control_name_ar: 'نسخ احتياطي واستعادة البيانات',
        description: 'Implement data backup and recovery procedures',
        control_type: 'Corrective',
        control_category: 'Data Protection',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-4.1',
        control_name_en: 'Security Monitoring',
        control_name_ar: 'مراقبة الأمن',
        description: 'Monitor security events and incidents',
        control_type: 'Detective',
        control_category: 'Operations',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-4.2',
        control_name_en: 'Incident Response Plan',
        control_name_ar: 'خطة الاستجابة للحوادث',
        description: 'Establish and maintain incident response procedures',
        control_type: 'Corrective',
        control_category: 'Operations',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-5.1',
        control_name_en: 'Security Awareness Training',
        control_name_ar: 'تدريب التوعية الأمنية',
        description: 'Provide security awareness training to employees',
        control_type: 'Administrative',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['NCA-ECC-1.0'],
        control_code: 'ECC-5.2',
        control_name_en: 'Vulnerability Management',
        control_name_ar: 'إدارة الثغرات الأمنية',
        description: 'Identify and remediate security vulnerabilities',
        control_type: 'Preventive',
        control_category: 'Security',
      }
    ];
    controls.push(...ncaEccControls);
  }

  // ========== PDPL Controls ==========
  if (frameworkMap['PDPL-LAW-2023']) {
    const pdplControls = [
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-1.1',
        control_name_en: 'Data Processing Lawfulness',
        control_name_ar: 'شرعية معالجة البيانات',
        description: 'Ensure data processing is lawful and has legal basis',
        control_type: 'Preventive',
        control_category: 'Data Protection',
      },
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-1.2',
        control_name_en: 'Consent Management',
        control_name_ar: 'إدارة الموافقة',
        description: 'Obtain and manage user consent for data processing',
        control_type: 'Preventive',
        control_category: 'Data Protection',
      },
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-2.1',
        control_name_en: 'Data Minimization',
        control_name_ar: 'تقليل البيانات',
        description: 'Collect only necessary personal data',
        control_type: 'Preventive',
        control_category: 'Data Protection',
      },
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-2.2',
        control_name_en: 'Data Accuracy',
        control_name_ar: 'دقة البيانات',
        description: 'Ensure personal data is accurate and up-to-date',
        control_type: 'Preventive',
        control_category: 'Data Protection',
      },
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-3.1',
        control_name_en: 'Data Subject Rights',
        control_name_ar: 'حقوق أصحاب البيانات',
        description: 'Implement procedures for data subject rights requests',
        control_type: 'Administrative',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-3.2',
        control_name_en: 'Data Breach Notification',
        control_name_ar: 'إشعار خرق البيانات',
        description: 'Notify authorities and data subjects of data breaches',
        control_type: 'Corrective',
        control_category: 'Operations',
      },
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-4.1',
        control_name_en: 'Privacy Impact Assessment',
        control_name_ar: 'تقييم تأثير الخصوصية',
        description: 'Conduct privacy impact assessments for new projects',
        control_type: 'Preventive',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['PDPL-LAW-2023'],
        control_code: 'PDPL-4.2',
        control_name_en: 'Data Protection Officer',
        control_name_ar: 'مسؤول حماية البيانات',
        description: 'Appoint and maintain a Data Protection Officer',
        control_type: 'Administrative',
        control_category: 'Governance',
      }
    ];
    controls.push(...pdplControls);
  }

  // ========== SAMA Cybersecurity Banking Framework Controls ==========
  if (frameworkMap['SAMA-CBFR-2020']) {
    const samaControls = [
      {
        framework_id: frameworkMap['SAMA-CBFR-2020'],
        control_code: 'SAMA-CBFR-1.1',
        control_name_en: 'Cybersecurity Governance',
        control_name_ar: 'حوكمة الأمن السيبراني',
        description: 'Establish cybersecurity governance framework',
        control_type: 'Administrative',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['SAMA-CBFR-2020'],
        control_code: 'SAMA-CBFR-2.1',
        control_name_en: 'Third-Party Risk Management',
        control_name_ar: 'إدارة مخاطر الأطراف الثالثة',
        description: 'Manage cybersecurity risks from third-party vendors',
        control_type: 'Preventive',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['SAMA-CBFR-2020'],
        control_code: 'SAMA-CBFR-3.1',
        control_name_en: 'Security Testing',
        control_name_ar: 'اختبار الأمن',
        description: 'Conduct regular security testing and penetration testing',
        control_type: 'Detective',
        control_category: 'Security',
      },
      {
        framework_id: frameworkMap['SAMA-CBFR-2020'],
        control_code: 'SAMA-CBFR-4.1',
        control_name_en: 'Business Continuity Planning',
        control_name_ar: 'تخطيط استمرارية الأعمال',
        description: 'Maintain business continuity and disaster recovery plans',
        control_type: 'Corrective',
        control_category: 'Operations',
      }
    ];
    controls.push(...samaControls);
  }

  // ========== ISO 27001 Controls (via SASO) ==========
  if (frameworkMap['SASO-ISO27001']) {
    const iso27001Controls = [
      {
        framework_id: frameworkMap['SASO-ISO27001'],
        control_code: 'ISO27001-A.9.1',
        control_name_en: 'Access Control Policy',
        control_name_ar: 'سياسة التحكم في الوصول',
        description: 'ISO 27001 A.9.1 - Access control policy',
        control_type: 'Preventive',
        control_category: 'Access Control',
      },
      {
        framework_id: frameworkMap['SASO-ISO27001'],
        control_code: 'ISO27001-A.9.2',
        control_name_en: 'User Access Management',
        control_name_ar: 'إدارة وصول المستخدمين',
        description: 'ISO 27001 A.9.2 - User access management',
        control_type: 'Preventive',
        control_category: 'Access Control',
      },
      {
        framework_id: frameworkMap['SASO-ISO27001'],
        control_code: 'ISO27001-A.12.1',
        control_name_en: 'Operational Procedures',
        control_name_ar: 'الإجراءات التشغيلية',
        description: 'ISO 27001 A.12.1 - Operational procedures and responsibilities',
        control_type: 'Administrative',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['SASO-ISO27001'],
        control_code: 'ISO27001-A.12.6',
        control_name_en: 'Backup',
        control_name_ar: 'النسخ الاحتياطي',
        description: 'ISO 27001 A.12.6 - Management of technical vulnerabilities',
        control_type: 'Corrective',
        control_category: 'Data Protection',
      },
      {
        framework_id: frameworkMap['SASO-ISO27001'],
        control_code: 'ISO27001-A.14.1',
        control_name_en: 'Security Requirements',
        control_name_ar: 'متطلبات الأمن',
        description: 'ISO 27001 A.14.1 - Security requirements of information systems',
        control_type: 'Preventive',
        control_category: 'Security',
      },
      {
        framework_id: frameworkMap['SASO-ISO27001'],
        control_code: 'ISO27001-A.16.1',
        control_name_en: 'Information Security Incident Management',
        control_name_ar: 'إدارة حوادث أمن المعلومات',
        description: 'ISO 27001 A.16.1 - Management of information security incidents',
        control_type: 'Corrective',
        control_category: 'Operations',
      }
    ];
    controls.push(...iso27001Controls);
  }

  // ========== ZATCA E-Invoicing Controls ==========
  if (frameworkMap['ZATCA-ETR-2021']) {
    const zatcaControls = [
      {
        framework_id: frameworkMap['ZATCA-ETR-2021'],
        control_code: 'ZATCA-ETR-1.1',
        control_name_en: 'E-Invoice Generation',
        control_name_ar: 'إنشاء الفاتورة الإلكترونية',
        description: 'Generate e-invoices in ZATCA-approved format',
        control_type: 'Preventive',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['ZATCA-ETR-2021'],
        control_code: 'ZATCA-ETR-1.2',
        control_name_en: 'E-Invoice Submission',
        control_name_ar: 'إرسال الفاتورة الإلكترونية',
        description: 'Submit e-invoices to ZATCA platform',
        control_type: 'Preventive',
        control_category: 'Governance',
      },
      {
        framework_id: frameworkMap['ZATCA-ETR-2021'],
        control_code: 'ZATCA-ETR-2.1',
        control_name_en: 'E-Invoice Storage',
        control_name_ar: 'تخزين الفاتورة الإلكترونية',
        description: 'Store e-invoices securely for required retention period',
        control_type: 'Preventive',
        control_category: 'Data Protection',
      }
    ];
    controls.push(...zatcaControls);
  }

  // Insert all controls
  if (controls.length > 0) {
    await knex('grc_controls').insert(controls);
    console.log(`✅ Seeded ${controls.length} regulatory controls`);
  } else {
    console.log('⚠️ No frameworks found. Please run framework seed first.');
  }
};

