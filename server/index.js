require("dotenv").config();
const db = require("./db");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));


app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to CineBook API",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "CineBook Backend is working!",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS database_name, COUNT(*) AS movie_count FROM movies",
    );

    res.json({
      success: true,
      message: "MySQL Connected Successfully!",
      database: rows[0].database_name,
      movies: rows[0].movie_count,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.get("/api/movies", async (req, res) => {
  try {
    const [movies] = await db.query(`
      SELECT id, title, genre, duration, poster
      FROM movies
      ORDER BY id DESC
    `);

    res.json(movies);
  } catch (error) {
    console.error("Movies API error:", error);
    res.status(500).json({
      message: "Unable to load movies"
    });
  }
});

app.get("/api/movies/:id/showtimes", async (req, res) => {
  try {
    const movieId = Number(req.params.id);

    if (!Number.isInteger(movieId) || movieId <= 0) {
      return res.status(400).json({
        message: "Invalid movie ID"
      });
    }

    const [showtimes] = await db.query(`
      SELECT
        s.id,
        s.movie_id AS movieId,
        t.name AS theater,
        DATE_FORMAT(s.show_date, '%Y-%m-%d') AS date,
        TIME_FORMAT(s.show_time, '%H:%i') AS time,
        s.price
      FROM showtimes s
      JOIN theaters t ON s.theater_id = t.id
      WHERE s.movie_id = ?
      ORDER BY s.show_date, s.show_time
    `, [movieId]);

    res.json(showtimes);
  } catch (error) {
    console.error("Showtimes API error:", error);
    res.status(500).json({
      message: "Unable to load showtimes"
    });
  }
});

const crypto = require("node:crypto");

// ดึงข้อมูลรอบฉาย พร้อมที่นั่งที่ถูกจอง
app.get("/api/showtimes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid showtime ID" });
    }

    const [rows] = await db.query(`
      SELECT
        s.id,
        s.movie_id AS movieId,
        m.title AS movieTitle,
        t.name AS theater,
        t.capacity,
        DATE_FORMAT(s.show_date, '%Y-%m-%d') AS date,
        TIME_FORMAT(s.show_time, '%H:%i') AS time,
        s.price
      FROM showtimes s
      JOIN movies m ON m.id = s.movie_id
      JOIN theaters t ON t.id = s.theater_id
      WHERE s.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Showtime not found" });
    }

    const [seats] = await db.query(`
      SELECT seat_code
      FROM booking_seats
      WHERE showtime_id = ?
    `, [id]);

    res.json({
      ...rows[0],
      occupiedSeats: seats.map((s) => s.seat_code)
    });
  } catch (error) {
    console.error("Showtime detail error:", error);
    res.status(500).json({ message: "Unable to load showtime" });
  }
});

// บันทึกการจองแบบ Transaction
app.post("/api/bookings", async (req, res) => {
  const { showtimeId, seats } = req.body || {};
  const id = Number(showtimeId);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !Array.isArray(seats) ||
    seats.length < 1 ||
    seats.length > 5 ||
    !seats.every((s) => typeof s === "string") ||
    new Set(seats).size !== seats.length
  ) {
    return res.status(400).json({
      message: "ข้อมูลการจองไม่ถูกต้อง หรือเลือกเกิน 5 ที่นั่ง"
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [showtimes] = await connection.query(`
      SELECT s.id, s.price, t.capacity
      FROM showtimes s
      JOIN theaters t ON t.id = s.theater_id
      WHERE s.id = ?
      FOR UPDATE
    `, [id]);

    if (showtimes.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "ไม่พบรอบฉาย"
      });
    }

    const showtime = showtimes[0];
    const capacity = Number(showtime.capacity);
    const rows = Math.ceil(capacity / 8);

    // ตรวจสอบว่าที่นั่งอยู่ในผังโรงภาพยนตร์
    const validSeats = new Set();

    for (let r = 0; r < rows; r++) {
      const rowName = String.fromCharCode(65 + r);
      const count = Math.min(8, capacity - r * 8);

      for (let n = 1; n <= count; n++) {
        validSeats.add(`${rowName}${n}`);
      }
    }

    if (
      capacity < 1 ||
      capacity > 208 ||
      !seats.every((s) => validSeats.has(s))
    ) {
      await connection.rollback();
      return res.status(400).json({
        message: "ตำแหน่งที่นั่งไม่ถูกต้อง"
      });
    }

    const [occupied] = await connection.query(`
      SELECT seat_code
      FROM booking_seats
      WHERE showtime_id = ?
    `, [id]);

    const occupiedSet = new Set(
      occupied.map((s) => s.seat_code)
    );

    if (seats.some((s) => occupiedSet.has(s))) {
      await connection.rollback();
      return res.status(409).json({
        message: "มีที่นั่งบางตำแหน่งถูกจองแล้ว"
      });
    }

    const bookingCode = crypto.randomUUID();
    const total = Number(showtime.price) * seats.length;

    const [result] = await connection.query(`
      INSERT INTO bookings
        (booking_code, showtime_id, quantity, total_price, status)
      VALUES (?, ?, ?, ?, 'PAID')
    `, [bookingCode, id, seats.length, total]);

    for (const seat of seats) {
      await connection.query(`
        INSERT INTO booking_seats
          (booking_id, showtime_id, seat_code)
        VALUES (?, ?, ?)
      `, [result.insertId, id, seat]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      bookingCode
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "ที่นั่งถูกจองแล้ว กรุณาเลือกใหม่"
      });
    }

    console.error("Booking error:", error);
    res.status(500).json({
      message: "ไม่สามารถบันทึกการจองได้"
    });
  } finally {
    if (connection) connection.release();
  }
});

// ดึงข้อมูลการจองจาก MySQL
app.get("/api/bookings/:code", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        b.booking_code AS bookingCode,
        b.quantity,
        b.total_price AS total,
        b.status,
        b.booked_at AS bookedAt,
        m.title AS movieTitle,
        t.name AS theater,
        DATE_FORMAT(s.show_date, '%Y-%m-%d') AS date,
        TIME_FORMAT(s.show_time, '%H:%i') AS time,
        GROUP_CONCAT(
          bs.seat_code
          ORDER BY LEFT(bs.seat_code, 1),
                   CAST(SUBSTRING(bs.seat_code, 2) AS UNSIGNED)
          SEPARATOR ','
        ) AS seatList
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      JOIN movies m ON m.id = s.movie_id
      JOIN theaters t ON t.id = s.theater_id
      JOIN booking_seats bs ON bs.booking_id = b.id
      WHERE b.booking_code = ?
      GROUP BY
        b.id, b.booking_code, b.quantity,
        b.total_price, b.status, b.booked_at,
        m.title, t.name, s.show_date, s.show_time
    `, [req.params.code]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "ไม่พบรายการจอง"
      });
    }

    const booking = rows[0];

    res.json({
      ...booking,
      seats: booking.seatList.split(",")
    });
  } catch (error) {
    console.error("Booking detail error:", error);
    res.status(500).json({
      message: "ไม่สามารถโหลดข้อมูลการจองได้"
    });
  }
});

