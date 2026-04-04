const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth is disabled because GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.');
} else {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists by email
      const email = profile.emails[0]?.value?.toLowerCase();
      if (!email) return done(new Error('Google profile has no email'), null);

      let user = await User.findOne({ email });

      if (!user) {
        // Create new user from Google profile
        user = await User.create({
          name: profile.displayName || profile.name?.givenName,
          email,
          google_id: profile.id,
          password: Math.random().toString(36).slice(-12), // Random password for OAuth users
          role: 'user',
          avatar_url: profile.photos?.[0]?.value || null
        });
      } else if (!user.google_id) {
        user.google_id = profile.id;
        if (!user.avatar_url && profile.photos?.[0]?.value) {
          user.avatar_url = profile.photos[0].value;
        }
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}


passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
