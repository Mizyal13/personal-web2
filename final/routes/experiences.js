import express from "express";
import { Pool } from "pg";
import { upload } from "../utils/awsUpload.js";

const router = express.Router();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET all experiences
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM tb_experiences ORDER BY id_exp ASC"
    );
    res.render("dataExp", { tb_experiences: result.rows });
  } catch (err) {
    res.status(500).send("gagal menampilkan experiences");
  }
});

// GET create experience page
router.get("/create", (req, res) => {
  res.render("createExp");
});

// POST create experience
router.post("/create", upload.single("img_exp"), async (req, res) => {
  const { dept_exp, comp_exp, job_exp, tech_exp, start_exp, end_exp } =
    req.body;
  const img_exp = req.file.key;
  const jobArray = job_exp.split(",").map((t) => t.trim());
  const techArray = tech_exp.split(",").map((t) => t.trim());
  try {
    await db.query(
      `INSERT INTO tb_experiences(dept_exp, comp_exp, job_exp, tech_exp, start_exp, end_exp, img_exp) 
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [dept_exp, comp_exp, jobArray, techArray, start_exp, end_exp, img_exp]
    );
    res.redirect("/experiences");
  } catch (err) {
    res.status(500).send("gagal create experience");
  }
});

// GET edit experience page
router.get("/edit/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM tb_experiences WHERE id_exp=$1",
      [req.params.id]
    );
    const exp = result.rows[0];
    if (exp.start_exp)
      exp.start_exp = exp.start_exp.toISOString().split("T")[0];
    if (exp.end_exp) exp.end_exp = exp.end_exp.toISOString().split("T")[0];
    res.render("editExp", { exp });
  } catch (err) {
    res.status(500).send("gagal load edit experience");
  }
});

// POST edit experience
router.post("/edit/:id", upload.single("img_exp"), async (req, res) => {
  const id = req.params.id;
  let { dept_exp, comp_exp, job_exp, tech_exp, start_exp, end_exp, old_img } =
    req.body;
  const img_exp = req.file ? req.file.key : old_img;
  const jobArray = job_exp.split(",").map((t) => t.trim());
  const techArray = tech_exp.split(",").map((t) => t.trim());

  try {
    if (req.file && old_img) {
      // delete old S3 file if needed
    }
    await db.query(
      `UPDATE tb_experiences SET dept_exp=$1, comp_exp=$2, job_exp=$3, tech_exp=$4, start_exp=$5, end_exp=$6, img_exp=$7
       WHERE id_exp=$8`,
      [dept_exp, comp_exp, jobArray, techArray, start_exp, end_exp, img_exp, id]
    );
    res.redirect("/experiences");
  } catch (err) {
    res.status(500).send("gagal update experience");
  }
});

// POST delete experience
router.post("/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM tb_experiences WHERE id_exp=$1", [
      req.params.id,
    ]);
    res.redirect("/experiences");
  } catch (err) {
    res.status(500).send("gagal hapus experience");
  }
});

export default router;
