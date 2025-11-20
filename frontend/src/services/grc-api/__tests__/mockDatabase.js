const { newDb } = require('pg-mem');
const { v4: uuidv4 } = require('uuid');

const setupMockDatabase = () => {
  const db = newDb();
  
  // Mock the uuid_generate_v4 function
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    implementation: () => uuidv4(),
  });

  // Create a mock pool
  const mockPool = {
    query: (text, params) => {
      return db.public.query(text, params);
    },
    connect: () => {
      return db.public.connect();
    }
  };
  
  return { db, mockPool };
};

module.exports = setupMockDatabase;
