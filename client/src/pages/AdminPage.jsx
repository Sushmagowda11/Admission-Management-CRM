import { useEffect, useMemo, useState } from 'react';
import {
  adminAcademicYears,
  adminCampuses,
  adminDepartments,
  adminInstitutions,
  adminPrograms,
  createAcademicYear,
  createCampus,
  createDepartment,
  createInstitution,
  createProgram,
  createSeatMatrix,
} from '../api.js';

const defaultCourseType = 'UG';
const defaultEntryType = 'Regular';
const defaultAdmissionMode = 'Government';

export default function AdminPage() {
  const [institutions, setInstitutions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [selectedInstitutionId, setSelectedInstitutionId] = useState(null);
  const [selectedCampusId, setSelectedCampusId] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(null);

  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadMasterSetupData();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [msg]);

  async function loadMasterSetupData() {
    setMsg(null);
    setInstitutions(await adminInstitutions());
    setAcademicYears(await adminAcademicYears());
  }

  async function refreshDependent() {
    setCampuses(selectedInstitutionId ? await adminCampuses({ institutionId: selectedInstitutionId }) : []);
    setDepartments(selectedCampusId ? await adminDepartments({ campusId: selectedCampusId }) : []);
    setPrograms(selectedDepartmentId ? await adminPrograms({ departmentId: selectedDepartmentId }) : []);
  }

  useEffect(() => {
    if (selectedInstitutionId == null) return;
    (async () => {
      setSelectedCampusId(null);
      setSelectedDepartmentId(null);
      setSelectedProgramId(null);
      const nextCampuses = await adminCampuses({ institutionId: selectedInstitutionId });
      setCampuses(nextCampuses);
      setDepartments([]);
      setPrograms([]);
    })();
  }, [selectedInstitutionId]);

  useEffect(() => {
    if (selectedCampusId == null) return;
    (async () => {
      setSelectedDepartmentId(null);
      setSelectedProgramId(null);
      const nextDepartments = await adminDepartments({ campusId: selectedCampusId });
      setDepartments(nextDepartments);
      setPrograms([]);
    })();
  }, [selectedCampusId]);

  useEffect(() => {
    if (selectedDepartmentId == null) return;
    (async () => {
      setSelectedProgramId(null);
      const nextPrograms = await adminPrograms({ departmentId: selectedDepartmentId });
      setPrograms(nextPrograms);
    })();

  }, [selectedDepartmentId]);

  const [institutionForm, setInstitutionForm] = useState({ name: '', shortCode: '' });
  const [campusForm, setCampusForm] = useState({ name: '' });
  const [departmentForm, setDepartmentForm] = useState({ name: '' });
  const [programForm, setProgramForm] = useState({
    branchName: '',
    courseType: defaultCourseType,
    entryType: defaultEntryType,
    admissionMode: defaultAdmissionMode,
  });
  const [academicYearForm, setAcademicYearForm] = useState({ label: '' });

  const [seatMatrixForm, setSeatMatrixForm] = useState({
    intakeTotal: '',
    kcet: '',
    comedk: '',
    management: '',
    supernumeraryKcet: '0',
    supernumeraryComedk: '0',
    supernumeraryManagement: '0',
  });
  
// used useMemo
  const quotasSum = useMemo(() => {
    const a = Number(seatMatrixForm.kcet || 0);
    const b = Number(seatMatrixForm.comedk || 0);
    const c = Number(seatMatrixForm.management || 0);
    return a + b + c;
  }, [seatMatrixForm.kcet, seatMatrixForm.comedk, seatMatrixForm.management]);

  async function handleCreateInstitution() {
    setMsg(null);
    try {
      await createInstitution(institutionForm);
      setInstitutionForm({ name: '', shortCode: '' });
      await loadMasterSetupData();
      setMsg({ type: 'ok', text: 'Institution created.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function handleCreateCampus() {
    setMsg(null);
    try {
      if (!selectedInstitutionId) return setMsg({ type: 'error', text: 'Select institution first' });
      await createCampus({ institutionId: selectedInstitutionId, name: campusForm.name });
      setCampusForm({ name: '' });
      const nextCampuses = await adminCampuses({ institutionId: selectedInstitutionId });
      setCampuses(nextCampuses);
      setMsg({ type: 'ok', text: 'Campus created.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function handleCreateDepartment() {
    setMsg(null);
    try {
      if (!selectedCampusId) return setMsg({ type: 'error', text: 'Select campus first' });
      await createDepartment({ campusId: selectedCampusId, name: departmentForm.name });
      setDepartmentForm({ name: '' });
      const nextDepartments = await adminDepartments({ campusId: selectedCampusId });
      setDepartments(nextDepartments);
      setMsg({ type: 'ok', text: 'Department created.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function handleCreateProgram() {
    setMsg(null);
    try {
      if (!selectedDepartmentId) return setMsg({ type: 'error', text: 'Select department first' });
      await createProgram({
        departmentId: selectedDepartmentId,
        branchName: programForm.branchName,
        courseType: programForm.courseType,
        entryType: programForm.entryType,
        admissionMode: programForm.admissionMode,
      });
      setProgramForm({
        branchName: '',
        courseType: defaultCourseType,
        entryType: defaultEntryType,
        admissionMode: defaultAdmissionMode,
      });
      const nextPrograms = await adminPrograms({ departmentId: selectedDepartmentId });
      setPrograms(nextPrograms);
      setMsg({ type: 'ok', text: 'Program created.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function handleCreateAcademicYear() {
    setMsg(null);
    try {
      await createAcademicYear(academicYearForm);
      setAcademicYearForm({ label: '' });
      setAcademicYears(await adminAcademicYears());
      setMsg({ type: 'ok', text: 'Academic year created.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  async function handleCreateSeatMatrix() {
    setMsg(null);
    try {
      if (!selectedProgramId || !selectedAcademicYearId) {
        return setMsg({ type: 'error', text: 'Select program and academic year first' });
      }

      const intakeTotal = Number(seatMatrixForm.intakeTotal);

      const quotas = [
        {
          quotaType: 'KCET',
          quotaTotal: Number(seatMatrixForm.kcet || 0),
          supernumeraryTotal: Number(seatMatrixForm.supernumeraryKcet || 0),
        },
        {
          quotaType: 'COMEDK',
          quotaTotal: Number(seatMatrixForm.comedk || 0),
          supernumeraryTotal: Number(seatMatrixForm.supernumeraryComedk || 0),
        },
        {
          quotaType: 'Management',
          quotaTotal: Number(seatMatrixForm.management || 0),
          supernumeraryTotal: Number(seatMatrixForm.supernumeraryManagement || 0),
        },
      ];

      await createSeatMatrix({
        programId: selectedProgramId,
        academicYearId: selectedAcademicYearId,
        intakeTotal,
        quotas,
      });

      setMsg({ type: 'ok', text: 'Seat matrix created (quota counters enforced at allocation time).' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed' });
    }
  }

  return (
    <div className="panel">
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Master Setup</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
        Create Institution then Campus then Department then Program then Intake and Quotas
      </div>

      <div className="grid2">
        <div className="panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div className="panel">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>1) Institution</div>
            <div className="row">
              <div className="field">
                <label>Institution Name</label>
                <input
                  value={institutionForm.name}
                  onChange={(e) => setInstitutionForm((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Short Code (used in admission no.)</label>
                <input
                  value={institutionForm.shortCode}
                  onChange={(e) => setInstitutionForm((s) => ({ ...s, shortCode: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={handleCreateInstitution}>
              Create Institution
            </button>
          </div>

          <div className="panel">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>2) Campus</div>
            <div className="row">
              <div className="field">
                <label>Select Institution</label>
                <select value={selectedInstitutionId ?? ''} onChange={(e) => setSelectedInstitutionId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">-- select --</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.short_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Campus Name</label>
                <input value={campusForm.name} onChange={(e) => setCampusForm({ name: e.target.value })} />
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={handleCreateCampus}>
              Create Campus
            </button>
          </div>

          <div className="panel">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>3) Department</div>
            <div className="row">
              <div className="field">
                <label>Select Campus</label>
                <select
                  value={selectedCampusId ?? ''}
                  onChange={(e) => setSelectedCampusId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- select --</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Department Name</label>
                <input value={departmentForm.name} onChange={(e) => setDepartmentForm({ name: e.target.value })} />
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={handleCreateDepartment}>
              Create Department
            </button>
          </div>
        </div>

        <div className="panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div className="panel">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>4) Program</div>
            <div className="row">
              <div className="field">
                <label>Select Department</label>
                <select
                  value={selectedDepartmentId ?? ''}
                  onChange={(e) => setSelectedDepartmentId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- select --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Branch Name (e.g., CSE)</label>
                <input
                  value={programForm.branchName}
                  onChange={(e) => setProgramForm((s) => ({ ...s, branchName: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Course Type</label>
                <select value={programForm.courseType} onChange={(e) => setProgramForm((s) => ({ ...s, courseType: e.target.value }))}>
                  <option value="UG">UG</option>
                  <option value="PG">PG</option>
                </select>
              </div>
              <div className="field">
                <label>Entry Type</label>
                <select value={programForm.entryType} onChange={(e) => setProgramForm((s) => ({ ...s, entryType: e.target.value }))}>
                  <option value="Regular">Regular</option>
                  <option value="Lateral">Lateral</option>
                </select>
              </div>
              <div className="field">
                <label>Admission Mode</label>
                <select
                  value={programForm.admissionMode}
                  onChange={(e) => setProgramForm((s) => ({ ...s, admissionMode: e.target.value }))}
                >
                  <option value="Government">Government</option>
                  <option value="Management">Management</option>
                </select>
              </div>
            </div>

            <button className="primary" style={{ marginTop: 10 }} onClick={handleCreateProgram}>
              Create Program
            </button>
          </div>

          <div className="panel">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>5) Academic Year</div>
            <div className="row">
              <div className="field">
                <label>Year Label (e.g., 2026)</label>
                <input value={academicYearForm.label} onChange={(e) => setAcademicYearForm({ label: e.target.value })} />
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={handleCreateAcademicYear}>
              Create Academic Year
            </button>
          </div>

          <div className="panel">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>6) Seat Matrix & Quotas</div>
            <div className="row">
              <div className="field">
                <label>Select Program</label>
                <select value={selectedProgramId ?? ''} onChange={(e) => setSelectedProgramId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">-- select --</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.branch_name} ({p.course_type}, {p.admission_mode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Select Academic Year</label>
                <select value={selectedAcademicYearId ?? ''} onChange={(e) => setSelectedAcademicYearId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">-- select --</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Total Intake</label>
                <input value={seatMatrixForm.intakeTotal} onChange={(e) => setSeatMatrixForm((s) => ({ ...s, intakeTotal: e.target.value }))} />
              </div>
              <div className="field">
                <label>Quota sum (KCET+COMEDK+Mgmt)</label>
                <input value={String(quotasSum)} readOnly />
              </div>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>KCET Quota</label>
                <input value={seatMatrixForm.kcet} onChange={(e) => setSeatMatrixForm((s) => ({ ...s, kcet: e.target.value }))} />
              </div>
              <div className="field">
                <label>COMEDK Quota</label>
                <input value={seatMatrixForm.comedk} onChange={(e) => setSeatMatrixForm((s) => ({ ...s, comedk: e.target.value }))} />
              </div>
              <div className="field">
                <label>Management Quota</label>
                <input value={seatMatrixForm.management} onChange={(e) => setSeatMatrixForm((s) => ({ ...s, management: e.target.value }))} />
              </div>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>KCET Supernumerary (optional)</label>
                <input value={seatMatrixForm.supernumeraryKcet} onChange={(e) => setSeatMatrixForm((s) => ({ ...s, supernumeraryKcet: e.target.value }))} />
              </div>
              <div className="field">
                <label>COMEDK Supernumerary (optional)</label>
                <input value={seatMatrixForm.supernumeraryComedk} onChange={(e) => setSeatMatrixForm((s) => ({ ...s, supernumeraryComedk: e.target.value }))} />
              </div>
              <div className="field">
                <label>Management Supernumerary (optional)</label>
                <input value={seatMatrixForm.supernumeraryManagement} onChange={(e) => setSeatMatrixForm((s) => ({ ...s, supernumeraryManagement: e.target.value }))} />
              </div>
            </div>

            <button className="primary" style={{ marginTop: 10 }} onClick={handleCreateSeatMatrix}>
              Create Seat Matrix
            </button>
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Rule: quota totals must equal intake. Allocation blocks when quota is full.
            </div>
          </div>
        </div>
      </div>

      {msg ? (
        <div className={`msg floating-msg ${msg.type === 'ok' ? 'ok' : 'error'}`}>{msg.text}</div>
      ) : null}

      <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        Tip: Use the demo credentials and create a seat matrix before allocating seats.
      </div>
    </div>
  );
}

