import express from "express";
import { Pool } from "pg";
import { upload } from "../utils/awsUpload.js";

const router = express.Router();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET all tech
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM tb_tech ORDER BY id_tech ASC");
    res.render("dataTech", { tb_tech: result.rows });
  } catch (err) {
    res.status(500).send("gagal menampilkan data tech");
  }
});

// POST create tech
router.post("/", upload.single("img_tech"), async (req, res) => {
  const { name_tech } = req.body;
  const img_tech = req.file.key;
  try {
    await db.query("INSERT INTO tb_tech (img_tech, name_tech) VALUES($1, $2)", [
      img_tech,
      name_tech,
    ]);
    res.redirect("/tech");
  } catch (err) {
    res.status(500).send("gagal menyimpan data tech");
  }
});

// POST update tech
router.post("/update/:id", upload.single("edit_img_tech"), async (req, res) => {
  const { id } = req.params;
  const { name_tech } = req.body;
  const file = req.file;
  try {
    if (file) {
      const oldRow = await db.query(
        "SELECT img_tech FROM tb_tech WHERE id_tech = $1",
        [id]
      );
      if (oldRow.rows.length) {
        const oldFilename = oldRow.rows[0].img_tech;
        // delete from S3
      }
      await db.query(
        "UPDATE tb_tech SET name_tech=$1, img_tech=$2 WHERE id_tech=$3",
        [name_tech, file.key, id]
      );
    } else {
      await db.query("UPDATE tb_tech SET name_tech=$1 WHERE id_tech=$2", [
        name_tech,
        id,
      ]);
    }
    res.redirect("/tech");
  } catch (err) {
    res.status(500).send("gagal update tech");
  }
});

// POST delete tech
router.post("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM tb_tech WHERE id_tech = $1", [id]);
    res.redirect("/tech");
  } catch (err) {
    res.status(500).send("gagal hapus tech");
  }
});

export default router;
