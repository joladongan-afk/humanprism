import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

export default app;
