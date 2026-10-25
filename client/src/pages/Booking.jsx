import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getShowtime } from "../api";
export default function Booking() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();

  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setSelectedSeats([]);

    getShowtime(showtimeId)
      .then((data) => {
        if (active) setShowtime(data);
      })
      .catch(() => {
        if (active) setError("ไม่สามารถโหลดข้อมูลที่นั่งได้");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [showtimeId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container py-5">
          กำลังโหลดที่นั่ง...
        </main>
      </>
    );
  }

  if (error || !showtime) {
    return (
      <>
        <Navbar />
        <main className="container py-5 text-center">
          <h2>{error || "ไม่พบรอบฉาย"}</h2>
          <Link to="/" className="btn btn-warning mt-3">
            กลับหน้าแรก
          </Link>
        </main>
      </>
    );
  }

  const occupiedSeats = showtime.occupiedSeats;
  const capacity = Number(showtime.capacity);
  const rowCount = Math.ceil(capacity / 8);

  const rows = Array.from(
    { length: rowCount },
    (_, i) => String.fromCharCode(65 + i)
  );

  function toggleSeat(seat) {
    if (occupiedSeats.includes(seat)) return;

    setSelectedSeats((previous) => {
      if (previous.includes(seat)) {
        return previous.filter((s) => s !== seat);
      }

      if (previous.length >= 5) {
        alert("เลือกได้สูงสุด 5 ที่นั่ง");
        return previous;
      }

      return [...previous, seat];
    });
  }

  function handleContinue() {
    if (selectedSeats.length === 0) return;

    navigate("/booking-confirm", {
      state: {
        showtimeId: showtime.id,
        movieTitle: showtime.movieTitle,
        theater: showtime.theater,
        date: showtime.date,
        time: showtime.time,
        price: Number(showtime.price),
        seats: selectedSeats,
        total: selectedSeats.length * Number(showtime.price)
      }
    });
  }

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <Link
          to={`/showtimes/${showtime.movieId}`}
          className="text-warning text-decoration-none"
        >
          <i className="bi bi-arrow-left me-2"></i>
          กลับไปเลือกรอบฉาย
        </Link>

        <div className="row g-4 mt-2">
          <div className="col-lg-8">
            <div className="card bg-dark border-secondary text-white">
              <div className="card-body p-4">
                <h3 className="fw-bold">เลือกที่นั่ง</h3>
                <p className="text-secondary">
                  เลือกได้สูงสุด 5 ที่นั่ง
                </p>

                <div className="cinema-screen mb-5">
                  SCREEN / จอภาพยนตร์
                </div>

                <div className="seat-layout">
                  {rows.map((row, rowIndex) => {
                    const seatsInRow = Math.min(
                      8,
                      capacity - rowIndex * 8
                    );

                    return (
                      <div className="seat-row" key={row}>
                        <span className="seat-row-label">{row}</span>

                        {Array.from(
                          { length: seatsInRow },
                          (_, index) => {
                            const seat = `${row}${index + 1}`;
                            const occupied =
                              occupiedSeats.includes(seat);
                            const selected =
                              selectedSeats.includes(seat);

                            return (
                              <button
                                key={seat}
                                type="button"
                                disabled={occupied}
                                onClick={() => toggleSeat(seat)}
                                className={`cinema-seat ${
                                  occupied ? "occupied" :
                                  selected ? "selected" : ""
                                }`}
                                title={seat}
                                aria-label={`ที่นั่ง ${seat}`}
                                aria-pressed={selected}
                              >
                                {index + 1}
                              </button>
                            );
                          }
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="d-flex justify-content-center flex-wrap gap-4 mt-4">
                  <span><span className="seat-legend available"></span>ว่าง</span>
                  <span><span className="seat-legend selected"></span>เลือกแล้ว</span>
                  <span><span className="seat-legend occupied"></span>จองแล้ว</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card bg-dark border-secondary text-white">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4">สรุปการจอง</h4>
                <h5 className="text-warning fw-bold">
                  {showtime.movieTitle}
                </h5>

                <p className="text-secondary">{showtime.theater}</p>
                <p className="text-secondary">{showtime.date}</p>
                <p className="text-secondary">{showtime.time}</p>

                <hr className="border-secondary" />

                <p>
                  ที่นั่ง: {selectedSeats.join(", ") || "ยังไม่ได้เลือก"}
                </p>
                <p>จำนวน: {selectedSeats.length} ที่นั่ง</p>
                <p>ราคา: {showtime.price} บาท/ที่นั่ง</p>

                <hr className="border-secondary" />

                <h3 className="text-warning fw-bold">
                  {(selectedSeats.length * Number(showtime.price))
                    .toLocaleString("th-TH")} ฿
                </h3>

                <button
                  className="btn btn-warning w-100 btn-lg mt-3"
                  disabled={selectedSeats.length === 0}
                  onClick={handleContinue}
                >
                  ดำเนินการต่อ
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

