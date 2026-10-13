export type VoiceStatus =
  | 'off'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'denied'
  | 'unsupported'

export type PeerVoiceState = { inVoice: boolean; muted: boolean }

type Send = (event: string, payload: Record<string, unknown>) => void

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
]
const CONNECT_TIMEOUT_MS = 20_000

export function voiceSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof RTCPeerConnection !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

/**
 * One-to-one voice between the two seats of an online room. Audio flows directly between
 * the players' devices; the table channel only carries the connection setup messages.
 * The host always makes the offer, so both sides never offer at the same time.
 */
export class VoiceLink {
  private local: MediaStream | null = null
  private pc: RTCPeerConnection | null = null
  private pendingIce: RTCIceCandidateInit[] = []
  private timeout: number | null = null
  private muted = false
  private peer: PeerVoiceState = { inVoice: false, muted: false }
  private status: VoiceStatus = 'off'

  constructor(
    private readonly options: {
      isHost: boolean
      send: Send
      onStatus: (status: VoiceStatus) => void
      onRemoteStream: (stream: MediaStream | null) => void
      onPeer: (peer: PeerVoiceState) => void
    },
  ) {}

  get inVoice(): boolean {
    return this.local !== null
  }

  async join(): Promise<void> {
    if (this.local) return
    if (!voiceSupported()) {
      this.setStatus('unsupported')
      return
    }
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      this.setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed')
      return
    }
    this.applyMute()
    this.setStatus('waiting')
    this.options.send('voice-join', { muted: this.muted })
  }

  leave(notify = true): void {
    if (notify && this.local) this.options.send('voice-leave', {})
    this.closePeer()
    this.local?.getTracks().forEach((track) => track.stop())
    this.local = null
    this.setStatus('off')
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyMute()
    if (this.local) this.options.send('voice-mute', { muted })
  }

  /** Re-announce after the table channel reconnects so the other seat can re-offer. */
  resync(): void {
    if (this.local) this.options.send('voice-join', { muted: this.muted })
  }

  async handle(event: string, payload: Record<string, unknown>): Promise<void> {
    switch (event) {
      case 'voice-join':
        this.setPeer({ inVoice: true, muted: payload.muted === true })
        if (!this.local) return
        if (this.options.isHost) {
          await this.startCall()
        } else if (payload.echo !== true) {
          this.options.send('voice-join', { muted: this.muted, echo: true })
        }
        return
      case 'voice-leave':
        this.setPeer({ inVoice: false, muted: false })
        this.closePeer()
        if (this.local) this.setStatus('waiting')
        return
      case 'voice-mute':
        this.setPeer({ ...this.peer, muted: payload.muted === true })
        return
      case 'voice-offer':
        if (!this.local || this.options.isHost) return
        await this.answer(payload.sdp as RTCSessionDescriptionInit)
        return
      case 'voice-answer':
        if (!this.pc || this.pc.signalingState !== 'have-local-offer') return
        await this.pc.setRemoteDescription(payload.sdp as RTCSessionDescriptionInit)
        await this.flushIce()
        return
      case 'voice-ice': {
        const candidate = payload.candidate as RTCIceCandidateInit | undefined
        if (!candidate) return
        if (this.pc?.remoteDescription) {
          await this.pc.addIceCandidate(candidate).catch(() => undefined)
        } else {
          this.pendingIce.push(candidate)
        }
        return
      }
    }
  }

  private async startCall(): Promise<void> {
    const pc = this.createPeer()
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    this.options.send('voice-offer', { sdp: pc.localDescription?.toJSON() })
  }

  private async answer(offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.createPeer()
    await pc.setRemoteDescription(offer)
    await this.flushIce()
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    this.options.send('voice-answer', { sdp: pc.localDescription?.toJSON() })
  }

  private createPeer(): RTCPeerConnection {
    this.closePeer()
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.pc = pc
    this.local?.getTracks().forEach((track) => pc.addTrack(track, this.local as MediaStream))
    pc.onicecandidate = (event) => {
      if (event.candidate) this.options.send('voice-ice', { candidate: event.candidate.toJSON() })
    }
    pc.ontrack = (event) => {
      this.options.onRemoteStream(event.streams[0] ?? new MediaStream([event.track]))
    }
    pc.onconnectionstatechange = () => {
      if (pc !== this.pc) return
      if (pc.connectionState === 'connected') {
        this.clearTimeout()
        this.setStatus('connected')
      } else if (pc.connectionState === 'failed') {
        this.clearTimeout()
        this.setStatus('failed')
      } else if (pc.connectionState === 'disconnected') {
        this.setStatus('connecting')
      }
    }
    this.setStatus('connecting')
    this.clearTimeout()
    this.timeout = window.setTimeout(() => {
      if (pc === this.pc && pc.connectionState !== 'connected') this.setStatus('failed')
    }, CONNECT_TIMEOUT_MS)
    return pc
  }

  private async flushIce(): Promise<void> {
    const queued = this.pendingIce
    this.pendingIce = []
    for (const candidate of queued) {
      await this.pc?.addIceCandidate(candidate).catch(() => undefined)
    }
  }

  private closePeer(): void {
    this.clearTimeout()
    this.pendingIce = []
    if (this.pc) {
      this.pc.onicecandidate = null
      this.pc.ontrack = null
      this.pc.onconnectionstatechange = null
      this.pc.close()
      this.pc = null
    }
    this.options.onRemoteStream(null)
  }

  private clearTimeout(): void {
    if (this.timeout) window.clearTimeout(this.timeout)
    this.timeout = null
  }

  private applyMute(): void {
    this.local?.getAudioTracks().forEach((track) => {
      track.enabled = !this.muted
    })
  }

  private setStatus(status: VoiceStatus): void {
    if (this.status === status) return
    this.status = status
    this.options.onStatus(status)
  }

  private setPeer(peer: PeerVoiceState): void {
    this.peer = peer
    this.options.onPeer(peer)
  }
}
