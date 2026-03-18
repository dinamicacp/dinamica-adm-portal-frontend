export default function DashboardLoading() {
  return (
    <main className="dashboard">
      <section className="dashboard-card">
        <header className="dashboard-header">
          <div className="skeleton-header-text">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-subtitle" />
            <div className="skeleton skeleton-meta" />
          </div>
          <div className="skeleton skeleton-button" />
        </header>

        <div className="skeleton skeleton-search" />

        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                {["Nome", "Sobrenome", "Login", "Status", ""].map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td><div className="skeleton skeleton-cell skeleton-cell--long" /></td>
                  <td><div className="skeleton skeleton-cell skeleton-cell--long" /></td>
                  <td><div className="skeleton skeleton-cell skeleton-cell--medium" /></td>
                  <td><div className="skeleton skeleton-cell skeleton-cell--short" /></td>
                  <td><div className="skeleton skeleton-cell skeleton-cell--icon" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
