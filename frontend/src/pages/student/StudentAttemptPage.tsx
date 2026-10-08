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
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service.js';
import { QuestionContentRenderer } from '../../components/common/QuestionContentRenderer.js';
import {
  AssessmentAttemptDto,
  SanitizedPaperQuestionDto,
  SaveAnswerDto,
  AttemptViolationType,
} from '../../types/attempt.types.js';
import { MonacoCodingWorkspace } from '../../components/coding/MonacoCodingWorkspace.js';

type SyncStatus = 'SAVED' | 'SYNCING' | 'OFFLINE';

export const StudentAttemptPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

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
  const [lastViolationReason, setLastViolationReason] = useState<{ title: string; message: string; type?: AttemptViolationType }>({
    title: 'Integrity Violation Detected',
    message: 'An integrity violation has been recorded.',
  });
  const hasEnteredFullscreenRef = useRef(false);
  const lastViolationTimeRef = useRef<{ type: AttemptViolationType; time: number } | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSubmittingRef = useRef(false);

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
        }

        // If already submitted/expired, redirect to results
        if (data.status !== 'IN_PROGRESS') {
          navigate('/student/results');
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
  }, [attemptId, navigate]);

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
  }, [timeLeftSeconds]);

  const handleTimeExpired = useCallback(async () => {
    if (isAutoSubmittingRef.current || !attemptId) return;
    isAutoSubmittingRef.current = true;
    setSyncStatus('SYNCING');
    try {
      const res = await attemptService.submitAttempt(attemptId);
      navigate(`/student/results/${res.id}`);
    } catch {
      navigate('/student/results');
    }
  }, [attemptId, navigate]);

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

  // 3b. Anti-Cheating: Authoritative Violation Reporter with Client Deduplication Shield
  const triggerViolation = useCallback(
    async (
      type: AttemptViolationType,
      title: string,
      message: string,
      details?: string
    ) => {
      if (!attemptId) return;

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

      // Update state for real-time modal warning
      setLastViolationReason({ title, message, type });
      setViolationWarningOpen(true);
      setViolationCount((prev) => prev + 1);

      // Asynchronously persist violation to authoritative backend
      try {
        const res = await attemptService.recordViolation(attemptId, {
          violationType: type,
          details,
          clientTimestamp: new Date().toISOString(),
        });
        if (res && typeof res.violationCount === 'number') {
          setViolationCount(res.violationCount);
        }
      } catch (err) {
        console.warn('Failed to record violation on server:', err);
      }
    },
    [attemptId]
  );

  // 3c. Fullscreen Lockdown Handler
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      setViolationWarningOpen(false);
      hasEnteredFullscreenRef.current = true;
    } catch {
      // Browser permission or policy restriction
      setViolationWarningOpen(false);
    }
  }, []);

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

      if (!inFs && hasEnteredFullscreenRef.current) {
        triggerViolation(
          'FULLSCREEN_EXIT',
          'Full-Screen Mode Exited',
          'You exited full-screen mode. Examinations must be taken in full-screen lockdown. Please re-enter full-screen immediately.',
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
  }, [triggerViolation]);

  // 3e. Page Visibility API Listener (Tab Switch Detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation(
          'TAB_SWITCH',
          'Tab Switch / Minimized Window Detected',
          'You navigated away from the active examination tab. Tab switching is strictly prohibited and logged as an integrity violation.',
          'Page Visibility API detected visibilityState: hidden'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerViolation]);

  // 3f. Browser / Window Focus & Blur Detection
  useEffect(() => {
    const handleWindowBlur = () => {
      // If tab visibility is already hidden, TAB_SWITCH handler already caught it
      if (document.visibilityState === 'hidden') return;

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
  }, [triggerViolation]);

  // 3g. Screenshot & Print Shortcut Interception
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerViolation(
          'SCREENSHOT_ATTEMPT',
          'Screenshot Command Intercepted',
          'Screen capture shortcuts (PrintScreen) are prohibited during official examinations and have been recorded as an integrity violation.',
          'PrintScreen keypress intercepted'
        );
        return;
      }

      // Print / PDF export key combos: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        triggerViolation(
          'SCREENSHOT_ATTEMPT',
          'Print Command Intercepted',
          'Print and PDF export shortcuts (Ctrl+P / Cmd+P) are prohibited during official examinations and have been recorded.',
          'Ctrl+P / Cmd+P keypress intercepted'
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
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
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#EDF2FF' }}>
      {/* 1. Distraction-Free Header Bar */}
      <Paper
        square
        elevation={0}
        sx={{
          py: 1.5,
          px: { xs: 2, md: 4 },
          bgcolor: '#ffffff',
          borderBottom: '1px solid #DCE6F5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        {/* Assessment Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: '#14264B' }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 3 } }}>
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

          {/* Real-time Violation Counter Badge */}
          {violationCount > 0 && (
            <Chip
              size="small"
              icon={<WarningAmberIcon style={{ color: '#b91c1c', fontSize: 16 }} />}
              label={`${violationCount} Violation${violationCount > 1 ? 's' : ''}`}
              sx={{
                bgcolor: '#fee2e2',
                color: '#b91c1c',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: '1px solid #fecaca',
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
            sx={{ fontWeight: 700, fontSize: '0.75rem', px: 1.5 }}
          >
            {isFullscreen ? 'Full-Screen Active' : 'Enter Full-Screen'}
          </Button>

          {/* Submit Test Button */}
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => setSubmitDialogOpen(true)}
            sx={{ fontWeight: 700, px: 2 }}
          >
            Submit Test
          </Button>
        </Box>
      </Paper>

      {/* 2. Main Examination Canvas */}
      <Box sx={{ flexGrow: 1, display: 'flex', p: { xs: 2, md: 3 }, gap: 3, overflow: 'hidden' }}>
        {/* Left / Center: Active Question Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {currentQuestion && currentQuestion.category === 'CODING' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
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
                  mt: 1.5,
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: '#ffffff',
                  border: '1px solid #DCE6F5',
                  borderRadius: 2,
                }}
              >
                <Button
                  variant="outlined"
                  color={currentAnswer?.isMarkedForReview ? 'secondary' : 'inherit'}
                  startIcon={currentAnswer?.isMarkedForReview ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  onClick={handleToggleReview}
                  size="small"
                >
                  {currentAnswer?.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                </Button>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    startIcon={<NavigateBeforeIcon />}
                    disabled={currentIndex === 0}
                    onClick={() => goToQuestion(currentIndex - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="contained"
                    endIcon={<NavigateNextIcon />}
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => goToQuestion(currentIndex + 1)}
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
              <CardContent sx={{ flexGrow: 1, p: { xs: 2.5, md: 4 }, overflowY: 'auto' }}>
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
                  p: 2,
                  px: 3,
                  borderTop: '1px solid #DCE6F5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  bgcolor: '#EDF2FF',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color={currentAnswer?.isMarkedForReview ? 'secondary' : 'inherit'}
                    startIcon={
                      currentAnswer?.isMarkedForReview ? <BookmarkIcon /> : <BookmarkBorderIcon />
                    }
                    onClick={handleToggleReview}
                    size="small"
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
                  >
                    Clear Choice
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    startIcon={<NavigateBeforeIcon />}
                    disabled={currentIndex === 0}
                    onClick={() => goToQuestion(currentIndex - 1)}
                  >
                    Previous
                  </Button>

                  <Button
                    variant="contained"
                    endIcon={<NavigateNextIcon />}
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => goToQuestion(currentIndex + 1)}
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

      {/* Anti-Cheating: Security & Integrity Violation Warning Dialog */}
      <Dialog
        open={violationWarningOpen}
        disableEscapeKeyDown
        onClose={(_, reason) => {
          if (reason === 'backdropClick') return;
        }}
        PaperProps={{
          sx: {
            p: 1.5,
            borderRadius: 3,
            border: '2px solid #ef4444',
            maxWidth: 500,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#b91c1c', fontWeight: 800 }}>
          <WarningAmberIcon sx={{ fontSize: 32 }} />
          {lastViolationReason.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#14264B', fontWeight: 500, mb: 2 }}>
            {lastViolationReason.message}
          </DialogContentText>
          <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca', mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#991b1b', fontWeight: 700 }}>
                Total Recorded Violations:
              </Typography>
              <Chip
                label={`${violationCount} Violation${violationCount === 1 ? '' : 's'}`}
                size="small"
                sx={{ bgcolor: '#dc2626', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#7f1d1d', display: 'block', mt: 0.5 }}>
              All integrity events are authoritatively logged on the server with timestamps for placement administration review.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            onClick={enterFullscreen}
            sx={{ fontWeight: 700 }}
          >
            {isFullscreen ? 'Acknowledge & Resume Assessment' : 'Re-enter Full-Screen & Resume'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
