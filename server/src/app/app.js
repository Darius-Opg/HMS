
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { router as authRouter } from "../modules/auth/index.js";
import { router as userRouter } from "../modules/users/index.js";
import {router as roomRouter} from "../modules/rooms/index.js";
import { router as guestRouter } from "../modules/guests/index.js";
import { router as reservationRouter } from "../modules/reservations/index.js";

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

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/rooms", roomRouter);
app.use("/guests", guestRouter);
app.use("/reservations", reservationRouter);




export default app;