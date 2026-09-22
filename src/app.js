import express from "express";
import cors from "cors";
import { initializeDatabase } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { storageRouter } from "./routes/storage.js";
import { authenticate } from "./auth-middleware.js";

const app = express();

app.use(express.json()); // Allows parsing JSON
app.use(cors()); // Allows all endpoints

// Init the database

await initializeDatabase();

// API endpoints

app.get("/api/v1/ping", (req, res) => {
  res.send({ status: "ok" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/storage", authenticate, storageRouter);

export { app };
