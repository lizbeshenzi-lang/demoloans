import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Video, VideoOff, Mic, MicOff, PhoneOff, FileText, Loader2 } from "lucide-react";
import logo from "@/assets/kechita-logo.jpg";

const InterviewRoom = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "waiting" | "connected" | "ended">("loading");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        });
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
            setStatus("connected");
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            setStatus("ended");
          }
        };

        // Signaling via Supabase Realtime
        const channel = supabase.channel(`interview-${id}`, { config: { broadcast: { self: false } } });
        channelRef.current = channel;

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({ type: "broadcast", event: "ice-candidate", payload: { candidate: e.candidate.toJSON() } });
          }
        };

        channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ type: "broadcast", event: "answer", payload: { answer } });
        });

        channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        });

        channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        });

        channel.on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          if (count >= 2 && isInitiator) {
            // Create offer
            createOffer(pc, channel);
          }
        });

        channel.on("presence", { event: "join" }, ({ newPresences }) => {
          const state = channel.presenceState();
          if (Object.keys(state).length >= 2) {
            createOffer(pc, channel);
          }
        });

        await channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ user: crypto.randomUUID(), joined: Date.now() });
            setStatus("waiting");

            // Check if we're the second person
            setTimeout(async () => {
              const state = channel.presenceState();
              if (Object.keys(state).length >= 2) {
                createOffer(pc, channel);
              } else {
                setIsInitiator(true);
              }
            }, 1000);
          }
        });
      } catch (err: any) {
        toast.error("Camera/microphone access required: " + err.message);
        setStatus("ended");
      }
    };

    init();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      channelRef.current?.unsubscribe();
    };
  }, [id]);

  const createOffer = async (pc: RTCPeerConnection, channel: ReturnType<typeof supabase.channel>) => {
    if (pc.signalingState !== "stable" || pc.localDescription) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channel.send({ type: "broadcast", event: "offer", payload: { offer } });
    } catch {}
  };

  const toggleCamera = () => {
    const tracks = localStreamRef.current?.getVideoTracks();
    if (tracks) { tracks.forEach(t => (t.enabled = !t.enabled)); setCameraOn(!cameraOn); }
  };

  const toggleMic = () => {
    const tracks = localStreamRef.current?.getAudioTracks();
    if (tracks) { tracks.forEach(t => (t.enabled = !t.enabled)); setMicOn(!micOn); }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    channelRef.current?.unsubscribe();
    setStatus("ended");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src={logo} alt="Demo" className="h-12 mx-auto rounded" />
          <h1 className="text-2xl font-bold font-display text-foreground">Interview Ended</h1>
          <p className="text-muted-foreground">Thank you for participating.</p>
          <Link to="/"><Button>Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Demo" className="h-7 rounded" />
          <span className="text-sm font-medium text-zinc-300">Interview Room</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "waiting" && <span className="text-xs text-yellow-400 animate-pulse">Waiting for participant...</span>}
          {status === "connected" && <span className="text-xs text-green-400">● Connected</span>}
        </div>
      </header>

      {/* Video area */}
      <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 relative">
        <div className={`flex-1 grid ${showNotes ? "md:grid-cols-[1fr_320px]" : ""} gap-2`}>
          <div className="relative flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Remote video (large) */}
            <div className="relative bg-zinc-800 rounded-xl overflow-hidden flex items-center justify-center min-h-[240px]">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {status === "waiting" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-zinc-400 text-sm">Waiting for the other participant to join...</p>
                </div>
              )}
            </div>

            {/* Local video */}
            <div className="relative bg-zinc-800 rounded-xl overflow-hidden min-h-[240px]">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              <span className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded">You</span>
            </div>
          </div>

          {/* Notes panel */}
          {showNotes && (
            <div className="bg-zinc-900 rounded-xl p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Interview Notes</h3>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 resize-none text-sm"
                placeholder="Type your notes here..."
                rows={10}
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-3 flex items-center justify-center gap-3">
        <Button variant={micOn ? "outline" : "destructive"} size="icon" onClick={toggleMic} className="rounded-full w-12 h-12">
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button variant={cameraOn ? "outline" : "destructive"} size="icon" onClick={toggleCamera} className="rounded-full w-12 h-12">
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowNotes(!showNotes)} className={`rounded-full w-12 h-12 ${showNotes ? "bg-primary text-primary-foreground" : ""}`}>
          <FileText className="w-5 h-5" />
        </Button>
        <Button variant="destructive" size="icon" onClick={endCall} className="rounded-full w-12 h-12">
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>

      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
};

export default InterviewRoom;
