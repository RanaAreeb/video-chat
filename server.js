const express = require('express');
const cors = require('cors'); // Import cors
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const app = express();
const port = 3000; // Ensure this port is free and not in use by other services

const APP_ID = 'b3217bbfbb3e4b35ad15c0c0a1ffa9b9'; // Replace with your Agora App ID
const APP_CERTIFICATE = '0396aa11696045adaaf4d305efdbded0'; // Replace with your Agora App Certificate

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
    console.log(`Server running at http://127.0.0.1:${port}`);
});
