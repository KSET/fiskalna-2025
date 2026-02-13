import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Serijalizacija korisnika (sprema se ID u session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserijalizacija korisnika (dohvaća se korisnik iz baze prema ID-u)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth strategija
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        console.log("Login attempt with email:", email);

        // Lista administratorskih email adresa
        const adminEmails = ["tadija75@gmail.com"];

        // Provjera je li korisnik admin ili ima @kset.org domenu
        const isAdmin = adminEmails.includes(email);
        const isKsetDomain = email.endsWith("@kset.org");

        console.log("isAdmin:", isAdmin);
        console.log("isKsetDomain:", isKsetDomain);

        // Ako nije admin i nema dozvoljenu domenu, odbij prijavu
        if (!isAdmin && !isKsetDomain) {
          console.log("Login rejected - email not allowed");
          return done(null, false, { message: "Vaš e mail nije dozvoljen" });
        }

        console.log("Login allowed");

        // Pokušaj pronaći korisnika prema Google ID-u
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        // Ako korisnik ne postoji, kreiraj ga
        if (!user) {
          console.log("Creating new user:", email);

          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email: email,
              name: profile.displayName,
              role: isAdmin ? "ADMIN" : "USER", // Postavi ADMIN ulogu ako je email na listi
            },
          });

          console.log("User created with role:", user.role);

        // Ako korisnik postoji, ali je sada na admin listi, unaprijedi ga
        } else if (isAdmin && user.role !== "ADMIN") {
          console.log("Upgrading existing user to ADMIN");

          user = await prisma.user.update({
            where: { googleId: profile.id },
            data: { role: "ADMIN" },
          });

          console.log("User upgraded to ADMIN");

        } else {
          console.log("Existing user found, role:", user.role);
        }

        done(null, user);

      } catch (error) {
        console.error("Error in Google OAuth strategy:", error.message);
        console.error("Full error:", error);
        done(error, null);
      }
    }
  )
);

export default prisma;
