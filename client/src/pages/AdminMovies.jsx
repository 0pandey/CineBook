import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

import {
  getAdminSession,
  getAdminMovies,
  addAdminMovie,
  updateAdminMovie,
  deleteAdminMovie,
} from "../api";

const emptyForm = {
  title: "",
  genre: "",
  duration: "",
  poster: "",
};

export default function AdminMovies() {
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadMovies() {
    const data = await getAdminMovies();
    setMovies(data);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        await getAdminSession();
        if (!active) return;

        const data = await getAdminMovies();
        if (active) setMovies(data);
      } catch (err) {
        if (!active) return;

        if (err.message === "Unauthorized" || err.status === 401) {
          navigate("/admin/login", { replace: true });
        } else {
          setError("ไม่สามารถโหลดข้อมูลภาพยนตร์ได้");
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

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEditForm(movie) {
    setForm({
      title: movie.title || "",
      genre: movie.genre || "",
      duration: String(movie.duration || ""),
      poster: movie.poster || "",
    });

    setEditingId(movie.id);
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

    try {
      if (editingId !== null) {
        await updateAdminMovie(editingId, form);
        setSuccess("แก้ไขภาพยนตร์สำเร็จ");
      } else {
        await addAdminMovie(form);
        setSuccess("เพิ่มภาพยนตร์สำเร็จ");
      }

      await loadMovies();

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

  async function handleDelete(movie) {
    const confirmed = window.confirm(
      `ต้องการลบภาพยนตร์ "${movie.title}" ใช่หรือไม่?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteAdminMovie(movie.id);
      await loadMovies();
      setSuccess("ลบภาพยนตร์สำเร็จ");
    } catch (err) {
      if (err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(err.message);
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

            <h1 className="fw-bold mb-2">จัดการภาพยนตร์</h1>

            <p className="text-secondary mb-0">
              เพิ่ม แก้ไข และลบข้อมูลภาพยนตร์
            </p>
          </div>

          <button className="btn btn-warning fw-bold" onClick={openAddForm}>
            <i className="bi bi-plus-lg me-2"></i>
            เพิ่มภาพยนตร์
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {success && <div className="alert alert-success">{success}</div>}

        {showForm && (
          <div className="card bg-dark border-secondary text-white mb-4">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-4">
                {editingId !== null ? "แก้ไขภาพยนตร์" : "เพิ่มภาพยนตร์ใหม่"}
              </h4>

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">ชื่อภาพยนตร์</label>

                    <input
                      className="form-control"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      maxLength={255}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">ประเภทภาพยนตร์</label>

                    <input
                      className="form-control"
                      name="genre"
                      value={form.genre}
                      onChange={handleChange}
                      placeholder="Action, Drama, Sci-Fi"
                      maxLength={255}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">ความยาว (นาที)</label>

                    <input
                      type="number"
                      className="form-control"
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      min="1"
                      max="600"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">URL รูปโปสเตอร์</label>

                    <input
                      type="url"
                      className="form-control"
                      name="poster"
                      value={form.poster}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {form.poster && (
                  <div className="mt-4">
                    <p className="text-secondary mb-2">ตัวอย่างโปสเตอร์</p>

                    <img
                      src={form.poster}
                      alt="ตัวอย่างโปสเตอร์"
                      className="rounded border border-secondary"
                      style={{
                        width: "150px",
                        height: "220px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}

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
              <h4 className="fw-bold mb-0">รายการภาพยนตร์</h4>

              <span className="badge text-bg-warning">
                {movies.length} เรื่อง
              </span>
            </div>

            {loading ? (
              <p className="text-secondary">กำลังโหลดข้อมูล...</p>
            ) : movies.length === 0 ? (
              <p className="text-secondary">ยังไม่มีภาพยนตร์</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle">
                  <thead>
                    <tr>
                      <th>โปสเตอร์</th>
                      <th>ชื่อภาพยนตร์</th>
                      <th>ประเภท</th>
                      <th>ความยาว</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {movies.map((movie) => (
                      <tr key={movie.id}>
                        <td>
                          {movie.poster ? (
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              className="rounded"
                              style={{
                                width: "55px",
                                height: "80px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              className="bg-secondary rounded d-flex align-items-center justify-content-center"
                              style={{
                                width: "55px",
                                height: "80px",
                              }}
                            >
                              <i className="bi bi-film"></i>
                            </div>
                          )}
                        </td>

                        <td className="fw-bold">{movie.title}</td>

                        <td>{movie.genre}</td>

                        <td>{movie.duration} นาที</td>

                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => openEditForm(movie)}
                            >
                              <i className="bi bi-pencil-square me-1"></i>
                              แก้ไข
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(movie)}
                            >
                              <i className="bi bi-trash me-1"></i>
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
