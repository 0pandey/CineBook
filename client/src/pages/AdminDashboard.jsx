
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";

import {
  getAdminSession,
  getAdminStats,
  adminLogout
} from "../api";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const session = await getAdminSession();
        if (!active) return;

        setAdmin(session);

        const data = await getAdminStats();
        if (active) setStats(data);
      } catch (err) {
        if (!active) return;

        if (err.message === "Unauthorized") {
          navigate("/admin/login", { replace: true });
        } else {
          setError("ไม่สามารถโหลดข้อมูล Dashboard ได้");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleLogout() {
    try {
      await adminLogout();
      navigate("/admin/login", { replace: true });
    } catch {
      alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container py-5">
          <p className="text-secondary">
            กำลังโหลด Dashboard...
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <span className="badge text-bg-warning mb-2">
              ADMIN PANEL
            </span>

            <h1 className="fw-bold">
              Dashboard
            </h1>

            <p className="text-secondary">
              ยินดีต้อนรับ {admin?.username}
            </p>
          </div>

          <button
            className="btn btn-outline-danger"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-2"></i>
            ออกจากระบบ
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {stats && (
          <>
            <div className="row g-4 mb-4">
              <StatCard
                title="ภาพยนตร์"
                value={stats.movies}
                icon="bi-film"
                suffix="เรื่อง"
              />

              <StatCard
                title="โรงภาพยนตร์"
                value={stats.theaters}
                icon="bi-building"
                suffix="โรง"
              />

              <StatCard
                title="รอบฉาย"
                value={stats.showtimes}
                icon="bi-calendar-event"
                suffix="รอบ"
              />

              <StatCard
                title="รายการจอง"
                value={stats.bookings}
                icon="bi-ticket-perforated"
                suffix="รายการ"
              />
            </div>

            <div className="card bg-dark text-white border-secondary mb-4">
              <div className="card-body p-4">
                <p className="text-secondary mb-2">
                  <i className="bi bi-cash-coin text-warning me-2"></i>
                  ยอดขายรวม (จำลอง)
                </p>

                <h2 className="text-warning fw-bold mb-0">
                  {Number(stats.revenue).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} ฿
                </h2>
              </div>
            </div>
          </>
        )}

        <h3 className="fw-bold mb-3">
          จัดการระบบ
        </h3>

        <div className="row g-3">
          {[
            {
              title: "จัดการภาพยนตร์",
              icon: "bi-film",
              path: "/admin/movies"
            },
            {
              title: "จัดการโรงภาพยนตร์",
              icon: "bi-building",
              path: "/admin/theaters"
            },
            {
              title: "จัดการรอบฉาย",
              icon: "bi-calendar-event",
              path: "/admin/showtimes"
            },
            {
              title: "รายการจอง",
              icon: "bi-ticket-perforated",
              path: "/admin/bookings"
            }
          ].map((item) => (
            <div className="col-md-6" key={item.path}>
              <div className="card bg-dark text-white border-secondary h-100">
                <div className="card-body p-4">
                  <i
                    className={`bi ${item.icon} text-warning`}
                    style={{ fontSize: "30px" }}
                  ></i>

                  <h5 className="fw-bold mt-3">
                    {item.title}
                  </h5>

                  <Link
                    to={item.path}
                    className="btn btn-outline-warning mt-2"
                  >
                    เปิดหน้าจัดการ
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/"
          className="btn btn-outline-secondary mt-4"
        >
          <i className="bi bi-house me-2"></i>
          กลับหน้าเว็บไซต์
        </Link>
      </main>
    </>
  );
}
