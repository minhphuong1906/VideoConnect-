import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { storage } from "./storage";

const callbackURL =
  process.env.GOOGLE_CALLBACK_URL ??
  "http://localhost:5000/api/auth/google/callback";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      callbackURL,
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value ?? `google-${profile.id}@local`;
        const user = await storage.upsertGoogleUser({
          googleId: profile.id,
          email,
          displayName: profile.displayName || email,
          avatarUrl: profile.photos?.[0]?.value ?? null,
        });

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

export default passport;
