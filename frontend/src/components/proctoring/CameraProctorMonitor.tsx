import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
  useMediaQuery,
} from '@mui/material';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import SecurityIcon from '@mui/icons-material/Security';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import { AttemptViolationType } from '../../types/attempt.types.js';

export type HeadPoseStatus = 'CENTER' | 'TURNED_LEFT' | 'TURNED_RIGHT' | 'NO_FACE';

interface CameraProctorMonitorProps {
  onViolation: (type: AttemptViolationType, title: string, message: string, details?: string) => void;
  violationCount: number;
  maxViolations?: number;
  isActive: boolean; // True when test has started and active
  onCameraReady?: (ready: boolean) => void;
}

export const CameraProctorMonitor: React.FC<CameraProctorMonitorProps> = ({
  onViolation,
  violationCount,
  maxViolations = 3,
  isActive,
  onCameraReady,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isMobile = useMediaQuery('(max-width:600px)');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [headPose, setHeadPose] = useState<HeadPoseStatus>('CENTER');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [turnHoldDurationMs, setTurnHoldDurationMs] = useState<number>(0);

  // Timers and tracking refs
  const turnStartTimeRef = useRef<number | null>(null);
  const lastPoseRef = useRef<HeadPoseStatus>('CENTER');
  const violationCooldownRef = useRef<number>(0);

  const HOLD_THRESHOLD_MS = 2000; // Continuous 2.0s turned left or right triggers warning
  const COOLDOWN_MS = 3500; // 3.5s cooldown after a strike before another can trigger

  useEffect(() => {
    if (isMobile) setIsMinimized(true);
  }, [isMobile]);

  // Play a brief warning sound on violation
  const playWarningChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.35); // E4
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio playback restriction
    }
  }, []);

  // Request Webcam Stream
  const initCamera = useCallback(async () => {
    try {
      setPermissionError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media devices API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // NO AUDIO RECORDED
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }

      setHasPermission(true);
      onCameraReady?.(true);
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      const errorMsg =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings to proceed with this proctored assessment.'
          : err?.message || 'Could not connect to camera device.';
      setHasPermission(false);
      setPermissionError(errorMsg);
      onCameraReady?.(false);
    }
  }, [onCameraReady]);

  // Lifecycle: Start Camera on mount
  useEffect(() => {
    initCamera();

    return () => {
      // Stop all tracks immediately upon unmount (Never store footage)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [initCamera]);

  // Re-attach stream if video element mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isMinimized, hasPermission]);

  // In-Memory Computer Vision Head Pose Analyzer (Pure local canvas processing)
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || !isActive) {
      animFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Draw current video frame to downscaled offscreen canvas (160 x 120 for high performance)
    ctx.drawImage(video, 0, 0, width, height);

    let detectedPose: HeadPoseStatus = 'CENTER';

    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Skin Tone Pixel Filtering in YCbCr space
      // Y in [60, 240], Cb in [77, 127], Cr in [133, 173]
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      let skinPixels = 0;
      let skinSumX = 0;
      let skinSumY = 0;

      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // RGB to YCbCr conversion
          const Y = 0.299 * r + 0.587 * g + 0.114 * b;
          const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          if (Y >= 50 && Y <= 245 && Cb >= 75 && Cb <= 130 && Cr >= 130 && Cr <= 175) {
            skinPixels++;
            skinSumX += x;
            skinSumY += y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Check if a substantial face cluster is visible
      const faceBoxWidth = maxX - minX;
      const faceBoxHeight = maxY - minY;

      if (skinPixels < 120 || faceBoxWidth < 28 || faceBoxHeight < 28) {
        detectedPose = 'NO_FACE';
      } else {
        const faceCenterX = skinSumX / skinPixels;
        const faceMidX = (minX + maxX) / 2;

        // Eye region luminance analysis:
        // In the upper 30%-60% of the detected face, calculate the horizontal center of darkest features (pupils/brows)
        const eyeTop = Math.floor(minY + faceBoxHeight * 0.25);
        const eyeBottom = Math.floor(minY + faceBoxHeight * 0.55);
        let darkSumX = 0;
        let darkCount = 0;
        let leftSideSkin = 0;
        let rightSideSkin = 0;

        for (let y = eyeTop; y < eyeBottom; y += 2) {
          for (let x = minX; x < maxX; x += 2) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (x < faceMidX) {
              leftSideSkin++;
            } else {
              rightSideSkin++;
            }

            // Dark eye/brow contrast pixels
            if (lum < 75) {
              darkSumX += x;
              darkCount++;
            }
          }
        }

        // Horizontal feature skew
        // Positive offset means features shifted to candidate's right (our right)
        // Negative offset means features shifted to candidate's left (our left)
        const skinSymmetryRatio =
          leftSideSkin + rightSideSkin > 0
            ? (rightSideSkin - leftSideSkin) / (leftSideSkin + rightSideSkin)
            : 0;

        const centroidOffset = (faceCenterX - faceMidX) / (faceBoxWidth || 1);

        let featureOffset = 0;
        if (darkCount > 10) {
          const darkMidX = darkSumX / darkCount;
          featureOffset = (darkMidX - faceMidX) / (faceBoxWidth || 1);
        }

        // Combined horizontal yaw orientation metric
        // Note: Webcam is mirrored, so student turning their head to the LEFT moves visual mass towards left or right depending on mirror
        // With standard video mirror:
        // Turning to student's left: features shift towards candidate's left (negative)
        // Turning to student's right: features shift towards candidate's right (positive)
        const totalYawIndex = centroidOffset * 0.4 + featureOffset * 0.4 + skinSymmetryRatio * 0.2;

        // Yaw thresholds for left / right turn
        if (totalYawIndex < -0.15) {
          detectedPose = 'TURNED_LEFT';
        } else if (totalYawIndex > 0.15) {
          detectedPose = 'TURNED_RIGHT';
        } else {
          detectedPose = 'CENTER';
        }
      }
    } catch {
      detectedPose = 'CENTER';
    }

    setHeadPose(detectedPose);

    // Violation Holding / 2-Second Warning Logic
    const now = Date.now();
    const isViolating = detectedPose === 'TURNED_LEFT' || detectedPose === 'TURNED_RIGHT';

    if (isViolating) {
      if (lastPoseRef.current !== detectedPose || turnStartTimeRef.current === null) {
        turnStartTimeRef.current = now;
        lastPoseRef.current = detectedPose;
        setTurnHoldDurationMs(0);
      } else {
        const elapsed = now - turnStartTimeRef.current;
        setTurnHoldDurationMs(elapsed);

        // If held turned for >= 2.0 seconds and outside cooldown window:
        if (elapsed >= HOLD_THRESHOLD_MS && now > violationCooldownRef.current) {
          violationCooldownRef.current = now + COOLDOWN_MS;
          turnStartTimeRef.current = null;
          setTurnHoldDurationMs(0);

          playWarningChime();

          const directionText = detectedPose === 'TURNED_LEFT' ? 'Left' : 'Right';
          const strikeNumber = Math.min(violationCount + 1, maxViolations);

          onViolation(
            'LOOKING_AWAY',
            `Warning ${strikeNumber}/${maxViolations}: Head Turned ${directionText}`,
            `You turned your head ${directionText.toLowerCase()} away from the screen for more than 2 seconds. Please look directly at the assessment screen.`,
            `Head turned ${directionText.toLowerCase()} sustained for >2s [Camera Proctor]`
          );
        }
      }
    } else {
      // Student looked back to center: reset hold timer with no strikes incurred
      turnStartTimeRef.current = null;
      lastPoseRef.current = detectedPose;
      setTurnHoldDurationMs(0);
    }

    animFrameRef.current = requestAnimationFrame(analyzeFrame);
  }, [isActive, violationCount, maxViolations, onViolation, playWarningChime]);

  // Start frame analyzer loop when active
  useEffect(() => {
    if (isActive && hasPermission) {
      animFrameRef.current = requestAnimationFrame(analyzeFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, hasPermission, analyzeFrame]);

  // Color helper for current head pose
  const getStatusColor = () => {
    if (headPose === 'TURNED_LEFT' || headPose === 'TURNED_RIGHT') return '#DC2626';
    if (headPose === 'NO_FACE') return '#D97706';
    return '#16A34A';
  };

  const getStatusLabel = () => {
    if (headPose === 'TURNED_LEFT') return '⚠️ Head Turned Left';
    if (headPose === 'TURNED_RIGHT') return '⚠️ Head Turned Right';
    if (headPose === 'NO_FACE') return '⚠️ Face Not Detected';
    return '● Looking at Screen (OK)';
  };

  // If permission failed, show warning alert card
  if (hasPermission === false) {
    return (
      <Paper
        elevation={6}
        sx={{
          position: 'fixed',
          bottom: { xs: 96, sm: 24 },
          right: { xs: 8, sm: 24 },
          zIndex: 9999,
          width: { xs: 'calc(100% - 16px)', sm: 'auto' },
          maxWidth: { xs: 340, sm: 360 },
          p: { xs: 1.25, sm: 2 },
          borderRadius: 3,
          border: '2px solid #EF4444',
          bgcolor: '#FEF2F2',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#B91C1C' }}>
          <VideocamOffIcon sx={{ fontSize: 22 }} />
          <Typography variant="subtitle2" fontWeight={800}>
            Camera Monitoring Required
          </Typography>
        </Box>
        <Typography variant="caption" color="#7F1D1D" display="block" sx={{ mb: 1.5, lineHeight: 1.4 }}>
          {permissionError || 'Camera access is required for proctoring. Please enable your camera.'}
        </Typography>
        <Button
          variant="contained"
          size="small"
          color="error"
          fullWidth
          onClick={initCamera}
          sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
        >
          Retry Camera Permission
        </Button>
      </Paper>
    );
  }

  // Minimized state widget (small pill showing status & strike counter)
  if (isMinimized) {
    return (
      <Paper
        elevation={6}
        sx={{
          position: 'fixed',
          top: { xs: 8, sm: 'auto' },
          bottom: { xs: 'auto', sm: 24 },
          right: { xs: 8, sm: 24 },
          zIndex: 9999,
          p: { xs: 0.5, sm: 1.25 },
          px: { xs: 0.75, sm: 2 },
          borderRadius: 6,
          bgcolor: '#0F172A',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, sm: 1.5 },
          border: `2px solid ${getStatusColor()}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: getStatusColor(),
            animation: headPose !== 'CENTER' ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.5)', opacity: 0.5 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        />
        <Typography variant="caption" fontWeight={700}>
          {isMobile ? 'Camera on' : getStatusLabel()}
        </Typography>
        <Chip
          label={isMobile ? `${violationCount}/${maxViolations}` : `Strikes: ${violationCount}/${maxViolations}`}
          size="small"
          sx={{
            height: { xs: 18, sm: 20 },
            fontSize: { xs: '0.62rem', sm: '0.68rem' },
            fontWeight: 800,
            bgcolor: violationCount >= 2 ? '#DC2626' : violationCount === 1 ? '#D97706' : '#334155',
            color: '#fff',
          }}
        />
        <Tooltip title="Expand Camera Monitor">
          <IconButton size="small" onClick={() => setIsMinimized(false)} sx={{ color: '#94A3B8', p: 0.25 }}>
            <OpenInFullIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Paper>
    );
  }

  // Normal Floating Picture-in-Picture Proctor Widget
  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: { xs: 96, sm: 24 },
        right: { xs: 8, sm: 24 },
        zIndex: 9999,
        width: { xs: 200, sm: 240 },
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: '#0F172A',
        color: '#ffffff',
        border: `2px solid ${headPose === 'CENTER' ? '#334155' : getStatusColor()}`,
        boxShadow:
          headPose !== 'CENTER'
            ? '0 12px 30px -4px rgba(220, 38, 38, 0.45)'
            : '0 12px 28px rgba(0,0,0,0.35)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          py: 0.75,
          px: 1.25,
          bgcolor: '#1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <SecurityIcon sx={{ fontSize: 16, color: '#38BDF8' }} />
          <Typography variant="caption" fontWeight={800} letterSpacing={0.5} sx={{ color: '#E2E8F0', fontSize: '0.72rem' }}>
            CAMERA PROCTOR
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label={`${violationCount}/${maxViolations} Strikes`}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 800,
              bgcolor: violationCount >= 2 ? '#DC2626' : violationCount === 1 ? '#D97706' : '#334155',
              color: '#ffffff',
            }}
          />
          <Tooltip title="Minimize to icon">
            <IconButton size="small" onClick={() => setIsMinimized(true)} sx={{ color: '#94A3B8', p: 0.25 }}>
              <CloseFullscreenIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Video Preview Frame */}
      <Box sx={{ position: 'relative', width: 240, height: 160, bgcolor: '#000000', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirror feed for candidate
          }}
        />

        {/* Hidden downscaled analysis canvas */}
        <canvas ref={canvasRef} width={160} height={120} style={{ display: 'none' }} />

        {/* Subtle Face Guide Oval Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 110,
            height: 130,
            borderRadius: '50%',
            border: `1.5px dashed ${
              headPose === 'CENTER' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(239, 68, 68, 0.75)'
            }`,
            pointerEvents: 'none',
          }}
        />

        {/* Turn Warning Progress Overlay (Active during 2s countdown) */}
        {turnHoldDurationMs > 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(220, 38, 38, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1.5,
              textAlign: 'center',
              backdropFilter: 'blur(2px)',
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 32, color: '#ffffff', mb: 0.5 }} />
            <Typography variant="caption" fontWeight={900} color="#ffffff" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              LOOK AT SCREEN!
            </Typography>
            <Typography variant="caption" color="#FEE2E2" sx={{ fontSize: '0.68rem', mb: 1 }}>
              Warning in {((HOLD_THRESHOLD_MS - turnHoldDurationMs) / 1000).toFixed(1)}s
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (turnHoldDurationMs / HOLD_THRESHOLD_MS) * 100)}
              sx={{
                width: '80%',
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': { bgcolor: '#ffffff' },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Footer Status & Privacy Tag */}
      <Box sx={{ p: 1, bgcolor: '#0F172A', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: getStatusColor(),
              }}
            />
            <Typography
              variant="caption"
              fontWeight={800}
              sx={{
                color: getStatusColor(),
                fontSize: '0.72rem',
              }}
            >
              {getStatusLabel()}
            </Typography>
          </Box>
        </Box>

        {/* Privacy Assurance Caption */}
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.62rem',
            color: '#64748B',
            textAlign: 'center',
            display: 'block',
            fontWeight: 500,
          }}
        >
          🔒 Real-time memory analysis • Zero video footage stored
        </Typography>
      </Box>
    </Paper>
  );
};
