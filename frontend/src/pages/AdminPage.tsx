import { useEffect, useState } from "react";
import { getAdminDashboard, type AdminDashboardData } from "../api";
import { IconCalendar, IconGrid, IconMessage, IconSparkles, IconUpload, IconUser } from "../components/Icons";
import type { CurrentUser } from "../types";

type AdminPageProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function AdminPage({ currentUser, onNavigate }: AdminPageProps) {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.isStaff) return;
    void getAdminDashboard()
      .then(setDashboard)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard."))
      .finally(() => setIsLoading(false));
  }, [currentUser?.isStaff]);

  if (!currentUser?.isStaff) {
    return (
      <section className="admin-access-denied">
        <IconGrid size={28} />
        <h1>Administrator access required</h1>
        <p>This workspace is available only to authorised Glam SA staff.</p>
        <button className="btn-primary" type="button" onClick={() => onNavigate("/")}>Return home</button>
      </section>
    );
  }

  const stats = dashboard?.stats;
  const statCards = [
    { label: "Total users", value: stats?.users, icon: <IconUser size={18} /> },
    { label: "Creators", value: stats?.creators, icon: <IconSparkles size={18} /> },
    { label: "Portfolio posts", value: stats?.posts, icon: <IconUpload size={18} /> },
    { label: "Pending bookings", value: stats?.pendingBookings, icon: <IconCalendar size={18} />, accent: true },
    { label: "Unread messages", value: stats?.unreadMessages, icon: <IconMessage size={18} /> },
    { label: "Active services", value: stats?.activeServices, icon: <IconGrid size={18} /> },
  ];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Operations</span>
          <h1>Admin dashboard</h1>
          <p>Monitor the community, bookings, and platform activity.</p>
        </div>
        <button className="btn-outline-sm" type="button" onClick={() => { window.location.href = "/admin/"; }}>
          Open full admin
        </button>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {isLoading ? (
        <div className="admin-loading">Loading platform metrics...</div>
      ) : (
        <>
          <div className="admin-stat-grid">
            {statCards.map((card) => (
              <article className={`admin-stat-card${card.accent ? " accent" : ""}`} key={card.label}>
                <span className="admin-stat-icon">{card.icon}</span>
                <span className="admin-stat-label">{card.label}</span>
                <strong>{card.value ?? 0}</strong>
              </article>
            ))}
          </div>

          <div className="admin-content-grid">
            <section className="admin-panel">
              <div className="admin-panel-heading"><h2>Recent users</h2><span>{stats?.users ?? 0} total</span></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Role</th><th>Location</th><th>Joined</th></tr></thead>
                  <tbody>
                    {dashboard?.recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong><small>{user.email}</small></td>
                        <td><span className={`admin-role ${user.accountType}`}>{user.accountType}</span></td>
                        <td>{user.location || "Not set"}</td>
                        <td>{formatDate(user.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-heading"><h2>Recent bookings</h2><span>{stats?.bookings ?? 0} total</span></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Service</th><th>Participants</th><th>Status</th><th>Created</th></tr></thead>
                  <tbody>
                    {dashboard?.recentBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td><strong>{booking.serviceName}</strong><small>R {booking.price}</small></td>
                        <td><small>{booking.client} → {booking.creator}</small></td>
                        <td><span className={`admin-status ${booking.status}`}>{booking.status}</span></td>
                        <td>{formatDate(booking.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

export default AdminPage;
