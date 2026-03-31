import { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { getDashboard } from '../api.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ManagementPage() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        setMsg(null);
        const d = await getDashboard();
        setData(d);
      } catch (e) {
        setMsg({ type: 'error', text: e?.response?.data?.error || e?.message || 'Failed to load dashboard' });
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [msg]);

  const summary = data?.summary || {};
  const quotaWise = data?.quotaWise || {};
  const quotaCategories = ['KCET', 'COMEDK', 'Management'];

  const quotaFilledDistributionChartData = useMemo(() => {
    const filledSeats = quotaCategories.map((quotaCategory) => quotaWise[quotaCategory]?.filled || 0);
    return {
      labels: quotaCategories,
      datasets: [
        {
          label: 'Filled Seats',
          data: filledSeats,
          backgroundColor: ['rgba(45, 212, 191, 0.85)', 'rgba(99, 102, 241, 0.82)', 'rgba(251, 191, 36, 0.82)'],
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
        },
      ],
    };
  }, [quotaWise]);

  const quotaFillAndRemainingChartData = useMemo(() => {
    const filledSeatsByCategory = quotaCategories.map((quotaCategory) => quotaWise[quotaCategory]?.filled || 0);
    const remainingSeatsByCategory = quotaCategories.map((quotaCategory) => quotaWise[quotaCategory]?.remaining || 0);
    return {
      labels: quotaCategories,
      datasets: [
        {
          label: 'Filled',
          data: filledSeatsByCategory,
          backgroundColor: 'rgba(45, 212, 191, 0.75)',
          borderRadius: 6,
        },
        {
          label: 'Remaining',
          data: remainingSeatsByCategory,
          backgroundColor: 'rgba(148, 163, 184, 0.6)',
          borderRadius: 6,
        },
      ],
    };
  }, [quotaWise]);

  const chartDisplayOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255,255,255,0.82)',
          boxWidth: 14,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.75)' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: 'rgba(255,255,255,0.75)' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
    },
  };

  if (busy) {
    return (
      <div className="panel">
        <div className="muted">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Management Dashboard</div>
        <div className="muted" style={{ fontSize: 13, maxWidth: 760, margin: '0 auto' }}>
          Total intake vs admitted, quota-wise filled seats, applicants with pending docs, and fee pending list.
        </div>
      </div>

      {msg ? (
        <div className={`msg floating-msg ${msg.type === 'ok' ? 'ok' : 'error'}`}>{msg.text}</div>
      ) : null}

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Intake</div>
            <div className="kpi-value mono">{summary.totalIntake ?? 0}</div>
            <div className="kpi-note muted">Configured seats across all seat matrices</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Admitted (Confirmed)</div>
            <div className="kpi-value mono">{summary.totalAdmitted ?? 0}</div>
            <div className="kpi-note muted">Admissions with confirmed admission number</div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Quota Distribution (Filled Seats)</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Visual split of currently filled seats across quotas.
          </div>
          <div className="chart-box">
            <Doughnut
              data={quotaFilledDistributionChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: 'rgba(255,255,255,0.82)', boxWidth: 12 },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Quota Fill vs Remaining</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Compare allocated seats and remaining capacity by quota.
          </div>
          <div className="chart-box">
            <Bar data={quotaFillAndRemainingChartData} options={chartDisplayOptions} />
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Applicants with Pending Documents</div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Program</th>
                <th>Quota</th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {(data?.pendingDocuments || []).slice(0, 20).map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.id}</td>
                  <td>{a.full_name}</td>
                  <td>
                    {a.branch_name} ({a.course_type})
                  </td>
                  <td>{a.quota_type}</td>
                  <td>
                    <span className="tag">{a.document_status}</span>
                  </td>
                </tr>
              ))}
              {(data?.pendingDocuments || []).length === 0 ? (
                <tr>
                  <td colSpan="5" className="muted">
                    No pending document applicants.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Fee Pending List</div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Program</th>
                <th>Quota</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {(data?.feePending || []).slice(0, 20).map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.id}</td>
                  <td>{a.full_name}</td>
                  <td>
                    {a.branch_name} ({a.course_type})
                  </td>
                  <td>{a.quota_type}</td>
                  <td>
                    <span className="tag">{a.fee_status}</span>
                  </td>
                </tr>
              ))}
              {(data?.feePending || []).length === 0 ? (
                <tr>
                  <td colSpan="5" className="muted">
                    No fee pending applicants.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

