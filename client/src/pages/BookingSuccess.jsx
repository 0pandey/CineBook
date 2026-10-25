
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getBooking } from "../api";

export default function BookingSuccess() {
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getBooking(bookingId)
      .then((data) => {
        if (active) setBooking(data);
      })
      .catch(() => {
        if (active) setError("ไม่พบข้อมูลการจอง");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [bookingId]);

  return (
    <>
      <Navbar />

      <main className="container py-5">
        {loading ? (
          <p className="text-secondary text-center">
            กำลังโหลดข้อมูลการจอง...
          </p>
        ) : error || !booking ? (
          <div className="text-center">
            <h2>{error || "ไม่พบรายการจอง"}</h2>
            <Link to="/" className="btn btn-warning mt-3">
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <div className="row justify-content-center">
            <div className="col-lg-7">
              <div className="card bg-dark border-secondary text-white">
                <div className="card-body p-4 p-md-5 text-center">
                  <i
                    className="bi bi-check-circle-fill text-success"
                    style={{ fontSize: "75px" }}
                  ></i>

                  <h1 className="fw-bold mt-3">
                    จองตั๋วสำเร็จ!
                  </h1>

                  <p className="text-secondary">
                    ขอบคุณที่ใช้บริการ CineBook
                  </p>

                  <div className="bg-black bg-opacity-25 rounded-3 p-4 text-start mt-4">
                    <p className="text-secondary small mb-1">
                      หมายเลขการจอง
                    </p>

                    <p className="text-warning fw-bold small text-break">
                      {booking.bookingCode}
                    </p>

                    <hr className="border-secondary" />

                    <h4 className="fw-bold">
                      {booking.movieTitle}
                    </h4>

                    <p>โรงภาพยนตร์: {booking.theater}</p>
                    <p>วันที่: {booking.date}</p>
                    <p>เวลา: {booking.time}</p>
                    <p>ที่นั่ง: {booking.seats.join(", ")}</p>
                    <p>จำนวน: {booking.quantity} ที่นั่ง</p>

                    <hr className="border-secondary" />

                    <div className="d-flex justify-content-between">
                      <strong>ยอดชำระ</strong>
                      <strong className="text-warning">
                        {Number(booking.total)
                          .toLocaleString("th-TH")} ฿
                      </strong>
                    </div>

                    <p className="text-success mt-3 mb-0">
                      <i className="bi bi-check-circle me-2"></i>
                      ชำระแล้ว (จำลอง)
                    </p>
                  </div>

                  <Link
                    to="/"
                    className="btn btn-warning btn-lg w-100 mt-4"
                  >
                    กลับหน้าแรก
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
