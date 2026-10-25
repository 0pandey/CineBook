import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

import {
  getAdminSession,
  getAdminBookings
} from "../api";

function formatDate(date) {
  if (!date) return "-";

  const value = new Date(date.replace(" ", "T"));

  if (Number.isNaN(value.getTime())) return date;

  return value.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatShowDate(date) {
  if (!date) return "-";

  const value = new Date(`${date}T00:00:00`);

  return value.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function StatusBadge({ status }) {
  const colors = {
    PAID: "text-bg-success",
    PENDING: "text-bg-warning",
    CANCELLED: "text-bg-danger"
  };

  const labels = {
    PAID: "ชำระแล้ว",
    PENDING: "รอชำระเงิน",
    CANCELLED: "ยกเลิก"
  };

  return (
    <span className={`badge ${colors[status] || "text-bg-secondary"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AdminBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBookings() {
    try {
      setError("");
      const data = await getAdminBookings();
      setBookings(data);
    } catch (err) {
      if (err.status === 401) {
        navigate("/admin/login", { replace: true });
      } else {
        setError(err.message);
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        await getAdminSession();
        if (!active) return;

        const data = await getAdminBookings();

        if (active) setBookings(data);
      } catch (err) {
        if (!active) return;

        if (
          err.message === "Unauthorized" ||
          err.status === 401
        ) {
          navigate("/admin/login", { replace: true });
        } else {
          setError("ไม่สามารถโหลดรายการจองได้");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [navigate]);

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        booking.status === statusFilter;

      const searchable = [
        booking.bookingCode,
        booking.movieTitle,
        booking.theaterName,
        booking.showDate,
        booking.showTime,
        booking.seats.join(", ")
      ].join(" ").toLowerCase();

      return (
        matchesStatus &&
        searchable.includes(keyword)
      );
    });
  }, [bookings, search, statusFilter]);

  const totalRevenue = bookings
    .filter((b) => b.status === "PAID")
    .reduce((sum, b) => sum + Number(b.total), 0);

  const paidCount = bookings.filter(
    (b) => b.status === "PAID"
  ).length;

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <Link
          to="/admin/dashboard"
          className="text-warning text-decoration-none"
        >
          <i className="bi bi-arrow-left me-2"></i>
          กลับ Dashboard
        </Link>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4 mb-4">
          <div>
            <p className="text-warning fw-bold mb-2">
              ADMIN PANEL
            </p>

            <h1 className="fw-bold mb-2">
              รายการจองตั๋ว
            </h1>

            <p className="text-secondary mb-0">
              ตรวจสอบรายการจองและยอดขายจำลอง
            </p>
          </div>

          <button
            className="btn btn-outline-warning"
            onClick={loadBookings}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            รีเฟรชข้อมูล
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card bg-dark border-secondary text-white h-100">
              <div className="card-body p-4">
                <p className="text-secondary mb-2">
                  รายการจองทั้งหมด
                </p>

                <h2 className="fw-bold mb-0">
                  {bookings.length}
                </h2>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card bg-dark border-secondary text-white h-100">
              <div className="card-body p-4">
                <p className="text-secondary mb-2">
                  ชำระแล้ว
                </p>

                <h2 className="fw-bold text-success mb-0">
                  {paidCount}
                </h2>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card bg-dark border-secondary text-white h-100">
              <div className="card-body p-4">
                <p className="text-secondary mb-2">
                  ยอดขายรวม (จำลอง)
                </p>

                <h2 className="fw-bold text-warning mb-0">
                  {totalRevenue.toLocaleString("th-TH")} ฿
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-dark border-secondary text-white">
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-8">
                <label className="form-label">
                  ค้นหารายการจอง
                </label>

                <input
                  type="search"
                  className="form-control"
                  placeholder="หมายเลขจอง ชื่อหนัง โรงภาพยนตร์ หรือที่นั่ง"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">
                  สถานะ
                </label>

                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">ทั้งหมด</option>
                  <option value="PAID">ชำระแล้ว</option>
                  <option value="PENDING">รอชำระเงิน</option>
                  <option value="CANCELLED">ยกเลิก</option>
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold mb-0">
                รายการจอง
              </h4>

              <span className="badge text-bg-warning">
                {filteredBookings.length} รายการ
              </span>
            </div>

            {loading ? (
              <p className="text-secondary">
                กำลังโหลดข้อมูล...
              </p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-secondary">
                ไม่พบรายการจอง
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle">
                  <thead>
                    <tr>
                      <th>หมายเลขจอง</th>
                      <th>ภาพยนตร์</th>
                      <th>รอบฉาย</th>
                      <th>ที่นั่ง</th>
                      <th>ยอดชำระ</th>
                      <th>สถานะ</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <span
                            className="text-warning small"
                            title={booking.bookingCode}
                          >
                            {booking.bookingCode.slice(0, 8)}...
                          </span>
                        </td>

                        <td>
                          <strong>{booking.movieTitle}</strong>
                          <div className="text-secondary small">
                            {booking.theaterName}
                          </div>
                        </td>

                        <td>
                          {formatShowDate(booking.showDate)}
                          <div className="text-secondary small">
                            {booking.showTime} น.
                          </div>
                        </td>

                        <td>{booking.seats.join(", ")}</td>

                        <td className="fw-bold">
                          {booking.total.toLocaleString("th-TH")} ฿
                        </td>

                        <td>
                          <StatusBadge status={booking.status} />
                        </td>

                        <td>
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selectedBooking && (
          <div
            className="modal d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-label="รายละเอียดการจอง"
            style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            onClick={() => setSelectedBooking(null)}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content bg-dark text-white border-secondary">
                <div className="modal-header border-secondary">
                  <h5 className="modal-title fw-bold">
                    รายละเอียดการจอง
                  </h5>

                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    aria-label="ปิด"
                    onClick={() => setSelectedBooking(null)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <p className="text-secondary small mb-1">
                    หมายเลขการจอง
                  </p>

                  <p className="text-warning fw-bold text-break">
                    {selectedBooking.bookingCode}
                  </p>

                  <hr className="border-secondary" />

                  <h5 className="fw-bold">
                    {selectedBooking.movieTitle}
                  </h5>

                  <p>โรงภาพยนตร์: {selectedBooking.theaterName}</p>
                  <p>
                    วันที่ฉาย: {formatShowDate(selectedBooking.showDate)}
                  </p>
                  <p>เวลา: {selectedBooking.showTime} น.</p>
                  <p>ที่นั่ง: {selectedBooking.seats.join(", ")}</p>
                  <p>จำนวน: {selectedBooking.quantity} ที่นั่ง</p>

                  <p>
                    วันที่จอง: {formatDate(selectedBooking.bookedAt)}
                  </p>

                  <hr className="border-secondary" />

                  <div className="d-flex justify-content-between mb-3">
                    <strong>ยอดชำระ</strong>
                    <strong className="text-warning">
                      {selectedBooking.total.toLocaleString("th-TH")} ฿
                    </strong>
                  </div>

                  <StatusBadge status={selectedBooking.status} />
                </div>

                <div className="modal-footer border-secondary">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setSelectedBooking(null)}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
