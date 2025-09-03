import express from "express";
import { Pool } from "pg";
import { upload } from "../utils/awsUpload.js";

const router = express.Router();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET all projects
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM tb_projects ORDER BY id_project ASC"
    );
    res.render("dataProject", { tb_projects: result.rows });
  } catch (err) {
    res.status(500).send("gagal menampilkan projects");
  }
});

// GET create project
router.get("/create", (req, res) => res.render("createProject"));

// POST create project
router.post("/create", upload.single("img_project"), async (req, res) => {
  const { name_project, desc_project, tech_project, github_project } = req.body;
  const img_project = req.file.key;
  const techArray = tech_project.split(",").map((t) => t.trim());
  try {
    await db.query(
      `INSERT INTO tb_projects(name_project, desc_project, tech_project, img_project, github_project)
       VALUES($1,$2,$3,$4,$5)`,
      [name_project, desc_project, techArray, img_project, github_project]
    );
    res.redirect("/projects");
  } catch (err) {
    res.status(500).send("gagal create project");
  }
});

// GET edit project
router.get("/edit/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM tb_projects WHERE id_project=$1",
      [req.params.id]
    );
    res.render("editProject", { projects: result.rows[0] });
  } catch (err) {
    res.status(500).send("gagal load edit project");
  }
});

// POST edit project
router.post("/edit/:id", upload.single("img_project"), async (req, res) => {
  const id = req.params.id;
  const {
    name_project,
    desc_project,
    tech_project,
    github_project,
    old_imgProject,
  } = req.body;
  const img_project = req.file ? req.file.key : old_imgProject;
  const techArray = tech_project.split(",").map((t) => t.trim());

  try {
    if (req.file && old_imgProject) {
      // delete old S3 file
    }
    await db.query(
      `UPDATE tb_projects SET name_project=$1, desc_project=$2, tech_project=$3, img_project=$4, github_project=$5 WHERE id_project=$6`,
      [name_project, desc_project, techArray, img_project, github_project, id]
    );
    res.redirect("/projects");
  } catch (err) {
    res.status(500).send("gagal update project");
  }
});

// POST delete project
router.post("/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM tb_projects WHERE id_project=$1", [
      req.params.id,
    ]);
    res.redirect("/projects");
  } catch (err) {
    res.status(500).send("gagal hapus project");
  }
});

export default router;
