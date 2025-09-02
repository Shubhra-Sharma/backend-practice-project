import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app= express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({limit: "16kb"} ));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// routes 

import userRouter from "./routes/user.routes.js";
// routes declaration
// usually we use app.get() syntax for making routes but here we have explicitly exported routes, so we use app.use() middleware
app.use("/api/v1/users", userRouter)
// http://localhost:8000/api/v1/users/register
// we can use this app/use() syntax for multiple routes by defining our own controllers and passing them in the user routes in user.controller.js
export {app};