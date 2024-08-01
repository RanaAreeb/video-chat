const APP_ID = "b3217bbfbb3e4b35ad15c0c0a1ffa9b9";
const SERVER_URL = "http://127.0.0.1:3000";

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};
let screenTrack;
let CHANNEL;
let TOKEN;

const fetchToken = async (channelName) => {
    try {
        const response = await fetch(`${SERVER_URL}/rtc/${channelName}/publisher/uid/0`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.rtcToken;
    } catch (error) {
        console.error("Failed to fetch token:", error);
        alert("Failed to fetch token. Please check the console for details.");
    }
};

document.getElementById('channel-btn').addEventListener('click', async () => {
    const channelName = document.getElementById('channel-name').value;
    if (channelName) {
        TOKEN = await fetchToken(channelName);
        if (TOKEN) {
            CHANNEL = channelName;
            await joinStream();
        }
    } else {
        alert("Please enter a channel name.");
    }
});

let joinStream = async () => {
    try {
        await joinAndDisplayLocalStream();
        document.getElementById('login-wrapper').style.display = 'none';
        document.getElementById('stream-wrapper').style.display = 'block';
    } catch (error) {
        console.error("Failed to join stream:", error);
        alert("Failed to join stream. Please check the console for details.");
    }
};

let joinAndDisplayLocalStream = async () => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    let UID = await client.join(APP_ID, CHANNEL, TOKEN, null);
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

    let player = `<div class="video-container" id="user-container-${UID}">
                    <div class="video-player" id="user-${UID}"></div>
                  </div>`;
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    localTracks[1].play(`user-${UID}`);
    await client.publish([localTracks[0], localTracks[1]]);
};

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player) {
            player.remove();
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                    <div class="video-player" id="user-${user.uid}"></div>
                 </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
};

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();
};

let leaveAndRemoveLocalStream = async () => {
    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.leave();
    document.getElementById('login-wrapper').style.display = 'block';
    document.getElementById('stream-wrapper').style.display = 'none';
    document.getElementById('video-streams').innerHTML = '';
};

let toggleMic = async (e) => {
    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false);
        e.target.innerText = 'Mic on';
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[0].setMuted(true);
        e.target.innerText = 'Mic off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
};

let toggleCamera = async (e) => {
    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false);
        e.target.innerText = 'Camera on';
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[1].setMuted(true);
        e.target.innerText = 'Camera off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
};

let toggleScreenShare = async () => {
    if (!screenTrack) {
        screenTrack = await AgoraRTC.createScreenVideoTrack();
        let player = `<div class="video-container" id="screen-share-container">
                        <div class="video-player" id="screen-share"></div>
                     </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
        screenTrack.play('screen-share');
        await client.publish(screenTrack);
    } else {
        screenTrack.stop();
        screenTrack.close();
        document.getElementById('screen-share-container').remove();
        screenTrack = null;
        await client.unpublish(screenTrack);
    }
};

document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('screenshare-btn').addEventListener('click', toggleScreenShare);
