export const signaling = {
  connect() {
    console.log("connect signaling");
  },

  disconnect() {
    console.log("disconnect signaling");
  },

  sendOffer(offer: RTCSessionDescriptionInit) {
    console.log("send offer", offer);
  },

  sendAnswer(answer: RTCSessionDescriptionInit) {
    console.log("send answer", answer);
  },

  sendIceCandidate(candidate: RTCIceCandidate) {
    console.log("send ice", candidate);
  },
};
