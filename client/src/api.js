const API_URL = "http://localhost:3001/api";

async function getJSON(path) {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export function getMovies() {
  return getJSON("/movies");
}

export function getMovieShowtimes(movieId) {
  return getJSON(`/movies/${movieId}/showtimes`);
}

export function getShowtime(id) {
  return getJSON(`/showtimes/${id}`);
}

export async function createBooking(showtimeId, seats) {
  const response = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ showtimeId, seats })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "ไม่สามารถจองตั๋วได้");
  }

  return data;
}

export function getBooking(code) {
  return getJSON(`/bookings/${encodeURIComponent(code)}`);
}

export async function adminLogin(username, password) {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "เข้าสู่ระบบไม่สำเร็จ");
  }

  return data;
}

export async function getAdminSession() {
  const response = await fetch(`${API_URL}/admin/me`, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Unauthorized");
  }

  return response.json();
}

export async function adminLogout() {
  await fetch(`${API_URL}/admin/logout`, {
    method: "POST",
    credentials: "include"
  });
}

export async function getAdminStats() {
  const response = await fetch(`${API_URL}/admin/stats`, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("ไม่สามารถโหลดสถิติ Dashboard ได้");
  }

  return response.json();
}

async function adminRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "เกิดข้อผิดพลาด"
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getAdminMovies() {
  return adminRequest("/admin/movies");
}

export function addAdminMovie(movie) {
  return adminRequest("/admin/movies", {
    method: "POST",
    body: JSON.stringify(movie)
  });
}

export function updateAdminMovie(id, movie) {
  return adminRequest(`/admin/movies/${id}`, {
    method: "PUT",
    body: JSON.stringify(movie)
  });
}

export function deleteAdminMovie(id) {
  return adminRequest(`/admin/movies/${id}`, {
    method: "DELETE"
  });
}

export function getAdminTheaters() {
  return adminRequest("/admin/theaters");
}

export function addAdminTheater(theater) {
  return adminRequest("/admin/theaters", {
    method: "POST",
    body: JSON.stringify(theater)
  });
}

export function updateAdminTheater(id, theater) {
  return adminRequest(`/admin/theaters/${id}`, {
    method: "PUT",
    body: JSON.stringify(theater)
  });
}

export function deleteAdminTheater(id) {
  return adminRequest(`/admin/theaters/${id}`, {
    method: "DELETE"
  });
}

export function getAdminShowtimes() {
  return adminRequest("/admin/showtimes");
}

export function addAdminShowtime(showtime) {
  return adminRequest("/admin/showtimes", {
    method: "POST",
    body: JSON.stringify(showtime)
  });
}

export function updateAdminShowtime(id, showtime) {
  return adminRequest(`/admin/showtimes/${id}`, {
    method: "PUT",
    body: JSON.stringify(showtime)
  });
}

export function deleteAdminShowtime(id) {
  return adminRequest(`/admin/showtimes/${id}`, {
    method: "DELETE"
  });
}

export function getAdminBookings() {
  return adminRequest("/admin/bookings");
}
