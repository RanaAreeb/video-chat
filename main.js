const APP_ID = "b3217bbfbb3e4b35ad15c0c0a1ffa9b9";
const SERVER_URL = "https://video-chat-production-f3f1.up.railway.app";

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

// Handling local user's video and screen sharing
let joinAndDisplayLocalStream = async () => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    let UID = await client.join(APP_ID, CHANNEL, TOKEN, null);
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

    let player = `
        <div class="video-container" id="user-container-${UID}">
            <div class="video-player" id="user-${UID}"></div>
            <button class="fullscreen-btn" onclick="toggleFullScreen('user-container-${UID}')">
                <i class="fas fa-expand"></i>
            </button>
        </div>`;
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    localTracks[1].play(`user-${UID}`);
    await client.publish([localTracks[0], localTracks[1]]);
};

// Fullscreen toggle function
function toggleFullScreen(elementId) {
    let elem = document.getElementById(elementId);

    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen(); // Firefox
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen(); // Chrome, Safari, and Opera
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen(); // IE/Edge
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen(); // Firefox
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen(); // Chrome, Safari, and Opera
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen(); // IE/Edge
        }
    }
}

// Example implementation for handling user-joined event and adding fullscreen button
let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player) {
            player.remove();
        }

        player = `
            <div class="video-container" id="user-container-${user.uid}">
                <div class="video-player" id="user-${user.uid}"></div>
                <button class="fullscreen-btn" onclick="toggleFullScreen('user-container-${user.uid}')">
                    <i class="fas fa-expand"></i>
                </button>
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
    let icon = e.target.querySelector('i');

    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false);
        if (icon) {
            icon.classList.remove('fa-microphone-slash');
            icon.classList.add('fa-microphone');
        }
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[0].setMuted(true);
        if (icon) {
            icon.classList.remove('fa-microphone');
            icon.classList.add('fa-microphone-slash');
        }
        e.target.style.backgroundColor = '#EE4B2B';
    }
};

let toggleCamera = async (e) => {
    let icon = e.target.querySelector('i');

    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false);
        if (icon) {
            icon.classList.remove('fa-video-slash');
            icon.classList.add('fa-video');
        }
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        await localTracks[1].setMuted(true);
        if (icon) {
            icon.classList.remove('fa-video');
            icon.classList.add('fa-video-slash');
        }
        e.target.style.backgroundColor = '#EE4B2B';
    }
};

let toggleScreenShare = async (e) => {
    let icon = e.target.querySelector('i');

    if (!screenTrack) {
        // Unpublish and stop the camera track
        if (localTracks[1]) {
            await client.unpublish(localTracks[1]);
            localTracks[1].stop();
        }

        // Create and publish the screen track
        try {
            screenTrack = await AgoraRTC.createScreenVideoTrack({ cursor: "always" });
            screenTrack.play(`user-${client.uid}`);
            await client.publish(screenTrack);
        } catch (error) {
            console.error("Error starting screen sharing:", error);
            alert("Screen sharing is not supported on this device or browser.");
            return;
        }

        icon.classList.remove('fa-desktop');
        icon.classList.add('fa-stop');
        e.target.style.backgroundColor = 'cadetblue';
    } else {
        // Stop and close the screen track
        screenTrack.stop();
        screenTrack.close();
        await client.unpublish(screenTrack);
        screenTrack = null;

        // Republish and play the camera track
        if (localTracks[1]) {
            await client.publish(localTracks[1]);
            localTracks[1].play(`user-${client.uid}`);
        }

        icon.classList.remove('fa-stop');
        icon.classList.add('fa-desktop');
        e.target.style.backgroundColor = '';
    }
};

document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('screenshare-btn').addEventListener('click', toggleScreenShare);
