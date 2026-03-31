const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('MANAGEMENT', 'ADMIN', 'OFFICER'));

router.get('/', async (req, res) => {
  const db = getDb();
  const intakeAgg = await db.collection('seat_matrices').aggregate([
    { $group: { _id: null, total: { $sum: '$intake_total' } } },
  ]).toArray();
  const totalIntakeAcrossPrograms = Number(intakeAgg[0]?.total ?? 0);
  const totalAdmitted = await db.collection('admissions').countDocuments({ status: 'CONFIRMED' });

  const quotaTotalsAgg = await db.collection('seat_matrix_quotas').aggregate([
    { $group: { _id: '$quota_type', quota_total: { $sum: '$quota_total' } } },
  ]).toArray();
  const quotaTotalsByType = quotaTotalsAgg.reduce((acc, r) => {
    acc[r._id] = Number(r.quota_total);
    return acc;
  }, {});

  const filledAdmissionRows = await db.collection('admissions').aggregate([
    { $match: { status: { $in: ['LOCKED', 'CONFIRMED'] } } },
    { $group: { _id: '$quota_type', filled: { $sum: 1 } } },
  ]).toArray();
  const filledAdmissionsByType = filledAdmissionRows.reduce((acc, r) => {
    acc[r._id] = Number(r.filled);
    return acc;
  }, {});

  const quotaStatisticsByType = {};
  for (const quotaCategory of ['KCET', 'COMEDK', 'Management']) {
    const totalSeatsConfigured = quotaTotalsByType[quotaCategory] ?? 0;
    const filledSeatsCount = filledAdmissionsByType[quotaCategory] ?? 0;
    quotaStatisticsByType[quotaCategory] = {
      total: totalSeatsConfigured,
      filled: filledSeatsCount,
      remaining: Math.max(0, totalSeatsConfigured - filledSeatsCount),
    };
  }

  const pendingDocuments = await db.collection('applicants').aggregate([
    { $match: { document_status: { $ne: 'VERIFIED' } } },
    { $sort: { id: -1 } },
    { $limit: 50 },
    { $lookup: { from: 'programs', localField: 'program_id', foreignField: 'id', as: 'program' } },
    { $unwind: '$program' },
    { $lookup: { from: 'academic_years', localField: 'academic_year_id', foreignField: 'id', as: 'year' } },
    { $unwind: '$year' },
    {
      $project: {
        _id: 0,
        id: 1,
        full_name: 1,
        quota_type: 1,
        document_status: 1,
        branch_name: '$program.branch_name',
        course_type: '$program.course_type',
        academic_year_label: '$year.label',
      },
    },
  ]).toArray();

  const feePending = await db.collection('applicants').aggregate([
    { $match: { fee_status: { $ne: 'PAID' } } },
    { $sort: { id: -1 } },
    { $limit: 50 },
    { $lookup: { from: 'programs', localField: 'program_id', foreignField: 'id', as: 'program' } },
    { $unwind: '$program' },
    { $lookup: { from: 'academic_years', localField: 'academic_year_id', foreignField: 'id', as: 'year' } },
    { $unwind: '$year' },
    {
      $project: {
        _id: 0,
        id: 1,
        full_name: 1,
        quota_type: 1,
        fee_status: 1,
        branch_name: '$program.branch_name',
        course_type: '$program.course_type',
        academic_year_label: '$year.label',
      },
    },
  ]).toArray();

  res.json({
    summary: { totalIntake: totalIntakeAcrossPrograms, totalAdmitted },
    quotaWise: quotaStatisticsByType,
    pendingDocuments,
    feePending,
  });
});

module.exports = router;

