
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));

// Reuse MongoDB connection
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null
    };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGO_URI)
            .then((mongooseInstance) => {
                console.log("MongoDB Connected");
                return mongooseInstance;
            })
            .catch((error) => {
                cached.promise = null;
                throw error;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

// Connect database before handling requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("Database connection failed:", error.message);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

// Authentication routes
app.use("/api/auth", require("./routes/auth"));

// Test route
app.get("/", (req, res) => {
    res.send("Weather App Backend Running");
});

// Export Express app for Vercel
module.exports = app;

// Local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
