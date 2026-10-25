import MovieCard from "../components/MovieCard";
import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { getMovies } from "../api";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getMovies()
      .then((data) => {
        if (active) setMovies(data);
      })
      .catch(() => {
        if (active) {
          setError("ไม่สามารถโหลดรายการภาพยนตร์ได้");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Navbar />

      <section className="cine-hero py-5">
        <div className="cine-hero-bg"></div>
        <div className="cine-hero-shade"></div>

        <div className="container position-relative">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <span className="badge text-bg-warning mb-3">
                ยินดีต้อนรับสู่ CineBook
              </span>

              <h1 className="display-5 fw-bold mb-3">
                ดูหนังเรื่องไหนดี <span className="text-warning">วันนี้?</span>
              </h1>

              <p className="text-secondary fs-5 mb-4">
                เลือกหนังที่ชอบ ดูรอบฉาย และจองตั๋ว ได้ง่าย ๆ
                โดยไม่ต้องสมัครสมาชิก
              </p>

              <a href="#movies" className="btn btn-warning btn-lg px-4">
                เลือกภาพยนตร์
              </a>
            </div>

            <div className="col-lg-6">
              <div className="card bg-dark text-white border-secondary overflow-hidden">
                <img
                  src="/images/premiere.jpg"
                  className="card-img"
                  alt="ภาพยนตร์ประจำสัปดาห์"
                  style={{ height: "370px", objectFit: "cover" }}
                />

                <div className="card-img-overlay d-flex flex-column justify-content-end cine-hero-overlay">
                  <span className="badge text-bg-warning align-self-start mb-2">
                    หนังแนะนำ
                  </span>

                  <h3 className="fw-bold">ภาพยนตร์ประจำสัปดาห์</h3>

                  <p className="mb-0">พบกับเรื่องราวสนุก ๆ บนจอภาพยนตร์</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="movies" className="container py-5">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <p className="text-warning fw-semibold small mb-2">NOW SHOWING</p>

            <h2 className="fw-bold mb-0">ภาพยนตร์ที่กำลังฉาย</h2>
          </div>

          <span className="text-secondary">{movies.length} เรื่อง</span>
        </div>

        {loading ? (
          <p className="text-secondary">กำลังโหลดภาพยนตร์...</p>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : movies.length === 0 ? (
          <p className="text-secondary">ยังไม่มีภาพยนตร์</p>
        ) : (
          <div className="row g-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      <section id="how-to-book" className="container pb-5">
        <h2 className="fw-bold mb-3">วิธีจองตั๋ว</h2>

        <div className="row g-3">
          {["เลือกภาพยนตร์", "เลือกรอบฉาย", "เลือกที่นั่ง", "ยืนยันการจอง"].map(
            (step, index) => (
              <div className="col-md-3" key={step}>
                <div className="card bg-dark border-secondary text-white h-100">
                  <div className="card-body">
                    <span className="text-warning fw-bold">0{index + 1}</span>
                    <h5 className="mt-2 mb-0">{step}</h5>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </>
  );
}
