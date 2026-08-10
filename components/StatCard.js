export default function StatCard({ label, value, helper, tone = "blue" }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}
