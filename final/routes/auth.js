import express from "express";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import flash from "express-flash";

const router = express.Router();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET login page
router.get("/login", (req, res) => {
  const messages = req.flash("error");
  res.render("login", { messages });
});

// POST login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM public.user WHERE email=$1", [
      email,
    ]);
    if (result.rowCount === 0) {
      req.flash("error", "email tidak ditemukan");
      return res.redirect("/auth/login");
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash("error", "password salah");
      return res.redirect("/auth/login");
    }
    const token = jwt.sign(
      { name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true });
    res.redirect("/tech");
  } catch (err) {
    console.error(err);
    res.redirect("/auth/login");
  }
});

// GET register page
router.get("/register", (req, res) => {
  const messages = req.flash("error");
  res.render("register", { messages });
});

// POST register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await db.query(
      "SELECT * FROM public.user WHERE email=$1",
      [email]
    );
    if (existing.rowCount > 0) {
      req.flash("error", "email sudah terdaftar");
      return res.redirect("/auth/register");
    }
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO public.user(name,email,password) VALUES($1,$2,$3)",
      [name, email, hashed]
    );
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "terjadi kesalahan saat regist");
    res.redirect("/auth/register");
  }
});

// GET logout
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/auth/login");
});

export default router;
