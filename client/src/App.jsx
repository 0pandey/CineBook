import { Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Home from "./pages/Home";
import Showtimes from "./pages/Showtimes";
import Booking from "./pages/Booking";
import BookingConfirm from "./pages/BookingConfirm";
import BookingSuccess from "./pages/BookingSuccess";
import AdminMovies from "./pages/AdminMovies";
import AdminTheaters from "./pages/AdminTheaters";
import AdminShowtimes from "./pages/AdminShowtimes";
import AdminBookings from "./pages/AdminBookings";
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/movies" element={<AdminMovies />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/theaters" element={<AdminTheaters />} />
      <Route path="/showtimes/:movieId" element={<Showtimes />} />
      <Route path="/admin/showtimes" element={<AdminShowtimes />} />
      <Route path="/booking/:showtimeId" element={<Booking />} />
      <Route path="/admin/bookings" element={<AdminBookings />} />
      <Route path="/booking-confirm" element={<BookingConfirm />} />
      <Route path="/booking-success/:bookingId" element={<BookingSuccess />} />
    </Routes>
  );
}
