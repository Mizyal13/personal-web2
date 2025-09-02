import express from "express";
import { Pool } from "pg";
import multer from "multer";
import path from "path";
import hbs from "hbs";
import bcrypt from "bcrypt";
import flash from "express-flash";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import AWS from "aws-sdk";
import multerS3 from "multer-s3";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();

app.set("view engine", "hbs");
app.set("views", "src/views");
app.use(express.json());
app.use(express.static("public"));
app.use("/assets", express.static("src/assets"));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/final", router);

app.use(flash());

// JWT middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};
app.use(verifyToken);

// Redirect root to /final
app.get("/", (req, res) => {
  res.redirect("/final");
});

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configure multer to use S3 for storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    acl: "public-read",
    key: function (req, file, cb) {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    },
  }),
});

hbs.registerHelper("monthYear", function (date) {
  const month = new Date(date).toLocaleString("en-US", { month: "short" });
  const year = new Date(date).getFullYear();
  return `${month} ${year}`;
});

// tech
app.get("/dataTech", tech);
async function tech(req, res) {
  try {
    const result = await db.query("SELECT * FROM tb_tech");
    let userData;
    if (req.user) {
      userData = req.user.name;
    }
    res.render("dataTech", { tb_tech: result.rows, userData: userData });
  } catch (err) {
    res.status(500).send("data gagal ditampilkan");
  }
}
app.post("/dataTech", upload.single("img_tech"), handleTech);
async function handleTech(req, res) {
  let { name_tech } = req.body;
  let img_tech = req.file.key; // S3 key
  try {
    const query = ` INSERT INTO tb_tech (img_tech, name_tech ) VALUES($1, $2)`;
    const values = [img_tech, name_tech];
    await db.query(query, values);

    res.redirect("/dataTech");
  } catch (err) {
    res.status(500).send("gagal menyimpan data tech");
  }
}

app.post("/dataTech/update/:id", upload.single("edit_img_tech"), editTech);
async function editTech(req, res) {
  const id = req.params.id;
  const newName = req.body.name_tech;
  const file = req.file;

  try {
    if (file) {
      const oldRow = await db.query(
        "SELECT img_tech FROM tb_tech WHERE id_tech = $1",
        [id]
      );
      if (oldRow.rows.length) {
        const oldFilename = oldRow.rows[0].img_tech;
        // Delete old file from S3
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: oldFilename,
        };
        s3.deleteObject(deleteParams, (err, data) => {
          if (err) {
            console.error("Gagal hapus file lama dari S3:", err);
          }
        });
      }

      const newFilename = file.key; // S3 key
      await db.query(
        "UPDATE tb_tech SET name_tech = $1, img_tech = $2 WHERE id_tech = $3",
        [newName, newFilename, id]
      );
      return res.json({
        name_tech: newName,
        img_tech: newFilename,
      });
    } else {
      await db.query("UPDATE tb_tech SET name_tech = $1 WHERE id_tech = $2", [
        newName,
        id,
      ]);
      return res.json({
        name_tech: newName,
        img_tech: null,
      });
    }
  } catch (err) {
    console.error("Error saat update tech:", err);
    return res.status(500).json({ error: "Gagal meng-update data tech" });
  }
}
app.post("/dataTech/delete/:id", deleteTech);
async function deleteTech(req, res) {
  const id = req.params.id;
  try {
    await db.query("DELETE FROM tb_tech WHERE id_tech = $1", [id]);
    res.redirect("/dataTech");
  } catch (err) {
    console.error("error hapus :<(");
    res.status(500).send("yah gabisa di hapus");
  }
}
// close
// experiences
app.get("/dataExp", experiences);
async function experiences(req, res) {
  try {
    const result = await db.query("SELECT * FROM tb_experiences");
    res.render("dataExp", { tb_experiences: result.rows });
  } catch (err) {
    res.status(500).send(err.message);
  }
}
app.get("/dataExp/create", createE);
async function createE(req, res) {
  res.render("createExp");
}

