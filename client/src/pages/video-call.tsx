import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SkipForward,
  ArrowLeft,
  Users,
  Loader2,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/contexts/websocket-context";
import { Button } from "@/components/ui/button";

type CallState =
  | "idle"
  | "requesting-media"
  | "searching"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function VideoCallPage() {
  const { user } = useAuth();
  const { send, on, off, onlineCount } = useWebSocket();
  const [, setLocation] = useLocation();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const roleRef = useRef<"initiator" | "receiver" | null>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [remoteUsername] = useState<string>("Stranger");
  const [callDuration, setCallDuration] = useState(0);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const closePeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (durationRef.current) clearInterval(durationRef.current);
    roomIdRef.current = null;
    roleRef.current = null;
    setCallDuration(0);
  }, []);

  const getLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch {
      setErrorMsg("Camera or microphone access denied. Please allow access and try again.");
      setCallState("error");
      return null;
    }
  }, []);

  const createPeerConnection = useCallback(
    (stream: MediaStream, roomId: string) => {
      const peer = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = peer;

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallState("connected");
          durationRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
        }
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          send({ type: "ice-candidate", candidate: event.candidate.toJSON(), roomId });
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "disconnected" || peer.connectionState === "failed") {
          setCallState("ended");
          closePeer();
        }
      };

      return peer;
    },
    [send, closePeer]
  );

  const startSearch = useCallback(async () => {
    setCallState("requesting-media");
    setErrorMsg("");

    let stream = localStreamRef.current;
    if (!stream) {
      stream = await getLocalMedia();
      if (!stream) return;
    }

    setCallState("searching");
    send({ type: "find-match" });
  }, [send, getLocalMedia]);

  const handleEndCall = useCallback(() => {
    if (roomIdRef.current) {
      send({ type: "end-call", roomId: roomIdRef.current });
    }
    send({ type: "cancel-match" });
    closePeer();
    setCallState("ended");
  }, [send, closePeer]);

  const handleSkip = useCallback(() => {
    if (roomIdRef.current) {
      send({ type: "end-call", roomId: roomIdRef.current });
    }
    closePeer();
    setCallState("searching");
    send({ type: "find-match" });
  }, [send, closePeer]);

  const handleGoHome = useCallback(() => {
    handleEndCall();
    stopLocalStream();
    setLocation("/");
  }, [handleEndCall, stopLocalStream, setLocation]);

  // WebSocket handlers
  useEffect(() => {
    const unsubMatched = on("matched", async (msg) => {
      const { roomId, role } = msg as { roomId: string; role: "initiator" | "receiver" };
      roomIdRef.current = roomId;
      roleRef.current = role;
      setCallState("connecting");

      const stream = localStreamRef.current;
      if (!stream) return;

      const peer = createPeerConnection(stream, roomId);

      if (role === "initiator") {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          send({ type: "offer", offer: peer.localDescription, roomId });
        } catch (e) {
          console.error("Offer error:", e);
        }
      }
    });

    const unsubOffer = on("offer", async (msg) => {
      const { offer, roomId } = msg as { offer: RTCSessionDescriptionInit; roomId: string };
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        send({ type: "answer", answer: peer.localDescription, roomId });
      } catch (e) {
        console.error("Answer error:", e);
      }
    });

    const unsubAnswer = on("answer", async (msg) => {
      const { answer } = msg as { answer: RTCSessionDescriptionInit };
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error("Set answer error:", e);
      }
    });

    const unsubICE = on("ice-candidate", async (msg) => {
      const { candidate } = msg as { candidate: RTCIceCandidateInit };
      const peer = peerRef.current;
      if (!peer || !candidate) return;
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE error:", e);
      }
    });

    const unsubDisconnect = on("peer-disconnected", () => {
      closePeer();
      setCallState("ended");
    });

    return () => {
      unsubMatched();
      unsubOffer();
      unsubAnswer();
      unsubICE();
      unsubDisconnect();
    };
  }, [on, off, send, createPeerConnection, closePeer]);

  // Auto-start search on mount
  useEffect(() => {
    startSearch();
    return () => {
      send({ type: "cancel-match" });
      closePeer();
      stopLocalStream();
    };
  }, []);

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setMicOn((prev) => !prev);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setCamOn((prev) => !prev);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(222_47%_4%)] text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 z-20 absolute top-0 left-0 right-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleGoHome}
          data-testid="button-go-home"
          className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Home</span>
        </Button>

        <div className="flex items-center gap-3">
          {callState === "connected" && (
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/80 font-medium">{formatDuration(callDuration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-white/60 text-sm">
            <Users className="h-3.5 w-3.5" />
            <span>{onlineCount} online</span>
          </div>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Remote video - full background */}
        <div className="absolute inset-0 bg-[hsl(222_47%_6%)]">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              callState === "connected" ? "opacity-100" : "opacity-0"
            }`}
            data-testid="video-remote"
          />
        </div>

        {/* Overlay states */}
        {callState !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            {callState === "requesting-media" && (
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 pulse-ring">
                  <Video className="h-9 w-9 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Setting up camera</h2>
                <p className="text-white/50 text-sm">Please allow camera and microphone access</p>
              </div>
            )}

            {callState === "searching" && (
              <div className="text-center px-6">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-ping animation-delay-300" />
                  <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Finding someone</h2>
                <p className="text-white/50 searching-dots">Searching for a match</p>
                <div className="mt-8 flex items-center gap-2 justify-center text-white/40 text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{onlineCount} people online</span>
                </div>
              </div>
            )}

            {callState === "connecting" && (
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-9 w-9 text-primary animate-spin" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Connecting</h2>
                <p className="text-white/50 text-sm">Setting up your secure video call</p>
              </div>
            )}

            {callState === "ended" && (
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                  <WifiOff className="h-9 w-9 text-white/40" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Call ended</h2>
                <p className="text-white/50 text-sm mb-8">The other person disconnected</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button
                    onClick={startSearch}
                    data-testid="button-find-next"
                    className="gap-2"
                  >
                    <SkipForward className="h-4 w-4" />
                    Find Next
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGoHome}
                    data-testid="button-go-home-ended"
                    className="gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Home
                  </Button>
                </div>
              </div>
            )}

            {callState === "error" && (
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                  <VideoOff className="h-9 w-9 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Camera Error</h2>
                <p className="text-white/50 text-sm mb-8 max-w-xs mx-auto">{errorMsg}</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={startSearch} data-testid="button-retry">
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGoHome}
                    className="border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remote user label */}
        {callState === "connected" && (
          <div className="absolute top-16 left-4 z-20">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-white/90 font-medium">{remoteUsername}</span>
            </div>
          </div>
        )}

        {/* Local video - PiP */}
        <div
          className={`absolute bottom-24 right-4 z-20 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
            callState === "connected" || callState === "searching" || callState === "connecting"
              ? "opacity-100"
              : "opacity-0"
          }`}
          style={{ width: "clamp(100px, 25vw, 200px)", aspectRatio: "4/3" }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            data-testid="video-local"
          />
          {!camOn && (
            <div className="absolute inset-0 bg-[hsl(222_47%_8%)] flex items-center justify-center">
              <VideoOff className="h-6 w-6 text-white/40" />
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 bg-black/50 rounded px-1.5 py-0.5">
            <span className="text-xs text-white/80">{user?.username}</span>
          </div>
          {/* border */}
          <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 pointer-events-none" />
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-20 flex items-center justify-center gap-3 py-6 px-4">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-3 flex-wrap justify-center">
          {/* Mic */}
          <button
            onClick={toggleMic}
            data-testid="button-toggle-mic"
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              micOn
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-destructive hover:bg-destructive/90 text-white"
            }`}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleCam}
            data-testid="button-toggle-cam"
            aria-label={camOn ? "Turn off camera" : "Turn on camera"}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              camOn
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-destructive hover:bg-destructive/90 text-white"
            }`}
          >
            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Skip */}
          {(callState === "connected" || callState === "searching") && (
            <button
              onClick={callState === "connected" ? handleSkip : startSearch}
              data-testid="button-skip"
              aria-label="Skip to next person"
              title="Find next person"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          )}

          {/* Hang up */}
          <button
            onClick={handleEndCall}
            data-testid="button-end-call"
            aria-label="End call"
            className="w-14 h-14 rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center transition-all shadow-lg"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