const ADMIN_COOKIE = "cinebook_admin";

function requireAdmin(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE];

  if (!token) {
    return res.status(401).json({
      message: "กรุณาเข้าสู่ระบบ Admin"
    });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({
      message: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่"
    });
  }
}

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username ||
      !password
    ) {
      return res.status(400).json({
        message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"
      });
    }

    const [rows] = await db.query(
      "SELECT id, username, password_hash FROM admin_users WHERE username = ?",
      [username]
    );

    const admin = rows[0];

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({
        message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
      });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/api/admin"
    });

    res.json({
      success: true,
      username: admin.username
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      message: "ไม่สามารถเข้าสู่ระบบได้"
    });
  }
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({
    id: req.admin.id,
    username: req.admin.username
  });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie(ADMIN_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin"
  });

  res.json({ success: true });
});

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [[movies]] = await db.query(
      "SELECT COUNT(*) AS total FROM movies"
    );

    const [[theaters]] = await db.query(
      "SELECT COUNT(*) AS total FROM theaters"
    );

    const [[showtimes]] = await db.query(
      "SELECT COUNT(*) AS total FROM showtimes"
    );

    const [[bookings]] = await db.query(
      "SELECT COUNT(*) AS total FROM bookings"
    );

    const [[revenue]] = await db.query(`
      SELECT COALESCE(SUM(total_price), 0) AS total
      FROM bookings
      WHERE status = 'PAID'
    `);

    res.json({
      movies: movies.total,
      theaters: theaters.total,
      showtimes: showtimes.total,
      bookings: bookings.total,
      revenue: Number(revenue.total)
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      message: "ไม่สามารถโหลดข้อมูล Dashboard ได้"
    });
  }
});

