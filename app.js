const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");

const app = express();

dotenv.config();

if (!process.env.JWT_SECRET) {
        throw new Error("Secret key is not defined in the environment variables.");
    }

const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2, // 2 jam
        httpOnly: true, // Meningkatkan keamanan
        secure: process.env.NODE_ENV === "development",
    }
  })
);

app.use("/users", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;