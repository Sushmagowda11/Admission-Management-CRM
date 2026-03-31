const express = require('express');
const { z } = require('zod');
const { getDb, getNextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { formatAdmissionNumber } = require('../utils/admissionNumber');

const router = express.Router();

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.use(requireAuth, requireRole('OFFICER', 'ADMIN'));

router.get('/availability', async (req, res) => {
  const requestSchema = z.object({
    programId: z.string().min(1),
    academicYearId: z.string().min(1),
    quotaType: z.enum(['KCET', 'COMEDK', 'Management']),
  });
  const validatedQuery = requestSchema.safeParse(req.query);
  if (!validatedQuery.success) {
    return res.status(400).json({ error: 'Invalid query', details: validatedQuery.error.flatten() });
  }

  const { programId, academicYearId, quotaType } = validatedQuery.data;
  const programIdNum = Number(programId);
  const academicYearIdNum = Number(academicYearId);

  const db = getDb();
  const programSeatMatrix = await db
    .collection('seat_matrices')
    .findOne({ program_id: programIdNum, academic_year_id: academicYearIdNum });
  if (!programSeatMatrix) return res.json({ quotaTotal: 0, filled: 0, remaining: 0 });

  const quotaConfiguration = await db
    .collection('seat_matrix_quotas')
    .findOne({ seat_matrix_id: programSeatMatrix.id, quota_type: quotaType });
  if (!quotaConfiguration) return res.json({ quotaTotal: 0, filled: 0, remaining: 0 });

  const filledSeats = await db.collection('admissions').countDocuments({
    seat_matrix_id: programSeatMatrix.id,
    quota_type: quotaType,
    status: { $in: ['LOCKED', 'CONFIRMED'] },
  });

  const quotaTotal = Number(quotaConfiguration.quota_total);
  const filledSeatCount = Number(filledSeats);
  return res.json({
    quotaTotal,
    filled: filledSeatCount,
    remaining: Math.max(0, quotaTotal - filledSeatCount),
  });
});

router.post('/allocate', async (req, res) => {
  const requestSchema = z.object({
    applicantId: z.number().int().positive(),
    allotmentNumber: z.string().optional().nullable(),
    quotaType: z.enum(['KCET', 'COMEDK', 'Management']).optional(),
  });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) {
    return res.status(400).json({ error: 'Invalid payload', details: validatedBody.error.flatten() });
  }

  const { applicantId, allotmentNumber, quotaType } = validatedBody.data;

  const db = getDb();
  const applicantRecord = await db.collection('applicants').findOne({ id: applicantId });
  if (!applicantRecord) return res.status(400).json({ error: 'Applicant not found' });

  const effectiveQuotaCategory = quotaType || applicantRecord.quota_type;
  const existingAdmissionRecord = await db.collection('admissions').findOne({ applicant_id: applicantId });
  if (existingAdmissionRecord) return res.status(409).json({ error: 'Applicant already has an admission record' });

  const programSeatMatrix = await db
    .collection('seat_matrices')
    .findOne({ program_id: applicantRecord.program_id, academic_year_id: applicantRecord.academic_year_id });
  if (!programSeatMatrix) return res.status(400).json({ error: 'No seat matrix configured for this program/year' });

  const quotaConfiguration = await db
    .collection('seat_matrix_quotas')
    .findOne({ seat_matrix_id: programSeatMatrix.id, quota_type: effectiveQuotaCategory });
  if (!quotaConfiguration) return res.status(400).json({ error: 'Quota not configured for this program/year' });

  const filledSeatsInQuota = await db.collection('admissions').countDocuments({
    seat_matrix_id: programSeatMatrix.id,
    quota_type: effectiveQuotaCategory,
    status: { $in: ['LOCKED', 'CONFIRMED'] },
  });
  if (Number(filledSeatsInQuota) >= Number(quotaConfiguration.quota_total)) {
    return res.status(409).json({ error: 'Quota is full; cannot allocate seat' });
  }

  const admissionId = await getNextId('admissions');
  const createdAdmissionRecord = {
    id: admissionId,
    applicant_id: applicantId,
    seat_matrix_id: programSeatMatrix.id,
    quota_type: effectiveQuotaCategory,
    allotment_number: allotmentNumber ?? null,
    status: 'LOCKED',
    admission_number: null,
    admission_sequence: null,
    created_at: new Date().toISOString(),
    confirmed_at: null,
  };
  await db.collection('admissions').insertOne(createdAdmissionRecord);

  if (quotaType) {
    await db.collection('applicants').updateOne({ id: applicantId }, { $set: { quota_type: quotaType } });
  }

  return res.json({ admission: createdAdmissionRecord });
});