function validateMovie(body) {
  const title = typeof body?.title === "string"
    ? body.title.trim()
    : "";

  const genre = typeof body?.genre === "string"
    ? body.genre.trim()
    : "";

  const poster = typeof body?.poster === "string"
    ? body.poster.trim()
    : "";

  const duration = Number(body?.duration);

  if (
    !title ||
    !genre ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 600 ||
    title.length > 255 ||
    genre.length > 255
  ) {
    return {
      error: "กรุณากรอกข้อมูลภาพยนตร์ให้ถูกต้อง"
    };
  }

  if (poster) {
    try {
      const url = new URL(poster);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid URL");
      }
    } catch {
      return {
        error: "URL โปสเตอร์ต้องขึ้นต้นด้วย http:// หรือ https://"
      };
    }
  }

  return {
    movie: { title, genre, duration, poster }
  };
}

// ดูภาพยนตร์ทั้งหมดสำหรับ Admin
app.get("/api/admin/movies", requireAdmin, async (req, res) => {
  try {
    const [movies] = await db.query(`
      SELECT id, title, genre, duration, poster
      FROM movies
      ORDER BY id DESC
    `);

    res.json(movies);
  } catch (error) {
    console.error("Admin movies error:", error);
    res.status(500).json({
      message: "ไม่สามารถโหลดรายการภาพยนตร์ได้"
    });
  }
});

// เพิ่มภาพยนตร์
app.post("/api/admin/movies", requireAdmin, async (req, res) => {
  const { movie, error } = validateMovie(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO movies (title, genre, duration, poster)
      VALUES (?, ?, ?, ?)
    `, [
      movie.title,
      movie.genre,
      movie.duration,
      movie.poster
    ]);

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: "เพิ่มภาพยนตร์สำเร็จ"
    });
  } catch (error) {
    console.error("Create movie error:", error);
    res.status(500).json({
      message: "ไม่สามารถเพิ่มภาพยนตร์ได้"
    });
  }
});

// แก้ไขภาพยนตร์
app.put("/api/admin/movies/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { movie, error } = validateMovie(req.body);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "รหัสภาพยนตร์ไม่ถูกต้อง"
    });
  }

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const [result] = await db.query(`
      UPDATE movies
      SET title = ?, genre = ?, duration = ?, poster = ?
      WHERE id = ?
    `, [
      movie.title,
      movie.genre,
      movie.duration,
      movie.poster,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "ไม่พบภาพยนตร์"
      });
    }

    res.json({
      success: true,
      message: "แก้ไขภาพยนตร์สำเร็จ"
    });
  } catch (error) {
    console.error("Update movie error:", error);
    res.status(500).json({
      message: "ไม่สามารถแก้ไขภาพยนตร์ได้"
    });
  }
});

// ลบภาพยนตร์
app.delete("/api/admin/movies/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "รหัสภาพยนตร์ไม่ถูกต้อง"
    });
  }

  try {
    // ป้องกันการลบหนังที่มีรอบฉายอยู่
    const [[result]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM showtimes
      WHERE movie_id = ?
    `, [id]);

    if (result.total > 0) {
      return res.status(409).json({
        message: "ไม่สามารถลบภาพยนตร์ที่มีรอบฉายอยู่ได้"
      });
    }

    const [deleted] = await db.query(
      "DELETE FROM movies WHERE id = ?",
      [id]
    );

    if (deleted.affectedRows === 0) {
      return res.status(404).json({
        message: "ไม่พบภาพยนตร์"
      });
    }

    res.json({
      success: true,
      message: "ลบภาพยนตร์สำเร็จ"
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "ไม่สามารถลบภาพยนตร์ที่มีข้อมูลเกี่ยวข้องได้"
      });
    }

    console.error("Delete movie error:", error);
    res.status(500).json({
      message: "ไม่สามารถลบภาพยนตร์ได้"
    });
  }
});

function validateTheater(body) {
  const name = typeof body?.name === "string"
    ? body.name.trim()
    : "";

  const capacity = Number(body?.capacity);

  if (!name || name.length > 100) {
    return {
      error: "กรุณากรอกชื่อโรงภาพยนตร์ (ไม่เกิน 100 ตัวอักษร)"
    };
  }

  if (
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 208
  ) {
    return {
      error: "จำนวนที่นั่งต้องอยู่ระหว่าง 1 ถึง 208"
    };
  }

  return { theater: { name, capacity } };
}

