
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { router as authRouter } from "../modules/auth/index.js";
import { router as userRouter } from "../modules/users/index.js";
import {router as roomRouter} from "../modules/rooms/index.js";
import { router as guestRouter } from "../modules/guests/index.js";
import { router as reservationRouter } from "../modules/reservations/index.js";
import { router as reportsRouter } from "../modules/reports/index.js";
import { router as auditLogRouter } from "../modules/audit/index.js";
import { router as billingRouter } from "../modules/billing/index.js";
import { globalLimiter } from "../modules/auth/rateLimit.js";

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true
    }),
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(globalLimiter);

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/rooms", roomRouter);
app.use("/guests", guestRouter);
app.use("/reservations", reservationRouter);
app.use("/billing", billingRouter);
app.use("/reports", reportsRouter);
app.use("/audit-logs", auditLogRouter);




export default app;
