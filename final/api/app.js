import express from "express";
import cookieParser from "cookie-parser";
import flash from "express-flash";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import techRouter from "../routes/tech.js";
import expRouter from "../routes/experiences.js";
import projectRouter from "../routes/projects.js";
import authRouter from "../routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(flash());
app.use(cors());

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// View engine
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "hbs");

// Register HBS helpers
import hbs from "hbs";
hbs.registerHelper("monthYear", function (date) {
  const month = new Date(date).toLocaleString("en-US", { month: "short" });
  const year = new Date(date).getFullYear();
  return `${month} ${year}`;
});

// JWT middleware
import jwt from "jsonwebtoken";
app.use((req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    req.user = null;
    next();
  }
});

// Routes
app.use("/tech", techRouter);
app.use("/experiences", expRouter);
app.use("/projects", projectRouter);
app.use("/auth", authRouter);

// Root redirect
app.get("/", (req, res) => res.redirect("/tech"));

// Serverless export
export default app;
