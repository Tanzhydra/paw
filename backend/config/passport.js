const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

// Debug info
console.log('Initializing Passport with Google Strategy');
console.log('Callback URL:', process.env.GOOGLE_CALLBACK_URL);

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google callback received:', {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName
      });

      const userEmail = profile.emails[0].value;
      let user = await User.findOne({ email: userEmail });
      
      // --- BAGIAN YANG DIPERBAIKI (AUTO REGISTER) ---
      if (!user) {
        console.log('User tidak ditemukan, membuat akun baru otomatis...');
        
        // Buat username dari nama google (hapus spasi, tambah angka acak biar unik)
        const cleanName = profile.displayName.replace(/\s+/g, '').toLowerCase();
        const randomSuffix = Math.floor(Math.random() * 1000);
        
        user = await User.create({
            email: userEmail,
            googleId: profile.id,
            username: `${cleanName}${randomSuffix}`, // Contoh: fatanmakhsani123
            photo: profile.photos[0]?.value,
            role: 'user', // Default role user baru
            // Password dummy karena login via Google (pastikan model User membolehkan ini)
            password: 'GOOGLE_LOGIN_' + Date.now() 
        });
        
        console.log('User baru berhasil dibuat:', user.email);
      } else {
        console.log('User lama ditemukan:', user.email);
      }
      // ----------------------------------------------

      // Update data user (jika foto/googleId berubah)
      user.googleId = profile.id;
      if (profile.photos[0]?.value) {
          user.photo = profile.photos[0].value;
      }
      
      await user.save();
      console.log('User ready for token generation:', user.username);
      return done(null, user);

    } catch (error) {
      console.error('Error in Google Strategy:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;
