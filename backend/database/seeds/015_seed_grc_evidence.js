/**
 * Seed: GRC Evidence
 * 
 * Seeds sample evidence records for control assessments
 */

exports.seed = async function(knex) {
  // Get sample assessments and users
  const assessments = await knex('grc_control_assessments').select('assessment_id').limit(10);
  const users = await knex('users').select('user_id').limit(5);

  if (assessments.length === 0 || users.length === 0) {
    console.log('⚠️ No assessments or users found. Skipping evidence seed.');
    return;
  }

  // Delete existing evidence
  await knex('grc_evidence').del();

  const evidence = [];

  // Create evidence for each assessment
  assessments.forEach((assessment, index) => {
    const user = users[index % users.length];
    
    evidence.push({
      assessment_id: assessment.assessment_id,
      evidence_type: 'Document',
      evidence_name: `Compliance Document ${index + 1}`,
      description: `Supporting document for assessment ${assessment.assessment_id}`,
      file_path: `/uploads/evidence/doc_${assessment.assessment_id}_${index + 1}.pdf`,
      file_type: 'pdf',
      file_size: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
      evidence_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
      uploaded_by: user.email || `user${index + 1}@dga.sa`,
      evidence_status: ['Submitted', 'Approved', 'Rejected'][Math.floor(Math.random() * 3)]
    });

    // Add a screenshot evidence
    if (index % 2 === 0) {
      evidence.push({
        assessment_id: assessment.assessment_id,
        evidence_type: 'Screenshot',
        evidence_name: `System Screenshot ${index + 1}`,
        description: `System configuration screenshot`,
        file_path: `/uploads/evidence/screenshot_${assessment.assessment_id}_${index + 1}.png`,
        file_type: 'png',
        file_size: Math.floor(Math.random() * 2000000) + 50000, // 50KB - 2MB
        evidence_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Last 60 days
        uploaded_by: user.email || `user${index + 1}@dga.sa`,
        evidence_status: 'Approved'
      });
    }
  });

  if (evidence.length > 0) {
    await knex('grc_evidence').insert(evidence);
    console.log(`✅ Seeded ${evidence.length} evidence records`);
  } else {
    console.log('⚠️ No evidence created. Need assessments first.');
  }
};

