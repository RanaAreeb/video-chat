const express = require('express');
const cors = require('cors');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
require('dotenv').config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3000;

const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;


// Enable CORS for all origins
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Handle token requests
app.get('/rtc/:channelName/publisher/uid/:uid', (req, res) => {
    const channelName = req.params.channelName;
    const uid = parseInt(req.params.uid);

    const role = RtcRole.PUBLISHER;
    const expireTime = 3600; // Token expiration time in seconds
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTime + expireTime;

    // Generate the token
    const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);

    // Send the token as JSON response
    res.json({ rtcToken: token });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
