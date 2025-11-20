/**
 * Impact Analysis Engine
 * Uses OpenAI GPT-4 to analyze regulatory changes and assess impact on organizations
 */

const logger = require('../../utils/logger');

let openai;
try {
  const OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
} catch (error) {
  logger.warn('OpenAI not available for impact analysis');
}

/**
 * Analyze impact of regulatory change using AI
 */
async function analyzeImpact(regulatoryChange) {
  try {
    logger.info(`🤖 Analyzing impact for: ${regulatoryChange.title.substring(0, 50)}...`);

    // If OpenAI is not available, return fallback analysis
    if (!openai) {
      logger.warn('OpenAI not available, using fallback analysis');
      return {
        impactScore: 5,
        keyChanges: ['Regulatory change requires review'],
        affectedOrganizations: regulatoryChange.affected_sectors || [],
        requiredActions: ['Review regulatory change', 'Assess compliance gaps', 'Plan implementation'],
        timeline: '3-6 months',
        estimatedCost: 'Medium',
        responsibleDepartment: 'Compliance',
        aiAnalysis: { error: 'AI analysis unavailable' }
      };
    }

    const prompt = `
As a Saudi regulatory compliance expert, analyze the following regulatory change and provide a detailed impact assessment:

**Regulator**: ${regulatoryChange.regulator_name}
**Title**: ${regulatoryChange.title}
**Description**: ${regulatoryChange.description || 'No description provided'}
**Effective Date**: ${regulatoryChange.effective_date || 'Not specified'}
**Affected Sectors**: ${regulatoryChange.affected_sectors?.join(', ') || 'All sectors'}

Please provide:
1. **Impact Score** (1-10, where 10 is highest impact)
2. **Key Changes**: What are the main changes or requirements?
3. **Affected Organizations**: What types of organizations will be most affected?
4. **Required Actions**: What specific actions must organizations take to comply?
5. **Timeline**: What is the recommended timeline for compliance?
6. **Estimated Cost**: What is the estimated cost impact (Low/Medium/High)?
7. **Responsible Department**: Which department should typically handle this (IT, Legal, Finance, etc.)?

Provide response in JSON format.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Saudi Arabian regulatory compliance and governance, risk, and compliance (GRC) systems.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    logger.info(`✅ Impact analysis completed. Score: ${analysis.impactScore || 'N/A'}`);

    return {
      impactScore: analysis.impactScore || 5,
      keyChanges: analysis.keyChanges || [],
      affectedOrganizations: analysis.affectedOrganizations || [],
      requiredActions: analysis.requiredActions || [],
      timeline: analysis.timeline || 'To be determined',
      estimatedCost: analysis.estimatedCost || 'Medium',
      responsibleDepartment: analysis.responsibleDepartment || 'Compliance',
      aiAnalysis: analysis
    };

  } catch (error) {
    logger.error(`❌ Impact analysis error:`, error);
    
    // Return fallback analysis
    return {
      impactScore: 5,
      keyChanges: ['Regulatory change requires review'],
      affectedOrganizations: regulatoryChange.affected_sectors || [],
      requiredActions: ['Review regulatory change', 'Assess compliance gaps', 'Plan implementation'],
      timeline: '3-6 months',
      estimatedCost: 'Medium',
      responsibleDepartment: 'Compliance',
      aiAnalysis: { error: 'AI analysis unavailable' }
    };
  }
}

/**
 * Analyze multiple regulatory changes in batch
 */
async function analyzeBatch(regulatoryChanges) {
  const analyses = [];
  
  for (const change of regulatoryChanges) {
    const analysis = await analyzeImpact(change);
    analyses.push({
      changeId: change.id,
      ...analysis
    });
    
    // Rate limiting: wait 1 second between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return analyses;
}

module.exports = {
  analyzeImpact,
  analyzeBatch
};