app.post("/dataExp/create/", upload.single("img_exp"), createExp);
async function createExp(req, res) {
  let { dept_exp, comp_exp, job_exp, tech_exp, start_exp, end_exp } = req.body;
  const img_exp = req.file.key; // S3 key
  const jobArray = job_exp.split(",").map((t) => t.trim());
  const techArray = tech_exp.split(",").map((t) => t.trim());
  try {
    const query =
      "INSERT INTO tb_experiences(dept_exp, comp_exp, job_exp, tech_exp, start_exp, end_exp, img_exp) VALUES ($1,$2,$3,$4,$5,$6,$7)";
    const values = [
      dept_exp,
      comp_exp,
      jobArray,
      techArray,
      start_exp,
      end_exp,
      img_exp,
    ];
    await db.query(query, values);
    console.log("test :", req.body, req.file);
    res.redirect("/dataExp");
  } catch (err) {
    console.error("gagal", err);
    res.status(500).send("gagal create :[");
  }
}
app.get("/dataExp/edit/:id", editExp);
async function editExp(req, res) {
  try {
    const result = await db.query(
      "SELECT * FROM tb_experiences WHERE id_exp = $1",
      [req.params.id]
    );
    const exp = result.rows[0];

    if (exp.start_exp)
      exp.start_exp = exp.start_exp.toISOString().split("T")[0];
    if (exp.end_exp) exp.end_exp = exp.end_exp.toISOString().split("T")[0];

    res.render("editExp", { exp });
  } catch (err) {
    res.status(500).send("error :(");
  }
}
app.post("/dataExp/edit/:id", upload.single("img_exp"), handleEdit);
async function handleEdit(req, res) {
  const id = req.params.id;
  let { dept_exp, comp_exp, job_exp, tech_exp, start_exp, end_exp, old_img } =
    req.body;
  const img_exp = req.file ? req.file.key : old_img; // S3 key
  const jobArray = job_exp.split(",").map((t) => t.trim());
  const techArray = tech_exp.split(",").map((t) => t.trim());
  try {
    if (req.file) {
      // Delete old file from S3
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: old_img,
      };
      s3.deleteObject(deleteParams, (err, data) => {
        if (err) {
          console.error("Gagal hapus file lama dari S3:", err);
        }
      });
    }
    const query =
      "UPDATE tb_experiences SET dept_exp = $1, comp_exp = $2, job_exp =$3, tech_exp = $4, start_exp = $5, end_exp = $6, img_exp = $7 WHERE id_exp = $8";
    const values = [
      dept_exp,
      comp_exp,
      jobArray,
      techArray,
      start_exp,
      end_exp,
      img_exp,
      id,
    ];
    await db.query(query, values);

    res.redirect("/dataExp");
  } catch (err) {
    console.error("gagal", err);
    res.status(500).send("gagal di edit :[");
  }
}
app.post("/dataExp/delete/:id", deleteExp);
async function deleteExp(req, res) {
  const id = req.params.id;
  try {
    await db.query("DELETE FROM tb_experiences WHERE id_exp = $1", [id]);
    res.redirect("/dataExp");
  } catch (err) {
    console.error("error hapus :<(");
    res.status(500).send("yah gabisa di hapus");
  }
}

// project
app.get("/dataProject", projects);
async function projects(req, res) {
  try {
    const result = await db.query("SELECT * FROM tb_projects");
    res.render("dataProject", { tb_projects: result.rows });
  } catch (err) {
    res.status(500).send("data project gagal ditampilkan :[");
  }
}
app.get("/dataProject/create", createP);
function createP(req, res) {
  res.render("createProject");
}
app.post("/dataProject/create", upload.single("img_project"), createProjects);
async function createProjects(req, res) {
  let { name_project, desc_project, tech_project, github_project } = req.body;
  let img_project = req.file.key; // S3 key
  const techArray = tech_project.split(",").map((t) => t.trim());
  try {
    const query =
      "INSERT INTO tb_projects (name_project, desc_project, tech_project, img_project, github_project) VALUES ($1,$2,$3,$4,$5)";
    const values = [
      name_project,
      desc_project,
      techArray,
      img_project,
      github_project,
    ];
    await db.query(query, values);
    res.redirect("/dataProject");
  } catch (err) {
    res.status(500).send("data gagal diambil");
  }
}

