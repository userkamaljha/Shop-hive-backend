import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import productRouter from "./routes/product.routes.js";
import brandRouter from "./routes/brand.routes.js";
import categoryRouter from "./routes/category.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import cartRouter from "./routes/cart.routes.js";
import orderRouter from "./routes/order.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    exposedHeaders: ['X-Total-Count']
}));

// Parse cookies
app.use(cookieParser());

// Parse JSON requests
app.use(express.json({ limit: '16kb' }));

// Parse URL-encoded requests
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Use routers for specific paths
app.use("/", productRouter);
app.use("/brands", brandRouter);
app.use("/categories", categoryRouter);
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/cart", cartRouter);
app.use("/orders", orderRouter);

app.get('/*', (req, res) => {
    const indexPath = path.resolve(__dirname, '..', 'dist', 'index.html');
    res.sendFile(indexPath);
  });
// Serve index.html for all other routes

export default app;
