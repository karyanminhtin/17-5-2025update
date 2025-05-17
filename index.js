// Import required dependencies
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const {
  RtcTokenBuilder,
  RtcRole,
} = require('agora-access-token');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app and configuration constants
const app = express();
const PORT = process.env.PORT || 8080;
const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;
const APP_DOMAIN = process.env.APP_DOMAIN;
const LOCAL_HOST = process.env.LOCAL_HOST;

// CORS Configuration
const allowedOrigins = [
  APP_DOMAIN,
  LOCAL_HOST // For development
];
console.log(allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors());

/**
 * Middleware to prevent caching of responses
 * This ensures tokens are always generated fresh
 */
const nocache = (_, resp, next) => {
  resp.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  resp.header('Expires', '-1');
  resp.header('Pragma', 'no-cache');
  next();
};

/**
 * Simple health check endpoint
 */
const ping = (req, resp) => {
  resp.send({ message: 'pong' });
};

const generateRTCToken = (req, resp) => {

  // get channel name
  const channelName = req.params.channel;
  if (!channelName) {
    return resp.status(400).json({ error: 'channel is required' });
  }
  // get uid
  let uid = req.params.uid;
  if (!uid || uid === '') {
    return resp.status(400).json({ error: 'uid is required' });
  }
  // get role
  let role;
  if (req.params.role === 'publisher') {
    role = RtcRole.PUBLISHER;
  } else if (req.params.role === 'audience') {
    role = RtcRole.SUBSCRIBER;
  } else {
    return resp.status(400).json({ error: 'role is incorrect' });
  }
  // get the expire time
  let expireTime = req.query.expiry;
  if (!expireTime || expireTime === '') {
    expireTime = 3600;
  } else {
    expireTime = parseInt(expireTime, 10);
  }
  // calculate privilege expire time
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;
  // build the token
  let token;
  if (req.params.tokentype === 'userAccount') {
    token = RtcTokenBuilder.buildTokenWithAccount(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpireTime
    );
  } else if (req.params.tokentype === 'uid') {
    token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpireTime
    );
  } else {
    return resp.status(400).json({ error: 'token type is invalid' });
  }
  // return the token
  return resp.json({ rtcToken: token });
};

// Define API endpoints
app.get('/ping', nocache, ping);
app.get('/rtc/:channel/:role/:tokentype/:uid', nocache, generateRTCToken); // Endpoint for RTC token generation

// Start the server
app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});

// Export the app for testing
module.exports = app;
