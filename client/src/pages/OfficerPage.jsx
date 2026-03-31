import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminAcademicYears,
  adminProgramsAll,
  createApplicant,
  allocateSeat,
  confirmAdmission,
  listApplicants,
  getSeatAvailability,
  setApplicantDocuments,
  setApplicantFee,
} from '../api.js';

function findApplicantFromList(applicantsList, applicantId) {
  return applicantsList.find((candidate) => candidate.id === applicantId) || null;
}

export default function OfficerPage() {
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [applicants, setApplicants] = useState([]);

  const [msg, setMsg] = useState(null);

  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const selectedApplicant = useMemo(() => {
    if (!selectedApplicantId) return null;
    return findApplicantFromList(applicants, Number(selectedApplicantId));
  }, [applicants, selectedApplicantId]);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    category: '',
    entryType: 'Regular',
    quotaType: 'KCET',
    marks: '',
    programId: null,
    academicYearId: null,
  });

  const [allocateForm, setAllocateForm] = useState({
    allotmentNumber: '',
    quotaTypeOverride: '',
  });

  const [docsForm, setDocsForm] = useState({
    documentStatus: 'PENDING',
  });

  const [feeForm, setFeeForm] = useState({
    feeStatus: 'PENDING',
  });

  const [seatAvailability, setSeatAvailability] = useState(null);

  const refreshApplicants = useCallback(async () => {
    const items = await listApplicants();
    setApplicants(items);
  }, []);

  useEffect(() => {
    (async () => {
      setPrograms(await adminProgramsAll());
      setAcademicYears(await adminAcademicYears());
      await refreshApplicants();
    })();
  }, [refreshApplicants]);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [msg]);

  useEffect(() => {
    if (!selectedApplicantId) return;
    const a = findApplicantFromList(applicants, Number(selectedApplicantId));
    if (!a) return;
    setAllocateForm((s) => ({ ...s, quotaTypeOverride: '' }));
    setDocsForm({ documentStatus: a.document_status || 'PENDING' });
    setFeeForm({ feeStatus: a.fee_status || 'PENDING' });
  }, [selectedApplicantId, applicants]);

  useEffect(() => {
    if (!selectedApplicant) {
      setSeatAvailability(null);
      return;
    }
    (async () => {
      const effectiveQuotaType = allocateForm.quotaTypeOverride || selectedApplicant.quota_type;
      if (!effectiveQuotaType) return;
      const a = await getSeatAvailability({
        programId: selectedApplicant.program_id,
        academicYearId: selectedApplicant.academic_year_id,
        quotaType: effectiveQuotaType,
      });
      setSeatAvailability(a);
    })();
  }, [
    selectedApplicant?.program_id,
    selectedApplicant?.academic_year_id,
    selectedApplicant?.quota_type,
    allocateForm.quotaTypeOverride,
  ]);

  async function onCreateApplicant() {
    setMsg(null);
    try {
      const payload = {
        fullName: createForm.fullName,
        category: createForm.category,
        entryType: createForm.entryType,
        quotaType: createForm.quotaType,
        marks: createForm.marks === '' ? undefined : Number(createForm.marks),
        programId: Number(createForm.programId),
        academicYearId: Number(createForm.academicYearId),
      };
      await createApplicant(payload);
      setCreateForm({
        fullName: '',
        category: '',
        entryType: 'Regular',
        quotaType: createForm.quotaType,
        marks: '',
        programId: createForm.programId,
        academicYearId: createForm.academicYearId,
      });
      await refreshApplicants();
      setMsg({ type: 'ok', text: 'Applicant created.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function onAllocate() {
    setMsg(null);
    try {
      if (!selectedApplicantId) return setMsg({ type: 'error', text: 'Select an applicant' });
      const payload = {
        applicantId: Number(selectedApplicantId),
        allotmentNumber: allocateForm.allotmentNumber || null,
      };
      if (allocateForm.quotaTypeOverride) payload.quotaType = allocateForm.quotaTypeOverride;
      await allocateSeat(payload);
      await refreshApplicants();
      setMsg({ type: 'ok', text: 'Seat locked (quota counters updated).' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function onSetDocs() {
    setMsg(null);
    try {
      if (!selectedApplicantId) return setMsg({ type: 'error', text: 'Select an applicant' });
      await setApplicantDocuments({ id: Number(selectedApplicantId), documentStatus: docsForm.documentStatus });
      await refreshApplicants();
      setMsg({ type: 'ok', text: 'Document status updated.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function onSetFee() {
    setMsg(null);
    try {
      if (!selectedApplicantId) return setMsg({ type: 'error', text: 'Select an applicant' });
      await setApplicantFee({ id: Number(selectedApplicantId), feeStatus: feeForm.feeStatus });
      await refreshApplicants();
      setMsg({ type: 'ok', text: 'Fee status updated.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function onConfirm() {
    setMsg(null);
    try {
      if (!selectedApplicantId) return setMsg({ type: 'error', text: 'Select an applicant' });
      const res = await confirmAdmission({ applicantId: Number(selectedApplicantId) });
      await refreshApplicants();
      setMsg({ type: 'ok', text: res?.admission?.admission_number ? `Confirmed: ${res.admission.admission_number}` : 'Admission confirmed.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  const canAllocate = !!selectedApplicantId;
  const canConfirm = !!selectedApplicantId;

  return (
    <div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Admission Officer</div>
        <div className="muted" style={{ fontSize: 13 }}>
          Create applicant, then allocate seat (quota validation), then verify documents, then mark fee paid, then confirm admission number
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>1) Create Applicant</div>

          <div className="row">
            <div className="field" style={{ minWidth: 260 }}>
              <label>Full Name</label>
              <input value={createForm.fullName} onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))} />
            </div>
            <div className="field">
              <label>Category</label>
              <input value={createForm.category} onChange={(e) => setCreateForm((s) => ({ ...s, category: e.target.value }))} placeholder="GM / SC / ST ..." />
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Entry Type</label>
              <select value={createForm.entryType} onChange={(e) => setCreateForm((s) => ({ ...s, entryType: e.target.value }))}>
                <option value="Regular">Regular</option>
                <option value="Lateral">Lateral</option>
              </select>
            </div>

            <div className="field">
              <label>Quota Type</label>
              <select value={createForm.quotaType} onChange={(e) => setCreateForm((s) => ({ ...s, quotaType: e.target.value }))}>
                <option value="KCET">KCET</option>
                <option value="COMEDK">COMEDK</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div className="field">
              <label>Marks (optional)</label>
              <input value={createForm.marks} onChange={(e) => setCreateForm((s) => ({ ...s, marks: e.target.value }))} />
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Program</label>
              <select value={createForm.programId ?? ''} onChange={(e) => setCreateForm((s) => ({ ...s, programId: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">-- select --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.branch_name} ({p.course_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Academic Year</label>
              <select
                value={createForm.academicYearId ?? ''}
                onChange={(e) => setCreateForm((s) => ({ ...s, academicYearId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">-- select --</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="primary" style={{ marginTop: 10 }} onClick={onCreateApplicant}>
            Create Applicant
          </button>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>2) Workflow Actions</div>

          <div className="field">
            <label>Select Applicant</label>
            <select value={selectedApplicantId ?? ''} onChange={(e) => setSelectedApplicantId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">-- select --</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name} (#{a.id}) - {a.branch_name}/{a.academic_year_label}
                </option>
              ))}
            </select>
          </div>

          <div className="panel" style={{ marginTop: 14, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Allocate Seat (Quota validated)</div>
            {seatAvailability && selectedApplicant ? (
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                Remaining seats for quota <span className="tag">{allocateForm.quotaTypeOverride || selectedApplicant.quota_type}</span>:{' '}
                <span className="mono">{seatAvailability.remaining}</span> (Filled: <span className="mono">{seatAvailability.filled}</span> / Total:{' '}
                <span className="mono">{seatAvailability.quotaTotal}</span>)
              </div>
            ) : null}
            <div className="row">
              <div className="field">
                <label>Allotment Number (optional)</label>
                <input
                  value={allocateForm.allotmentNumber}
                  onChange={(e) => setAllocateForm((s) => ({ ...s, allotmentNumber: e.target.value }))}
                  placeholder="e.g., GOV-123"
                />
              </div>
              <div className="field">
                <label>Quota Override (optional)</label>
                <select
                  value={allocateForm.quotaTypeOverride}
                  onChange={(e) => setAllocateForm((s) => ({ ...s, quotaTypeOverride: e.target.value }))}
                >
                  <option value="">Keep applicant quota</option>
                  <option value="KCET">KCET</option>
                  <option value="COMEDK">COMEDK</option>
                  <option value="Management">Management</option>
                </select>
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={onAllocate} disabled={!canAllocate}>
              Lock Seat
            </button>
          </div>

          <div className="panel" style={{ marginTop: 14, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Verify Documents</div>
            <div className="row">
              <div className="field">
                <label>Document Checklist Status</label>
                <select value={docsForm.documentStatus} onChange={(e) => setDocsForm({ documentStatus: e.target.value })}>
                  <option value="PENDING">PENDING</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="VERIFIED">VERIFIED</option>
                </select>
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={onSetDocs} disabled={!canAllocate}>
              Update Documents
            </button>
          </div>

          <div className="panel" style={{ marginTop: 14, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Fee Status</div>
            <div className="row">
              <div className="field">
                <label>Fee Status</label>
                <select value={feeForm.feeStatus} onChange={(e) => setFeeForm({ feeStatus: e.target.value })}>
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={onSetFee} disabled={!canAllocate}>
              Update Fee
            </button>
          </div>

          <div className="panel" style={{ marginTop: 14, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Admission Confirmation</div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Admission number is generated only once, and only if `Documents=VERIFIED` and `Fee=PAID`.
            </div>
            <button className="ok" style={{ borderColor: 'rgba(52,211,153,0.45)', background: 'rgba(52,211,153,0.10)' }} onClick={onConfirm} disabled={!canConfirm}>
              Confirm Admission
            </button>
            {selectedApplicant ? (
              <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                Current admission: <span className="tag">{selectedApplicant.admission_status || 'NONE'}</span> {selectedApplicant.admission_number ? (<span className="mono" style={{ marginLeft: 8 }}>{selectedApplicant.admission_number}</span>) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {msg ? (
        <div className={`msg floating-msg ${msg.type === 'ok' ? 'ok' : 'error'}`}>{msg.text}</div>
      ) : null}

      <div className="panel" style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Applicants</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Seat locked counts against quota. Admission confirmed generates an immutable admission number.
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Program</th>
                <th>Year</th>
                <th>Quota</th>
                <th>Docs</th>
                <th>Fee</th>
                <th>Admission</th>
              </tr>
            </thead>
            <tbody>
              {applicants.length === 0 ? (
                <tr>
                  <td colSpan="8" className="muted">
                    No applicants yet.
                  </td>
                </tr>
              ) : (
                applicants.map((a) => (
                  <tr key={a.id} style={{ cursor: 'pointer' }}>
                    <td className="mono">{a.id}</td>
                    <td>{a.full_name}</td>
                    <td>
                      {a.branch_name} ({a.course_type})
                    </td>
                    <td>{a.academic_year_label}</td>
                    <td>{a.quota_type}</td>
                    <td>
                      <span className="tag">{a.document_status}</span>
                    </td>
                    <td>
                      <span className="tag">{a.fee_status}</span>
                    </td>
                    <td className="admission-cell">
                      {a.admission_status ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="tag">{a.admission_status}</span>
                          {a.admission_number ? <span className="mono">{a.admission_number}</span> : null}
                        </div>
                      ) : (
                        <span className="muted">Not allocated</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

