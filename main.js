const APP_ID = "b3217bbfbb3e4b35ad15c0c0a1ffa9b9";
const TOKEN = "007eJxTYMjtZJq7U5hZbVGPAFsgW8Wc2XF+pYLH2QL7/58Pf7UhL0eBIcnYyNA8KSktKck41STJ2DQxxdA02SDZINEwLS3RMslypdvqtIZARoavMTFMjAwQCOKzMOQmZuYxMAAAn5ceJA==";
const CHANNEL = "main";

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};
let screenTrack; // Screen sharing track

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

let joinStream = async () => {
  await joinAndDisplayLocalStream();
  document.getElementById('join-btn').style.display = 'none';
  document.getElementById('stream-controls').style.display = 'flex';
};

let handleUserJoined = async (user, mediaType) => {
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);

  if (mediaType === 'video') {
    let player = document.getElementById(`user-container-${user.uid}`);
    if (player != null) {
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
  for (let i = 0; localTracks.length > i; i++) {
    localTracks[i].stop();
    localTracks[i].close();
  }
  if (screenTrack) {
    screenTrack.stop();
    screenTrack.close();
  }
  await client.leave();
  document.getElementById('join-btn').style.display = 'block';
  document.getElementById('stream-controls').style.display = 'none';
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
      // Start screen sharing
      try {
        screenTrack = await AgoraRTC.createScreenVideoTrack();
        let player = document.getElementById('screen-container');
        if (player != null) {
          player.remove();
        }
        player = `<div class="video-container" id="screen-container">
                    <div class="video-player" id="screen-player"></div>
                  </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
        screenTrack.play('screen-player');
        await client.publish(screenTrack);
        screenTrack.on("track-ended", () => {
          stopScreenShare();
        });
        document.getElementById('screenshare-btn').innerText = 'Stop Screen Share';
        document.getElementById('screenshare-btn').style.backgroundColor = '#EE4B2B';
      } catch (err) {
        console.error("Screen sharing failed", err);
      }
    } else {
      // Stop screen sharing
      stopScreenShare();
    }
  };
  
  let stopScreenShare = async () => {
    screenTrack.stop();
    screenTrack.close();
    await client.unpublish(screenTrack);
    document.getElementById('screen-container').remove();
    screenTrack = null;
    document.getElementById('screenshare-btn').innerText = 'Share Screen';
    document.getElementById('screenshare-btn').style.backgroundColor = 'cadetblue';
  };
  

document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('screenshare-btn').addEventListener('click', toggleScreenShare);
