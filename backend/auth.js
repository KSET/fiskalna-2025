import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      hd: "kset.org",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const adminEmails = ["tadija75@gmail.com", "lorenaivanisevic@gmail.com", "pavle.ergovic@kset.org"];
        const isAdmin = adminEmails.includes(email);

        console.log("Login attempt:", email, "| Is Admin List:", isAdmin);

        let user = await prisma.user.findUnique({
          where: { email: email },
        });

        if (!user) {
          if (isAdmin) {
            console.log("Auto-creating admin account for:", email);
            user = await prisma.user.create({
              data: {
                googleId: profile.id,
                email: email,
                name: profile.displayName,
                role: "ADMIN",
              },
            });
          } else {
            console.log("Login rejected - User not in DB and not an admin:", email);
            return done(null, false, { message: "Vaš račun nije registriran. Kontaktirajte admina." });
          }
        }

        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: profile.id },
          });
        }

        if (isAdmin && user.role !== "ADMIN") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
        }

        if (user.role === "X") {
          return done(null, false, { message: "Vaš račun je blokiran." });
        }

        return done(null, user);

      } catch (error) {
        console.error("Error in Google OAuth strategy:", error);
        return done(error, null);
      }
    }
  )
);

export default prisma;