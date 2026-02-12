import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import prisma from "./auth.js"; // <- your cleaned auth.js
import requireAuth from "./middleware/requireAuth.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // dev only
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/oauth/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      return res.redirect("http://localhost:5173/?error=server_error");
    }
    if (!user) {
      // Authentication failed (non-@kset.org email)
      return res.redirect("http://localhost:5173/?error=unauthorized");
    }
    // Log user in
    req.logIn(user, (err) => {
      if (err) {
        return res.redirect("http://localhost:5173/?error=login_error");
      }
      res.redirect("http://localhost:5173/home");
    });
  })(req, res, next);
});

app.get("/auth/me", (req, res) => {
  res.json(req.user || null);
});

app.post("/auth/logout", (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

app.get("/protected", requireAuth, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
