/**
 * Master Seed File - Coordinates all seed files in correct order
 * 
 * This ensures proper dependency order:
 * 1. Entities (no dependencies)
 * 2. Users (depends on entities)
 * 3. Programs (depends on entities)
 * 4. Budget (depends on entities, programs)
 * 5. KPIs (depends on entities, programs)
 * 6. Extended tables (depends on entities, programs)
 */

exports.seed = async function(knex) {
  console.log('🌱 Starting master seed process...\n');
  
  try {
    // 1. Seed Entities (158 entities - 100% coverage)
    console.log('📋 Step 1: Seeding entities...');
    const seedEntities = require('./002_seed_all_158_entities');
    await seedEntities.seed(knex);
    
    // 2. Seed Users (depends on entities)
    console.log('\n👥 Step 2: Seeding users...');
    const seedUsers = require('./003_seed_users');
    await seedUsers.seed(knex);
    
    // 3. Seed Programs (depends on entities)
    console.log('\n📊 Step 3: Seeding programs...');
    const seedPrograms = require('./002_seed_programs');
    await seedPrograms.seed(knex);
    
    // 4. Seed Budget (depends on entities, programs)
    console.log('\n💰 Step 4: Seeding budget...');
    const seedBudget = require('./004_seed_budget');
    await seedBudget.seed(knex);
    
    // 5. Seed KPIs (depends on entities, programs)
    console.log('\n📈 Step 5: Seeding KPIs...');
    const seedKPIs = require('./005_seed_kpis');
    await seedKPIs.seed(knex);
    
    // 6. Seed Compliance Records (depends on entities)
    console.log('\n🛡️ Step 6: Seeding compliance records...');
    const seedCompliance = require('./006_seed_compliance_records');
    await seedCompliance.seed(knex);
    
    // 7. Seed Risks (depends on entities)
    console.log('\n⚠️ Step 7: Seeding risks...');
    const seedRisks = require('./007_seed_risks');
    await seedRisks.seed(knex);
    
    // 8. Seed Stakeholder Consensus (depends on entities)
    console.log('\n🤝 Step 8: Seeding stakeholder consensus...');
    const seedStakeholders = require('./008_seed_stakeholder_consensus');
    await seedStakeholders.seed(knex);
    
    // 9. Seed Digital Maturity Scores (depends on entities)
    console.log('\n📊 Step 9: Seeding digital maturity scores...');
    const seedMaturity = require('./009_seed_digital_maturity_scores');
    await seedMaturity.seed(knex);
    
    // Final verification
    console.log('\n✅ Master seed completed successfully!');
    console.log('\n📊 Final Database Status:');
    
    const entityCount = await knex('dga_entities').count('* as count').first();
    const programCount = await knex('dga_programs').count('* as count').first();
    const userCount = await knex('users').count('* as count').first();
    const budgetCount = await knex('dga_budget').count('* as count').first();
    const kpiCount = await knex('dga_kpi_reports').count('* as count').first();
    
    console.log(`  - Entities: ${entityCount.count} / 158 (${((entityCount.count / 158) * 100).toFixed(1)}%)`);
    console.log(`  - Programs: ${programCount.count}`);
    console.log(`  - Users: ${userCount.count}`);
    console.log(`  - Budget Records: ${budgetCount.count}`);
    console.log(`  - KPI Reports: ${kpiCount.count}`);
    
    if (parseInt(entityCount.count) === 158) {
      console.log('\n🎉 100% Entity Coverage Achieved!');
    } else {
      console.log(`\n⚠️ Entity Coverage: ${entityCount.count}/158 (${((entityCount.count / 158) * 100).toFixed(1)}%)`);
    }
    
  } catch (error) {
    console.error('❌ Error during master seed:', error);
    throw error;
  }
};

