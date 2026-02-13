export default function requireAuth(req, res, next) {
  console.log(`🔐 requireAuth middleware: ${req.method} ${req.path}`);
  console.log(`   Authenticated: ${req.isAuthenticated()}`);
  console.log(`   User: ${req.user?.email || "NONE"}`);
  
  if (!req.isAuthenticated()) {
    console.error(`   ❌ REJECTED - Not authenticated`);
    return res.status(401).json({ error: "Unauthorized" });
  }
  console.log(`   ✅ ALLOWED - User authenticated`);
  next();
}
