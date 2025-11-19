import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Loader2 } from 'lucide-react';

export default function TwilioVideoRoom({ roomName = 'PSA', userName, onLeave }) {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const participantRefs = useRef({});

  useEffect(() => {
    let twilioRoom;

    const connectToRoom = async () => {
      try {
        const response = await base44.functions.invoke('generateTwilioToken', {
          identity: userName || `user_${Date.now()}`,
          roomName: roomName || 'PSA'
        });

        const { token } = response.data;

        const TwilioVideo = await import('https://cdn.skypack.dev/twilio-video@2.28.1');
        const { connect } = TwilioVideo;

        // Connect to room - Twilio creates tracks automatically
        twilioRoom = await connect(token, {
          name: roomName || 'PSA',
          audio: true,
          video: { width: 1280, height: 720, frameRate: 20 }
        });

        console.log('✅ Connected to Twilio room:', twilioRoom.name);
        setRoom(twilioRoom);
        setIsConnecting(false);

        // Attach LOCAL participant's video to local preview
        if (localVideoRef.current) {
          twilioRoom.localParticipant.videoTracks.forEach(publication => {
            const videoElement = publication.track.attach();
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.muted = true;
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            localVideoRef.current.appendChild(videoElement);
            console.log('✅ Local video preview attached');
          });
        }

        // Handle existing participants
        twilioRoom.participants.forEach(participant => {
          console.log('📥 Existing participant:', participant.identity);
          handleParticipantConnected(participant);
        });

        // Handle new participants
        twilioRoom.on('participantConnected', participant => {
          console.log('📥 New participant:', participant.identity);
          handleParticipantConnected(participant);
        });

        twilioRoom.on('participantDisconnected', participant => {
          console.log('📤 Participant left:', participant.identity);
          setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
          if (participantRefs.current[participant.sid]) {
            delete participantRefs.current[participant.sid];
          }
        });

      } catch (err) {
        console.error('❌ Connection error:', err);
        setError(err.message);
        setIsConnecting(false);
      }
    };

    const handleParticipantConnected = (participant) => {
      setParticipants(prev => {
        if (prev.find(p => p.sid === participant.sid)) return prev;
        return [...prev, participant];
      });

      participant.on('trackSubscribed', track => {
        console.log('✅ Track subscribed:', track.kind);
        attachTrack(track, participant.sid);
      });

      participant.on('trackUnsubscribed', track => {
        console.log('⏹️ Track unsubscribed:', track.kind);
        detachTrack(track, participant.sid);
      });

      participant.tracks.forEach(publication => {
        if (publication.track) {
          attachTrack(publication.track, participant.sid);
        }
      });
    };

    const attachTrack = (track, participantSid) => {
      const container = participantRefs.current[participantSid];
      if (!container) return;

      if (track.kind === 'video') {
        const existingVideo = container.querySelector('video');
        if (!existingVideo) {
          const videoElement = track.attach();
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
          container.appendChild(videoElement);
        }
      } else if (track.kind === 'audio') {
        const audioElement = track.attach();
        audioElement.autoplay = true;
        container.appendChild(audioElement);
      }
    };

    const detachTrack = (track, participantSid) => {
      track.detach().forEach(element => element.remove());
    };

    connectToRoom();

    return () => {
      if (twilioRoom) {
        twilioRoom.disconnect();
        console.log('🔌 Disconnected from room');
      }
    };
  }, [roomName, userName]);

  const toggleVideo = () => {
    if (room) {
      room.localParticipant.videoTracks.forEach(publication => {
        if (isVideoEnabled) {
          publication.track.disable();
        } else {
          publication.track.enable();
        }
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (room) {
      room.localParticipant.audioTracks.forEach(publication => {
        if (isAudioEnabled) {
          publication.track.disable();
        } else {
          publication.track.enable();
        }
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const leaveRoom = () => {
    if (room) {
      room.disconnect();
    }
    if (onLeave) onLeave();
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 text-white animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white">Connecting to Room...</h2>
            <p className="text-blue-200 mt-2">Setting up video call</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <VideoOff className="w-24 h-24 text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Connection Failed</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={leaveRoom} className="bg-slate-600">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">🎥 {roomName}</h1>
            <p className="text-blue-200 flex items-center gap-2 mt-1">
              <Users className="w-4 h-4" />
              {participants.length + 1} / 25 participants
            </p>
          </div>
          <Button onClick={leaveRoom} className="bg-red-600 hover:bg-red-700">
            <PhoneOff className="w-5 h-5 mr-2" />
            Leave Room
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 to-purple-600">
            <CardContent className="p-0">
              <div className="bg-blue-800 text-white p-3 text-center">
                <h3 className="font-bold">You</h3>
              </div>
              <div className="aspect-video bg-slate-900 relative" ref={localVideoRef}>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <VideoOff className="w-12 h-12 text-slate-400" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {participants.map(participant => (
            <Card key={participant.sid} className="border-none shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-slate-700 text-white p-3 text-center">
                  <h3 className="font-bold truncate">{participant.identity}</h3>
                </div>
                <div 
                  className="aspect-video bg-slate-900 relative"
                  ref={el => {
                    if (el) participantRefs.current[participant.sid] = el;
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-12 h-12 text-slate-600 animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-2xl bg-white/10 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex justify-center gap-4">
              <Button
                onClick={toggleVideo}
                variant={isVideoEnabled ? 'default' : 'destructive'}
                size="lg"
                className="w-16 h-16 rounded-full"
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
              
              <Button
                onClick={toggleAudio}
                variant={isAudioEnabled ? 'default' : 'destructive'}
                size="lg"
                className="w-16 h-16 rounded-full"
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                onClick={leaveRoom}
                variant="destructive"
                size="lg"
                className="px-8 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                Leave
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}