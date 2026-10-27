
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
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { AttemptViolationType } from '../../types/attempt.types.js';

export type HeadPoseStatus = 'CENTER' | 'TURNED_LEFT' | 'TURNED_RIGHT' | 'NO_FACE';

export interface CameraProctorMonitorProps {
  onViolation: (type: AttemptViolationType, title: string, message: string, details?: string) => void;
  violationCount: number;
  maxViolations?: number;
  isActive: boolean; // True when test has started and active
  onCameraReady?: (ready: boolean) => void;
  enableMobileDetection?: boolean; // Admin configuration toggle
  isWarningModalOpen?: boolean;
}

export type ModelStatus = 'LOADING' | 'READY' | 'ERROR';

export const CameraProctorMonitor: React.FC<CameraProctorMonitorProps> = ({
  onViolation,
  violationCount,
  maxViolations = 3,
  isActive,
  onCameraReady,
  enableMobileDetection = true,
  isWarningModalOpen = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isMobile = useMediaQuery('(max-width:600px)');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCameraDisconnected, setIsCameraDisconnected] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('LOADING');
  const [modelError, setModelError] = useState<string | null>(null);

  const [headPose, setHeadPose] = useState<HeadPoseStatus>('CENTER');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [turnHoldDurationMs, setTurnHoldDurationMs] = useState<number>(0);

  // Real-time Detection States
  const [phoneDetected, setPhoneDetected] = useState<boolean>(false);
  const [phoneConfidence, setPhoneConfidence] = useState<number>(0);
  const [phoneHoldDurationMs, setPhoneHoldDurationMs] = useState<number>(0);

  const [multiPersonDetected, setMultiPersonDetected] = useState<boolean>(false);
  const [multiPersonCount, setMultiPersonCount] = useState<number>(1);
  const [multiPersonHoldDurationMs, setMultiPersonHoldDurationMs] = useState<number>(0);

  const [faceAbsentDetected, setFaceAbsentDetected] = useState<boolean>(false);
  const [faceAbsentHoldDurationMs, setFaceAbsentHoldDurationMs] = useState<number>(0);

  // Simulation test modes (for QA testing scenarios A through H)
  const [isSimulatedPhone, setIsSimulatedPhone] = useState<boolean>(false);
  const [isSimulatedAbsent, setIsSimulatedAbsent] = useState<boolean>(false);
  const [isSimulatedMultiPerson, setIsSimulatedMultiPerson] = useState<boolean>(false);
  const [isSimulatedDisconnect, setIsSimulatedDisconnect] = useState<boolean>(false);
  const [isSimulatedModelError, setIsSimulatedModelError] = useState<boolean>(false);

  // Model & Detection Refs
  const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const isInferringRef = useRef<boolean>(false);

  // Timers and tracking refs for Head Pose
  const turnStartTimeRef = useRef<number | null>(null);
  const lastPoseRef = useRef<HeadPoseStatus>('CENTER');
  const headViolationCooldownRef = useRef<number>(0);

  // Timers and tracking refs for Mobile Phone
  const phoneStartTimeRef = useRef<number | null>(null);
  const phoneCooldownRef = useRef<number>(0);
  const isPhoneViolatingRef = useRef<boolean>(false);
  const lastPhoneStrikeTimeRef = useRef<number>(0);

  // Timers and tracking refs for Multiple Persons
  const multiPersonStartTimeRef = useRef<number | null>(null);
  const multiPersonCooldownRef = useRef<number>(0);
  const isMultiPersonViolatingRef = useRef<boolean>(false);
  const lastMultiPersonStrikeTimeRef = useRef<number>(0);

  // Timers and tracking refs for Face Absence
  const faceAbsentStartTimeRef = useRef<number | null>(null);
  const faceAbsentCooldownRef = useRef<number>(0);
  const isFaceAbsentViolatingRef = useRef<boolean>(false);
  const lastFaceAbsentStrikeTimeRef = useRef<number>(0);

  // Tracking ref for Camera Disconnect
  const disconnectCooldownRef = useRef<number>(0);

  // Thresholds
  const HOLD_THRESHOLD_MS = 2000; // 2.0s head turn sustained triggers warning
  const PHONE_CONFIRMATION_THRESHOLD_MS = 500; // 500ms multi-frame temporal confirmation
  const MULTI_PERSON_CONFIRMATION_THRESHOLD_MS = 750; // 750ms multi-frame confirmation
  const FACE_ABSENT_THRESHOLD_MS = 3000; // 3.0s prolonged absence triggers warning (not brief blinks)

  const GENERAL_COOLDOWN_MS = 5000; // 5.0s deduplication cooldown for same incident
  const REPEAT_VIOLATION_INTERVAL_MS = 7000; // Repeat violation policy: re-triggers if condition remains visible
  const ABSENCE_REPEAT_INTERVAL_MS = 8000; // Repeat violation policy for prolonged absence

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
      // Audio playback restrictions
    }
  }, []);

  // Initialize and load COCO-SSD object detection model
  const loadDetectionModel = useCallback(async () => {
    setModelStatus('LOADING');
    setModelError(null);
    try {
      await tf.ready();
      // Load lightweight MobileNetV2 SSD model
      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      cocoModelRef.current = model;
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

  // Initialize Camera Stream
  const initCamera = useCallback(async () => {
    try {
      setPermissionError(null);
      setIsCameraDisconnected(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media devices API is not supported in this browser.');
      }

      // Stop existing tracks if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // ZERO AUDIO RECORDED
      });

      streamRef.current = stream;

      // Handle camera disconnect / track ended
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setIsCameraDisconnected(true);
        };
        videoTrack.onmute = () => {
          setIsCameraDisconnected(true);
        };
        videoTrack.onunmute = () => {
          setIsCameraDisconnected(false);
        };
      }

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

  // Device disconnect listener
  useEffect(() => {
    const handleDeviceChange = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoDevice = devices.some((d) => d.kind === 'videoinput');
        if (!hasVideoDevice) {
          setIsCameraDisconnected(true);
        }
      } catch {
        // Device check error
      }
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, []);

  // Lifecycle: Start Camera on mount
  useEffect(() => {
    initCamera();

    return () => {
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

  // Handle Camera Disconnect Violation
  useEffect(() => {
    const isDisconnected = isCameraDisconnected || isSimulatedDisconnect;
    if (!isActive || !isDisconnected) return;

    const now = Date.now();
    if (now > disconnectCooldownRef.current && !isWarningModalOpen) {
      disconnectCooldownRef.current = now + GENERAL_COOLDOWN_MS;
      playWarningChime();
      const strikeNumber = Math.min(violationCount + 1, maxViolations);
      onViolation(
        'CAMERA_DISCONNECTED',
        `Warning ${strikeNumber}/${maxViolations}: Camera Disconnected`,
        'Warning: Camera disconnected. Please reconnect your camera immediately to continue your assessment.',
        'Camera video feed stream interrupted or disconnected [Camera Proctor]'
      );
    }
  }, [
    isCameraDisconnected,
    isSimulatedDisconnect,
    isActive,
    isWarningModalOpen,
    violationCount,
    maxViolations,
    onViolation,
    playWarningChime,
  ]);

  // Main Detection Loop (runs at ~10-12 FPS via requestAnimationFrame)
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || !isActive) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = Date.now();
    const effectiveModelError = modelStatus === 'ERROR' || isSimulatedModelError;

    // Check if camera disconnected
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && (track.readyState === 'ended' || !track.enabled)) {
        setIsCameraDisconnected(true);
      }
    }

    // Run deep learning object detection inference every ~250ms when model is ready
    let detectedPhone = false;
    let detectedPhoneScore = 0;
    let detectedPersons = 1;
    let faceVisible = true;
    let currentPose: HeadPoseStatus = 'CENTER';

    if (cocoModelRef.current && !effectiveModelError && !isInferringRef.current && now - lastInferenceTimeRef.current >= 240) {
      isInferringRef.current = true;
      lastInferenceTimeRef.current = now;

      try {
        const predictions = await cocoModelRef.current.detect(video);

        // 1. Mobile Phone Detection
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
        detectedPersons = personPreds.length;

        // 3. Face / Student Absence check
        if (detectedPersons === 0) {
          faceVisible = false;
        }
      } catch (err) {
        console.warn('Inference error in proctor monitor:', err);
      } finally {
        isInferringRef.current = false;
      }
    }

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
          // If no skin cluster found and person count is 0, candidate is definitely absent
          if (detectedPersons === 0) {
            faceVisible = false;
          }
        } else {
          faceVisible = true;
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
        // Fallback
      }
    }

    // Apply simulation overrides (for QA testing scenarios B, C, D, H)
    if (isSimulatedPhone) {
      detectedPhone = true;
      detectedPhoneScore = 0.96;
    }
    if (isSimulatedAbsent) {
      faceVisible = false;
      detectedPersons = 0;
      currentPose = 'NO_FACE';
    }
    if (isSimulatedMultiPerson) {
      detectedPersons = 2;
    }

    setPhoneDetected(detectedPhone);
    setPhoneConfidence(detectedPhoneScore);
    setMultiPersonDetected(detectedPersons > 1);
    setMultiPersonCount(detectedPersons);
    setFaceAbsentDetected(!faceVisible);
    setHeadPose(currentPose);

    // Skip violations if warning modal is currently open or proctor inactive
    if (isWarningModalOpen || effectiveModelError) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // -------------------------------------------------------------
    // 1. MOBILE PHONE VIOLATION PIPELINE
    // -------------------------------------------------------------
    if (enableMobileDetection && detectedPhone) {
      if (phoneStartTimeRef.current === null) {
        phoneStartTimeRef.current = now;
        setPhoneHoldDurationMs(0);
      } else {
        const elapsed = now - phoneStartTimeRef.current;
        setPhoneHoldDurationMs(elapsed);

        if (elapsed >= PHONE_CONFIRMATION_THRESHOLD_MS) {
          const strikeNumber = Math.min(violationCount + 1, maxViolations);

          // Initial strike outside cooldown
          if (!isPhoneViolatingRef.current && now > phoneCooldownRef.current) {
            isPhoneViolatingRef.current = true;
            phoneCooldownRef.current = now + GENERAL_COOLDOWN_MS;
            lastPhoneStrikeTimeRef.current = now;

            playWarningChime();
            onViolation(
              'MOBILE_PHONE_DETECTED',
              `Warning ${strikeNumber}/${maxViolations}: Mobile Phone Detected`,
              'Warning: Mobile phone detected. Please remove your phone.',
              `Suspected mobile phone visible in webcam frame (confidence: ${Math.round(detectedPhoneScore * 100)}%) [Camera Proctor]`
            );
          }
          // Repeat violation policy if phone remains visible
          else if (
            isPhoneViolatingRef.current &&
            now - lastPhoneStrikeTimeRef.current >= REPEAT_VIOLATION_INTERVAL_MS
          ) {
            lastPhoneStrikeTimeRef.current = now;
            phoneCooldownRef.current = now + GENERAL_COOLDOWN_MS;

            playWarningChime();
            onViolation(
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

    // -------------------------------------------------------------
    // 2. MULTIPLE PERSON VIOLATION PIPELINE
    // -------------------------------------------------------------
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
            onViolation(
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
            onViolation(
              'MULTIPLE_PERSONS_DETECTED',
              `Warning ${strikeNumber}/${maxViolations}: Multiple Persons Detected (Repeat)`,
              'Warning: Another person has been detected. Only the registered student is allowed during the assessment.',
              `Multiple persons remained visible in webcam frame after prior warning [Camera Proctor]`
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

    // -------------------------------------------------------------
    // 3. STUDENT ABSENCE VIOLATION PIPELINE (Prolonged >= 3.0s)
    // -------------------------------------------------------------
    if (!faceVisible && !isCameraDisconnected && !isSimulatedDisconnect) {
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
            onViolation(
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
            onViolation(
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

    // -------------------------------------------------------------
    // 4. HEAD POSE VIOLATION PIPELINE (Turned Away >= 2.0s)
    // -------------------------------------------------------------
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

          onViolation(
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

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [
    isActive,
    enableMobileDetection,
    isWarningModalOpen,
    modelStatus,
    isSimulatedModelError,
    isSimulatedPhone,
    isSimulatedAbsent,
    isSimulatedMultiPerson,
    isSimulatedDisconnect,
    isCameraDisconnected,
    violationCount,
    maxViolations,
    onViolation,
    playWarningChime,
  ]);

  // Start Frame Loop
  useEffect(() => {
    if (isActive && hasPermission) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, hasPermission, processFrame]);

  // Keyboard shortcut for developer / QA simulation test:
  // Alt+P: Phone, Alt+A: Absent, Alt+M: Multi-Person, Alt+D: Disconnect, Alt+E: Model Error
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === 'p' || e.key === 'P') {
        setIsSimulatedPhone((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        setIsSimulatedAbsent((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsSimulatedMultiPerson((prev) => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        setIsSimulatedDisconnect((prev) => !prev);
      } else if (e.key === 'e' || e.key === 'E') {
        setIsSimulatedModelError((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Status Color Helper
  const getStatusColor = () => {
    if (modelStatus === 'ERROR' || isSimulatedModelError) return '#DC2626';
    if (modelStatus === 'LOADING') return '#38BDF8';
    if (isCameraDisconnected || isSimulatedDisconnect) return '#DC2626';
    if (phoneDetected) return '#DC2626';
    if (multiPersonDetected) return '#DC2626';
    if (faceAbsentDetected) return '#D97706';
    if (headPose === 'TURNED_LEFT' || headPose === 'TURNED_RIGHT') return '#DC2626';
    return '#16A34A';
  };

  const getStatusLabel = () => {
    if (modelStatus === 'ERROR' || isSimulatedModelError) return '❌ AI Model Failed';
    if (modelStatus === 'LOADING') return '⏳ Initializing Models...';
    if (isCameraDisconnected || isSimulatedDisconnect) return '⚠️ Camera Disconnected';
    if (phoneDetected) return '⚠️ Mobile Phone Detected';
    if (multiPersonDetected) return '⚠️ Multiple People Detected';
    if (faceAbsentDetected) return '⚠️ Face Not Visible';
    if (headPose === 'TURNED_LEFT') return '⚠️ Head Turned Left';
    if (headPose === 'TURNED_RIGHT') return '⚠️ Head Turned Right';
    return enableMobileDetection ? '● Proctor Active • In View' : '● Looking at Screen (OK)';
  };

  // If permission denied / camera unavailable
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

  // Model Initialization Failure Alert (Requirement H)
  if ((modelStatus === 'ERROR' || isSimulatedModelError) && !isMinimized) {
    return (
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: { xs: 96, sm: 24 },
          right: { xs: 8, sm: 24 },
          zIndex: 9999,
          width: { xs: 240, sm: 260 },
          p: 2,
          borderRadius: 3,
          bgcolor: '#1E1B4B',
          border: '2px solid #EF4444',
          color: '#ffffff',
          boxShadow: '0 12px 30px rgba(239, 68, 68, 0.35)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#F87171' }}>
          <ErrorOutlineIcon sx={{ fontSize: 22 }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.82rem' }}>
            AI Proctor Load Error
          </Typography>
        </Box>
        <Typography variant="caption" color="#E2E8F0" sx={{ display: 'block', mb: 1.5, lineHeight: 1.4, fontSize: '0.72rem' }}>
          {modelError || 'AI detection model failed to load. Monitoring cannot proceed until model initializes.'}
        </Typography>
        <Button
          variant="contained"
          color="error"
          size="small"
          fullWidth
          startIcon={<RefreshIcon />}
          onClick={() => {
            setIsSimulatedModelError(false);
            loadDetectionModel();
          }}
          sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
        >
          Retry Loading Model
        </Button>
      </Paper>
    );
  }

  // Minimized Widget
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
            animation: phoneDetected || multiPersonDetected || faceAbsentDetected ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.5)', opacity: 0.5 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        />
        <Typography variant="caption" fontWeight={700}>
          {phoneDetected
            ? '📱 Phone Detected!'
            : multiPersonDetected
            ? '👥 Multiple People!'
            : faceAbsentDetected
            ? '⚠️ Face Absent!'
            : getStatusLabel()}
        </Typography>
        <Chip
          label={`${violationCount}/${maxViolations} Strikes`}
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

  // Floating Camera Monitor Widget
  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: { xs: 96, sm: 24 },
        right: { xs: 8, sm: 24 },
        zIndex: 9999,
        width: { xs: 210, sm: 250 },
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: '#0F172A',
        color: '#ffffff',
        border: `2px solid ${getStatusColor()}`,
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
      <Box sx={{ position: 'relative', width: { xs: 210, sm: 250 }, height: 160, bgcolor: '#000000', overflow: 'hidden' }}>
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
              phoneDetected || multiPersonDetected || faceAbsentDetected
                ? 'rgba(239, 68, 68, 0.9)'
                : headPose === 'CENTER'
                ? 'rgba(56, 189, 248, 0.45)'
                : 'rgba(239, 68, 68, 0.75)'
            }`,
            pointerEvents: 'none',
          }}
        />

        {/* Model Loading Overlay */}
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

        {/* Camera Disconnected Warning Overlay */}
        {(isCameraDisconnected || isSimulatedDisconnect) && (
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
            <VideocamOffIcon sx={{ fontSize: 32, color: '#ffffff', mb: 0.5 }} />
            <Typography variant="caption" fontWeight={900} color="#ffffff" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              CAMERA DISCONNECTED!
            </Typography>
            <Typography variant="caption" color="#FEE2E2" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
              Please reconnect your camera immediately
            </Typography>
          </Box>
        )}

        {/* Phone Detection Warning Overlay (Requirement 1) */}
        {!isCameraDisconnected && !isSimulatedDisconnect && phoneDetected && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(185, 28, 28, 0.82)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1.5,
              textAlign: 'center',
              backdropFilter: 'blur(2px)',
              animation: 'alertPulse 0.8s ease-in-out infinite alternate',
              '@keyframes alertPulse': {
                '0%': { bgcolor: 'rgba(185, 28, 28, 0.78)' },
                '100%': { bgcolor: 'rgba(220, 38, 38, 0.90)' },
              },
            }}
          >
            <SmartphoneIcon sx={{ fontSize: 32, color: '#ffffff', mb: 0.5 }} />
            <Typography variant="caption" fontWeight={900} color="#ffffff" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              MOBILE PHONE DETECTED!
            </Typography>
            <Typography variant="caption" color="#FEE2E2" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
              Warning: Mobile phone detected. Please remove your phone.{phoneConfidence > 0 ? ` (${Math.round(phoneConfidence * 100)}% confidence)` : ''}
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

        {/* Multiple Persons Warning Overlay (Requirement 3) */}
        {!isCameraDisconnected && !isSimulatedDisconnect && !phoneDetected && multiPersonDetected && (
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
            <Typography variant="caption" fontWeight={900} color="#ffffff" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              ANOTHER PERSON DETECTED!
            </Typography>
            <Typography variant="caption" color="#FFEDD5" sx={{ fontSize: '0.68rem', mt: 0.5 }}>
              Warning: Another person has been detected ({multiPersonCount} visible). Only the registered student is allowed during the assessment.
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

        {/* Student Absence Warning Overlay (Requirement 2) */}
        {!isCameraDisconnected && !isSimulatedDisconnect && !phoneDetected && !multiPersonDetected && faceAbsentDetected && (
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
            <Typography variant="caption" fontWeight={900} color="#ffffff" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
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
        {!isCameraDisconnected && !phoneDetected && !multiPersonDetected && !faceAbsentDetected && turnHoldDurationMs > 0 && (
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

      {/* Footer Status & QA Simulation Controls */}
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

          {/* QA Test Simulation Action Bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Tooltip title={isSimulatedPhone ? 'Disable Phone Simulation' : 'Test: Simulate Phone Detection (Alt+P)'}>
              <IconButton
                size="small"
                onClick={() => setIsSimulatedPhone((p) => !p)}
                sx={{
                  p: 0.25,
                  color: isSimulatedPhone ? '#EF4444' : '#64748B',
                  '&:hover': { color: '#EF4444' },
                }}
              >
                <SmartphoneIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={isSimulatedAbsent ? 'Disable Absent Simulation' : 'Test: Simulate Face Absent (Alt+A)'}>
              <IconButton
                size="small"
                onClick={() => setIsSimulatedAbsent((p) => !p)}
                sx={{
                  p: 0.25,
                  color: isSimulatedAbsent ? '#D97706' : '#64748B',
                  '&:hover': { color: '#D97706' },
                }}
              >
                <PersonOffIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={isSimulatedMultiPerson ? 'Disable Multi-Person Simulation' : 'Test: Simulate Multiple People (Alt+M)'}>
              <IconButton
                size="small"
                onClick={() => setIsSimulatedMultiPerson((p) => !p)}
                sx={{
                  p: 0.25,
                  color: isSimulatedMultiPerson ? '#F97316' : '#64748B',
                  '&:hover': { color: '#F97316' },
                }}
              >
                <PeopleIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={isSimulatedDisconnect ? 'Restore Camera' : 'Test: Simulate Camera Disconnect (Alt+D)'}>
              <IconButton
                size="small"
                onClick={() => setIsSimulatedDisconnect((p) => !p)}
                sx={{
                  p: 0.25,
                  color: isSimulatedDisconnect ? '#DC2626' : '#64748B',
                  '&:hover': { color: '#DC2626' },
                }}
              >
                <VideocamOffIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={isSimulatedModelError ? 'Clear Model Error' : 'Test: Simulate Model Load Error (Alt+E)'}>
              <IconButton
                size="small"
                onClick={() => setIsSimulatedModelError((p) => !p)}
                sx={{
                  p: 0.25,
                  color: isSimulatedModelError ? '#EF4444' : '#64748B',
                  '&:hover': { color: '#EF4444' },
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
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
          🔒 Local device AI • Zero camera footage stored or sent
        </Typography>
      </Box>
    </Paper>
  );
};
