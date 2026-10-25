
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

import {
  getAdminSession,
  getAdminTheaters,
  addAdminTheater,
  updateAdminTheater,
  deleteAdminTheater
} from "../api";

const emptyForm = {
  name: "",
  capacity: "48"
};

export default function AdminTheaters() {
  const navigate = useNavigate();

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

        const data = await getAdminTheaters();
        if (active) setTheaters(data);
      } catch (err) {
        if (!active) return;

        if (err.message === "Unauthorized" ||
            err.status === 401) {
          navigate("/admin/login", { replace: true });
        } else {
          setError("ไม่สามารถโหลดข้อมูลโรงภาพยนตร์ได้");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [navigate]);

  async function refreshTheaters() {
    const data = await getAdminTheaters();
    setTheaters(data);
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEditForm(theater) {
    setEditingId(theater.id);
    setForm({
      name: theater.name,
      capacity: String(theater.capacity)
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name,
        capacity: Number(form.capacity)
      };

      if (editingId !== null) {
        await updateAdminTheater(editingId, payload);
        setSuccess("แก้ไขโรงภาพยนตร์สำเร็จ");
      } else {
        await addAdminTheater(payload);
        setSuccess("เพิ่มโรงภาพยนตร์สำเร็จ");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await refreshTheaters();
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

  async function handleDelete(theater) {
    const confirmed = window.confirm(
      `ต้องการลบโรงภาพยนตร์ "${theater.name}" ใช่หรือไม่?`
    );

    if (!confirmed) return;

    setDeletingId(theater.id);
    setError("");
    setSuccess("");

    try {
      await deleteAdminTheater(theater.id);
      setSuccess("ลบโรงภาพยนตร์สำเร็จ");
      await refreshTheaters();
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
            <p className="text-warning fw-bold mb-2">
              ADMIN PANEL
            </p>

            <h1 className="fw-bold mb-2">
              จัดการโรงภาพยนตร์
            </h1>

            <p className="text-secondary mb-0">
              เพิ่ม แก้ไข และกำหนดจำนวนที่นั่ง
            </p>
          </div>

          <button
            className="btn btn-warning fw-bold"
            onClick={openAddForm}
          >
            <i className="bi bi-plus-lg me-2"></i>
            เพิ่มโรงภาพยนตร์
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {showForm && (
          <div className="card bg-dark border-secondary text-white mb-4">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-4">
                {editingId !== null
                  ? "แก้ไขโรงภาพยนตร์"
                  : "เพิ่มโรงภาพยนตร์ใหม่"}
              </h4>

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      ชื่อโรงภาพยนตร์
                    </label>

                    <input
                      className="form-control"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="เช่น โรงภาพยนตร์ 4"
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      จำนวนที่นั่ง
                    </label>

                    <input
                      type="number"
                      className="form-control"
                      name="capacity"
                      value={form.capacity}
                      onChange={handleChange}
                      min="1"
                      max="208"
                      required
                    />
                  </div>
                </div>

                <p className="text-secondary small mt-3 mb-0">
                  ระบบจัดเรียงที่นั่งแถวละ 8 ที่นั่ง
                  เช่น 48 ที่นั่ง = 6 แถว (A–F)
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
              <h4 className="fw-bold mb-0">
                รายการโรงภาพยนตร์
              </h4>

              <span className="badge text-bg-warning">
                {theaters.length} โรง
              </span>
            </div>

            {loading ? (
              <p className="text-secondary">
                กำลังโหลดข้อมูล...
              </p>
            ) : theaters.length === 0 ? (
              <p className="text-secondary">
                ยังไม่มีโรงภาพยนตร์
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>ชื่อโรงภาพยนตร์</th>
                      <th>จำนวนที่นั่ง</th>
                      <th>รอบฉาย</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {theaters.map((theater) => {
                      const hasShowtimes =
                        Number(theater.showtimeCount) > 0;

                      return (
                        <tr key={theater.id}>
                          <td>#{theater.id}</td>

                          <td className="fw-bold">
                            <i className="bi bi-building text-warning me-2"></i>
                            {theater.name}
                          </td>

                          <td>
                            {theater.capacity} ที่นั่ง
                          </td>

                          <td>
                            <span className={`badge ${
                              hasShowtimes
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}>
                              {theater.showtimeCount} รอบ
                            </span>
                          </td>

                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => openEditForm(theater)}
                              >
                                <i className="bi bi-pencil-square me-1"></i>
                                แก้ไข
                              </button>

                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(theater)}
                                disabled={
                                  hasShowtimes ||
                                  deletingId === theater.id
                                }
                                title={
                                  hasShowtimes
                                    ? "มีรอบฉายอยู่ ไม่สามารถลบได้"
                                    : "ลบโรงภาพยนตร์"
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
