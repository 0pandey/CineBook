import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

import {
  getAdminSession,
  getAdminMovies,
  getAdminTheaters,
  getAdminShowtimes,
  addAdminShowtime,
  updateAdminShowtime,
  deleteAdminShowtime,
} from "../api";

const emptyForm = {
  movieId: "",
  theaterId: "",
  date: "",
  time: "",
  price: "180",
};

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminShowtimes() {
  const navigate = useNavigate();

  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theaters, setTheaters] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        await getAdminSession();
        if (!active) return;

        const [movieData, theaterData, showtimeData] = await Promise.all([
          getAdminMovies(),
          getAdminTheaters(),
          getAdminShowtimes(),
        ]);

        if (!active) return;

        setMovies(movieData);
        setTheaters(theaterData);
        setShowtimes(showtimeData);
      } catch (err) {
        if (!active) return;

        if (err.message === "Unauthorized" || err.status === 401) {
          navigate("/admin/login", { replace: true });
        } else {
          setError("ไม่สามารถโหลดข้อมูลรอบฉายได้");
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

  async function refreshShowtimes() {
    const data = await getAdminShowtimes();
    setShowtimes(data);
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEditForm(showtime) {
    setEditingId(showtime.id);

    setForm({
      movieId: String(showtime.movieId),
      theaterId: String(showtime.theaterId),
      date: showtime.date,
      time: showtime.time,
      price: String(showtime.price),
    });

    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      movieId: Number(form.movieId),
      theaterId: Number(form.theaterId),
      date: form.date,
      time: form.time,
      price: Number(form.price),
    };

    try {
      if (editingId !== null) {
        await updateAdminShowtime(editingId, payload);
        setSuccess("แก้ไขรอบฉายสำเร็จ");
      } else {
        await addAdminShowtime(payload);
        setSuccess("เพิ่มรอบฉายสำเร็จ");
      }

      await refreshShowtimes();

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      if (err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }

      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(showtime) {
    const confirmed = window.confirm(
      `ต้องการลบรอบฉาย "${showtime.movieTitle}" วันที่ ${showtime.date} เวลา ${showtime.time} ใช่หรือไม่?`,
    );

    if (!confirmed) return;

    setDeletingId(showtime.id);
    setError("");
    setSuccess("");

    try {
      await deleteAdminShowtime(showtime.id);
      await refreshShowtimes();
      setSuccess("ลบรอบฉายสำเร็จ");
    } catch (err) {
      if (err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }

      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

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
            <p className="text-warning fw-bold mb-2">ADMIN PANEL</p>

            <h1 className="fw-bold mb-2">จัดการรอบฉาย</h1>

            <p className="text-secondary mb-0">
              กำหนดภาพยนตร์ โรงภาพยนตร์ วัน เวลา และราคาตั๋ว
            </p>
          </div>

          <button
            className="btn btn-warning fw-bold"
            onClick={openAddForm}
            disabled={loading}
          >
            <i className="bi bi-plus-lg me-2"></i>
            เพิ่มรอบฉาย
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {success && <div className="alert alert-success">{success}</div>}

        {showForm && (
          <div className="card bg-dark border-secondary text-white mb-4">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-4">
                {editingId !== null ? "แก้ไขรอบฉาย" : "เพิ่มรอบฉายใหม่"}
              </h4>

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">ภาพยนตร์</label>

                    <select
                      className="form-select"
                      name="movieId"
                      value={form.movieId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกภาพยนตร์ --</option>
                      {movies.map((movie) => (
                        <option key={movie.id} value={movie.id}>
                          {movie.title} ({movie.duration} นาที)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">โรงภาพยนตร์</label>

                    <select
                      className="form-select"
                      name="theaterId"
                      value={form.theaterId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกโรงภาพยนตร์ --</option>
                      {theaters.map((theater) => (
                        <option key={theater.id} value={theater.id}>
                          {theater.name} ({theater.capacity} ที่นั่ง)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">วันที่ฉาย</label>

                    <input
                      type="date"
                      className="form-control"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">เวลาฉาย</label>

                    <input
                      type="time"
                      className="form-control"
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">ราคาตั๋ว (บาท)</label>

                    <input
                      type="number"
                      className="form-control"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      min="0.01"
                      max="999999.99"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <p className="text-secondary small mt-3 mb-0">
                  ระบบจะตรวจสอบเวลาชนกันโดยใช้ความยาวของภาพยนตร์
                </p>

                <div className="d-flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="btn btn-warning fw-bold"
                    disabled={saving}
                  >
                    <i className="bi bi-check-lg me-2"></i>
                    {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={saving}
                    onClick={() => setShowForm(false)}
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="card bg-dark border-secondary text-white">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0">รายการรอบฉาย</h4>

              <span className="badge text-bg-warning">
                {showtimes.length} รอบ
              </span>
            </div>

            {loading ? (
              <p className="text-secondary">กำลังโหลดข้อมูล...</p>
            ) : showtimes.length === 0 ? (
              <p className="text-secondary">ยังไม่มีรอบฉาย</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle">
                  <thead>
                    <tr>
                      <th>ภาพยนตร์</th>
                      <th>โรงภาพยนตร์</th>
                      <th>วันที่</th>
                      <th>เวลา</th>
                      <th>ราคา</th>
                      <th>รายการจอง</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {showtimes.map((showtime) => {
                      const hasBookings = Number(showtime.bookingCount) > 0;

                      return (
                        <tr key={showtime.id}>
                          <td className="fw-bold">{showtime.movieTitle}</td>

                          <td>{showtime.theaterName}</td>
                          <td>{formatDate(showtime.date)}</td>

                          <td>
                            <span className="text-warning fw-bold">
                              {showtime.time}
                            </span>
                          </td>

                          <td>
                            {Number(showtime.price).toLocaleString("th-TH")} ฿
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                hasBookings
                                  ? "text-bg-success"
                                  : "text-bg-secondary"
                              }`}
                            >
                              {showtime.bookingCount} รายการ
                            </span>
                          </td>

                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => openEditForm(showtime)}
                                disabled={hasBookings}
                                title={
                                  hasBookings
                                    ? "มีรายการจองแล้ว ไม่สามารถแก้ไขได้"
                                    : "แก้ไขรอบฉาย"
                                }
                              >
                                <i className="bi bi-pencil-square me-1"></i>
                                แก้ไข
                              </button>

                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(showtime)}
                                disabled={
                                  hasBookings || deletingId === showtime.id
                                }
                                title={
                                  hasBookings
                                    ? "มีรายการจองแล้ว ไม่สามารถลบได้"
                                    : "ลบรอบฉาย"
                                }
                              >
                                <i className="bi bi-trash me-1"></i>
                                ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