// ดึงโรงภาพยนตร์ทั้งหมด
app.get("/api/admin/theaters", requireAdmin, async (req, res) => {
  try {
    const [theaters] = await db.query(`
      SELECT
        t.id,
        t.name,
        t.capacity,
        COUNT(s.id) AS showtimeCount
      FROM theaters t
      LEFT JOIN showtimes s ON s.theater_id = t.id
      GROUP BY t.id, t.name, t.capacity
      ORDER BY t.id DESC
    `);

    res.json(theaters);
  } catch (error) {
    console.error("Admin theaters error:", error);
    res.status(500).json({
      message: "ไม่สามารถโหลดข้อมูลโรงภาพยนตร์ได้"
    });
  }
});

// เพิ่มโรงภาพยนตร์
app.post("/api/admin/theaters", requireAdmin, async (req, res) => {
  const { theater, error } = validateTheater(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO theaters (name, capacity)
      VALUES (?, ?)
    `, [theater.name, theater.capacity]);

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: "เพิ่มโรงภาพยนตร์สำเร็จ"
    });
  } catch (error) {
    console.error("Create theater error:", error);
    res.status(500).json({
      message: "ไม่สามารถเพิ่มโรงภาพยนตร์ได้"
    });
  }
});

// แก้ไขโรงภาพยนตร์
app.put("/api/admin/theaters/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { theater, error } = validateTheater(req.body);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "รหัสโรงภาพยนตร์ไม่ถูกต้อง"
    });
  }

  if (error) {
    return res.status(400).json({ message: error });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(`
      SELECT id, capacity
      FROM theaters
      WHERE id = ?
      FOR UPDATE
    `, [id]);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "ไม่พบโรงภาพยนตร์"
      });
    }

    const [showtimes] = await connection.query(`
      SELECT id
      FROM showtimes
      WHERE theater_id = ?
      LIMIT 1
    `, [id]);

    if (
      showtimes.length > 0 &&
      Number(rows[0].capacity) !== theater.capacity
    ) {
      await connection.rollback();
      return res.status(409).json({
        message: "โรงภาพยนตร์นี้มีรอบฉายแล้ว ไม่สามารถเปลี่ยนจำนวนที่นั่งได้"
      });
    }

    await connection.query(`
      UPDATE theaters
      SET name = ?, capacity = ?
      WHERE id = ?
    `, [theater.name, theater.capacity, id]);

    await connection.commit();

    res.json({
      success: true,
      message: "แก้ไขโรงภาพยนตร์สำเร็จ"
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Update theater error:", error);
    res.status(500).json({
      message: "ไม่สามารถแก้ไขโรงภาพยนตร์ได้"
    });
  } finally {
    if (connection) connection.release();
  }
});

// ลบโรงภาพยนตร์
app.delete("/api/admin/theaters/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "รหัสโรงภาพยนตร์ไม่ถูกต้อง"
    });
  }

  try {
    const [result] = await db.query(
      "DELETE FROM theaters WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "ไม่พบโรงภาพยนตร์"
      });
    }

    res.json({
      success: true,
      message: "ลบโรงภาพยนตร์สำเร็จ"
    });
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message: "ไม่สามารถลบโรงภาพยนตร์ที่มีรอบฉายอยู่ได้"
      });
    }

    console.error("Delete theater error:", error);
    res.status(500).json({
      message: "ไม่สามารถลบโรงภาพยนตร์ได้"
    });
  }
});

function validateShowtime(body) {
  const movieId = Number(body?.movieId);
  const theaterId = Number(body?.theaterId);
  const date = body?.date;
  const time = body?.time;
  const price = Number(body?.price);

  if (
    !Number.isSafeInteger(movieId) || movieId <= 0 ||
    !Number.isSafeInteger(theaterId) || theaterId <= 0 ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 999999.99 ||
    Math.round(price * 100) / 100 !== price
  ) {
    return {
      error: "กรุณากรอกข้อมูลรอบฉายให้ถูกต้อง"
    };
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    return { error: "วันที่ไม่ถูกต้อง" };
  }

  return {
    showtime: { movieId, theaterId, date, time, price }
  };
}

// ดึงรอบฉายทั้งหมด
app.get("/api/admin/showtimes", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.id,
        s.movie_id AS movieId,
        s.theater_id AS theaterId,
        m.title AS movieTitle,
        m.duration,
        t.name AS theaterName,
        DATE_FORMAT(s.show_date, '%Y-%m-%d') AS date,
        TIME_FORMAT(s.show_time, '%H:%i') AS time,
        s.price,
        (
          SELECT COUNT(*)
          FROM bookings b
          WHERE b.showtime_id = s.id
        ) AS bookingCount
      FROM showtimes s
      JOIN movies m ON m.id = s.movie_id
      JOIN theaters t ON t.id = s.theater_id
      ORDER BY s.show_date DESC, s.show_time DESC, s.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Admin showtimes error:", error);
    res.status(500).json({
      message: "ไม่สามารถโหลดรอบฉายได้"
    });
  }
});

// ตรวจสอบเวลาชนกัน รวมรอบฉายที่ข้ามเที่ยงคืน
async function findShowtimeConflict(connection, data, excludeId = 0) {
  const [[movie]] = await connection.query(
    "SELECT duration FROM movies WHERE id = ?",
    [data.movieId]
  );

  if (!movie) {
    return { error: "ไม่พบภาพยนตร์" };
  }

  const start = new Date(`${data.date}T${data.time}:00Z`);
  const end = new Date(
    start.getTime() + Number(movie.duration) * 60000
  );

  const windowStart = new Date(
    start.getTime() - 24 * 60 * 60 * 1000
  );

  const windowEnd = new Date(
    start.getTime() + 24 * 60 * 60 * 1000
  );

  const toSqlDate = (d) => d.toISOString().slice(0, 10);
  const toSqlDateTime = (d) =>
    d.toISOString().slice(0, 19).replace("T", " ");

  const [rows] = await connection.query(`
    SELECT
      s.id,
      m.title,
      TIMESTAMP(s.show_date, s.show_time) AS startsAt,
      DATE_ADD(
        TIMESTAMP(s.show_date, s.show_time),
        INTERVAL m.duration MINUTE
      ) AS endsAt
    FROM showtimes s
    JOIN movies m ON m.id = s.movie_id
    WHERE s.theater_id = ?
      AND s.id <> ?
      AND s.show_date BETWEEN ? AND ?
  `, [
    data.theaterId,
    excludeId,
    toSqlDate(windowStart),
    toSqlDate(windowEnd)
  ]);

  for (const row of rows) {
    // db.js ตั้ง dateStrings: true ไว้แล้ว
    const existingStart = new Date(
      row.startsAt.replace(" ", "T") + "Z"
    );
    const existingEnd = new Date(
      row.endsAt.replace(" ", "T") + "Z"
    );

    if (start < existingEnd && end > existingStart) {
      return {
        error: `รอบฉายชนกับ "${row.title}" ในโรงภาพยนตร์เดียวกัน`
      };
    }
  }

  return { start: toSqlDateTime(start) };
}

// เพิ่มรอบฉาย
app.post("/api/admin/showtimes", requireAdmin, async (req, res) => {
  const { showtime, error } = validateShowtime(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [theaters] = await connection.query(
      "SELECT id FROM theaters WHERE id = ? FOR UPDATE",
      [showtime.theaterId]
    );

    if (theaters.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "ไม่พบโรงภาพยนตร์"
      });
    }

    const conflict = await findShowtimeConflict(
      connection, showtime
    );

    if (conflict.error) {
      await connection.rollback();
      return res.status(409).json({
        message: conflict.error
      });
    }

    const [result] = await connection.query(`
      INSERT INTO showtimes
        (movie_id, theater_id, show_date, show_time, price)
      VALUES (?, ?, ?, ?, ?)
    `, [
      showtime.movieId,
      showtime.theaterId,
      showtime.date,
      showtime.time,
      showtime.price
    ]);

    await connection.commit();

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: "เพิ่มรอบฉายสำเร็จ"
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Create showtime error:", error);
    res.status(500).json({
      message: "ไม่สามารถเพิ่มรอบฉายได้"
    });
  } finally {
    if (connection) connection.release();
  }
});

// แก้ไขรอบฉาย
app.put("/api/admin/showtimes/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { showtime, error } = validateShowtime(req.body);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "รหัสรอบฉายไม่ถูกต้อง"
    });
  }

  if (error) {
    return res.status(400).json({ message: error });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id, theater_id FROM showtimes WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "ไม่พบรอบฉาย"
      });
    }

    // ล็อกโรงเดิมและโรงใหม่ตาม ID เพื่อช่วยลด deadlock
    const theaterIds = [
      ...new Set([
        Number(existing[0].theater_id),
        showtime.theaterId
      ])
    ].sort((a, b) => a - b);

    for (const theaterId of theaterIds) {
      const [rows] = await connection.query(
        "SELECT id FROM theaters WHERE id = ? FOR UPDATE",
        [theaterId]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          message: "ไม่พบโรงภาพยนตร์"
        });
      }
    }

    const [locked] = await connection.query(
      "SELECT id FROM showtimes WHERE id = ? FOR UPDATE",
      [id]
    );

    if (locked.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "ไม่พบรอบฉาย"
      });
    }

    const [[bookings]] = await connection.query(
      "SELECT COUNT(*) AS total FROM bookings WHERE showtime_id = ?",
      [id]
    );

    if (bookings.total > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "ไม่สามารถแก้ไขรอบฉายที่มีรายการจองแล้ว"
      });
    }

    const conflict = await findShowtimeConflict(
      connection, showtime, id
    );

    if (conflict.error) {
      await connection.rollback();
      return res.status(409).json({
        message: conflict.error
      });
    }

    await connection.query(`
      UPDATE showtimes
      SET movie_id = ?, theater_id = ?,
          show_date = ?, show_time = ?, price = ?
      WHERE id = ?
    `, [
      showtime.movieId,
      showtime.theaterId,
      showtime.date,
      showtime.time,
      showtime.price,
      id
    ]);

    await connection.commit();

    res.json({
      success: true,
      message: "แก้ไขรอบฉายสำเร็จ"
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Update showtime error:", error);
    res.status(500).json({
      message: "ไม่สามารถแก้ไขรอบฉายได้"
    });
  } finally {
    if (connection) connection.release();
  }
});

// ลบรอบฉาย
app.delete("/api/admin/showtimes/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "รหัสรอบฉายไม่ถูกต้อง"
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT theater_id FROM showtimes WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "ไม่พบรอบฉาย"
      });
    }

    await connection.query(
      "SELECT id FROM theaters WHERE id = ? FOR UPDATE",
      [existing[0].theater_id]
    );

    await connection.query(
      "SELECT id FROM showtimes WHERE id = ? FOR UPDATE",
      [id]
    );

    const [[bookings]] = await connection.query(
      "SELECT COUNT(*) AS total FROM bookings WHERE showtime_id = ?",
      [id]
    );

    if (bookings.total > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "ไม่สามารถลบรอบฉายที่มีรายการจองแล้ว"
      });
    }

    await connection.query(
      "DELETE FROM showtimes WHERE id = ?",
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "ลบรอบฉายสำเร็จ"
    });
  } catch (error) {
    if (connection) await connection.rollback();

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "รอบฉายนี้มีข้อมูลการจองอยู่ ไม่สามารถลบได้"
      });
    }

    console.error("Delete showtime error:", error);
    res.status(500).json({
      message: "ไม่สามารถลบรอบฉายได้"
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        b.id,
        b.booking_code AS bookingCode,
        b.quantity,
        b.total_price AS total,
        b.status,
        DATE_FORMAT(
          b.booked_at, '%Y-%m-%d %H:%i:%s'
        ) AS bookedAt,
        m.title AS movieTitle,
        t.name AS theaterName,
        DATE_FORMAT(
          s.show_date, '%Y-%m-%d'
        ) AS showDate,
        TIME_FORMAT(
          s.show_time, '%H:%i'
        ) AS showTime,
        GROUP_CONCAT(
          bs.seat_code
          ORDER BY LEFT(bs.seat_code, 1),
                   CAST(SUBSTRING(bs.seat_code, 2) AS UNSIGNED)
          SEPARATOR ','
        ) AS seatList
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      JOIN movies m ON m.id = s.movie_id
      JOIN theaters t ON t.id = s.theater_id
      LEFT JOIN booking_seats bs ON bs.booking_id = b.id
      GROUP BY
        b.id,
        b.booking_code,
        b.quantity,
        b.total_price,
        b.status,
        b.booked_at,
        m.title,
        t.name,
        s.show_date,
        s.show_time
      ORDER BY b.booked_at DESC, b.id DESC
    `);

    const bookings = rows.map((row) => ({
      ...row,
      total: Number(row.total),
      seats: row.seatList
        ? row.seatList.split(",")
        : []
    }));

    res.json(bookings);
  } catch (error) {
    console.error("Admin bookings error:", error);

    res.status(500).json({
      message: "ไม่สามารถโหลดรายการจองได้"
    });
  }
});

app.listen(PORT, () => {
  console.log(`CineBook API running at http://localhost:${PORT}`);
});
