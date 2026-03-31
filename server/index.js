require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const applicantsRoutes = require('./routes/applicants');
const admissionsRoutes = require('./routes/admissions');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/applicants', applicantsRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

