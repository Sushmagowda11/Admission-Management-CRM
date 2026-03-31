import axios from 'axios';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login({ username, password }) {
  const res = await httpClient.post('/auth/login', { username, password });
  localStorage.setItem('token', res.data.token);
  return res.data.user;
}

export async function getMe() {
  const res = await httpClient.get('/auth/me');
  return res.data.user;
}

export async function logout() {
  localStorage.removeItem('token');
}

export async function adminInstitutions() {
  const res = await httpClient.get('/admin/institutions');
  return res.data.items;
}

export async function adminCampuses({ institutionId }) {
  const res = await httpClient.get('/admin/campuses', { params: { institutionId } });
  return res.data.items;
}

export async function adminDepartments({ campusId }) {
  const res = await httpClient.get('/admin/departments', { params: { campusId } });
  return res.data.items;
}

export async function adminPrograms({ departmentId }) {
  const res = await httpClient.get('/admin/programs', { params: { departmentId } });
  return res.data.items;
}

export async function adminProgramsAll() {
  const res = await httpClient.get('/admin/programs');
  return res.data.items;
}

export async function adminAcademicYears() {
  const res = await httpClient.get('/admin/academic-years');
  return res.data.items;
}

export async function adminSeatMatrices({ programId, academicYearId }) {
  const res = await httpClient.get('/admin/seat-matrices', { params: { programId, academicYearId } });
  return res.data.items;
}

export async function createInstitution({ name, shortCode }) {
  const res = await httpClient.post('/admin/institutions', { name, shortCode });
  return res.data;
}

export async function createCampus({ institutionId, name }) {
  const res = await httpClient.post('/admin/campuses', { institutionId, name });
  return res.data;
}

export async function createDepartment({ campusId, name }) {
  const res = await httpClient.post('/admin/departments', { campusId, name });
  return res.data;
}

export async function createProgram({ departmentId, branchName, courseType, entryType, admissionMode }) {
  const res = await httpClient.post('/admin/programs', {
    departmentId,
    branchName,
    courseType,
    entryType,
    admissionMode,
  });
  return res.data;
}

export async function createAcademicYear({ label }) {
  const res = await httpClient.post('/admin/academic-years', { label });
  return res.data;
}

export async function createSeatMatrix({ programId, academicYearId, intakeTotal, quotas }) {
  const res = await httpClient.post('/admin/seat-matrices', {
    programId,
    academicYearId,
    intakeTotal,
    quotas,
  });
  return res.data;
}

export async function createApplicant(payload) {
  const res = await httpClient.post('/applicants', payload);
  return res.data;
}

export async function listApplicants() {
  const res = await httpClient.get('/applicants');
  return res.data.items;
}

export async function setApplicantDocuments({ id, documentStatus }) {
  const res = await httpClient.patch(`/applicants/${id}/documents`, { documentStatus });
  return res.data;
}

export async function setApplicantFee({ id, feeStatus }) {
  const res = await httpClient.patch(`/applicants/${id}/fee`, { feeStatus });
  return res.data;
}

export async function allocateSeat({ applicantId, allotmentNumber, quotaType }) {
  const res = await httpClient.post('/admissions/allocate', { applicantId, allotmentNumber, quotaType });
  return res.data;
}

export async function confirmAdmission({ applicantId }) {
  const res = await httpClient.post('/admissions/confirm', { applicantId });
  return res.data;
}

export async function getSeatAvailability({ programId, academicYearId, quotaType }) {
  const res = await httpClient.get('/admissions/availability', { params: { programId, academicYearId, quotaType } });
  return res.data;
}

export async function getDashboard() {
  const res = await httpClient.get('/dashboard');
  return res.data;
}

