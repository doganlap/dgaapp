const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const { query } = require('./database');
const { v4: uuidv4 } = require('uuid');

passport.use(
  new OIDCStrategy(
    {
      identityMetadata: process.env.AZURE_AD_IDENTITY_METADATA,
      clientID: process.env.AZURE_AD_CLIENT_ID,
      responseType: 'code id_token',
      responseMode: 'form_post',
      redirectUrl: process.env.AZURE_AD_REDIRECT_URI,
      allowHttpForRedirectUrl: true,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      scope: ['profile', 'email', 'openid'],
      passReqToCallback: true,
    },
    async (req, iss, sub, profile, accessToken, refreshToken, done) => {
      try {
        const email = profile.upn || profile._json.email;
        if (!email) {
          return done(new Error('No email found in profile'));
        }

        let userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
        let user = userResult.rows[0];

        if (!user) {
          // Create a new user if they don't exist
          const newUser = {
            id: uuidv4(),
            email: email,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
            sso_provider: 'azure_ad',
            sso_provider_id: sub,
            status: 'active',
          };

          const creationResult = await query(
            'INSERT INTO users (id, email, first_name, last_name, sso_provider, sso_provider_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [newUser.id, newUser.email, newUser.first_name, newUser.last_name, newUser.sso_provider, newUser.sso_provider_id, newUser.status]
          );
          user = creationResult.rows[0];
        } else {
          // Update existing user with SSO details if they don't have them
          if (!user.sso_provider_id) {
            await query('UPDATE users SET sso_provider = $1, sso_provider_id = $2 WHERE id = $3', ['azure_ad', sub, user.id]);
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

module.exports = passport;
