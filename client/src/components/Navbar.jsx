import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary sticky-top">
      <div className="container py-2">
        <Link className="navbar-brand fw-bold fs-4" to="/">
          <span className="text-warning">✦</span> CineBook
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMenu"
          aria-controls="navbarMenu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarMenu">
          <ul className="navbar-nav mx-auto">
            <li className="nav-item">
              <Link className="nav-link active" to="/">
                หน้าแรก
              </Link>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/#movies">
                ภาพยนตร์
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/#how-to-book">
                วิธีจองตั๋ว
              </a>
            </li>
          </ul>

          <Link to="/admin/login" className="btn btn-outline-warning">
            <i className="bi bi-person-lock me-1"></i>
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
