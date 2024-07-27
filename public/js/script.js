const socket = io();

let local;
let peerConnection;
let isCameraOn = true;
let isMicOn = true;

const rtcSettings = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const initialize = async () => {
  socket.on("signalingMessage", handleSignalingMessage);

  local = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });

  document.querySelector("#localVideo").srcObject = local;

  document.getElementById("cameraButton").addEventListener("click", toggleCamera);
  document.getElementById("micButton").addEventListener("click", toggleMic);

  // Set initial button states
  document.getElementById("cameraButton").classList.add("on");
  document.getElementById("micButton").classList.add("on");

  initiateOffer();
};

const initiateOffer = async () => {
  await createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signalingMessage', JSON.stringify({ type: "offer", offer }));
};

const createPeerConnection = async () => {
  peerConnection = new RTCPeerConnection(rtcSettings);

  let remoteMediaStream = new MediaStream();
  document.querySelector("#remoteVideo").srcObject = remoteMediaStream;

  document.querySelector("#remoteVideo").style.display = "block";
  document.querySelector("#localVideo").classList.add("small-frame");

  local.getTracks().forEach(track => {
    peerConnection.addTrack(track, local);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => remoteMediaStream.addTrack(track));
  };

  peerConnection.onicecandidate = (event) => {
    event.candidate && socket.emit("signalingMessage", JSON.stringify({
      type: "candidate",
      candidate: event.candidate
    }));
  };
};

const handleSignalingMessage = async (message) => {
  const { type, offer, answer, candidate } = JSON.parse(message);

  if (type === "offer") handleOffer(offer);
  if (type === "answer") handleAnswer(answer);
  if (type === "candidate" && peerConnection) {
    await peerConnection.addIceCandidate(candidate);
  }
};

const handleOffer = async (offer) => {
  await createPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('signalingMessage', JSON.stringify({ type: "answer", answer }));
};

const handleAnswer = async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  onConnectionEstablished();
};

const toggleCamera = () => {
  isCameraOn = !isCameraOn;
  local.getVideoTracks()[0].enabled = isCameraOn;
  const cameraButton = document.getElementById("cameraButton");
  if (isCameraOn) {
    cameraButton.classList.remove("off");
    cameraButton.classList.add("on");
  } else {
    cameraButton.classList.remove("on");
    cameraButton.classList.add("off");
  }
};

const toggleMic = () => {
  isMicOn = !isMicOn;
  local.getAudioTracks()[0].enabled = isMicOn;
  const micButton = document.getElementById("micButton");
  if (isMicOn) {
    micButton.classList.remove("off");
    micButton.classList.add("on");
  } else {
    micButton.classList.remove("on");
    micButton.classList.add("off");
  }
};

// Timer functionality
let seconds = 0;
let minutes = 0;
let hours = 0;
let timerInterval;

function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    seconds++;
    if (seconds == 60) {
        seconds = 0;
        minutes++;
        if (minutes == 60) {
            minutes = 0;
            hours++;
        }
    }
    
    document.getElementById('timer').textContent = 
        (hours ? (hours > 9 ? hours : "0" + hours) + ":" : "") +
        (minutes > 9 ? minutes : "0" + minutes) + ":" +
        (seconds > 9 ? seconds : "0" + seconds);
}

function onCallStart() {
    startTimer();
}

// End call functionality
document.getElementById('endCallButton').addEventListener('click', endCall);

function endCall() {
    clearInterval(timerInterval);
    alert('Call ended');
    // Add your logic to end the call here
    // You might want to redirect to a different page or reset the UI
}

function onConnectionEstablished() {
    document.getElementById('remoteName').textContent = 'Connected';
    onCallStart();
}

initialize();