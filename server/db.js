const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB;

if (!mongoUri || !mongoDbName) {
  throw new Error("MongoDB environment variables not set");
}

let client;
let db;

async function ensureCounterForCollection(counterName, collectionName) {
  const last = await db.collection(collectionName).find().sort({ id: -1 }).limit(1).next();
  const maxId = Number(last?.id || 0);
  await db.collection('counters').updateOne(
    { _id: counterName },
    { $max: { seq: maxId }, $setOnInsert: { created_at: new Date().toISOString() } },
    { upsert: true },
  );
}

async function getNextId(counterName) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: counterName },
    { $inc: { seq: 1 }, $setOnInsert: { created_at: new Date().toISOString() } },
    { upsert: true, returnDocument: 'after' },
  );
  return Number(result.seq);
}

async function initDb() {
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(mongoDbName);

  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('institutions').createIndex({ short_code: 1 }, { unique: true });
  await db.collection('campuses').createIndex({ institution_id: 1, name: 1 }, { unique: true });
  await db.collection('departments').createIndex({ campus_id: 1, name: 1 }, { unique: true });
  await db.collection('programs').createIndex(
    { department_id: 1, branch_name: 1, course_type: 1, entry_type: 1, admission_mode: 1 },
    { unique: true },
  );
  await db.collection('academic_years').createIndex({ label: 1 }, { unique: true });
  await db.collection('seat_matrices').createIndex({ program_id: 1, academic_year_id: 1 }, { unique: true });
  await db.collection('seat_matrix_quotas').createIndex({ seat_matrix_id: 1, quota_type: 1 }, { unique: true });
  await db.collection('admissions').createIndex({ applicant_id: 1 }, { unique: true });
  await db.collection('admissions').createIndex(
    { admission_number: 1 },
    {
      unique: true,
      partialFilterExpression: { admission_number: { $type: 'string' } },
    },
  );

  for (const [counterName, collectionName] of [
    ['users', 'users'],
    ['institutions', 'institutions'],
    ['campuses', 'campuses'],
    ['departments', 'departments'],
    ['programs', 'programs'],
    ['academic_years', 'academic_years'],
    ['seat_matrices', 'seat_matrices'],
    ['seat_matrix_quotas', 'seat_matrix_quotas'],
    ['applicants', 'applicants'],
    ['admissions', 'admissions'],
  ]) {
    await ensureCounterForCollection(counterName, collectionName);
  }

  const userCount = await db.collection('users').countDocuments();
  if (userCount === 0) {
    const seedUsers = [
      { username: 'admin', role: 'ADMIN', password: 'admin123' },
      { username: 'officer', role: 'OFFICER', password: 'officer123' },
      { username: 'management', role: 'MANAGEMENT', password: 'management123' },
    ];

    for (const user of seedUsers) {
      const id = await getNextId('users');
      await db.collection('users').insertOne({
        id,
        username: user.username,
        role: user.role,
        password_hash: bcrypt.hashSync(user.password, 10),
      });
    }
  }
}

function getDb() {
  if (!db) throw new Error('Database is not initialized');
  return db;
}

module.exports = { initDb, getDb, getNextId };

