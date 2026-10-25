import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { createBooking } from "../api";
export default function BookingConfirm() {
  const { state: booking } = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  if (!booking || !booking.seats?.length) {
    return (
      <>
        <Navbar />
        <main className="container py-5 text-center">
          <h2>ไม่พบข้อมูลการจอง</h2>
          <p className="text-secondary">กรุณาเลือกภาพยนตร์และที่นั่งอีกครั้ง</p>
          <Link to="/" className="btn btn-warning">
            กลับหน้าแรก
          </Link>
        </main>
      </>
    );
  }

  async function handlePayment() {
    if (processing) return;

    setProcessing(true);
    setError("");

    try {
      const result = await createBooking(booking.showtimeId, booking.seats);

      navigate(`/booking-success/${result.bookingCode}`, {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <div className="text-center mb-5">
          <span className="badge text-bg-warning mb-3">
            BOOKING CONFIRMATION
          </span>
          <h1 className="fw-bold">ยืนยันการจองตั๋ว</h1>
          <p className="text-secondary">
            กรุณาตรวจสอบข้อมูลก่อนยืนยันการชำระเงิน
          </p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-7">
            <div className="card bg-dark text-white border-secondary">
              <div className="card-body p-4 p-md-5">
                <h3 className="fw-bold text-warning mb-4">
                  {booking.movieTitle}
                </h3>

                <div className="d-flex justify-content-between mb-3">
                  <span className="text-secondary">โรงภาพยนตร์</span>
                  <strong>{booking.theater}</strong>
                </div>

                <div className="d-flex justify-content-between mb-3">
                  <span className="text-secondary">วันที่</span>
                  <strong>{booking.date}</strong>
                </div>

                <div className="d-flex justify-content-between mb-3">
                  <span className="text-secondary">เวลา</span>
                  <strong>{booking.time}</strong>
                </div>

                <div className="d-flex justify-content-between mb-3">
                  <span className="text-secondary">ที่นั่ง</span>
                  <strong>{booking.seats.join(", ")}</strong>
                </div>

                <div className="d-flex justify-content-between mb-3">
                  <span className="text-secondary">จำนวน</span>
                  <strong>{booking.seats.length} ที่นั่ง</strong>
                </div>

                <hr className="border-secondary my-4" />

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">ยอดชำระทั้งหมด</h5>
                  <h2 className="text-warning fw-bold mb-0">
                    {booking.total.toLocaleString("th-TH")} ฿
                  </h2>
                </div>

                <div className="alert alert-warning">
                  <i className="bi bi-info-circle me-2"></i>
                  ระบบชำระเงินจำลอง ไม่มีการเรียกเก็บเงินจริง
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                <button
                  type="button"
                  className="btn btn-warning btn-lg w-100 fw-bold"
                  disabled={processing}
                  onClick={handlePayment}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  {processing ? "กำลังดำเนินการ..." : "ชำระแล้ว"}
                </button>

                <Link
                  to={`/booking/${booking.showtimeId}`}
                  className="btn btn-outline-secondary w-100 mt-3"
                >
                  กลับไปเลือกที่นั่ง
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
