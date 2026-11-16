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
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import SecurityIcon from '@mui/icons-material/Security';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as blazeface from '@tensorflow-models/blazeface';
import { AttemptViolationType } from '../../types/attempt.types.js';

export type HeadPoseStatus = 'CENTER' | 'TURNED_LEFT' | 'TURNED_RIGHT' | 'NO_FACE';

export type CameraState =
  | 'INITIALIZING'
  | 'REQUESTING_PERMISSION'
  | 'ATTACHING_STREAM'
  | 'VERIFYING_FRAMES'
  | 'ACTIVE'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'BUSY'
  | 'DISCONNECTED'
  | 'ERROR';

export type ModelStatus = 'LOADING' | 'READY' | 'ERROR';

export interface CameraProctorMonitorProps {
  onViolation: (type: AttemptViolationType, title: string, message: string, details?: string) => void;
  violationCount: number;
  maxViolations?: number;
  isActive: boolean; // True when test has started and active
  onCameraReady?: (ready: boolean, error?: string | null) => void;
  enableMobileDetection?: boolean; // Admin configuration toggle
  isWarningModalOpen?: boolean;
}

const CAMERA_INIT_TIMEOUT_MS = 15000; // 15 seconds max initialization timeout
const FRAME_VERIFICATION_TIMEOUT_MS = 4000; // 4 seconds max to verify first rendered frame
const DETECTION_INTERVAL_MS = 1000;

const HOLD_THRESHOLD_MS = 2000; // 2.0s head turn sustained triggers warning
const PHONE_CONFIRMATION_THRESHOLD_MS = 500; // 500ms multi-frame temporal confirmation
const MULTI_PERSON_CONFIRMATION_THRESHOLD_MS = 750; // 750ms multi-frame confirmation
const FACE_ABSENT_THRESHOLD_MS = 3000; // 3.0s prolonged absence triggers warning

const GENERAL_COOLDOWN_MS = 5000; // 5.0s deduplication cooldown for same incident
const REPEAT_VIOLATION_INTERVAL_MS = 7000; // Repeat violation policy
const ABSENCE_REPEAT_INTERVAL_MS = 8000; // Repeat violation policy for prolonged absence

/**
 * Verifies that the attached video element is receiving and decoding real physical frames.
 */
const verifyActiveVideoFrames = (
  video: HTMLVideoElement,
  abortSignal: AbortSignal,
  timeoutMs = FRAME_VERIFICATION_TIMEOUT_MS
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let frameId: number;

    const cleanup = () => {
      cancelAnimationFrame(frameId);
      abortSignal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new Error('ABORTED'));
    };

    if (abortSignal.aborted) {
      reject(new Error('ABORTED'));
      return;
    }
    abortSignal.addEventListener('abort', onAbort);

    const check = () => {
      if (abortSignal.aborted) {
        onAbort();
        return;
      }

      const stream = video.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (!track || track.readyState !== 'live') {
        cleanup();
        reject(new Error('Webcam video track is not live or was closed.'));
        return;
      }

      // Check readyState >= HAVE_CURRENT_DATA (2) and real physical dimensions
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve({ width: video.videoWidth, height: video.videoHeight });
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        cleanup();
        reject(
          new Error(
            `Webcam connected, but video frames failed to render within ${timeoutMs / 1000}s (readyState: ${video.readyState}, size: ${video.videoWidth}x${video.videoHeight}).`
          )
        );
        return;
      }

      frameId = requestAnimationFrame(check);
    };

    check();
  });
};