app.get("/dataProject/edit/:id", editJ);
async function editJ(req, res) {
  try {
    const result = await db.query(
      "SELECT * FROM tb_projects WHERE id_project = $1",
      [req.params.id]
    );
    const projects = result.rows[0];
    console.log(req.params.id);
    res.render("editProject", { projects });
  } catch (err) {
    res.status(500).send("error :(");
  }
}

app.post("/dataProject/edit/:id", upload.single("img_project"), editProject);
async function editProject(req, res) {
  const id = req.params.id;
  const {
    name_project,
    desc_project,
    tech_project,
    github_project,
    old_imgProject,
  } = req.body;
  const img_project = req.file ? req.file.key : old_imgProject; // S3 key
  const techArray = tech_project.split(",").map((t) => t.trim());
  try {
    if (req.file) {
      // Delete old file from S3
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: old_imgProject,
      };
      s3.deleteObject(deleteParams, (err, data) => {
        if (err) {
          console.error("Gagal hapus file lama dari S3:", err);
        }
      });
    }
    await db.query(
      "UPDATE tb_projects SET name_project = $1, desc_project = $2, tech_project = $3, img_project = $4, github_project = $5 WHERE id_project = $6",
      [name_project, desc_project, techArray, img_project, github_project, id]
    );
    res.redirect("/dataProject");
  } catch (err) {
    console.error("data error", err);
    res.status(500).send("yah gagal :(");
  }
}
app.post("/dataProject/delete/:id", deleteProject);
async function deleteProject(req, res) {
  const id = req.params.id;
  try {
    await db.query("DELETE FROM tb_projects WHERE id_project = $1", [id]);
    res.redirect("/dataProject");
  } catch (err) {
    console.error("error hapus :<(");
    res.status(500).send("yah gabisa di hapus");
  }
}

app.get("/final", final);
async function final(req, res) {
  const techResult = await db.query(
    "SELECT * FROM tb_tech ORDER BY id_tech ASC"
  );
  const expResult = await db.query(
    "SELECT * FROM tb_experiences ORDER BY id_exp ASC"
  );
  const projectResult = await db.query(
    "SELECT * FROM tb_projects ORDER BY id_project ASC"
  );

  const tech = techResult.rows;
  const exp = expResult.rows;
  const project = projectResult.rows;
  res.render("index", { tech, exp, project });
}
app.get("/final/login", login);
function login(req, res) {
  const errorMessage = req.flash("error");
  res.render("login", { messages: errorMessage });
}
app.post("/final/login", handleLogin);
async function handleLogin(req, res) {
  const { email, password } = req.body;
  try {
    const inregist = await db.query(
      `SELECT * FROM public.user WHERE email = $1`,
      [email]
    );

    if (inregist.rowCount === 0) {
      req.flash("error", "email tidak ditemukan");
      return res.redirect("/final/login");
    }

    const user = inregist.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      req.flash("error", "password salah");
      return res.redirect("/final/login");
    }
    // Generate JWT token instead of session
    const token = jwt.sign(
      { name: user.name, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    res.cookie("token", token, { httpOnly: true });
    console.log("berhasil login", user.name);
    res.redirect("/dataTech");
  } catch (err) {
    console.error("login error", err);
    res.redirect("/final/login");
  }
}

app.get("/final/register", register);
function register(req, res) {
  const errorMessage = req.flash("error");
  res.render("register", { messages: errorMessage });
}
app.post("/final/register", handleRegister);
async function handleRegister(req, res) {
  let { name, email, password } = req.body;

  try {
    const inregist = await db.query(
      `SELECT * FROM public.user WHERE email = $1`,
      [email]
    );
    if (inregist.rowCount > 0) {
      req.flash("error", "email sudah terdaftar");
      return res.redirect("/final/register");
    }

    const hidePW = await bcrypt.hash(password, 10);
    const query =
      "INSERT INTO public.user (name, email, password) VALUES ($1, $2, $3)";
    const values = [name, email, hidePW];

    await db.query(query, values);
    res.redirect("/final/login");
  } catch (err) {
    console.error("yah error", err);
    req.flash("error", "terjadi kesalahan saat regist");
    res.redirect("/final/register");
  }
}

app.get("/final/logout", logOut);
function logOut(req, res) {
  res.clearCookie("token");
  res.redirect("/final/login");
}

export default app;
