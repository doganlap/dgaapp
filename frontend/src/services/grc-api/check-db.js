const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PRISMA_DATABASE_URL || "postgres://3a38414caf532ad9c7c62582f78126f965d25a9f095a4d812f9f07eb9eb8d012:sk_W9GasVBo1IETypryTQEFJ@db.prisma.io:5432/postgres?sslmode=require"
    }
  }
});

async function testConnection() {
  try {
    console.log('🔄 Testing Prisma Accelerate connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Prisma connection established');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test passed:', result);
    
    // Get database version
    const version = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 Database version:', version[0].version);
    
    console.log('🎉 Database connection successful!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();