export const CameraProctorMonitor: React.FC<CameraProctorMonitorProps> = ({
  onViolation,
  violationCount,
  maxViolations = 3,
  isActive,
  onCameraReady,
  enableMobileDetection = true,
  isWarningModalOpen = false,
}) => {
  const isMobile = useMediaQuery('(max-width:600px)');

  // Critical DOM References (never unmounted)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Lifecycle & Session Control Refs
  const isActiveRef = useRef(isActive);
  const isMountedRef = useRef<boolean>(true);
  const sessionCounterRef = useRef<number>(0);
  const hasEverBeenActiveRef = useRef<boolean>(false);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initAbortControllerRef = useRef<AbortController | null>(null);

  // Stable Callback Refs
  const onCameraReadyRef = useRef(onCameraReady);
  useEffect(() => {
    onCameraReadyRef.current = onCameraReady;
  }, [onCameraReady]);

  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Camera & Stream Verification States
  const [cameraState, setCameraState] = useState<CameraState>('INITIALIZING');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [timeoutSecondsLeft, setTimeoutSecondsLeft] = useState<number>(15);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // AI Model States
  const [modelStatus, setModelStatus] = useState<ModelStatus>('LOADING');
  const [modelError, setModelError] = useState<string | null>(null);

  // AI Real-time Detection States
  const [headPose, setHeadPose] = useState<HeadPoseStatus>('CENTER');
  const [turnHoldDurationMs, setTurnHoldDurationMs] = useState<number>(0);

  const [phoneDetected, setPhoneDetected] = useState<boolean>(false);
  const [phoneConfidence, setPhoneConfidence] = useState<number>(0);
  const [phoneHoldDurationMs, setPhoneHoldDurationMs] = useState<number>(0);

  const [multiPersonDetected, setMultiPersonDetected] = useState<boolean>(false);
  const [multiPersonCount, setMultiPersonCount] = useState<number>(1);
  const [multiPersonHoldDurationMs, setMultiPersonHoldDurationMs] = useState<number>(0);

  const [faceAbsentDetected, setFaceAbsentDetected] = useState<boolean>(false);
  const [faceAbsentHoldDurationMs, setFaceAbsentHoldDurationMs] = useState<number>(0);

  // Model & Detection Refs
  const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const faceModelRef = useRef<Awaited<ReturnType<typeof blazeface.load>> | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastFrameProcessingTimeRef = useRef<number>(0);
  const isInferringRef = useRef<boolean>(false);
  const lastDetectionRef = useRef<{
    phoneDetected: boolean;
    phoneConfidence: number;
    personCount: number;
    faceVisible: boolean;
  } | null>(null);

  // Timers and tracking refs for Violations
  const turnStartTimeRef = useRef<number | null>(null);
  const lastPoseRef = useRef<HeadPoseStatus>('CENTER');
  const headViolationCooldownRef = useRef<number>(0);

  const phoneStartTimeRef = useRef<number | null>(null);
  const phoneCooldownRef = useRef<number>(0);
  const isPhoneViolatingRef = useRef<boolean>(false);
  const lastPhoneStrikeTimeRef = useRef<number>(0);

  const multiPersonStartTimeRef = useRef<number | null>(null);
  const multiPersonCooldownRef = useRef<number>(0);
  const isMultiPersonViolatingRef = useRef<boolean>(false);
  const lastMultiPersonStrikeTimeRef = useRef<number>(0);

  const faceAbsentStartTimeRef = useRef<number | null>(null);
  const faceAbsentCooldownRef = useRef<number>(0);
  const isFaceAbsentViolatingRef = useRef<boolean>(false);
  const lastFaceAbsentStrikeTimeRef = useRef<number>(0);

  const disconnectCooldownRef = useRef<number>(0);

  useEffect(() => {
    if (isMobile) setIsMinimized(true);
  }, [isMobile]);

  // Audio warning chime
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
      // Audio autoplay policy fallback
    }
  }, []);

  // Initialize and load AI detection models
  const loadDetectionModel = useCallback(async () => {
    setModelStatus('LOADING');
    setModelError(null);
    cocoModelRef.current = null;
    faceModelRef.current = null;
    lastDetectionRef.current = null;
    lastInferenceTimeRef.current = 0;
    try {
      await tf.ready();
      const [objectModel, faceModel] = await Promise.all([
        cocoSsd.load({ base: 'lite_mobilenet_v2' }),
        blazeface.load(),
      ]);
      cocoModelRef.current = objectModel;
      faceModelRef.current = faceModel;
      setModelStatus('READY');
    } catch (err: any) {
      console.warn('AI Proctoring model load error:', err);
      setModelStatus('ERROR');
      setModelError(err?.message || 'Failed to load AI proctoring model weights. Check network/browser.');
    }
  }, []);

  useEffect(() => {
    loadDetectionModel();
  }, [loadDetectionModel]);

  // Fully terminate, release, and shut down webcam hardware and indicator LED
  const stopCamera = useCallback(() => {
    // 1. Cancel in-flight timeouts & countdowns
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current);
      initTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (initAbortControllerRef.current) {
      initAbortControllerRef.current.abort();
      initAbortControllerRef.current = null;
    }

    // 2. Invalidate current session
    sessionCounterRef.current += 1;

    // 3. Cancel animation frame loops
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isInferringRef.current = false;

    // 4. Detach stream and pause video
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      const vidStream = videoRef.current.srcObject as MediaStream | null;
      if (vidStream && typeof vidStream.getTracks === 'function') {
        vidStream.getTracks().forEach((track) => {
          try {
            track.enabled = false;
            track.stop();
          } catch {}
        });
      }
      videoRef.current.srcObject = null;
    }

    // 5. Stop all media stream tracks in streamRef to turn off camera hardware light
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.enabled = false;
            track.stop();
          } catch {}
        });
      } catch {}
      streamRef.current = null;
    }
  }, []);

  // Initialize Physical Camera Stream with 15-second timeout and frame verification
  const initCamera = useCallback(async () => {
    if (!isActiveRef.current || !isMountedRef.current) return;

    // 1. Release previous camera instances
    stopCamera();

    // 2. Prepare new session & abort controller
    const currentSession = ++sessionCounterRef.current;
    const abortController = new AbortController();
    initAbortControllerRef.current = abortController;

    // Reset statuses
    setCameraState('REQUESTING_PERMISSION');
    setCameraError(null);
    setVideoDimensions(null);
    setTimeoutSecondsLeft(15);

    // 3. Start 15-second countdown timer for visible student feedback
    let remaining = 15;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeoutSecondsLeft(Math.max(0, remaining));
    }, 1000);

    // 4. Master 15-second timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      initTimerRef.current = setTimeout(() => {
        reject(
          new Error(
            'CAMERA_TIMEOUT: Camera initialization timed out after 15 seconds. Browser camera permission was not granted or the camera hardware is busy.'
          )
        );
      }, CAMERA_INIT_TIMEOUT_MS);
    });

    // 5. The Hardware Acquisition & Frame Verification Task
    const acquisitionTask = async () => {
      // Step A: Insecure context check
      const isInsecure =
        typeof window !== 'undefined' &&
        (!window.isSecureContext ||
          (window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)));
      if (isInsecure) {
        throw new Error(
          `HTTPS_REQUIRED: Physical webcam access requires HTTPS. Modern browsers strictly block camera devices on HTTP LAN connections (http://${window.location.host}). Please reload using HTTPS.`
        );
      }

      // Step B: MediaDevices API check
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('Webcam MediaDevices API is not supported in this browser or context.');
      }

      // Step C: getUserMedia with fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false, // ZERO AUDIO RECORDED
        });
      } catch (constraintErr) {
        if (abortController.signal.aborted || currentSession !== sessionCounterRef.current) throw new Error('ABORTED');
        console.warn('Initial getUserMedia constraints failed, trying { video: true }:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (abortController.signal.aborted || currentSession !== sessionCounterRef.current || !isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('ABORTED');
      }

      // Step D: Validate video track
      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState !== 'live') {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('No live video track returned by camera hardware.');
      }

      streamRef.current = stream;

      // Track lifecycle listeners
      track.onended = () => {
        if (hasEverBeenActiveRef.current) {
          setCameraState('DISCONNECTED');
        }
      };
      track.onmute = () => {
        if (hasEverBeenActiveRef.current) {
          setCameraState('DISCONNECTED');
        }
      };
      track.onunmute = () => {
        if (hasEverBeenActiveRef.current) {
          setCameraState('ACTIVE');
        }
      };

      // Step E: Attach to <video> element
      setCameraState('ATTACHING_STREAM');
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('Video preview element is not available.');
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      try {
        await video.play();
      } catch (playErr) {
        console.warn('Video preview play warning:', playErr);
      }

      if (abortController.signal.aborted || currentSession !== sessionCounterRef.current || !isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('ABORTED');
      }

      // Step F: Verify actual video frames are actively rendering
      setCameraState('VERIFYING_FRAMES');
      const dims = await verifyActiveVideoFrames(video, abortController.signal, FRAME_VERIFICATION_TIMEOUT_MS);
      return { stream, dims };
    };

    // 6. Race hardware acquisition against 15-second master timeout
    try {
      const result = await Promise.race([acquisitionTask(), timeoutPromise]);

      if (currentSession !== sessionCounterRef.current || !isMountedRef.current) return;

      // Clear timeouts on success
      if (initTimerRef.current) clearTimeout(initTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      // VERIFIED SUCCESS: Real physical frames are streaming
      setCameraState('ACTIVE');
      setCameraError(null);
      setVideoDimensions(result.dims);
      hasEverBeenActiveRef.current = true;

      // Parent notification: questions unlocked
      onCameraReadyRef.current?.(true, null);
    } catch (err: any) {
      if (currentSession !== sessionCounterRef.current || !isMountedRef.current) return;

      // Clear timeouts on failure
      if (initTimerRef.current) clearTimeout(initTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      if (err?.message === 'ABORTED') return;

      stopCamera();

      let state: CameraState = 'ERROR';
      let errorMsg = 'Failed to connect to physical camera.';
      const msg = err?.message || '';

      if (msg.startsWith('CAMERA_TIMEOUT:')) {
        state = 'TIMEOUT';
        errorMsg = 'Camera request timed out after 15 seconds. Please ensure camera access is allowed in your browser address bar and click Retry.';
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        state = 'PERMISSION_DENIED';
        errorMsg = 'Camera permission denied. Please allow camera access in your browser address bar (lock/tune icon) and click Retry.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        state = 'NOT_FOUND';
        errorMsg = 'No physical webcam detected on this device. Please connect a working camera and click Retry.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        state = 'BUSY';
        errorMsg = 'Webcam is currently occupied by another program (e.g. Zoom, Microsoft Teams, Google Meet). Please close all background video apps and click Retry.';
      } else if (msg.includes('HTTPS_REQUIRED')) {
        state = 'ERROR';
        errorMsg = msg;
      } else if (msg) {
        errorMsg = msg;
      }

      setCameraState(state);
      setCameraError(errorMsg);
      onCameraReadyRef.current?.(false, errorMsg);
    }
  }, [stopCamera]);

  // Camera stream lifecycle: Start when active, stop when inactive
  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) {
      initCamera();
    } else {
      stopCamera();
    }
  }, [isActive, initCamera, stopCamera]);

  // Unmount & page transition safety
  useEffect(() => {
    isMountedRef.current = true;

    const handleBeforeUnload = () => {
      stopCamera();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      isMountedRef.current = false;
      stopCamera();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [stopCamera]);

  // Re-attach stream if video element loses srcObject while active
  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current && !videoRef.current.srcObject && cameraState === 'ACTIVE') {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isMinimized, cameraState, isActive]);

  // Handle Camera Disconnect Violation (ONLY fires if camera was previously ACTIVE)
  useEffect(() => {
    if (!isActive || !hasEverBeenActiveRef.current || cameraState !== 'DISCONNECTED') return;

    const now = Date.now();
    if (now > disconnectCooldownRef.current && !isWarningModalOpen) {
      disconnectCooldownRef.current = now + GENERAL_COOLDOWN_MS;
      playWarningChime();
      const strikeNumber = Math.min(violationCount + 1, maxViolations);
      onViolationRef.current?.(
        'CAMERA_DISCONNECTED',
        `Warning ${strikeNumber}/${maxViolations}: Camera Disconnected`,
        'Warning: Camera disconnected. Please reconnect your camera immediately to continue your assessment.',
        'Camera video feed stream interrupted or disconnected [Camera Proctor]'
      );
    }
  }, [
    cameraState,
    isActive,
    isWarningModalOpen,
    violationCount,
    maxViolations,
    playWarningChime,
  ]);

  // Main Detection Loop (runs at ~10-12 FPS via requestAnimationFrame)
  const processFrame = useCallback(async () => {
    if (!isActiveRef.current) return;

    // AI detection runs ONLY when camera is verified ACTIVE
    if (cameraState !== 'ACTIVE') {
      if (isActiveRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) {
      if (isActiveRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    const now = Date.now();
    if (now - lastFrameProcessingTimeRef.current < 100) {
      if (isActiveRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }
    lastFrameProcessingTimeRef.current = now;

    const effectiveModelError = modelStatus === 'ERROR';

    // Verify track state
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && (track.readyState === 'ended' || !track.enabled)) {
        setCameraState('DISCONNECTED');
        return;
      }
    }

    // Keep the most recent detections between model runs
    let detection = lastDetectionRef.current;
    let inferenceFailed = false;
    let currentPose: HeadPoseStatus = 'CENTER';

    if (
      cocoModelRef.current &&
      faceModelRef.current &&
      !effectiveModelError &&
      !isInferringRef.current &&
      now - lastInferenceTimeRef.current >= DETECTION_INTERVAL_MS
    ) {
      isInferringRef.current = true;
      lastInferenceTimeRef.current = now;

      try {
        const [predictions, faces] = await Promise.all([
          cocoModelRef.current.detect(video),
          faceModelRef.current.estimateFaces(video, false),
        ]);

        // 1. Mobile Phone Detection
        let detectedPhone = false;
        let detectedPhoneScore = 0;
        if (enableMobileDetection) {
          const phonePred = predictions.find(
            (p) => (p.class === 'cell phone' || p.class === 'remote') && p.score >= 0.48
          );
          if (phonePred) {
            detectedPhone = true;
            detectedPhoneScore = phonePred.score;
          }
        }

        // 2. Person Count Detection
        const personPreds = predictions.filter((p) => p.class === 'person' && p.score >= 0.42);
        const detectedPersons = personPreds.length;

        detection = {
          phoneDetected: detectedPhone,
          phoneConfidence: detectedPhoneScore,
          personCount: detectedPersons,
          faceVisible: faces.length > 0,
        };
        lastDetectionRef.current = detection;
      } catch (err) {
        console.warn('Inference error in proctor monitor:', err);
        inferenceFailed = true;
      } finally {
        isInferringRef.current = false;
      }
    }

    let detectedPhone = detection?.phoneDetected ?? false;
    let detectedPhoneScore = detection?.phoneConfidence ?? 0;
    let detectedPersons = detection?.personCount ?? 1;
    let faceVisible = detection?.faceVisible ?? true;

    // Assistive Local Canvas & Head Pose Tracking
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      const width = canvas.width;
      const height = canvas.height;
      ctx.drawImage(video, 0, 0, width, height);

      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        let skinPixels = 0;
        let skinSumX = 0;
        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;

        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const Y = 0.299 * r + 0.587 * g + 0.114 * b;
            const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            if (Y >= 45 && Y <= 250 && Cb >= 75 && Cb <= 135 && Cr >= 125 && Cr <= 180) {
              skinPixels++;
              skinSumX += x;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const faceBoxWidth = maxX - minX;
        const faceBoxHeight = maxY - minY;

        if (skinPixels < 110 || faceBoxWidth < 24 || faceBoxHeight < 24) {
          currentPose = 'NO_FACE';
        } else {
          const faceCenterX = skinSumX / (skinPixels || 1);
          const faceMidX = (minX + maxX) / 2;
          const centroidOffset = (faceCenterX - faceMidX) / (faceBoxWidth || 1);

          if (centroidOffset < -0.16) {
            currentPose = 'TURNED_LEFT';
          } else if (centroidOffset > 0.16) {
            currentPose = 'TURNED_RIGHT';
          } else {
            currentPose = 'CENTER';
          }
        }
      } catch {
        // Centroid analysis fallback
      }
    }

    setPhoneDetected(detectedPhone);
    setPhoneConfidence(detectedPhoneScore);
    setMultiPersonDetected(detectedPersons > 1);
    setMultiPersonCount(detectedPersons);
    setFaceAbsentDetected(!faceVisible);
    setHeadPose(currentPose);

    // Skip violations if warning modal is open or inference failing
    if (isWarningModalOpen || effectiveModelError || inferenceFailed) {
      if (isActiveRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    // 1. MOBILE PHONE VIOLATION PIPELINE
    if (enableMobileDetection && detectedPhone) {
      if (phoneStartTimeRef.current === null) {
        phoneStartTimeRef.current = now;
        setPhoneHoldDurationMs(0);
      } else {
        const elapsed = now - phoneStartTimeRef.current;
        setPhoneHoldDurationMs(elapsed);

        if (elapsed >= PHONE_CONFIRMATION_THRESHOLD_MS) {
          const strikeNumber = Math.min(violationCount + 1, maxViolations);

          if (!isPhoneViolatingRef.current && now > phoneCooldownRef.current) {
            isPhoneViolatingRef.current = true;
            phoneCooldownRef.current = now + GENERAL_COOLDOWN_MS;
            lastPhoneStrikeTimeRef.current = now;

            playWarningChime();
            onViolationRef.current?.(
              'MOBILE_PHONE_DETECTED',
              `Warning ${strikeNumber}/${maxViolations}: Mobile Phone Detected`,
              'Warning: Mobile phone detected. Please remove your phone.',
              `Suspected mobile phone visible in webcam frame (confidence: ${Math.round(detectedPhoneScore * 100)}%) [Camera Proctor]`
            );
          } else if (
            isPhoneViolatingRef.current &&
            now - lastPhoneStrikeTimeRef.current >= REPEAT_VIOLATION_INTERVAL_MS
          ) {
            lastPhoneStrikeTimeRef.current = now;
            phoneCooldownRef.current = now + GENERAL_COOLDOWN_MS;

            playWarningChime();
            onViolationRef.current?.(
              'MOBILE_PHONE_DETECTED',
              `Warning ${strikeNumber}/${maxViolations}: Mobile Phone Detected (Repeat)`,
              'Warning: Mobile phone detected. Please remove your phone.',
              `Suspected mobile phone remained visible in camera view after prior warning [Camera Proctor]`
            );
          }
        }
      }
    } else {
      phoneStartTimeRef.current = null;
      setPhoneHoldDurationMs(0);
      if (isPhoneViolatingRef.current) {
        isPhoneViolatingRef.current = false;
      }
    }

    // 2. MULTIPLE PERSON VIOLATION PIPELINE
    if (detectedPersons > 1) {
      if (multiPersonStartTimeRef.current === null) {
        multiPersonStartTimeRef.current = now;
        setMultiPersonHoldDurationMs(0);
      } else {
        const elapsed = now - multiPersonStartTimeRef.current;
        setMultiPersonHoldDurationMs(elapsed);

        if (elapsed >= MULTI_PERSON_CONFIRMATION_THRESHOLD_MS) {
          const strikeNumber = Math.min(violationCount + 1, maxViolations);

          if (!isMultiPersonViolatingRef.current && now > multiPersonCooldownRef.current) {
            isMultiPersonViolatingRef.current = true;
            multiPersonCooldownRef.current = now + GENERAL_COOLDOWN_MS;
            lastMultiPersonStrikeTimeRef.current = now;

            playWarningChime();
            onViolationRef.current?.(
              'MULTIPLE_PERSONS_DETECTED',
              `Warning ${strikeNumber}/${maxViolations}: Multiple Persons Detected`,
              'Warning: Another person has been detected. Only the registered student is allowed during the assessment.',
              `${detectedPersons} persons visible in webcam frame [Camera Proctor]`
            );
          } else if (
            isMultiPersonViolatingRef.current &&
            now - lastMultiPersonStrikeTimeRef.current >= REPEAT_VIOLATION_INTERVAL_MS
          ) {
            lastMultiPersonStrikeTimeRef.current = now;
            multiPersonCooldownRef.current = now + GENERAL_COOLDOWN_MS;

            playWarningChime();
            onViolationRef.current?.(
              'MULTIPLE_PERSONS_DETECTED',
              `Warning ${strikeNumber}/${maxViolations}: Multiple Persons Detected (Repeat)`,
              'Warning: Another person has been detected. Only the registered student is allowed during the assessment.',
              `${detectedPersons} persons visible in webcam frame [Camera Proctor]`
            );
          }
        }
      }
    } else {
      multiPersonStartTimeRef.current = null;
      setMultiPersonHoldDurationMs(0);
      if (isMultiPersonViolatingRef.current) {
        isMultiPersonViolatingRef.current = false;
      }
    }

    // 3. STUDENT ABSENCE VIOLATION PIPELINE
    if (detectedPersons === 0) {
      if (faceAbsentStartTimeRef.current === null) {
        faceAbsentStartTimeRef.current = now;
        setFaceAbsentHoldDurationMs(0);
      } else {
        const elapsed = now - faceAbsentStartTimeRef.current;
        setFaceAbsentHoldDurationMs(elapsed);

        if (elapsed >= FACE_ABSENT_THRESHOLD_MS) {
          const strikeNumber = Math.min(violationCount + 1, maxViolations);

          if (!isFaceAbsentViolatingRef.current && now > faceAbsentCooldownRef.current) {
            isFaceAbsentViolatingRef.current = true;
            faceAbsentCooldownRef.current = now + GENERAL_COOLDOWN_MS;
            lastFaceAbsentStrikeTimeRef.current = now;

            playWarningChime();
            onViolationRef.current?.(
              'FACE_NOT_VISIBLE',
              `Warning ${strikeNumber}/${maxViolations}: Student Not Visible`,
              'Warning: Your face is not visible. Please return to your seat.',
              'Candidate face/person absent from webcam frame for >3 seconds [Camera Proctor]'
            );
          } else if (
            isFaceAbsentViolatingRef.current &&
            now - lastFaceAbsentStrikeTimeRef.current >= ABSENCE_REPEAT_INTERVAL_MS
          ) {
            lastFaceAbsentStrikeTimeRef.current = now;
            faceAbsentCooldownRef.current = now + GENERAL_COOLDOWN_MS;

            playWarningChime();
            onViolationRef.current?.(
              'FACE_NOT_VISIBLE',
              `Warning ${strikeNumber}/${maxViolations}: Student Still Absent (Repeat)`,
              'Warning: Your face is not visible. Please return to your seat.',
              'Candidate remained absent from seat after prior absence warning [Camera Proctor]'
            );
          }
        }
      }
    } else {
      faceAbsentStartTimeRef.current = null;
      setFaceAbsentHoldDurationMs(0);
      if (isFaceAbsentViolatingRef.current) {
        isFaceAbsentViolatingRef.current = false;
      }
    }

    // 4. HEAD POSE VIOLATION PIPELINE
    const isHeadViolating = currentPose === 'TURNED_LEFT' || currentPose === 'TURNED_RIGHT';
    if (isHeadViolating && faceVisible && !detectedPhone && detectedPersons === 1) {
      if (lastPoseRef.current !== currentPose || turnStartTimeRef.current === null) {
        turnStartTimeRef.current = now;
        lastPoseRef.current = currentPose;
        setTurnHoldDurationMs(0);
      } else {
        const elapsed = now - turnStartTimeRef.current;
        setTurnHoldDurationMs(elapsed);

        if (elapsed >= HOLD_THRESHOLD_MS && now > headViolationCooldownRef.current) {
          headViolationCooldownRef.current = now + GENERAL_COOLDOWN_MS;
          turnStartTimeRef.current = null;
          setTurnHoldDurationMs(0);

          playWarningChime();
          const dir = currentPose === 'TURNED_LEFT' ? 'Left' : 'Right';
          const strikeNumber = Math.min(violationCount + 1, maxViolations);

          onViolationRef.current?.(
            'LOOKING_AWAY',
            `Warning ${strikeNumber}/${maxViolations}: Head Turned ${dir}`,
            `You turned your head ${dir.toLowerCase()} away from the screen for more than 2 seconds. Please look directly at the assessment screen.`,
            `Head turned ${dir.toLowerCase()} sustained for >2s [Camera Proctor]`
          );
        }
      }
    } else {
      turnStartTimeRef.current = null;
      lastPoseRef.current = currentPose;
      setTurnHoldDurationMs(0);
    }

    if (isActiveRef.current) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [
    cameraState,
    enableMobileDetection,
    isWarningModalOpen,
    modelStatus,
    violationCount,
    maxViolations,
    playWarningChime,
  ]);

  // Start Frame Loop when active
  useEffect(() => {
    if (isActive && cameraState === 'ACTIVE') {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, cameraState, processFrame]);

  // UI Status Helpers
  const getCameraStatusColor = (): string => {
    switch (cameraState) {
      case 'ACTIVE':
        if (phoneDetected || multiPersonDetected || headPose === 'TURNED_LEFT' || headPose === 'TURNED_RIGHT') {
          return '#DC2626';
        }
        if (faceAbsentDetected) return '#D97706';
        return '#16A34A';
      case 'REQUESTING_PERMISSION':
      case 'ATTACHING_STREAM':
      case 'VERIFYING_FRAMES':
      case 'INITIALIZING':
        return '#38BDF8';
      case 'TIMEOUT':
      case 'PERMISSION_DENIED':
      case 'NOT_FOUND':
      case 'BUSY':
      case 'DISCONNECTED':
      case 'ERROR':
      default:
        return '#DC2626';
    }
  };

  const getCameraStatusLabel = (): string => {
    switch (cameraState) {
      case 'ACTIVE':
        if (phoneDetected) return '⚠️ Mobile Phone Detected';
        if (multiPersonDetected) return '⚠️ Multiple People Detected';
        if (faceAbsentDetected) return '⚠️ Face Not Visible';
        if (headPose === 'TURNED_LEFT') return '⚠️ Head Turned Left';
        if (headPose === 'TURNED_RIGHT') return '⚠️ Head Turned Right';
        return '● Physical Webcam Active';
      case 'REQUESTING_PERMISSION':
        return `⏳ Requesting Camera... (${timeoutSecondsLeft}s)`;
      case 'ATTACHING_STREAM':
        return '⏳ Connecting Video Stream...';
      case 'VERIFYING_FRAMES':
        return '⏳ Verifying Video Feed...';
      case 'INITIALIZING':
        return '⏳ Starting Webcam...';
      case 'TIMEOUT':
        return '⚠️ Camera Request Timed Out (15s)';
      case 'PERMISSION_DENIED':
        return '❌ Camera Permission Denied';
      case 'BUSY':
        return '❌ Camera Busy in Another App';
      case 'NOT_FOUND':
        return '❌ No Webcam Detected';
      case 'DISCONNECTED':
        return '⚠️ Camera Disconnected';
      case 'ERROR':
      default:
        return '❌ Camera Hardware Error';
    }
  };

  const getModelStatusColor = (): string => {
    if (modelStatus === 'ERROR') return '#EF4444';
    if (modelStatus === 'LOADING') return '#F59E0B';
    return '#38BDF8';
  };

  const getModelStatusLabel = (): string => {
    if (modelStatus === 'ERROR') return modelError ? `AI Offline: ${modelError}` : 'AI Engine Offline';
    if (modelStatus === 'LOADING') return 'AI Engine Initializing...';
    return 'AI Guard Active (Phone/Head/Presence)';
  };

  return (
    <Box>
      {/* 
        CRITICAL: The Expanded Paper container remains mounted at all times.
        When isMinimized is true, we hide it via display: none so <video> is NEVER unmounted.
      */}
      <Box
        sx={{
          display: isMinimized ? 'none' : 'block',
          position: 'fixed',
          bottom: { xs: 96, sm: 24 },
          right: { xs: 8, sm: 24 },
          zIndex: 9999,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: { xs: 220, sm: 260 },
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: '#0F172A',
            color: '#ffffff',
            border: `2px solid ${getCameraStatusColor()}`,
            boxShadow:
              phoneDetected || multiPersonDetected || faceAbsentDetected
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
              <SecurityIcon sx={{ fontSize: 16, color: phoneDetected ? '#EF4444' : '#38BDF8' }} />
              <Typography
                variant="caption"
                fontWeight={800}
                letterSpacing={0.5}
                sx={{ color: '#E2E8F0', fontSize: '0.72rem' }}
              >
                AI CAMERA PROCTOR
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
          <Box
            sx={{
              position: 'relative',
              width: { xs: 220, sm: 260 },
              height: 165,
              bgcolor: '#000000',
              overflow: 'hidden',
            }}
          >
            {/* The Physical Video Element (Permanently in DOM to avoid race conditions) */}
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
                display: cameraState === 'ACTIVE' ? 'block' : 'none',
              }}
            />

            {/* Hidden downscaled analysis canvas */}
            <canvas ref={canvasRef} width={160} height={120} style={{ display: 'none' }} />

            {/* State Overlay when Camera is NOT Active */}
            {cameraState !== 'ACTIVE' && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: '#0B132B',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  textAlign: 'center',
                }}
              >
                {['INITIALIZING', 'REQUESTING_PERMISSION', 'ATTACHING_STREAM', 'VERIFYING_FRAMES'].includes(
                  cameraState
                ) ? (
                  <>
                    <CircularProgress size={32} sx={{ color: '#38BDF8', mb: 1.25 }} />
                    <Typography variant="caption" fontWeight={700} color="#E2E8F0" sx={{ fontSize: '0.78rem' }}>
                      {cameraState === 'REQUESTING_PERMISSION'
                        ? `Requesting Camera Access... (${timeoutSecondsLeft}s)`
                        : cameraState === 'VERIFYING_FRAMES'
                        ? 'Verifying Video Feed...'
                        : 'Connecting Camera...'}
                    </Typography>
                    <Typography variant="caption" color="#94A3B8" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
                      Please click "Allow" in your browser prompt
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={initCamera}
                      startIcon={<RefreshIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        mt: 1.5,
                        py: 0.25,
                        px: 1.5,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        color: '#38BDF8',
                        borderColor: 'rgba(56, 189, 248, 0.4)',
                        borderRadius: 1.5,
                      }}
                    >
                      Restart Request
                    </Button>
                  </>
                ) : (
                  <>
                    <VideocamOffIcon sx={{ fontSize: 34, color: '#EF4444', mb: 0.5 }} />
                    <Typography variant="caption" fontWeight={800} color="#F87171" sx={{ fontSize: '0.78rem' }}>
                      {cameraState === 'TIMEOUT'
                        ? 'Camera Request Timed Out'
                        : cameraState === 'PERMISSION_DENIED'
                        ? 'Camera Permission Denied'
                        : cameraState === 'BUSY'
                        ? 'Camera In Use by Another App'
                        : cameraState === 'NOT_FOUND'
                        ? 'No Webcam Hardware Found'
                        : cameraState === 'DISCONNECTED'
                        ? 'Camera Disconnected'
                        : 'Camera Access Failed'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="#CBD5E1"
                      sx={{ fontSize: '0.65rem', mt: 0.5, mb: 1.25, lineHeight: 1.35 }}
                    >
                      {cameraError || 'Physical camera stream is required for this assessment.'}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      color="error"
                      onClick={initCamera}
                      startIcon={<RefreshIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        py: 0.35,
                        px: 1.5,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        borderRadius: 1.5,
                      }}
                    >
                      Retry Camera Access
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Overlays when Camera IS Active */}
            {cameraState === 'ACTIVE' && (
              <>
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
                      phoneDetected || multiPersonDetected || faceAbsentDetected
                        ? 'rgba(239, 68, 68, 0.9)'
                        : headPose === 'CENTER'
                        ? 'rgba(56, 189, 248, 0.45)'
                        : 'rgba(239, 68, 68, 0.75)'
                    }`,
                    pointerEvents: 'none',
                  }}
                />

                {/* AI Models Loading Overlay */}
                {modelStatus === 'LOADING' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(15, 23, 42, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      textAlign: 'center',
                    }}
                  >
                    <LinearProgress sx={{ width: '60%', mb: 1, borderRadius: 2 }} />
                    <Typography variant="caption" fontWeight={700} color="#38BDF8" sx={{ fontSize: '0.72rem' }}>
                      Initializing AI Proctor Models...
                    </Typography>
                  </Box>
                )}

                {/* Mobile Phone Warning Overlay */}
                {phoneDetected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(185, 28, 28, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      textAlign: 'center',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    <SmartphoneIcon sx={{ fontSize: 32, color: '#ffffff', mb: 0.5 }} />
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      color="#ffffff"
                      sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
                    >
                      MOBILE PHONE DETECTED!
                    </Typography>
                    <Typography variant="caption" color="#FEE2E2" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
                      Warning: Mobile phone detected. Please remove your phone.
                      {phoneConfidence > 0 ? ` (${Math.round(phoneConfidence * 100)}% conf)` : ''}
                    </Typography>
                    {phoneHoldDurationMs < PHONE_CONFIRMATION_THRESHOLD_MS && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (phoneHoldDurationMs / PHONE_CONFIRMATION_THRESHOLD_MS) * 100)}
                        sx={{
                          width: '80%',
                          height: 5,
                          mt: 1,
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.3)',
                          '& .MuiLinearProgress-bar': { bgcolor: '#ffffff' },
                        }}
                      />
                    )}
                  </Box>
                )}

                {/* Multiple Persons Warning Overlay */}
                {!phoneDetected && multiPersonDetected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(194, 65, 12, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      textAlign: 'center',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 32, color: '#ffffff', mb: 0.5 }} />
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      color="#ffffff"
                      sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
                    >
                      ANOTHER PERSON DETECTED!
                    </Typography>
                    <Typography variant="caption" color="#FFEDD5" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
                      Warning: Another person has been detected ({multiPersonCount} visible). Only the registered
                      student is allowed.
                    </Typography>
                    {multiPersonHoldDurationMs < MULTI_PERSON_CONFIRMATION_THRESHOLD_MS && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (multiPersonHoldDurationMs / MULTI_PERSON_CONFIRMATION_THRESHOLD_MS) * 100)}
                        sx={{
                          width: '80%',
                          height: 5,
                          mt: 1,
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.3)',
                          '& .MuiLinearProgress-bar': { bgcolor: '#ffffff' },
                        }}
                      />
                    )}
                  </Box>
                )}

                {/* Student Absence Warning Overlay */}
                {!phoneDetected && !multiPersonDetected && faceAbsentDetected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(180, 83, 9, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      textAlign: 'center',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    <PersonOffIcon sx={{ fontSize: 32, color: '#ffffff', mb: 0.5 }} />
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      color="#ffffff"
                      sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
                    >
                      FACE NOT VISIBLE!
                    </Typography>
                    <Typography variant="caption" color="#FEF3C7" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
                      Warning: Your face is not visible. Please return to your seat.
                    </Typography>
                    {faceAbsentHoldDurationMs < FACE_ABSENT_THRESHOLD_MS && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (faceAbsentHoldDurationMs / FACE_ABSENT_THRESHOLD_MS) * 100)}
                        sx={{
                          width: '80%',
                          height: 5,
                          mt: 1,
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.3)',
                          '& .MuiLinearProgress-bar': { bgcolor: '#ffffff' },
                        }}
                      />
                    )}
                  </Box>
                )}

                {/* Turn Warning Progress Overlay */}
                {!phoneDetected && !multiPersonDetected && !faceAbsentDetected && turnHoldDurationMs > 0 && (
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
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      color="#ffffff"
                      sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
                    >
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
              </>
            )}
          </Box>

          {/* Footer Status Indicators */}
          <Box
            sx={{
              p: 1.25,
              bgcolor: '#0F172A',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.6,
              borderTop: '1px solid #1E293B',
            }}
          >
            {/* Primary Status (Camera Feed) */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: getCameraStatusColor(),
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{
                    color: getCameraStatusColor(),
                    fontSize: '0.72rem',
                  }}
                >
                  {getCameraStatusLabel()}
                </Typography>
              </Box>
              {videoDimensions && cameraState === 'ACTIVE' && (
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.62rem', fontWeight: 600 }}>
                  {videoDimensions.width}x{videoDimensions.height}
                </Typography>
              )}
            </Box>

            {/* Secondary Status (AI Engine) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: getModelStatusColor(),
                }}
              />
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{
                  color: getModelStatusColor(),
                  fontSize: '0.64rem',
                }}
              >
                {getModelStatusLabel()}
              </Typography>
            </Box>

            {/* Privacy Assurance Caption */}
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                color: '#64748B',
                textAlign: 'center',
                display: 'block',
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              🔒 Local device AI • Zero camera footage stored or sent
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* 
        Minimized Floating Pill Widget:
        Rendered when isMinimized is true, while keeping videoRef safely mounted above.
      */}
      {isMinimized && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: { xs: 96, sm: 24 },
            right: { xs: 8, sm: 24 },
            zIndex: 9999,
            p: 1,
            px: 1.5,
            borderRadius: 6,
            bgcolor: '#0F172A',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            border: `2px solid ${getCameraStatusColor()}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: getCameraStatusColor(),
              animation: phoneDetected || multiPersonDetected || faceAbsentDetected ? 'pulse 1s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.5)', opacity: 0.5 },
                '100%': { transform: 'scale(1)', opacity: 1 },
              },
            }}
          />
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.72rem' }}>
            {phoneDetected
              ? '📱 Phone Detected!'
              : multiPersonDetected
              ? '👥 Multiple People!'
              : faceAbsentDetected
              ? '⚠️ Face Absent!'
              : getCameraStatusLabel()}
          </Typography>
          <Chip
            label={`${violationCount}/${maxViolations}`}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.62rem',
              fontWeight: 800,
              bgcolor: violationCount >= 2 ? '#DC2626' : violationCount === 1 ? '#D97706' : '#334155',
              color: '#fff',
            }}
          />
          <Tooltip title="Expand Camera Monitor">
            <IconButton size="small" onClick={() => setIsMinimized(false)} sx={{ color: '#94A3B8', p: 0.25 }}>
              <OpenInFullIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Paper>
      )}
    </Box>
  );
};
