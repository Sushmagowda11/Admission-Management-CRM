const express = require('express');
const { z } = require('zod');
const { getDb, getNextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('OFFICER', 'ADMIN'));

router.get('/', async (req, res) => {
  const rows = await getDb()
    .collection('applicants')
    .aggregate([
      { $sort: { id: -1 } },
      {
        $lookup: {
          from: 'programs',
          localField: 'program_id',
          foreignField: 'id',
          as: 'program',
        },
      },
      { $unwind: '$program' },
      {
        $lookup: {
          from: 'academic_years',
          localField: 'academic_year_id',
          foreignField: 'id',
          as: 'year',
        },
      },
      { $unwind: '$year' },
      {
        $lookup: {
          from: 'admissions',
          localField: 'id',
          foreignField: 'applicant_id',
          as: 'admission',
        },
      },
      {
        $addFields: {
          admission: { $arrayElemAt: ['$admission', 0] },
        },
      },
      {
        $project: {
          _id: 0,
          id: 1,
          full_name: 1,
          category: 1,
          entry_type: 1,
          quota_type: 1,
          marks: 1,
          program_id: 1,
          academic_year_id: 1,
          document_status: 1,
          fee_status: 1,
          created_by: 1,
          created_at: 1,
          branch_name: '$program.branch_name',
          course_type: '$program.course_type',
          admission_mode: '$program.admission_mode',
          academic_year_label: '$year.label',
          admission_id: '$admission.id',
          admission_status: '$admission.status',
          allotment_number: '$admission.allotment_number',
          admission_number: '$admission.admission_number',
          seat_matrix_id: '$admission.seat_matrix_id',
        },
      },
    ])
    .toArray();

  res.json({ items: rows });
});

router.post('/', async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(1),
    category: z.string().min(1),
    entryType: z.string().min(1),
    quotaType: z.enum(['KCET', 'COMEDK', 'Management']),
    marks: z.number().optional(),
    programId: z.number().int().positive(),
    academicYearId: z.number().int().positive(),
    documentStatus: z.enum(['PENDING', 'SUBMITTED', 'VERIFIED']).optional(),
    feeStatus: z.enum(['PENDING', 'PAID']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const authenticatedUser = req.user;

  const {
    fullName,
    category,
    entryType,
    quotaType,
    marks,
    programId,
    academicYearId,
    documentStatus,
    feeStatus,
  } = parsed.data;

  const applicantId = await getNextId('applicants');
  const createdApplicant = {
    id: applicantId,
    full_name: fullName,
    category,
    entry_type: entryType,
    quota_type: quotaType,
    marks: marks ?? null,
    program_id: programId,
    academic_year_id: academicYearId,
    document_status: documentStatus ?? 'PENDING',
    fee_status: feeStatus ?? 'PENDING',
    created_by: Number(authenticatedUser.sub),
    created_at: new Date().toISOString(),
  };
  await getDb().collection('applicants').insertOne(createdApplicant);

  res.json({ id: createdApplicant.id, applicant: createdApplicant });
});

router.patch('/:id/documents', async (req, res) => {
  const schema = z.object({ documentStatus: z.enum(['PENDING', 'SUBMITTED', 'VERIFIED']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const applicantId = Number(req.params.id);
  const { documentStatus } = parsed.data;

  const updateResult = await getDb()
    .collection('applicants')
    .updateOne({ id: applicantId }, { $set: { document_status: documentStatus } });

  if (updateResult.matchedCount === 0) return res.status(404).json({ error: 'Applicant not found' });
  res.json({ ok: true });
});

router.patch('/:id/fee', async (req, res) => {
  const schema = z.object({ feeStatus: z.enum(['PENDING', 'PAID']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const applicantId = Number(req.params.id);
  const { feeStatus } = parsed.data;

  const updateResult = await getDb()
    .collection('applicants')
    .updateOne({ id: applicantId }, { $set: { fee_status: feeStatus } });
  if (updateResult.matchedCount === 0) return res.status(404).json({ error: 'Applicant not found' });
  res.json({ ok: true });
});

module.exports = router;

