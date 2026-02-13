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

// ========== ARTICLES API ==========
app.get("/api/articles", requireAuth, async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/articles", requireAuth, async (req, res) => {
  // Only admin can create articles
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { name, code, kpdSifra, brutIznos, pdv, opis } = req.body;
    const article = await prisma.article.create({
      data: { name, code, kpdSifra, brutIznos, pdv, opis },
    });
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/articles/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { id } = req.params;
    const { name, code, kpdSifra, brutIznos, pdv, opis, active } = req.body;
    const article = await prisma.article.update({
      where: { id },
      data: { name, code, kpdSifra, brutIznos, pdv, opis, active },
    });
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/articles/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { id } = req.params;
    await prisma.article.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ========== RECEIPTS API ==========
app.get("/api/receipts", requireAuth, async (req, res) => {
  try {
    const receipts = await prisma.receipt.findMany({
      include: { items: { include: { article: true } }, kreator: true },
      orderBy: { datum: "desc" },
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/receipts", requireAuth, async (req, res) => {
  try {
    const { broj, nacinPlacanja, items } = req.body; // items: [{articleId, quantity, price}]
    
    // Calculate total
    const ukupno = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    const receipt = await prisma.receipt.create({
      data: {
        broj,
        nacinPlacanja,
        ukupno,
        tvorac: req.user.id,
        items: {
          create: items.map((item) => ({
            articleId: item.articleId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: { include: { article: true } } },
    });

    // Auto-create transaction
    await prisma.transaction.create({
      data: {
        receiptId: receipt.id,
        userId: req.user.id,
        amount: ukupno,
      },
    });

    res.status(201).json(receipt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/receipts/:id/storno", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.receipt.update({
      where: { id },
      data: { isCancelled: true },
      include: { items: { include: { article: true } } },
    });
    res.json(receipt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/receipts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { broj, nacinPlacanja, items } = req.body;
    
    const ukupno = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Remove old items
    await prisma.receiptItem.deleteMany({ where: { receiptId: id } });
    
    const receipt = await prisma.receipt.update({
      where: { id },
      data: {
        broj,
        nacinPlacanja,
        ukupno,
        items: {
          create: items.map((item) => ({
            articleId: item.articleId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: { include: { article: true } } },
    });
    res.json(receipt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ========== TRANSACTIONS API ==========
app.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { 
        receipt: { include: { items: { include: { article: true } } } },
        user: { select: { id: true, name: true, email: true } } 
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SALES REPORTS API ==========
app.get("/api/reports", requireAuth, async (req, res) => {
  try {
    const reports = await prisma.salesReport.findMany({
      orderBy: { datum: "desc" },
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/reports", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { datum, ukupnoProdano, brojRacuna, opis } = req.body;
    const report = await prisma.salesReport.create({
      data: { datum: new Date(datum), ukupnoProdano, brojRacuna, opis },
    });
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ========== USERS API ==========
app.get("/api/users", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { email, name, role } = req.body;
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || "USER",
        googleId: `manual_${email}`, // Placeholder for manually created users
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/users/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { id } = req.params;
    const { role, name } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { role, name },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/users/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
