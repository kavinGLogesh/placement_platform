import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormGroup,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SyncIcon from '@mui/icons-material/Sync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SecurityIcon from '@mui/icons-material/Security';
import BlockIcon from '@mui/icons-material/Block';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service.js';
import { QuestionContentRenderer } from '../../components/common/QuestionContentRenderer.js';
import {
  AssessmentAttemptDto,
  SanitizedPaperQuestionDto,
  SaveAnswerDto,
  AttemptViolationType,
} from '../../types/attempt.types.js';
import { MonacoCodingWorkspace } from '../../components/coding/MonacoCodingWorkspace.js';
import { CameraProctorMonitor } from '../../components/proctoring/CameraProctorMonitor.js';

type SyncStatus = 'SAVED' | 'SYNCING' | 'OFFLINE';

export const StudentAttemptPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [attempt, setAttempt] = useState<AssessmentAttemptDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Map<string, SaveAnswerDto>>(new Map());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('SAVED');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Anti-Cheating & Fullscreen Enforcement
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationWarningOpen, setViolationWarningOpen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [recordedViolations, setRecordedViolations] = useState<
    Array<{ type: AttemptViolationType; title: string; message: string; timestamp: string }>
  >([]);
  const [lastViolationReason, setLastViolationReason] = useState<{ title: string; message: string; type?: AttemptViolationType }>({
    title: 'Integrity Violation Detected',
    message: 'An integrity violation has been recorded.',
  });
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const hasEnteredFullscreenRef = useRef(false);
  const lastViolationTimeRef = useRef<{ type: AttemptViolationType; time: number } | null>(null);
  const mountTimeRef = useRef(Date.now());

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSubmittingRef = useRef(false);

  // Assessment-Only Fullscreen Handlers
  const exitFullscreen = useCallback(async () => {
    hasEnteredFullscreenRef.current = false;
    try {
      const inFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (inFs) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Failed to exit fullscreen cleanly:', err);
    }
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      setViolationWarningOpen(false);
      hasEnteredFullscreenRef.current = true;
      return true;
    } catch {
      // Browser permission or user gesture restriction
      setIsFullscreen(false);
      return false;
    }
  }, []);

  // Auto-redirect to student dashboard when terminated
  useEffect(() => {
    if (!isTerminated) return;
    setRedirectCountdown(8);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          exitFullscreen().catch(() => {});
          navigate('/student/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTerminated, exitFullscreen, navigate]);

  // Cleanup: Guarantee fullscreen is always exited if component unmounts (student leaves test page)
  useEffect(() => {
    return () => {
      hasEnteredFullscreenRef.current = false;
      const inFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (inFs) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    };
  }, []);

  // 1. Load Attempt
  useEffect(() => {
    if (!attemptId) return;

    let mounted = true;
    const fetchAttempt = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await attemptService.getAttempt(attemptId);
        if (!mounted) return;

        setAttempt(data);
        if (typeof data.violationCount === 'number') {
          setViolationCount(data.violationCount);
          if (data.violationCount >= 3) {
            setIsTerminated(true);
            isAutoSubmittingRef.current = true;
          }
        }

        if (data.violations && Array.isArray(data.violations)) {
          setRecordedViolations(
            data.violations.map((v) => ({
              type: v.violationType,
              title: v.violationType.replace(/_/g, ' '),
              message: v.details || 'Integrity violation detected',
              timestamp: new Date(v.timestamp).toLocaleTimeString(),
            }))
          );
        }

        // If already submitted/expired or disqualified, exit fullscreen and redirect to dashboard
        if (data.status !== 'IN_PROGRESS' || (typeof data.violationCount === 'number' && data.violationCount >= 3)) {
          await exitFullscreen();
          navigate('/student/dashboard');
          return;
        }

        // Restore initial answers map
        const initialMap = new Map<string, SaveAnswerDto>();
        (data.answers || []).forEach((ans) => {
          initialMap.set(ans.questionId, {
            questionId: ans.questionId,
            selectedOptionIds: ans.selectedOptionIds || [],
            textAnswer: ans.textAnswer || '',
            isMarkedForReview: ans.isMarkedForReview,
            version: ans.version,
          });
        });
        setAnswersMap(initialMap);

        // Restore current question index if available
        if (data.currentQuestion && data.questions && data.questions.length >= data.currentQuestion) {
          setCurrentIndex(data.currentQuestion - 1);
        }

        // Calculate initial remaining time from authoritative expectedEndTime
        const remaining = Math.max(
          0,
          Math.floor((new Date(data.expectedEndTime).getTime() - Date.now()) / 1000)
        );
        setTimeLeftSeconds(remaining);

        // Check fullscreen status for active attempt
        const inFs = Boolean(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );

        if (inFs) {
          setIsFullscreen(true);
          hasEnteredFullscreenRef.current = true;
        } else {
          setIsFullscreen(false);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : 'Failed to load attempt';
        setError(msg || 'Failed to load attempt');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAttempt();

    return () => {
      mounted = false;
    };
  }, [attemptId, navigate, location.state, enterFullscreen, exitFullscreen]);

  const handleTimeExpired = useCallback(async () => {
    if (isAutoSubmittingRef.current || !attemptId) return;
    isAutoSubmittingRef.current = true;
    setSyncStatus('SYNCING');
    try {
      const res = await attemptService.submitAttempt(attemptId);
      await exitFullscreen();
      navigate(`/student/results/${res.id}`);
    } catch {
      await exitFullscreen();
      navigate('/student/results');
    }
  }, [attemptId, navigate, exitFullscreen]);

  // 2. Authoritative Timer Countdown & Auto-Submit
  useEffect(() => {
    if (timeLeftSeconds === null) return;

    const timerInterval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timeLeftSeconds, handleTimeExpired]);

  // 3. Online/Offline Network Listener
  useEffect(() => {
    const handleOnline = async () => {
      if (!attemptId) return;
      setSyncStatus('SYNCING');
      try {
        await attemptService.flushPendingOfflineAnswers(attemptId);
        setSyncStatus('SAVED');
      } catch {
        setSyncStatus('OFFLINE');
      }
    };

    const handleOffline = () => {
      setSyncStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [attemptId]);

  // 3b. Anti-Cheating: Authoritative Violation Reporter with 3-Strike Enforcement
  const triggerViolation = useCallback(
    async (
      type: AttemptViolationType,
      title: string,
      message: string,
      details?: string
    ) => {
      if (!attemptId || isAutoSubmittingRef.current || isTerminated) return;

      const now = Date.now();
      const last = lastViolationTimeRef.current;

      // 1. Cooldown deduplication: ignore exact same violation within 1500ms
      if (last && last.type === type && now - last.time < 1500) {
        return;
      }

      // 2. Tab-switch vs window-blur deduplication: Chromium fires blur when switching tabs
      if (type === 'WINDOW_BLUR' && last && last.type === 'TAB_SWITCH' && now - last.time < 1500) {
        return;
      }

      lastViolationTimeRef.current = { type, time: now };

      const nextCount = violationCount + 1;
      setViolationCount(nextCount);
      setLastViolationReason({ title, message, type });
      setRecordedViolations((prev) => [
        ...prev,
        {
          type,
          title,
          message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // 3. Sequential Warning System: auto-terminate after confirmed limit (default 3 warnings) unless configured to WARN_ONLY
      const configuredLimit = (attempt?.assessment as any)?.maxViolations;
      const maxAllowed = typeof configuredLimit === 'number' && configuredLimit > 0 ? configuredLimit : 3;
      const terminationAction = (attempt?.assessment as any)?.terminationAction || 'AUTO_SUBMIT';
      const shouldAutoTerminate = terminationAction !== 'WARN_ONLY' && nextCount >= maxAllowed;

      if (shouldAutoTerminate) {
        isAutoSubmittingRef.current = true;
        setIsTerminated(true);
        setViolationWarningOpen(false);
        exitFullscreen().catch(() => {});

        // Flush offline & auto-save answers first to securely preserve all work
        try {
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
          }
          await attemptService.flushPendingOfflineAnswers(attemptId);
        } catch {
          // Ignore
        }

        try {
          await attemptService.recordViolation(attemptId, {
            violationType: type,
            details: `${details || ''} [TERMINATED: ${maxAllowed} WARNINGS REACHED]`,
            clientTimestamp: new Date().toISOString(),
          });
        } catch {
          // Ignore
        }

        try {
          await attemptService.submitAttempt(attemptId);
        } catch (err) {
          console.warn('Auto-submit on warning limit error:', err);
        }
        return;
      }

      // 4. Show Warning Modal
      setViolationWarningOpen(true);

      // Asynchronously persist violation to authoritative backend
      try {
        const res = await attemptService.recordViolation(attemptId, {
          violationType: type,
          details,
          clientTimestamp: new Date().toISOString(),
        });
        if (res && typeof res.violationCount === 'number') {
          setViolationCount(res.violationCount);
          if (res.isTerminated || (res.violationCount >= maxAllowed && terminationAction !== 'WARN_ONLY')) {
            setIsTerminated(true);
            setViolationWarningOpen(false);
            exitFullscreen().catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Failed to record violation on server:', err);
      }
    },
    [attemptId, violationCount, isTerminated, exitFullscreen, attempt?.assessment]
  );

  // 3d. Fullscreen Change Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(inFs);

      if (!inFs && hasEnteredFullscreenRef.current && !isAutoSubmittingRef.current && !isTerminated) {
        triggerViolation(
          'FULLSCREEN_EXIT',
          'Full-Screen Mode Exited',
          'You exited full-screen mode. Examinations must be taken strictly in full-screen lockdown. Please return to full-screen immediately.',
          'Candidate exited full-screen lockdown'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [triggerViolation, isTerminated]);

  // 3e. Page Visibility API Listener (Tab Switch Detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isAutoSubmittingRef.current && !isTerminated) {
        triggerViolation(
          'TAB_SWITCH',
          'Tab Switch / Application Hidden',
          'You navigated away from the active examination tab. Tab switching is strictly prohibited and logged as an integrity violation.',
          'Page Visibility API detected visibilityState: hidden'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerViolation, isTerminated]);

  // 3f. Browser / Window Focus & Blur Detection
  useEffect(() => {
    const handleWindowBlur = () => {
      if (document.visibilityState === 'hidden' || isAutoSubmittingRef.current || isTerminated) return;
      if (Date.now() - mountTimeRef.current < 2500) return;

      triggerViolation(
        'WINDOW_BLUR',
        'Window Focus Lost',
        'Your examination window lost focus or an external application/overlay was activated. Please maintain focus strictly on this examination.',
        'Window blur event detected'
      );
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [triggerViolation, isTerminated]);

  // 3g. Screenshot, DevTools & Shortcut Interception
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAutoSubmittingRef.current || isTerminated) return;

      const target = e.target as HTMLElement | null;
      const isCodeEditor = Boolean(target?.closest('.monaco-editor, .monaco-diff-editor, [data-monaco-editor]'));
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || Boolean(target?.closest('input, textarea, [contenteditable="true"]'));

      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
        triggerViolation(
          'SCREENSHOT_ATTEMPT',
          'Screenshot Command Intercepted',
          'Screen capture shortcuts (PrintScreen) are prohibited during official examinations and have been recorded as an integrity violation.',
          'PrintScreen keypress intercepted'
        );
        return;
      }

      // Windows Snipping Tool (Meta+Shift+S / Win+Shift+S / Ctrl+Shift+S)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          'SCREENSHOT_ATTEMPT',
          'Snipping Tool Intercepted',
          'Screen snipping and capture shortcuts are strictly prohibited during official examinations.',
          'Snipping shortcut (Meta/Ctrl+Shift+S) intercepted'
        );
        return;
      }

      // Mac screenshot combos (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          'SCREENSHOT_ATTEMPT',
          'Screen Capture Shortcut Intercepted',
          'Screen capture shortcuts (Cmd+Shift+3/4/5) are strictly prohibited during official examinations.',
          'Mac screenshot shortcut intercepted'
        );
        return;
      }

      // Print / PDF export key combos: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          'SCREENSHOT_ATTEMPT',
          'Print Command Intercepted',
          'Print and PDF export shortcuts (Ctrl+P / Cmd+P) are prohibited during official examinations and have been recorded.',
          'Ctrl+P / Cmd+P keypress intercepted'
        );
        return;
      }

      // Copy / Cut shortcuts outside input/textarea and outside code editor
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (!isInput && !isCodeEditor) {
          e.preventDefault();
          e.stopPropagation();
          triggerViolation(
            'CLIPBOARD_COPY',
            'Text Copying Prohibited',
            'Copying question text or examination materials is strictly prohibited and recorded as an integrity violation.',
            'Ctrl+C / Cmd+C shortcut intercepted'
          );
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        if (!isInput && !isCodeEditor) {
          e.preventDefault();
          e.stopPropagation();
          triggerViolation(
            'CLIPBOARD_CUT',
            'Text Cutting Prohibited',
            'Cutting examination content is prohibited and recorded as an integrity violation.',
            'Ctrl+X / Cmd+X shortcut intercepted'
          );
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (!isInput && !isCodeEditor) {
          e.preventDefault();
          e.stopPropagation();
          triggerViolation(
            'CLIPBOARD_PASTE',
            'Unauthorized Paste Attempt',
            'Pasting external content outside answer inputs is prohibited and recorded as an integrity violation.',
            'Ctrl+V / Cmd+V shortcut intercepted'
          );
          return;
        }
      }

      // DevTools shortcuts: F12, Ctrl+Shift+I/J/C, Ctrl+U
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          'WINDOW_BLUR',
          'Developer Tools / Inspection Blocked',
          'Opening browser developer tools or viewing page source is prohibited during examinations.',
          'DevTools shortcut intercepted'
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [triggerViolation, isTerminated]);

  // 3h. Clipboard, Context Menu, and Selection Prevention Listeners (with Code Editor Exemption)
  useEffect(() => {
    const isInsideCodeEditor = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      return Boolean(el?.closest('.monaco-editor, .monaco-diff-editor, [data-monaco-editor]'));
    };

    const isInsideTextInput = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      return Boolean(el?.closest('input, textarea, [contenteditable="true"]'));
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (isInsideCodeEditor(e.target)) return;
      e.preventDefault();
      triggerViolation(
        'RIGHT_CLICK',
        'Right-Click / Context Menu Blocked',
        'Right-clicking and context menu inspection are disabled during this examination and recorded as an integrity violation.',
        'Right-click context menu event intercepted'
      );
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (isInsideCodeEditor(e.target)) return;
      e.preventDefault();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {});
      }
      triggerViolation(
        'CLIPBOARD_COPY',
        'Text Copying Prohibited',
        'Attempting to copy exam questions or content is strictly prohibited and has been recorded as an integrity violation.',
        'Clipboard copy event blocked'
      );
    };

    const handleCut = (e: ClipboardEvent) => {
      if (isInsideCodeEditor(e.target) || isInsideTextInput(e.target)) return;
      e.preventDefault();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {});
      }
      triggerViolation(
        'CLIPBOARD_CUT',
        'Text Cutting Prohibited',
        'Cutting examination content is prohibited and recorded as an integrity violation.',
        'Clipboard cut event blocked'
      );
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (isInsideCodeEditor(e.target) || isInsideTextInput(e.target)) {
        return; // Allow pasting code in editor or text in input answers
      }
      e.preventDefault();
      triggerViolation(
        'CLIPBOARD_PASTE',
        'Unauthorized Paste Attempt',
        'Pasting external content into the examination interface is strictly prohibited.',
        'Clipboard paste event blocked outside input/editor'
      );
    };

    const handleSelectStart = (e: Event) => {
      if (isInsideCodeEditor(e.target) || isInsideTextInput(e.target)) {
        return; // Allow selecting code in editor or text in input
      }
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      if (isInsideCodeEditor(e.target) || isInsideTextInput(e.target)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, [triggerViolation]);

  // 4. Current Question & Options
  const questions = attempt?.questions || [];
  const currentQuestion: SanitizedPaperQuestionDto | undefined = questions[currentIndex];
  const currentAnswer = currentQuestion ? answersMap.get(currentQuestion.questionId) : undefined;

  // 5. Answer Update & Debounced Auto-Save
  const updateAnswer = (partial: Partial<SaveAnswerDto>) => {
    if (!currentQuestion || !attemptId) return;

    const existing = answersMap.get(currentQuestion.questionId) || {
      questionId: currentQuestion.questionId,
      selectedOptionIds: [],
      textAnswer: '',
      isMarkedForReview: false,
    };

    const updated: SaveAnswerDto = {
      ...existing,
      ...partial,
      currentQuestion: currentIndex + 1,
    };

    const newMap = new Map(answersMap);
    newMap.set(currentQuestion.questionId, updated);
    setAnswersMap(newMap);

    // Auto-save with debouncing
    setSyncStatus('SYNCING');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await attemptService.saveAnswer(attemptId, updated);
        setSyncStatus('SAVED');
      } catch {
        setSyncStatus('OFFLINE');
      }
    }, 400);
  };

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    if (currentQuestion.questionType === 'SINGLE_CHOICE' || currentQuestion.questionType === 'TRUE_FALSE') {
      updateAnswer({ selectedOptionIds: [optionId] });
    } else if (currentQuestion.questionType === 'MULTIPLE_CHOICE') {
      const selected = currentAnswer?.selectedOptionIds || [];
      const newSelected = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      updateAnswer({ selectedOptionIds: newSelected });
    }
  };

  const handleClearSelection = () => {
    updateAnswer({ selectedOptionIds: [], textAnswer: '' });
  };

  const handleToggleReview = () => {
    const isMarked = !(currentAnswer?.isMarkedForReview);
    updateAnswer({ isMarkedForReview: isMarked });
  };

  // 6. Navigation
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  // 7. Submission
  const handleConfirmSubmit = async () => {
    if (!attemptId) return;
    setIsSubmitting(true);
    try {
      const result = await attemptService.submitAttempt(attemptId);
      await exitFullscreen();
      navigate(`/student/results/${result.id}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to submit test';
      setError(msg || 'Failed to submit test');
      setIsSubmitting(false);
      setSubmitDialogOpen(false);
    }
  };

  // 8. Stats for Palette & Submit Modal
  const answeredCount = questions.filter((q) => {
    const ans = answersMap.get(q.questionId);
    return (
      (ans?.selectedOptionIds && ans.selectedOptionIds.length > 0) ||
      (ans?.textAnswer && ans.textAnswer.trim().length > 0)
    );
  }).length;

  const reviewCount = questions.filter((q) => {
    const ans = answersMap.get(q.questionId);
    return ans?.isMarkedForReview;
  }).length;

  const unansweredCount = questions.length - answeredCount;

  // Format Timer String
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !attempt) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/student/tests')}>
          Return to My Tests
        </Button>
      </Box>
    );
  }

  return (
    <>
      <style>{`
        ::selection {
          background: transparent !important;
          color: inherit !important;
        }
        .assessment-unselectable,
        .assessment-unselectable * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        .monaco-editor,
        .monaco-editor * {
          -webkit-user-select: auto !important;
          -moz-user-select: auto !important;
          -ms-user-select: auto !important;
          user-select: auto !important;
        }
        input, textarea, [contenteditable="true"] {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
      `}</style>

      {/* Mandatory Full-Screen Lockdown Entry Screen Overlay */}
      {!isFullscreen && !isTerminated && !violationWarningOpen && attempt?.status === 'IN_PROGRESS' && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            bgcolor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Paper
            elevation={24}
            sx={{
              maxWidth: 580,
              width: '100%',
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              bgcolor: '#ffffff',
              textAlign: 'center',
              border: '2px solid #0284C7',
              boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.35)',
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <FullscreenIcon sx={{ fontSize: 44, color: '#0284C7' }} />
            </Box>

            <Chip
              icon={<SecurityIcon style={{ fontSize: 16, color: '#0284C7' }} />}
              label="PROCTORED ASSESSMENT ENVIRONMENT"
              size="small"
              sx={{ bgcolor: '#E0F2FE', color: '#0284C7', fontWeight: 800, mb: 1.5, letterSpacing: 0.5 }}
            />

            <Typography variant="h5" fontWeight={800} color="#0F172A" gutterBottom>
              Mandatory Full-Screen Mode
            </Typography>

            <Typography variant="body2" color="#475569" sx={{ mb: 2.5, lineHeight: 1.6 }}>
              This examination operates under strict proctored lockdown. Questions and answer inputs are accessible strictly while active full-screen mode is maintained.
            </Typography>

            <Box
              sx={{
                bgcolor: '#F8FAFC',
                borderRadius: 2.5,
                p: 2.5,
                mb: 3,
                textAlign: 'left',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <CheckCircleOutlineIcon sx={{ color: '#059669', fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" fontWeight={600} color="#1E293B">
                  <strong>No Tab Switching:</strong> Navigating away from the active tab or minimizing window is prohibited.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <CheckCircleOutlineIcon sx={{ color: '#059669', fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" fontWeight={600} color="#1E293B">
                  <strong>No Copy / Paste / Context Menu:</strong> Copying text, cutting, and right-click menus are disabled.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <CheckCircleOutlineIcon sx={{ color: '#059669', fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" fontWeight={600} color="#1E293B">
                  <strong>No Screenshots:</strong> PrintScreen, screen clipping, and print shortcuts are blocked.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <CheckCircleOutlineIcon sx={{ color: '#059669', fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" fontWeight={600} color="#1E293B">
                  <strong>Live Camera Monitoring (No Footage Stored):</strong> Real-time in-memory head posture tracking. Turning left or right for more than 2 seconds incurs an integrity warning strike. Video is analyzed locally; no recordings are stored.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <WarningAmberIcon sx={{ color: '#DC2626', fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" fontWeight={700} color="#991B1B">
                  <strong>3-Strike Policy:</strong> You will receive 2 warnings. On the 3rd violation, the test is permanently stopped and submitted.
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<PlayArrowIcon />}
              onClick={enterFullscreen}
              sx={{
                py: 1.5,
                fontWeight: 800,
                fontSize: '1rem',
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.45)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
                },
              }}
            >
              {answersMap.size > 0 ? 'Activate Full-Screen & Resume Test' : 'Activate Full-Screen & Start Test'}
            </Button>
          </Paper>
        </Box>
      )}

      {/* Main Examination Canvas with conditional blur when not in fullscreen */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#EDF2FF',
          filter: (!isFullscreen || isTerminated) ? 'blur(25px)' : 'none',
          pointerEvents: (!isFullscreen || isTerminated) ? 'none' : 'auto',
          transition: 'filter 0.3s ease',
        }}
      >
      {/* 1. Distraction-Free Header Bar */}
      <Paper
        square
        elevation={0}
        sx={{
          py: { xs: 1, md: 1.5 },
          px: { xs: 1.25, md: 4 },
          bgcolor: '#ffffff',
          borderBottom: '1px solid #DCE6F5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          gap: { xs: 1, md: 2 },
          pt: { xs: 5.5, md: 1.5 },
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        {/* Assessment Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 }, minWidth: 0 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ color: '#14264B', fontSize: { xs: '0.95rem', sm: '1.25rem' }, overflowWrap: 'anywhere' }}
          >
            {attempt?.assessment?.name || 'Examination'}
          </Typography>
          <Chip
            size="small"
            label={`Section: ${currentQuestion?.category || 'General'}`}
            variant="outlined"
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, borderColor: '#D1DEF0', color: '#526584', fontWeight: 600 }}
          />
        </Box>

        {/* Sync Status & Timer & Submit */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', md: 'flex-end' },
            flexWrap: 'wrap',
            gap: { xs: 0.75, md: 3 },
            width: { xs: '100%', md: 'auto' },
          }}
        >
          {/* Sync Status Indicator */}
          <Chip
            size="small"
            icon={
              syncStatus === 'SAVED' ? (
                <CloudDoneIcon sx={{ color: '#059669 !important' }} />
              ) : syncStatus === 'SYNCING' ? (
                <SyncIcon sx={{ color: '#318992 !important', animation: 'spin 1s linear infinite' }} />
              ) : (
                <CloudOffIcon sx={{ color: '#d97706 !important' }} />
              )
            }
            label={syncStatus === 'SAVED' ? 'Auto-Saved' : syncStatus === 'SYNCING' ? 'Saving...' : 'Offline'}
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: syncStatus === 'SAVED' ? '#ecfdf5' : syncStatus === 'SYNCING' ? '#eff6ff' : '#fef3c7',
              color: syncStatus === 'SAVED' ? '#047857' : syncStatus === 'SYNCING' ? '#267D86' : '#b45309',
              border: '1px solid',
              borderColor: syncStatus === 'SAVED' ? '#a7f3d0' : syncStatus === 'SYNCING' ? '#bfdbfe' : '#fde68a',
            }}
          />

          {/* Countdown Timer */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 0.5,
              borderRadius: 2,
              bgcolor:
                (timeLeftSeconds || 0) < 60
                  ? '#fef2f2'
                  : (timeLeftSeconds || 0) < 300
                  ? '#fffbeb'
                  : '#E7EEFA',
              border: '1px solid',
              borderColor:
                (timeLeftSeconds || 0) < 60
                  ? '#fca5a5'
                  : (timeLeftSeconds || 0) < 300
                  ? '#fde68a'
                  : '#D1DEF0',
            }}
          >
            <TimerIcon
              sx={{
                fontSize: 18,
                color:
                  (timeLeftSeconds || 0) < 60
                    ? '#dc2626'
                    : (timeLeftSeconds || 0) < 300
                    ? '#d97706'
                    : '#318992',
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 800,
                color:
                  (timeLeftSeconds || 0) < 60
                    ? '#dc2626'
                    : (timeLeftSeconds || 0) < 300
                    ? '#d97706'
                    : '#14264B',
              }}
            >
              {formatTime(timeLeftSeconds)}
            </Typography>
          </Box>

          {/* Real-time 3-Warning Security Badge */}
          {violationCount > 0 && (
            <Chip
              size="small"
              icon={<WarningAmberIcon style={{ color: violationCount >= 2 ? '#b91c1c' : '#d97706', fontSize: 16 }} />}
              label={`Warning ${Math.min(violationCount, 3)}/3`}
              sx={{
                bgcolor: violationCount >= 2 ? '#fee2e2' : '#fef3c7',
                color: violationCount >= 2 ? '#b91c1c' : '#92400e',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: violationCount >= 2 ? '1px solid #fecaca' : '1px solid #fde68a',
              }}
            />
          )}

          {/* Full-Screen Lockdown Button */}
          <Button
            size="small"
            variant={isFullscreen ? 'outlined' : 'contained'}
            color={isFullscreen ? 'inherit' : 'warning'}
            startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            onClick={enterFullscreen}
            sx={{ fontWeight: 700, fontSize: '0.75rem', px: { xs: 0.75, sm: 1.5 }, minWidth: 0 }}
          >
            {isFullscreen ? 'Full-Screen Active' : 'Return to Full-Screen'}
          </Button>

          {/* Submit Test Button */}
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => setSubmitDialogOpen(true)}
            sx={{ fontWeight: 700, px: { xs: 1, sm: 2 }, minWidth: 0 }}
          >
            Submit Test
          </Button>
        </Box>
      </Paper>

      {/* 2. Main Examination Canvas */}
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          p: { xs: 1, sm: 2, md: 3 },
          gap: { xs: 1.5, md: 3 },
          overflow: { xs: 'visible', lg: 'hidden' },
        }}
      >
        {/* Left / Center: Active Question Area */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {currentQuestion && currentQuestion.category === 'CODING' ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                minWidth: 0,
                overflow: { xs: 'visible', md: 'hidden' },
              }}
            >
              <MonacoCodingWorkspace
                attemptId={attemptId!}
                questionId={currentQuestion.questionId || currentQuestion.id}
                onAnswerSaved={() => {
                  updateAnswer({
                    textAnswer: 'CODING_SUBMITTED',
                    isMarkedForReview: currentAnswer?.isMarkedForReview || false,
                  });
                }}
              />
              <Box
                sx={{
                  mt: { xs: 1, sm: 1.5 },
                  p: { xs: 1, sm: 1.5 },
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1,
                  bgcolor: '#ffffff',
                  border: '1px solid #DCE6F5',
                  borderRadius: 2,
                  position: { xs: 'sticky', sm: 'static' },
                  bottom: 0,
                  zIndex: 10000,
                }}
              >
                <Button
                  variant="outlined"
                  color={currentAnswer?.isMarkedForReview ? 'secondary' : 'inherit'}
                  startIcon={currentAnswer?.isMarkedForReview ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  onClick={handleToggleReview}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {currentAnswer?.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                </Button>

                <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<NavigateBeforeIcon />}
                    disabled={currentIndex === 0}
                    onClick={() => goToQuestion(currentIndex - 1)}
                    sx={{ flex: 1 }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="contained"
                    endIcon={<NavigateNextIcon />}
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => goToQuestion(currentIndex + 1)}
                    sx={{ flex: 1 }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : currentQuestion ? (
            <Card
              onContextMenu={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              sx={{
                flexGrow: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
                borderRadius: 2.5,
                boxShadow: '0 1px 3px rgba(20, 38, 75, 0.04)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
              }}
            >
              {/* Question Header */}
              <Box
                sx={{
                  p: 2.5,
                  borderBottom: '1px solid #DCE6F5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                <Typography variant="h6" fontWeight={800} color="#14264B">
                  Question {currentIndex + 1} of {questions.length}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    size="small"
                    label={`${currentQuestion.marks} Mark${currentQuestion.marks > 1 ? 's' : ''}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  {attempt?.assessment?.negativeMarking && currentQuestion.negativeMarks > 0 && (
                    <Chip
                      size="small"
                      label={`-${currentQuestion.negativeMarks} Neg`}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                  <Chip size="small" label={currentQuestion.difficulty} sx={{ bgcolor: '#E7EEFA', color: '#526584', fontWeight: 600 }} />
                </Box>
              </Box>

              {/* Question Content & Options */}
              <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2.5, md: 4 }, overflowY: 'auto', overflowWrap: 'anywhere' }}>
                <Box sx={{ mb: 4 }}>
                  <QuestionContentRenderer
                    content={currentQuestion.questionText}
                    imageUrl={currentQuestion.imageUrl}
                    sx={{ fontSize: '1.15rem', fontWeight: 500 }}
                  />
                </Box>

                {/* Single Choice / True False: Radio Group */}
                {(currentQuestion.questionType === 'SINGLE_CHOICE' ||
                  currentQuestion.questionType === 'TRUE_FALSE') && (
                  <RadioGroup
                    value={currentAnswer?.selectedOptionIds?.[0] || ''}
                    onChange={(e) => handleOptionSelect(e.target.value)}
                  >
                    {currentQuestion.options.map((opt) => {
                      const isSelected = currentAnswer?.selectedOptionIds?.[0] === opt.id;
                      return (
                        <Paper
                          key={opt.id}
                          variant="outlined"
                          onClick={() => handleOptionSelect(opt.id)}
                          sx={{
                            mb: 1.5,
                            p: 1.5,
                            px: 2,
                            borderRadius: 2,
                            cursor: 'pointer',
                            bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                            borderColor: isSelected ? '#318992' : '#DCE6F5',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: isSelected ? '#dbeafe' : '#EDF2FF',
                              borderColor: isSelected ? '#318992' : '#D1DEF0',
                            },
                          }}
                        >
                          <FormControlLabel
                            value={opt.id}
                            control={<Radio color="primary" />}
                            label={
                              <Typography variant="body1" sx={{ fontSize: '1.05rem', ml: 1, color: isSelected ? '#1e40af' : '#14264B', fontWeight: isSelected ? 600 : 400 }}>
                                {opt.optionText}
                              </Typography>
                            }
                            sx={{ width: '100%', m: 0 }}
                          />
                        </Paper>
                      );
                    })}
                  </RadioGroup>
                )}

                {/* Multiple Choice: Checkbox Group */}
                {currentQuestion.questionType === 'MULTIPLE_CHOICE' && (
                  <FormGroup>
                    {currentQuestion.options.map((opt) => {
                      const isSelected = currentAnswer?.selectedOptionIds?.includes(opt.id);
                      return (
                        <Paper
                          key={opt.id}
                          variant="outlined"
                          onClick={() => handleOptionSelect(opt.id)}
                          sx={{
                            mb: 1.5,
                            p: 1.5,
                            px: 2,
                            borderRadius: 2,
                            cursor: 'pointer',
                            bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                            borderColor: isSelected ? '#318992' : '#DCE6F5',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: isSelected ? '#dbeafe' : '#EDF2FF',
                              borderColor: isSelected ? '#318992' : '#D1DEF0',
                            },
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={Boolean(isSelected)}
                                onChange={() => handleOptionSelect(opt.id)}
                                color="primary"
                              />
                            }
                            label={
                              <Typography variant="body1" sx={{ fontSize: '1.05rem', ml: 1, color: isSelected ? '#1e40af' : '#14264B', fontWeight: isSelected ? 600 : 400 }}>
                                {opt.optionText}
                              </Typography>
                            }
                            sx={{ width: '100%', m: 0 }}
                          />
                        </Paper>
                      );
                    })}
                  </FormGroup>
                )}

                {/* Fill in Blank / Descriptive */}
                {(currentQuestion.questionType === 'FILL_BLANK' ||
                  currentQuestion.questionType === 'DESCRIPTIVE') && (
                  <TextField
                    fullWidth
                    multiline={currentQuestion.questionType === 'DESCRIPTIVE'}
                    rows={currentQuestion.questionType === 'DESCRIPTIVE' ? 4 : 1}
                    placeholder="Type your answer here..."
                    value={currentAnswer?.textAnswer || ''}
                    onChange={(e) => updateAnswer({ textAnswer: e.target.value })}
                    variant="outlined"
                    sx={{ mt: 2 }}
                  />
                )}
              </CardContent>

              {/* Bottom Action Controls */}
              <Box
                sx={{
                  p: { xs: 1, sm: 2 },
                  px: { xs: 1, sm: 3 },
                  borderTop: '1px solid #DCE6F5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: { xs: 'column', sm: 'row' },
                  flexWrap: 'wrap',
                  gap: { xs: 1, sm: 1.5 },
                  bgcolor: '#EDF2FF',
                  position: { xs: 'sticky', sm: 'static' },
                  bottom: 0,
                  zIndex: 10000,
                  boxShadow: { xs: '0 -4px 12px rgba(20, 38, 75, 0.12)', sm: 'none' },
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.75, width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="outlined"
                    color={currentAnswer?.isMarkedForReview ? 'secondary' : 'inherit'}
                    startIcon={
                      currentAnswer?.isMarkedForReview ? <BookmarkIcon /> : <BookmarkBorderIcon />
                    }
                    onClick={handleToggleReview}
                    size="small"
                    sx={{ flex: { xs: 1, sm: 'initial' }, minWidth: 0, whiteSpace: 'nowrap' }}
                  >
                    {currentAnswer?.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </Button>

                  <Button
                    variant="text"
                    color="inherit"
                    startIcon={<ClearIcon />}
                    onClick={handleClearSelection}
                    size="small"
                    disabled={!currentAnswer?.selectedOptionIds?.length && !currentAnswer?.textAnswer}
                    sx={{ flex: { xs: 1, sm: 'initial' }, minWidth: 0, whiteSpace: 'nowrap' }}
                  >
                    Clear Choice
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<NavigateBeforeIcon />}
                    disabled={currentIndex === 0}
                    onClick={() => goToQuestion(currentIndex - 1)}
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    Previous
                  </Button>

                  <Button
                    variant="contained"
                    endIcon={<NavigateNextIcon />}
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => goToQuestion(currentIndex + 1)}
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    Save & Next
                  </Button>
                </Box>
              </Box>
            </Card>
          ) : null}
        </Box>

        {/* Right: Question Navigation Palette */}
        <Card
          sx={{
            width: { xs: 260, md: 320 },
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            bgcolor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: 2.5,
            boxShadow: '0 1px 3px rgba(20, 38, 75, 0.04)',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #DCE6F5' }}>
            <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.5} color="#14264B">
              Question Palette
            </Typography>
          </Box>

          <CardContent sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            {/* Palette Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 3 }}>
              {questions.map((q, idx) => {
                const ans = answersMap.get(q.questionId);
                const isAnswered =
                  (ans?.selectedOptionIds && ans.selectedOptionIds.length > 0) ||
                  (ans?.textAnswer && ans.textAnswer.trim().length > 0);
                const isMarked = ans?.isMarkedForReview;
                const isCurrent = idx === currentIndex;

                let btnBg = '#E7EEFA';
                let btnColor = '#405678';

                if (isAnswered && isMarked) {
                  btnBg = '#d97706'; // Amber: Answered & Marked
                  btnColor = '#fff';
                } else if (isMarked) {
                  btnBg = '#7c3aed'; // Purple: Marked for Review
                  btnColor = '#fff';
                } else if (isAnswered) {
                  btnBg = '#059669'; // Green: Answered
                  btnColor = '#fff';
                }

                return (
                  <Button
                    key={q.id}
                    variant="contained"
                    onClick={() => goToQuestion(idx)}
                    sx={{
                      minWidth: 0,
                      p: 1,
                      height: 40,
                      fontWeight: 800,
                      bgcolor: btnBg,
                      color: btnColor,
                      border: isCurrent ? '2px solid #318992' : '1px solid transparent',
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: btnBg,
                        filter: 'brightness(0.95)',
                      },
                    }}
                  >
                    {idx + 1}
                  </Button>
                );
              })}
            </Box>

            <Divider sx={{ mb: 2, borderColor: '#DCE6F5' }} />

            {/* Legend & Stats */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#059669' }} />
                  <Typography variant="caption" color="text.secondary">Answered</Typography>
                </Box>
                <Typography variant="caption" fontWeight={700} color="#14264B">
                  {answeredCount}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#7c3aed' }} />
                  <Typography variant="caption" color="text.secondary">Marked for Review</Typography>
                </Box>
                <Typography variant="caption" fontWeight={700} color="#14264B">
                  {reviewCount}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#D1DEF0' }} />
                  <Typography variant="caption" color="text.secondary">Unanswered</Typography>
                </Box>
                <Typography variant="caption" fontWeight={700} color="#14264B">
                  {unansweredCount}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 3. Submit Confirmation Modal */}
      <Dialog
        open={submitDialogOpen}
        onClose={() => !isSubmitting && setSubmitDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2.5, bgcolor: '#ffffff' },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#14264B', fontWeight: 800 }}>
          <WarningAmberIcon color="warning" /> Confirm Test Submission
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Are you sure you want to submit your assessment? You will not be able to modify your answers once submitted.
          </DialogContentText>

          {/* Submission Summary Table */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#EDF2FF', borderColor: '#DCE6F5', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Questions:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="#14264B">
                {questions.length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
                Answered:
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#059669' }}>
                {answeredCount}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#d97706', fontWeight: 600 }}>
                Unanswered:
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#d97706' }}>
                {unansweredCount}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#7c3aed', fontWeight: 600 }}>
                Marked for Review:
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#7c3aed' }}>
                {reviewCount}
              </Typography>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button disabled={isSubmitting} onClick={() => setSubmitDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={isSubmitting}
            onClick={handleConfirmSubmit}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
          >
            {isSubmitting ? 'Submitting...' : 'Yes, Submit Test'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Anti-Cheating: Progressive Sequential Warning Dialog (Warning 1/3 and Warning 2/3) */}
      <Dialog
        open={violationWarningOpen && !isTerminated}
        disableEscapeKeyDown
        onClose={(_, reason) => {
          if (reason === 'backdropClick') return;
        }}
        PaperProps={{
          sx: {
            p: 2.5,
            borderRadius: 3.5,
            border: violationCount === 2 ? '2px solid #ea580c' : '2px solid #d97706',
            maxWidth: 520,
            boxShadow:
              violationCount === 2
                ? '0 20px 45px -10px rgba(234, 88, 12, 0.35)'
                : '0 20px 40px -10px rgba(217, 119, 6, 0.3)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: violationCount === 2 ? '#c2410c' : '#b45309',
            fontWeight: 800,
            pb: 1,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 34, color: violationCount === 2 ? '#ea580c' : '#d97706' }} />
          {violationCount === 2 ? 'Final Warning Notice (Warning 2/3)' : 'Assessment Integrity Warning (Warning 1/3)'}
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Chip
              label={violationCount === 2 ? 'FINAL WARNING • WARNING 2 OF 3' : 'SECURITY WARNING 1 OF 3'}
              size="small"
              sx={{
                bgcolor: violationCount === 2 ? '#ffedd5' : '#fef3c7',
                color: violationCount === 2 ? '#c2410c' : '#92400e',
                fontWeight: 800,
                fontSize: '0.75rem',
                border: violationCount === 2 ? '1px solid #fdba74' : '1px solid #fcd34d',
                mb: 1.5,
              }}
            />
            <Typography variant="subtitle1" fontWeight={700} color="#0F172A" sx={{ mb: 0.5 }}>
              {lastViolationReason.title}
            </Typography>
            <DialogContentText sx={{ color: '#334155', fontWeight: 500, fontSize: '0.95rem' }}>
              {lastViolationReason.message}
            </DialogContentText>
            {lastViolationReason.type === 'MOBILE_PHONE_DETECTED' && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  bgcolor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <SmartphoneIcon sx={{ color: '#DC2626', fontSize: 28 }} />
                <Typography variant="body2" fontWeight={700} color="#991B1B">
                  Warning: Mobile phone detected. Please remove your phone.
                </Typography>
              </Box>
            )}
            {lastViolationReason.type === 'MULTIPLE_PERSONS_DETECTED' && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  bgcolor: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <PeopleIcon sx={{ color: '#EA580C', fontSize: 28 }} />
                <Typography variant="body2" fontWeight={700} color="#9A3412">
                  Warning: Another person has been detected. Only the registered student is allowed during the assessment.
                </Typography>
              </Box>
            )}
            {lastViolationReason.type === 'FACE_NOT_VISIBLE' && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  bgcolor: '#FEFCE8',
                  border: '1px solid #FEF08A',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <PersonOffIcon sx={{ color: '#CA8A04', fontSize: 28 }} />
                <Typography variant="body2" fontWeight={700} color="#854D0E">
                  Warning: Your face is not visible. Please return to your seat.
                </Typography>
              </Box>
            )}
            {lastViolationReason.type === 'CAMERA_DISCONNECTED' && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  bgcolor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <VideocamOffIcon sx={{ color: '#DC2626', fontSize: 28 }} />
                <Typography variant="body2" fontWeight={700} color="#991B1B">
                  Warning: Camera disconnected. Please reconnect your camera immediately to continue your assessment.
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              p: 2,
              bgcolor: violationCount === 2 ? '#fff7ed' : '#fffbeb',
              borderRadius: 2.5,
              border: violationCount === 2 ? '1px solid #fed7aa' : '1px solid #fef3c7',
              mb: 1,
            }}
          >
            {violationCount === 2 ? (
              <>
                <Typography variant="body2" fontWeight={800} sx={{ color: '#c2410c', mb: 0.5 }}>
                  CRITICAL: THIS IS YOUR FINAL WARNING (Warning 2 of 3).
                </Typography>
                <Typography variant="caption" sx={{ color: '#9a3412', display: 'block', lineHeight: 1.5 }}>
                  If 1 more security violation is detected (Warning 3/3), your assessment will be immediately terminated, your answers locked and evaluated, and you will be redirected to your dashboard without ability to resume.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#92400e', mb: 0.5 }}>
                  Notice: Warning 1 of 3 recorded. You have 2 warnings remaining before automatic termination.
                </Typography>
                <Typography variant="caption" sx={{ color: '#b45309', display: 'block', lineHeight: 1.5 }}>
                  All integrity events (tab switching, window focus loss, exiting full-screen, clipboard actions, and right-clicks) are logged authoritatively with exact timestamps.
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="contained"
            color="warning"
            fullWidth
            size="large"
            onClick={enterFullscreen}
            sx={{
              fontWeight: 800,
              py: 1.25,
              fontSize: '1rem',
              borderRadius: 2,
              bgcolor: violationCount === 2 ? '#ea580c' : '#d97706',
              '&:hover': { bgcolor: violationCount === 2 ? '#c2410c' : '#b45309' },
            }}
          >
            {violationCount === 2
              ? 'Acknowledge Final Warning & Resume Assessment'
              : 'Acknowledge Warning 1 & Return to Assessment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Anti-Cheating: Disqualification Modal (Warning 3 of 3 Reached) */}
      <Dialog
        open={isTerminated}
        disableEscapeKeyDown
        onClose={(_, reason) => {
          if (reason === 'backdropClick') return;
        }}
        PaperProps={{
          sx: {
            p: 2.5,
            borderRadius: 4,
            border: '3px solid #b91c1c',
            maxWidth: 540,
            boxShadow: '0 25px 60px -15px rgba(185, 28, 28, 0.45)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: '#991b1b',
            fontWeight: 800,
            pb: 1,
          }}
        >
          <BlockIcon sx={{ fontSize: 38, color: '#dc2626' }} />
          Assessment Terminated (Warning 3 of 3 Reached)
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Chip
              label="WARNING 3/3 CONFIRMED • ATTEMPT TERMINATED"
              size="small"
              sx={{
                bgcolor: '#dc2626',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.75rem',
                mb: 1.5,
              }}
            />
            <DialogContentText sx={{ color: '#0F172A', fontWeight: 600, fontSize: '1rem', mb: 1 }}>
              Your examination has been automatically terminated because 3 security violations were confirmed.
            </DialogContentText>
            <Typography variant="body2" color="#475569" sx={{ mb: 0.5 }}>
              All answers submitted prior to termination have been securely saved and evaluated in accordance with assessment grading rules.
            </Typography>
            <Typography variant="body2" color="#64748B" fontWeight={500}>
              Resuming this terminated assessment is blocked. You will be automatically redirected to your dashboard{redirectCountdown !== null ? ` in ${redirectCountdown}s` : ''}.
            </Typography>
          </Box>

          {/* Breakdown of recorded violations */}
          {recordedViolations.length > 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: '#FEF2F2',
                borderColor: '#FECACA',
                borderRadius: 2.5,
                mb: 1,
                maxHeight: 180,
                overflowY: 'auto',
              }}
            >
              <Typography variant="caption" fontWeight={800} color="#991B1B" display="block" mb={1}>
                CONFIRMED SECURITY VIOLATIONS ({recordedViolations.length}/3):
              </Typography>
              {recordedViolations.map((v, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 0.75,
                    borderBottom: i < recordedViolations.length - 1 ? '1px dashed #FECACA' : 'none',
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="#7F1D1D">
                    Warning {i + 1}/3: {v.title}
                  </Typography>
                  <Typography variant="caption" color="#991B1B">
                    {v.timestamp}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            onClick={() => {
              exitFullscreen().catch(() => {});
              navigate('/student/dashboard');
            }}
            sx={{ fontWeight: 800, py: 1.25, fontSize: '1rem', borderRadius: 2 }}
          >
            Return to Dashboard {redirectCountdown !== null ? `(${redirectCountdown}s)` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Real-Time Camera Proctoring Monitor (Zero Footage Stored) */}
      <CameraProctorMonitor
        onViolation={triggerViolation}
        violationCount={violationCount}
        maxViolations={(attempt?.assessment as any)?.maxViolations || 3}
        enableMobileDetection={(attempt?.assessment as any)?.enableMobileDetection !== false}
        isActive={!isTerminated}
        isWarningModalOpen={violationWarningOpen}
      />
    </Box>
    </>
  );
};
