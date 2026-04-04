const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists by email
    let user = await User.findOne({ email: profile.emails[0].value });

    if (!user) {
      // Create new user from Google profile
      user = await User.create({
        name: profile.displayName || profile.name.givenName,
        email: profile.emails[0].value,
        google_id: profile.id,
        password: Math.random().toString(36).slice(-12), // Random password for OAuth users
        role: 'user',
        avatar_url: profile.photos[0]?.value
      });
    } else if (!user.google_id) {
      // Link existing user to Google
      user.google_id = profile.id;
      if (!user.avatar_url && profile.photos[0]?.value) {
        user.avatar_url = profile.photos[0].value;
      }
      await user.save();
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

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