router.post('/confirm', async (req, res) => {
  const requestSchema = z.object({ applicantId: z.number().int().positive() });
  const validatedBody = requestSchema.safeParse(req.body);
  if (!validatedBody.success) return res.status(400).json({ error: 'Invalid payload' });

  const { applicantId } = validatedBody.data;

  const db = getDb();
  const admissionRecord = await db.collection('admissions').findOne({ applicant_id: applicantId });
  if (!admissionRecord) return res.status(400).json({ error: 'Admission record not found for applicant' });

  if (admissionRecord.status === 'CONFIRMED' && admissionRecord.admission_number) {
    return res.json({ admission: admissionRecord });
  }

  const applicantRecord = await db.collection('applicants').findOne({ id: applicantId });
  if (!applicantRecord) return res.status(400).json({ error: 'Applicant not found' });
  if (applicantRecord.document_status !== 'VERIFIED') {
    return res.status(400).json({ error: 'Documents must be VERIFIED to confirm admission' });
  }
  if (applicantRecord.fee_status !== 'PAID') return res.status(400).json({ error: 'Fee must be PAID to confirm admission' });

  if (admissionRecord.admission_number) {
    await db.collection('admissions').updateOne(
      { id: admissionRecord.id },
      { $set: { status: 'CONFIRMED', confirmed_at: new Date().toISOString() } },
    );
    const refreshed = await db.collection('admissions').findOne({ id: admissionRecord.id }, { projection: { _id: 0 } });
    return res.json({ admission: refreshed });
  }

  const program = await db.collection('programs').findOne({ id: applicantRecord.program_id });
  const department = await db.collection('departments').findOne({ id: program.department_id });
  const campus = await db.collection('campuses').findOne({ id: department.campus_id });
  const institution = await db.collection('institutions').findOne({ id: campus.institution_id });
  const year = await db.collection('academic_years').findOne({ id: applicantRecord.academic_year_id });

  const admissionNumberPrefix = `${institution.short_code}/${year.label}/${program.course_type}/${program.branch_name}/${applicantRecord.quota_type}/`;
  const existingPrefixAdmissions = await db.collection('admissions').find(
    { admission_number: { $regex: `^${escapeRegex(admissionNumberPrefix)}` } },
    { projection: { _id: 0, admission_number: 1 } },
  ).toArray();
  const maxSeq = existingPrefixAdmissions.reduce((max, row) => {
    const value = Number(String(row.admission_number || '').slice(-4));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const nextAdmissionSequence = maxSeq + 1;

  const generatedAdmissionNumber = formatAdmissionNumber({
    institutionCode: institution.short_code,
    academicYear: year.label,
    courseLevel: program.course_type,
    branchCode: program.branch_name,
    quotaCategory: applicantRecord.quota_type,
    sequenceNumber: nextAdmissionSequence,
  });

  await db.collection('admissions').updateOne(
    { id: admissionRecord.id },
    {
      $set: {
        status: 'CONFIRMED',
        admission_number: generatedAdmissionNumber,
        admission_sequence: nextAdmissionSequence,
        confirmed_at: new Date().toISOString(),
      },
    },
  );
  const refreshedAdmission = await db.collection('admissions').findOne({ id: admissionRecord.id }, { projection: { _id: 0 } });
  return res.json({ admission: refreshedAdmission });
});

module.exports = router;

