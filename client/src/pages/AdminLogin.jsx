
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { adminLogin } from "../api";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await adminLogin(username, password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card bg-dark text-white border-secondary">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <i
                    className="bi bi-shield-lock text-warning"
                    style={{ fontSize: "48px" }}
                  ></i>

                  <h2 className="fw-bold mt-3">
                    Admin Login
                  </h2>

                  <p className="text-secondary">
                    เข้าสู่ระบบผู้ดูแล CineBook
                  </p>
                </div>

                {error && (
                  <div className="alert alert-danger">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">
                      ชื่อผู้ใช้
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label">
                      รหัสผ่าน
                    </label>

                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-warning btn-lg w-100"
                    disabled={loading}
                  >
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                  </button>
                </form>

                <Link
                  to="/"
                  className="btn btn-outline-secondary w-100 mt-3"
                >
                  กลับหน้าแรก
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
