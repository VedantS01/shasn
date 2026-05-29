/**
 * client.js — ClientLink: receives filtered state from the host over a
 * WebRTC data channel and exposes a dispatch() that sends action messages
 * back to the host.
 *
 * The client-side UI treats the received state as if it were the local engine
 * state — it renders normally without knowing it is remote.
 */

export class ClientLink {
  /**
   * @param {RTCDataChannel} dataChannel  the data channel connected to the host
   */
  constructor(dataChannel) {
    this.dataChannel = dataChannel;
    /** @type {object|null} Latest filtered state received from host. */
    this.state = null;
    /** @type {Array<function(object):void>} */
    this._listeners = [];

    dataChannel.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "state") {
          this.state = msg.state;
          this._notify();
        }
      } catch { /* ignore malformed */ }
    });
  }

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  /** Register a callback invoked whenever new state arrives. */
  onStateChange(fn) {
    this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(this.state); } catch { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Action dispatch
  // ---------------------------------------------------------------------------

  /**
   * Send an action to the host for processing.
   * The host runs the reducer and broadcasts the updated state back.
   *
   * @param {string} action
   * @param {object} [payload={}]
   */
  dispatch(action, payload = {}) {
    if (this.dataChannel.readyState !== "open") {
      throw new Error("ClientLink: data channel is not open");
    }
    this.dataChannel.send(JSON.stringify({ type: "action", action, payload }));
  }
}
