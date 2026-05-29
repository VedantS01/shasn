/**
 * host.js — HostRoom: holds canonical game state, runs all reducers,
 * broadcasts filtered views to each connected peer, and exposes its
 * own (host-player) view via getOwnView().
 *
 * The host is always Player 0 (seat 0).
 * Each connected peer is assigned the next available seat (1, 2, …).
 */

import { createGame } from "../engine/state.js";
import * as A from "../engine/actions.js";
import { viewState } from "./privacy.js";

const REDUCERS = {
  answerDilemma:     A.answerDilemma,
  spinDilemma:       A.spinDilemma,
  drawExtraDilemma:  A.drawExtraDilemma,
  doneReadAloud:     A.doneReadAloud,
  endTurn:           A.endTurn,
  passBetweenTurns:  A.passBetweenTurns,
  donePendingPlace:  A.donePendingPlace,
  discardResources:  A.discardResources,
  buyVoteBank:       A.buyVoteBank,
  placeToken:        A.placeToken,
  gerrymander:       A.gerrymander,
  buyVoter:          A.buyVoter,
  buyConspiracy:     A.buyConspiracy,
  playConspiracy:    A.playConspiracy,
  openMarket:        A.openMarket,
  landGrab:          A.landGrab,
  donations:         A.donations,
  civilDisobedience: A.civilDisobedience,
  targetedMarketing: A.targetedMarketing,
  usePower:          A.usePower,
  proposeTrade:      A.proposeTrade,
  respondTrade:      A.respondTrade,
  proposeCoalition:  A.proposeCoalition,
  respondCoalition:  A.respondCoalition,
  withdrawCoalition: A.withdrawCoalition,
  draftResource:     A.draftResource,
};

export class HostRoom {
  /**
   * @param {{ players: Array<{name:string,color:string}>, seed?: number, mapId?: string }} opts
   */
  constructor({ players, seed, mapId }) {
    this.state = createGame({ players, seed, mapId });
    /** @type {Map<string, {pc: RTCPeerConnection, dataChannel: RTCDataChannel, playerId: number}>} */
    this.peers = new Map();
    /** @type {Array<function(object):void>} */
    this.listeners = [];
    /** Next available seat index for incoming peers (host takes 0). */
    this._nextSeat = 1;
  }

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  /** Register a callback invoked after every state mutation. */
  onStateChange(fn) {
    this.listeners.push(fn);
  }

  _notifyListeners() {
    for (const fn of this.listeners) {
      try { fn(this.state); } catch { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------------------
  // State views
  // ---------------------------------------------------------------------------

  /** Filtered state for the host (Player 0). */
  getOwnView() {
    return viewState(this.state, 0);
  }

  /** Filtered state for a specific playerId. */
  viewFor(playerId) {
    return viewState(this.state, playerId);
  }

  // ---------------------------------------------------------------------------
  // Action dispatch
  // ---------------------------------------------------------------------------

  /**
   * Run an action from the given playerId and re-broadcast filtered views.
   * @param {number} playerId
   * @param {string} action
   * @param {object} payload
   */
  dispatchFrom(playerId, action, payload = {}) {
    // Special: newGame / draft handled separately; skip unknown actions gracefully.
    const fn = REDUCERS[action];
    if (!fn) {
      // Unknown action — no-op (could log or throw for debugging).
      return;
    }
    this.state = fn(this.state, payload);
    this._broadcast();
    this._notifyListeners();
  }

  /**
   * Broadcast the filtered view to every connected peer's data channel.
   * The host's own view is NOT sent here — the host reads it via getOwnView().
   */
  _broadcast() {
    for (const [, peer] of this.peers) {
      if (peer.dataChannel.readyState === "open") {
        const filtered = viewState(this.state, peer.playerId);
        peer.dataChannel.send(JSON.stringify({ type: "state", state: filtered }));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Peer management
  // ---------------------------------------------------------------------------

  /**
   * Attach a newly-connected client peer.
   * Assigns the next available seat, wires up message handling, and immediately
   * sends the client their initial filtered state.
   *
   * @param {{ peerId: string, pc: RTCPeerConnection, dataChannel: RTCDataChannel }} peer
   * @returns {number} assigned playerId
   */
  attachClient({ peerId, pc, dataChannel }) {
    const playerId = this._nextSeat++;
    this.peers.set(peerId, { pc, dataChannel, playerId });

    // Handle incoming actions from this client.
    dataChannel.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "action") {
          this.dispatchFrom(playerId, msg.action, msg.payload || {});
        }
      } catch { /* ignore malformed */ }
    });

    // Handle disconnection.
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        this.peers.delete(peerId);
        this._notifyListeners();
      }
    });

    // Send initial state snapshot to the newly connected peer.
    if (dataChannel.readyState === "open") {
      const filtered = viewState(this.state, playerId);
      dataChannel.send(JSON.stringify({ type: "state", state: filtered }));
    } else {
      dataChannel.addEventListener("open", () => {
        const filtered = viewState(this.state, playerId);
        dataChannel.send(JSON.stringify({ type: "state", state: filtered }));
      }, { once: true });
    }

    return playerId;
  }

  /** Number of currently connected peers (not counting the host). */
  get peerCount() {
    return this.peers.size;
  }
}
