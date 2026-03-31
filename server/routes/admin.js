const express = require('express');
const { z } = require('zod');
const { getDb, getNextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/institutions', async (req, res) => {
  const institutions = await getDb().collection('institutions').find({}, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  res.json({ items: institutions });
});

router.post('/institutions', requireRole('ADMIN'), async (req, res) => {
  const requestSchema = z.object({
    name: z.string().min(1),
    shortCode: z.string().min(1).max(10),
  });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) return res.status(400).json({ error: 'Invalid payload' });

  const { name, shortCode } = validatedBody.data;
  try {
    const id = await getNextId('institutions');
    await getDb().collection('institutions').insertOne({ id, name, short_code: shortCode });
    res.json({ id });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Institution short code already exists' });
    throw error;
  }
});

router.get('/campuses', async (req, res) => {
  const institutionId = req.query.institutionId ? Number(req.query.institutionId) : null;
  const filter = institutionId ? { institution_id: institutionId } : {};
  const campuses = await getDb().collection('campuses').find(filter, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  res.json({ items: campuses });
});

router.post('/campuses', requireRole('ADMIN'), async (req, res) => {
  const requestSchema = z.object({
    institutionId: z.number().int().positive(),
    name: z.string().min(1),
  });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) return res.status(400).json({ error: 'Invalid payload' });

  const { institutionId, name } = validatedBody.data;
  try {
    const id = await getNextId('campuses');
    await getDb().collection('campuses').insertOne({ id, institution_id: institutionId, name });
    res.json({ id });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Campus with this name already exists for the selected institution' });
    }
    throw error;
  }
});

router.get('/departments', async (req, res) => {
  const campusId = req.query.campusId ? Number(req.query.campusId) : null;
  const filter = campusId ? { campus_id: campusId } : {};
  const departments = await getDb().collection('departments').find(filter, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  res.json({ items: departments });
});

router.post('/departments', requireRole('ADMIN'), async (req, res) => {
  const requestSchema = z.object({
    campusId: z.number().int().positive(),
    name: z.string().min(1),
  });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) return res.status(400).json({ error: 'Invalid payload' });

  const { campusId, name } = validatedBody.data;
  try {
    const id = await getNextId('departments');
    await getDb().collection('departments').insertOne({ id, campus_id: campusId, name });
    res.json({ id });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Department already exists for the selected campus' });
    throw error;
  }
});

router.get('/programs', async (req, res) => {
  const departmentId = req.query.departmentId ? Number(req.query.departmentId) : null;
  const filter = departmentId ? { department_id: departmentId } : {};
  const programs = await getDb().collection('programs').find(filter, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  res.json({ items: programs });
});

router.post('/programs', requireRole('ADMIN'), async (req, res) => {
  const requestSchema = z.object({
    departmentId: z.number().int().positive(),
    branchName: z.string().min(1),
    courseType: z.enum(['UG', 'PG']),
    entryType: z.enum(['Regular', 'Lateral']),
    admissionMode: z.enum(['Government', 'Management']),
  });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) return res.status(400).json({ error: 'Invalid payload' });

  const { departmentId, branchName, courseType, entryType, admissionMode } = validatedBody.data;
  try {
    const id = await getNextId('programs');
    await getDb().collection('programs').insertOne({
      id,
      department_id: departmentId,
      branch_name: branchName,
      course_type: courseType,
      entry_type: entryType,
      admission_mode: admissionMode,
    });
    res.json({ id });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Program already exists for this combination' });
    throw error;
  }
});

router.get('/academic-years', async (req, res) => {
  const academicYears = await getDb().collection('academic_years').find({}, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  res.json({ items: academicYears });
});

router.post('/academic-years', requireRole('ADMIN'), async (req, res) => {
  const requestSchema = z.object({
    label: z.string().min(4).max(12),
  });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) return res.status(400).json({ error: 'Invalid payload' });

  const yearLabel = validatedBody.data.label.trim();
  if (!yearLabel) return res.status(400).json({ error: 'Academic year label is required' });

  try {
    const id = await getNextId('academic_years');
    await getDb().collection('academic_years').insertOne({ id, label: yearLabel });
    return res.json({ id });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Academic year already exists' });
    }
    throw error;
  }
});

router.get('/seat-matrices', async (req, res) => {
  const programId = req.query.programId ? Number(req.query.programId) : null;
  const academicYearId = req.query.academicYearId ? Number(req.query.academicYearId) : null;
  const filter = {};
  if (programId) filter.program_id = programId;
  if (academicYearId) filter.academic_year_id = academicYearId;
  const seatMatrices = await getDb().collection('seat_matrices').find(filter, { projection: { _id: 0 } }).sort({ id: -1 }).toArray();
  res.json({ items: seatMatrices });
});

router.post('/seat-matrices', requireRole('ADMIN'), async (req, res) => {
  const requestSchema = z.object({
    programId: z.number().int().positive(),
    academicYearId: z.number().int().positive(),
    intakeTotal: z.number().int().positive(),
    quotas: z
      .array(
        z.object({
          quotaType: z.enum(['KCET', 'COMEDK', 'Management']),
          quotaTotal: z.number().int().nonnegative(),
          supernumeraryTotal: z.number().int().nonnegative().optional(),
        }),
      )
      .min(1),
  });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) {
    return res.status(400).json({ error: 'Invalid payload', details: validatedBody.error.flatten() });
  }

  const { programId, academicYearId, intakeTotal, quotas } = validatedBody.data;
  const totalQuotaDeclared = quotas.reduce((acc, quota) => acc + quota.quotaTotal, 0);
  if (totalQuotaDeclared !== intakeTotal) {
    return res.status(400).json({
      error: 'Quota total must equal intake total',
      intakeTotal,
      sum: totalQuotaDeclared,
    });
  }

  // Ensure quotas are unique by quota type
  const quotaTypes = new Set();
  for (const quota of quotas) {
    if (quotaTypes.has(quota.quotaType)) return res.status(400).json({ error: 'Duplicate quotaType in quotas' });
    quotaTypes.add(quota.quotaType);
  }

  try {
    const createdSeatMatrixId = await getNextId('seat_matrices');
    await getDb().collection('seat_matrices').insertOne({
      id: createdSeatMatrixId,
      program_id: programId,
      academic_year_id: academicYearId,
      intake_total: intakeTotal,
      created_at: new Date().toISOString(),
    });

    for (const quota of quotas) {
      const quotaId = await getNextId('seat_matrix_quotas');
      await getDb().collection('seat_matrix_quotas').insertOne({
        id: quotaId,
        seat_matrix_id: createdSeatMatrixId,
        quota_type: quota.quotaType,
        quota_total: quota.quotaTotal,
        supernumerary_total: quota.supernumeraryTotal ?? 0,
      });
    }

    return res.json({ id: createdSeatMatrixId });
  } catch (error) {
    return res.status(409).json({ error: 'Failed to create seat matrix (maybe duplicate program/year)' });
  }
});

module.exports = router;

