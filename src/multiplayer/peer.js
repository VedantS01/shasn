/**
 * peer.js — WebRTC primitives for browser-only LAN multiplayer.
 *
 * All functions are browser-only (they depend on RTCPeerConnection).
 * Importing this module in Node.js (e.g. during tests) is safe — the functions
 * are defined but will throw at call-time if RTCPeerConnection is not available.
 *
 * SDP exchange is manual: the host generates an offer, the joiner generates an
 * answer; both sides paste the base64-encoded SDP string into the UI.
 *
 * ICE strategy: wait for gathering to complete (onicegatheringstatechange →
 * "complete") before returning the local description. This bundles all
 * candidates into the SDP so no separate candidate trickle is required.
 * No STUN servers are configured — mDNS handles LAN-local addressing.
 *
 * // WebRTC connection tested manually in browser.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeSdp(descriptionObj) {
  return btoa(JSON.stringify({ type: descriptionObj.type, sdp: descriptionObj.sdp }));
}

function decodeSdp(b64) {
  return JSON.parse(atob(b64));
}

function waitForIceComplete(pc) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    function check() {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    }
    pc.addEventListener("icegatheringstatechange", check);
  });
}

function makePeerConnection() {
  // No STUN — rely on mDNS candidates for LAN-local addressing.
  return new RTCPeerConnection({ iceServers: [] });
}

function wireDataChannel(dc, onMessage) {
  dc.binaryType = "arraybuffer";
  if (onMessage) {
    dc.addEventListener("message", (ev) => {
      try {
        onMessage(JSON.parse(ev.data));
      } catch {
        // Ignore malformed messages.
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------------

/**
 * createHostPeer(onMessage)
 *
 * Creates an RTCPeerConnection on the host side for one client seat.
 * Returns { pc, dataChannel, offerSdpPromise }.
 *
 * offerSdpPromise resolves to a base64 string encoding { type: "offer", sdp }.
 * Pass this string to the joiner; they will return an answer string that you
 * feed to acceptClientAnswer().
 *
 * @param {function(object): void} onMessage  called with each parsed JSON message from the client
 */
export function createHostPeer(onMessage) {
  const pc = makePeerConnection();
  const dc = pc.createDataChannel("game", { ordered: true });
  wireDataChannel(dc, onMessage);

  const offerSdpPromise = pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .then(() => waitForIceComplete(pc))
    .then(() => encodeSdp(pc.localDescription));

  return { pc, dataChannel: dc, offerSdpPromise };
}

/**
 * acceptClientAnswer(pc, answerB64)
 *
 * Host-side: apply the client's answer SDP after receiving it from the joiner.
 *
 * @param {RTCPeerConnection} pc
 * @param {string} answerB64  base64-encoded { type: "answer", sdp }
 */
export async function acceptClientAnswer(pc, answerB64) {
  const desc = decodeSdp(answerB64);
  await pc.setRemoteDescription(new RTCSessionDescription(desc));
}

// ---------------------------------------------------------------------------
// Client (joiner) side
// ---------------------------------------------------------------------------

/**
 * createClientPeer(offerB64, onMessage)
 *
 * Joiner side: take the host's offer SDP, create an answer, and return it.
 * Returns { pc, dataChannel, answerSdpPromise }.
 *
 * answerSdpPromise resolves to a base64 string encoding { type: "answer", sdp }.
 * Send this string back to the host so they can call acceptClientAnswer().
 *
 * dataChannel is the RTCDataChannel opened by the host; it becomes available
 * when the host peer triggers ondatachannel on the remote side.
 *
 * @param {string} offerB64  base64-encoded { type: "offer", sdp }
 * @param {function(object): void} onMessage  called with each parsed JSON message from the host
 */
export function createClientPeer(offerB64, onMessage) {
  const pc = makePeerConnection();

  // The data channel is created by the host; the client receives it via ondatachannel.
  let resolveChannel;
  const channelPromise = new Promise((res) => { resolveChannel = res; });

  pc.addEventListener("datachannel", (ev) => {
    const dc = ev.channel;
    wireDataChannel(dc, onMessage);
    resolveChannel(dc);
  });

  const answerSdpPromise = (async () => {
    const offer = decodeSdp(offerB64);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceComplete(pc);
    return encodeSdp(pc.localDescription);
  })();

  // Expose a promise that resolves to the data channel once it's wired.
  // Callers that need to send messages should await dataChannelPromise.
  return { pc, dataChannelPromise: channelPromise, answerSdpPromise };
}
