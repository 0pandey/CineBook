import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMovies, getMovieShowtimes } from "../api";

export default function Showtimes() {
  const { movieId } = useParams();

  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    Promise.all([
      getMovies(),
      getMovieShowtimes(movieId)
    ])
      .then(([movies, times]) => {
        if (!active) return;

        setMovie(
          movies.find((m) => m.id === Number(movieId)) || null
        );
        setShowtimes(times);
      })
      .catch(() => {
        if (active) {
          setError("ไม่สามารถโหลดข้อมูลรอบฉายได้");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [movieId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container py-5">
          <p className="text-secondary">กำลังโหลดรอบฉาย...</p>
        </main>
      </>
    );
  }

  if (error || !movie) {
    return (
      <>
        <Navbar />
        <main className="container py-5 text-center">
          <h2>{error || "ไม่พบภาพยนตร์"}</h2>
          <Link to="/" className="btn btn-warning mt-3">
            กลับหน้าแรก
          </Link>
        </main>
      </>
    );
  }

  const dates = [...new Set(showtimes.map((s) => s.date))];

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <Link
          to="/"
          className="text-warning text-decoration-none"
        >
          <i className="bi bi-arrow-left me-2"></i>
          กลับหน้าแรก
        </Link>

        <div className="row g-4 mt-2 mb-5">
          <div className="col-md-3">
            <img
              src={movie.poster}
              alt={movie.title}
              className="img-fluid rounded-3 w-100"
              style={{
                maxHeight: "380px",
                objectFit: "cover"
              }}
            />
          </div>

          <div className="col-md-9">
            <span className="badge text-bg-warning mb-3">
              NOW SHOWING
            </span>

            <h1 className="fw-bold">{movie.title}</h1>

            <p className="text-secondary">
              <i className="bi bi-film me-2"></i>
              {movie.genre}
            </p>

            <p className="text-secondary">
              <i className="bi bi-clock me-2"></i>
              {movie.duration} นาที
            </p>

            <hr className="border-secondary" />

            <h4 className="fw-bold mt-4">
              <i className="bi bi-calendar-event text-warning me-2"></i>
              เลือกรอบฉาย
            </h4>

            <p className="text-secondary">
              เลือกวัน เวลา และโรงภาพยนตร์ที่ต้องการ
            </p>
          </div>
        </div>

        {dates.length === 0 ? (
          <div className="alert alert-secondary">
            ยังไม่มีรอบฉายสำหรับภาพยนตร์เรื่องนี้
          </div>
        ) : (
          dates.map((date) => (
            <section key={date} className="mb-4">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-calendar3 text-warning me-2"></i>
                {new Date(`${date}T00:00:00`)
                  .toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
              </h5>

              <div className="row g-3">
                {showtimes
                  .filter((s) => s.date === date)
                  .map((showtime) => (
                    <div
                      key={showtime.id}
                      className="col-md-6 col-lg-4"
                    >
                      <div className="card bg-dark border-secondary text-white h-100">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-secondary">
                              {showtime.theater}
                            </span>
                            <span className="badge text-bg-secondary">
                              2D
                            </span>
                          </div>

                          <h3 className="fw-bold text-warning">
                            {showtime.time}
                          </h3>

                          <p className="text-secondary mb-3">
                            ราคา {showtime.price} บาท / ที่นั่ง
                          </p>

                          <Link
                            to={`/booking/${showtime.id}`}
                            className="btn btn-warning w-100"
                          >
                            <i className="bi bi-ticket-perforated me-2"></i>
                            เลือกที่นั่ง
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}
