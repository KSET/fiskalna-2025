import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import pg from "pg";
import { createRequire } from "module";
import prisma from "./auth.js"; // <- your cleaned auth.js
import requireAuth from "./middleware/requireAuth.js";
import { handleOrderFiscalization } from "./fira.js";

const require = createRequire(import.meta.url);
const connectPgSimple = require("connect-pg-simple");
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://172.") || origin.startsWith("http://192.168.") || origin.startsWith("http://10.")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.use(
  session({
    store: new PgSession({ pool: pgPool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // dev only
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ========== HEALTH CHECK & DATABASE TEST ==========
app.get("/api/health", async (req, res) => {
  console.log("\n🏥 HEALTH CHECK endpoint");
  try {
    console.log("  Checking database connection...");
    const userCount = await prisma.user.count();
    const transactionCount = await prisma.transaction.count();
    const receiptCount = await prisma.receipt.count();
    
    console.log(`  ✅ Database OK!`);
    console.log(`     Users: ${userCount}`);
    console.log(`     Transactions: ${transactionCount}`);
    console.log(`     Receipts: ${receiptCount}`);
    
    res.json({
      status: "OK",
      database: "connected",
      users: userCount,
      transactions: transactionCount,
      receipts: receiptCount
    });
  } catch (error) {
    console.error("  ❌ Database connection FAILED:");
    console.error("     Error:", error.message);
    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
      error: error.message
    });
  }
});

// Routes
app.get("/auth/google", (req, res, next) => {
  // Save the frontend origin so we can redirect back to it after OAuth
  const referer = req.headers.referer || req.headers.origin || "";
  const match = referer.match(/^(https?:\/\/[^/]+)/);
  req.session.frontendOrigin = match ? match[1] : "http://localhost:5173";
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

app.get("/oauth/callback", (req, res, next) => {
  const frontend = req.session.frontendOrigin || "http://localhost:5173";
  passport.authenticate("google", (err, user) => {
    if (err) {
      return res.redirect(`${frontend}/?error=server_error`);
    }
    if (!user) {
      return res.redirect(`${frontend}/?error=unauthorized`);
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.redirect(`${frontend}/?error=login_error`);
      }
      res.redirect(`${frontend}/home`);
    });
  })(req, res, next);
});

app.get("/auth/me", (req, res) => {
  console.log("📋 GET /auth/me - Checking authentication status");
  console.log("   Authenticated:", req.isAuthenticated());
  console.log("   User:", req.user?.email || "NOT AUTHENTICATED");
  res.json(req.user || null);
});

app.post("/auth/logout", (req, res) => {
  console.log("🔚 POST /auth/logout - User logging out");
  console.log("   User:", req.user?.email || "UNKNOWN");
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
    // Admins see ALL articles (active and inactive)
    // Regular users only see active articles from active categories
    const isAdmin = req.user.role === "ADMIN";

    const whereClause = isAdmin ? {} : {
      OR: [
        { categoryId: null }, // Show articles with no category
        {
          category: {
            active: true // ONLY show if the linked category is active
          }
        }
      ],
      active: true // Only show active articles for non-admins
    };

    const articles = await prisma.article.findMany({
      where: whereClause,
      include: { category: true }, // Include category details in the response
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
    const { name, productCode, kpdCode, price, taxRate, description, unit } = req.body;
    const article = await prisma.article.create({
      data: { name, productCode, kpdCode, price, taxRate, description, unit },
    });
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/articles/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });

  try {
    const { id } = req.params;
    const { name, productCode, kpdCode, price, taxRate, description, unit, active, categoryId } = req.body;

    const article = await prisma.article.update({
      where: { id },
      data: { 
        name, 
        productCode, 
        kpdCode, 
        price, 
        taxRate, 
        description, 
        unit, 
        active,
        categoryId: categoryId || null
      },
    });
    res.json(article);
  } catch (error) {
    console.error("Update Article Error:", error);
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
      include: { items: { include: { article: true } }, user: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get receipt for printing - secure endpoint with authentication
app.get("/api/receipts/:id/print", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch receipt with all details
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { 
        items: { include: { article: true } },
        user: { select: { id: true, name: true, email: true } }
      },
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    // Format receipt data for printing
    const printData = {
      num: receipt.invoiceNumber,
      payment: receipt.paymentType,
      items: receipt.items.map(item => ({
        name: item.name || item.article?.name || "N/A",
        quantity: item.quantity,
        price: item.price,
      })),
      time: new Date(receipt.createdAt).toLocaleString("hr-HR"),
      cashier: receipt.user?.name || "N/A",
      base: receipt.netto,
      tax: receipt.taxValue,
      jir: receipt.jir,
      zki: receipt.zki,
      link: (() => {
        if (!receipt.jir) return null;
        const d = new Date(receipt.createdAt);
        const pad = (n) => n.toString().padStart(2, '0');
        const datv = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
        const iznInt = Math.round(Math.abs(receipt.brutto) * 100);
        const iznFormatted = Math.floor(iznInt / 100).toString().padStart(8, '0') + ',' + (iznInt % 100).toString().padStart(2, '0');
        return `https://porezna.gov.hr/rn?jir=${receipt.jir}&datv=${datv}&izn=${iznFormatted}`;
      })(),
      phone: "0916043415",
      email: "info@kset.org",
    };

    res.json(printData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/receipts", requireAuth, async (req, res) => {
  try {
    const {
      receiptNumber,
      webshopOrderId,
      webshopType,
      webshopEvent,
      webshopOrderNumber,
      invoiceType = "RAČUN", 
      paymentType = "GOTOVINA",
      paymentGatewayCode,
      paymentGatewayName,
      brutto, 
      netto, 
      taxValue,
      currency = "EUR",
      taxesIncluded = false,
      dueDate,
      validTo,
      billingAddress,
      shippingAddress,
      customerLocale = "HR",
      termsHR,
      termsEN,
      termsDE,
      internalNote,
      discountValue = 0,
      shippingCost = 0,
      items 
    } = req.body;
    
    // Validate payment type is uppercase
    const validPaymentTypes = ["GOTOVINA", "KARTICA", "TRANSAKCIJSKI"];
    if (!validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({ error: "Invalid paymentType. Must be GOTOVINA, KARTICA, or TRANSAKCIJSKI" });
    }

    // Create billing address if provided
    let billingAddressId = null;
    if (billingAddress) {
      const createdBillingAddress = await prisma.billingAddress.create({
        data: billingAddress,
      });
      billingAddressId = createdBillingAddress.id;
    }

    // Create shipping address if provided
    let shippingAddressId = null;
    if (shippingAddress) {
      const createdShippingAddress = await prisma.shippingAddress.create({
        data: shippingAddress,
      });
      shippingAddressId = createdShippingAddress.id;
    }
    
    const receipt = await prisma.receipt.create({
      data: {
        invoiceNumber: receiptNumber || `RCN-${Date.now()}`,
        webshopOrderId,
        webshopType,
        webshopEvent,
        webshopOrderNumber,
        invoiceType,
        paymentType,
        paymentGatewayCode,
        paymentGatewayName,
        userId: req.user.id,
        brutto,
        netto,
        taxValue,
        currency,
        taxesIncluded,
        dueDate: dueDate ? new Date(dueDate) : null,
        validTo: validTo ? new Date(validTo) : null,
        billingAddressId,
        shippingAddressId,
        customerLocale,
        termsHR,
        termsEN,
        termsDE,
        internalNote,
        discountValue,
        shippingCost,
        items: {
          create: items.map((item) => ({
            name: item.name,
            description: item.description,
            lineItemId: item.lineItemId,
            quantity: item.quantity,
            price: item.price,
            taxRate: item.taxRate,
            unit: item.unit,
            articleId: item.articleId,
          })),
        },
      },
      include: { items: { include: { article: true } }, user: true },
    });

    // Auto-create transaction
    if (!internalNote?.includes("STORNO")) {
      await prisma.transaction.create({
        data: {
          receiptId: receipt.id,
          userId: req.user.id,
          amount: brutto,
        },
      });
    }
    const calculatedBrutto = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const firaResult = await handleOrderFiscalization({
      id: receipt.id,
      code: receipt.id,
      email: receipt.billingAddress?.email,
      createdAt: receipt.createdAt,
      currency: receipt.currency,
      items: receipt.items,
    });

    if (firaResult && firaResult.invoiceNumber) {
      try {
        await prisma.receipt.update({
          where: { id: receipt.id },
          data: {

            invoiceNumber: firaResult.invoiceNumber, 
            jir: firaResult.jir,
            zki: firaResult.zki,
          },
        });
        receipt.invoiceNumber = firaResult.invoiceNumber;
        receipt.jir = firaResult.jir;
        receipt.zki = firaResult.zki;
        receipt.invoiceDate = firaResult.invoiceDate;

      } catch (updateError) {
        console.error("Failed to update receipt with fiscal data:", updateError);
        if (updateError.code === 'P2002') {
          await prisma.receipt.update({
            where: { id: receipt.id },
            data: {
              invoiceNumber: `${firaResult.invoiceNumber}-DUP-${Date.now()}`,
              jir: firaResult.jir,
              zki: firaResult.zki,
            },
          });
        }
      }
    }

    //rounding check
    if (Math.abs(calculatedBrutto - brutto) > 0.01) {
        return res.status(400).json({ error: "Total amount mismatch." });
    }
    res.status(201).json(receipt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/receipts/:id/storno", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the original receipt
    const originalReceipt = await prisma.receipt.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!originalReceipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    // Mark original as cancelled
    await prisma.receipt.update({
      where: { id },
      data: { status: 'RACUN_STORNIRAN' },
    });

    // Create cancellation receipt with negative values and unique receipt number
    const stornoReceipt = await prisma.receipt.create({
      data: {
        invoiceNumber: `RCN-${Date.now()}`,
        status: 'STORNO',
        webshopOrderId: originalReceipt.webshopOrderId,
        webshopType: originalReceipt.webshopType,
        webshopEvent: originalReceipt.webshopEvent,
        webshopOrderNumber: originalReceipt.webshopOrderNumber,
        invoiceType: originalReceipt.invoiceType,
        paymentType: originalReceipt.paymentType,
        paymentGatewayCode: originalReceipt.paymentGatewayCode,
        paymentGatewayName: originalReceipt.paymentGatewayName,
        userId: req.user.id,
        brutto: -originalReceipt.brutto,
        netto: -originalReceipt.netto,
        taxValue: -originalReceipt.taxValue,
        currency: originalReceipt.currency,
        taxesIncluded: originalReceipt.taxesIncluded,
        dueDate: originalReceipt.dueDate,
        validTo: originalReceipt.validTo,
        billingAddressId: originalReceipt.billingAddressId,
        shippingAddressId: originalReceipt.shippingAddressId,
        customerLocale: originalReceipt.customerLocale,
        termsHR: originalReceipt.termsHR,
        termsEN: originalReceipt.termsEN,
        termsDE: originalReceipt.termsDE,
        internalNote: `STORNO of ${originalReceipt.invoiceNumber}`,
        discountValue: originalReceipt.discountValue,
        shippingCost: originalReceipt.shippingCost,
        items: {
          create: originalReceipt.items.map((item) => ({
            name: item.name,
            description: item.description,
            lineItemId: item.lineItemId,
            quantity: item.quantity,
            price: -item.price,
            taxRate: item.taxRate,
            unit: item.unit,
            articleId: item.articleId,
          })),
        },
      },
      include: { items: { include: { article: true } } },
    });

    // Create transaction for storno
    await prisma.transaction.create({
      data: {
        receiptId: stornoReceipt.id,
        userId: req.user.id,
        amount: -originalReceipt.brutto,
      },
    });

    // Fiscalize storno receipt via FIRA
    const firaResult = await handleOrderFiscalization({
      id: stornoReceipt.id,
      code: stornoReceipt.id,
      email: null,
      createdAt: stornoReceipt.createdAt,
      currency: stornoReceipt.currency,
      items: stornoReceipt.items,
    });

    if (firaResult && firaResult.invoiceNumber) {
      await prisma.receipt.update({
        where: { id: stornoReceipt.id },
        data: {
          invoiceNumber: firaResult.invoiceNumber,
          jir: firaResult.jir,
          zki: firaResult.zki,
        },
      });
      stornoReceipt.invoiceNumber = firaResult.invoiceNumber;
      stornoReceipt.jir = firaResult.jir;
      stornoReceipt.zki = firaResult.zki;
      stornoReceipt.invoiceDate = firaResult.invoiceDate;
    }

    res.json(stornoReceipt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/receipts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      invoiceNumber, 
      webshopOrderId,
      webshopType,
      webshopEvent,
      webshopOrderNumber,
      invoiceType, 
      paymentType,
      paymentGatewayCode,
      paymentGatewayName,
      brutto, 
      netto, 
      taxValue,
      currency,
      taxesIncluded,
      dueDate,
      validTo,
      billingAddress,
      shippingAddress,
      customerLocale,
      termsHR,
      termsEN,
      termsDE,
      internalNote,
      discountValue,
      shippingCost,
      items 
    } = req.body;
    
    // Create or update billing address if provided
    let billingAddressId = null;
    if (billingAddress) {
      if (billingAddress.id) {
        await prisma.billingAddress.update({
          where: { id: billingAddress.id },
          data: billingAddress,
        });
        billingAddressId = billingAddress.id;
      } else {
        const createdBillingAddress = await prisma.billingAddress.create({
          data: billingAddress,
        });
        billingAddressId = createdBillingAddress.id;
      }
    }

    // Create or update shipping address if provided
    let shippingAddressId = null;
    if (shippingAddress) {
      if (shippingAddress.id) {
        await prisma.shippingAddress.update({
          where: { id: shippingAddress.id },
          data: shippingAddress,
        });
        shippingAddressId = shippingAddress.id;
      } else {
        const createdShippingAddress = await prisma.shippingAddress.create({
          data: shippingAddress,
        });
        shippingAddressId = createdShippingAddress.id;
      }
    }
    
    // Remove old items
    await prisma.receiptItem.deleteMany({ where: { receiptId: id } });
    
    const receipt = await prisma.receipt.update({
      where: { id },
      data: {
        webshopType,
        webshopEvent,
        webshopOrderNumber,
        invoiceType,
        paymentType,
        paymentGatewayCode,
        paymentGatewayName,
        brutto,
        netto,
        taxValue,
        currency,
        taxesIncluded,
        dueDate: dueDate ? new Date(dueDate) : null,
        validTo: validTo ? new Date(validTo) : null,
        billingAddressId,
        shippingAddressId,
        customerLocale,
        termsHR,
        termsEN,
        termsDE,
        internalNote,
        discountValue,
        shippingCost,
        items: {
          create: items.map((item) => ({
            name: item.name,
            description: item.description,
            lineItemId: item.lineItemId,
            quantity: item.quantity,
            price: item.price,
            taxRate: item.taxRate,
            unit: item.unit,
            articleId: item.articleId,
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
  console.log("\n========================================");
  console.log("📍 GET /api/transactions endpoint hit");
  console.log("🔐 User:", req.user?.email || "NOT AUTHENTICATED");
  console.log("========================================");
  
  try {
    console.log("🔍 Fetching transactions from database...");
    const transactions = await prisma.transaction.findMany({
      include: { 
        receipt: { include: { items: { include: { article: true } } } },
        user: { select: { id: true, name: true, email: true } } 
      },
      orderBy: { createdAt: "desc" },
    });
    
    console.log(`✅ Successfully fetched ${transactions.length} transactions`);
    console.log("📊 First transaction sample:", JSON.stringify(transactions[0], null, 2));
    console.log("========================================\n");
    
    res.json(transactions);
  } catch (error) {
    console.error("❌ ERROR in /api/transactions endpoint:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("========================================\n");
    res.status(500).json({ error: error.message, details: error.toString() });
  }
});

// ========== SALES REPORTS API ==========
app.get("/api/reports", requireAuth, async (req, res) => {
  try {
    const reports = await prisma.salesReport.findMany({
      orderBy: { createdAt: "desc" },
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
    const { date, totalSalesAmount, invoiceCount, description } = req.body;
    const report = await prisma.salesReport.create({
      data: { date: new Date(date), totalSalesAmount, invoiceCount, description },
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
// ========== CATEGORIES API ==========
app.get("/api/categories", requireAuth, async (req, res) => {
  try {
    const { onlyActive } = req.query;
    const where = onlyActive === 'true' ? { active: true } : {};

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/categories", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
  try {
    const { name, active } = req.body;
    const category = await prisma.category.create({
      data: { name, active },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/categories/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    const category = await prisma.category.update({
      where: { id },
      data: { name, active },
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/categories/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("\n========================================");
  console.log(`Running on http://localhost:${PORT}`);
  console.log("========================================\n");
});
