import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MemoryIcon from '@mui/icons-material/Memory';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryIcon from '@mui/icons-material/History';
import TerminalIcon from '@mui/icons-material/Terminal';
import CodeIcon from '@mui/icons-material/Code';

import {
  CodingExecutionResponse,
  CodingQuestion,
  SubmissionHistoryItem,
  SupportedLanguage,
} from '../../types/coding.types';
import { codingService } from '../../services/coding.service';

interface MonacoCodingWorkspaceProps {
  attemptId: string;
  questionId: string;
  onAnswerSaved?: () => void;
}

const MONACO_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  c: 'c',
  cpp: 'cpp',
  python: 'python',
  java: 'java',
};

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  c: 'C (GCC 9.2.0)',
  cpp: 'C++ (GCC 9.2.0)',
  python: 'Python 3 (3.8.1)',
  java: 'Java (OpenJDK 13)',
};

export const MonacoCodingWorkspace: React.FC<MonacoCodingWorkspaceProps> = ({
  attemptId,
  questionId,
  onAnswerSaved,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [question, setQuestion] = useState<CodingQuestion | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<CodingExecutionResponse | null>(null);
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTestIndex, setActiveTestIndex] = useState<number>(0);

  // Fetch question metadata and latest state
  useEffect(() => {
    let isMounted = true;

    async function loadQuestion() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await codingService.getCodingQuestion(attemptId, questionId);
        if (!isMounted) return;

        setQuestion(data);

        // If there is a last submission, restore its language and code
        if (data.lastSubmission) {
          setLanguage(data.lastSubmission.language);
          setCode(data.lastSubmission.sourceCode);
        } else {
          // Default to python starter code or fallback
          const defaultLang: SupportedLanguage = 'python';
          setLanguage(defaultLang);
          setCode(data.starterCode[defaultLang] || '');
        }

        // Fetch submissions history
        const subs = await codingService.getSubmissions(attemptId, questionId);
        if (isMounted) setHistory(subs);
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.response?.data?.message || 'Failed to load coding question.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadQuestion();
    return () => {
      isMounted = false;
    };
  }, [attemptId, questionId]);

  // Handle language switch
  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    // If current code matches previous template or is empty, load new template
    if (question?.starterCode[newLang]) {
      setCode(question.starterCode[newLang]);
    }
  };

  // Reset code to starter template
  const handleResetCode = () => {
    if (question?.starterCode[language]) {
      setCode(question.starterCode[language]);
    }
    setResetDialogOpen(false);
  };

  // Run code against sample test cases
  const handleRunCode = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setErrorMessage(null);
    setActiveTab(0); // Switch to test results tab

    try {
      const res = await codingService.runCode(attemptId, questionId, language, code);
      setExecutionResult(res);
      setActiveTestIndex(0);

      // Refresh history
      const subs = await codingService.getSubmissions(attemptId, questionId);
      setHistory(subs);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Code execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit code for formal evaluation
  const handleSubmitCode = async () => {
    if (!code.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setActiveTab(0);

    try {
      const res = await codingService.submitCode(attemptId, questionId, language, code);
      setExecutionResult(res);
      setActiveTestIndex(0);

      // Refresh history
      const subs = await codingService.getSubmissions(attemptId, questionId);
      setHistory(subs);

      // Notify parent to sync answer palette
      if (onAnswerSaved) {
        onAnswerSaved();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <Chip icon={<CheckCircleIcon />} label="Accepted" color="success" size="small" />;
      case 'WRONG_ANSWER':
        return <Chip icon={<CancelIcon />} label="Wrong Answer" color="error" size="small" />;
      case 'COMPILATION_ERROR':
        return <Chip icon={<ErrorOutlineIcon />} label="Compilation Error" color="warning" size="small" />;
      case 'RUNTIME_ERROR':
        return <Chip icon={<ErrorOutlineIcon />} label="Runtime Error" color="error" size="small" />;
      case 'TIME_LIMIT_EXCEEDED':
        return <Chip icon={<AccessTimeIcon />} label="Time Limit Exceeded" color="warning" size="small" />;
      case 'MEMORY_LIMIT_EXCEEDED':
        return <Chip icon={<MemoryIcon />} label="Memory Limit Exceeded" color="warning" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Initializing secure Monaco coding environment...
        </Typography>
      </Box>
    );
  }

  if (!question) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {errorMessage || 'Unable to load coding problem specifications.'}
      </Alert>
    );
  }

  const sampleResults = executionResult?.sampleResults || [];
  const activeSampleResult = sampleResults[activeTestIndex];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 170px)', minHeight: '600px' }}>
      {/* Top Action Toolbar */}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Language:
            </Typography>
          </Box>
          <Select
            size="small"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
            sx={{ minWidth: 180, height: 36 }}
          >
            {(['c', 'cpp', 'python', 'java'] as SupportedLanguage[]).map((lang) => (
              <MenuItem key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </MenuItem>
            ))}
          </Select>

          <Tooltip title="Reset to Starter Template">
            <IconButton size="small" color="inherit" onClick={() => setResetDialogOpen(true)}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="primary"
            size="medium"
            startIcon={isRunning ? <CircularProgress size={16} /> : <PlayArrowIcon />}
            disabled={isRunning || isSubmitting}
            onClick={handleRunCode}
            sx={{ textTransform: 'none', px: 2.5, fontWeight: 600 }}
          >
            {isRunning ? 'Running...' : 'Run Code (Sample)'}
          </Button>

          <Button
            variant="contained"
            color="success"
            size="medium"
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            disabled={isRunning || isSubmitting}
            onClick={handleSubmitCode}
            sx={{ textTransform: 'none', px: 3, fontWeight: 700 }}
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Code'}
          </Button>
        </Box>
      </Paper>

      {/* Error notification banner */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Main Workspace Split (Left: Problem Specs | Right: Monaco Editor + Console Drawer) */}
      <Box sx={{ display: 'flex', flex: 1, gap: 1.5, minHeight: 0, overflow: 'hidden' }}>
        {/* Left Panel: Problem Statement & Specs */}
        <Card
          sx={{
            flex: '0 0 40%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 2,
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {question.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={question.difficulty} color="info" size="small" sx={{ fontWeight: 600 }} />
                <Chip label={`${question.marks} Marks`} color="secondary" size="small" sx={{ fontWeight: 600 }} />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', fontSize: '0.8rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 16 }} />
                <span>Time Limit: {question.timeLimitSeconds}s</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MemoryIcon sx={{ fontSize: 16 }} />
                <span>Memory: {Math.round(question.memoryLimitKb / 1024)} MB</span>
              </Box>
            </Box>
          </Box>

          <CardContent sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
            {/* Description */}
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 2.5, lineHeight: 1.6 }}>
              {question.description}
            </Typography>

            {/* Input & Output format */}
            {question.inputFormat && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Input Format
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                    {question.inputFormat}
                  </Typography>
                </Paper>
              </Box>
            )}

            {question.outputFormat && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Output Format
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                    {question.outputFormat}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Constraints */}
            {question.constraints && question.constraints.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Constraints
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {question.constraints.map((c, i) => (
                    <Typography key={i} component="li" variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                      {c}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {/* Sample Test Cases */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Sample Test Cases ({question.sampleTestCases.length})
            </Typography>
            {question.sampleTestCases.map((tc) => (
              <Paper
                key={tc.index}
                variant="outlined"
                sx={{ p: 1.5, mb: 1.5, borderRadius: 1.5, bgcolor: 'background.default' }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 1 }}>
                  Sample {tc.index}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Input:
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: 'action.selected',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {tc.input || '(empty)'}
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Expected Output:
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    mb: tc.explanation ? 1 : 0,
                    bgcolor: 'action.selected',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {tc.expectedOutput}
                </Box>

                {tc.explanation && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                    Explanation: {tc.explanation}
                  </Typography>
                )}
              </Paper>
            ))}

            {/* Hidden Test Cases indicator */}
            <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
              Contains <strong>{question.totalHiddenTestCases} hidden test cases</strong> evaluated upon final submission.
            </Alert>
          </CardContent>
        </Card>

        {/* Right Panel: Editor & Execution Drawer */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Monaco Editor Container */}
          <Box
            sx={{
              flex: executionResult ? '1 1 55%' : '1 1 70%',
              borderRadius: 2,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              boxShadow: 1,
            }}
          >
            <Editor
              height="100%"
              language={MONACO_LANGUAGE_MAP[language]}
              value={code}
              theme="vs-dark"
              onChange={(value) => setCode(value || '')}
              options={{
                fontSize: 14,
                tabSize: 4,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
                wordWrap: 'on',
              }}
            />
          </Box>

          {/* Bottom Console / Execution Results Panel */}
          <Paper
            elevation={2}
            sx={{
              flex: executionResult ? '1 1 45%' : '1 1 30%',
              mt: 1.5,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
            }}
          >
            {/* Tabs Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ minHeight: 40 }}>
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TerminalIcon sx={{ fontSize: 18 }} />
                      <span>Test Results</span>
                      {executionResult && (
                        <Chip
                          label={`${executionResult.passedTestCount}/${executionResult.totalTestCount}`}
                          size="small"
                          color={executionResult.status === 'ACCEPTED' ? 'success' : 'default'}
                          sx={{ height: 20, fontSize: '0.72rem' }}
                        />
                      )}
                    </Box>
                  }
                  sx={{ minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 600 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorOutlineIcon sx={{ fontSize: 18 }} />
                      <span>Console Logs</span>
                      {(executionResult?.compileError || executionResult?.runtimeError) && (
                        <Chip label="Error" size="small" color="error" sx={{ height: 20, fontSize: '0.72rem' }} />
                      )}
                    </Box>
                  }
                  sx={{ minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 600 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HistoryIcon sx={{ fontSize: 18 }} />
                      <span>Submissions ({history.length})</span>
                    </Box>
                  }
                  sx={{ minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 600 }}
                />
              </Tabs>

              {executionResult && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {getStatusChip(executionResult.status)}
                  {executionResult.submissionType === 'SUBMIT' && executionResult.marksAwarded !== undefined && (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                      Score: {executionResult.marksAwarded} / {executionResult.totalMarks}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* Tab 0: Test Results */}
            {activeTab === 0 && (
              <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                {!executionResult ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      Run your code or submit to view test results.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {/* Sample test cases tabs */}
                    {sampleResults.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                          {sampleResults.map((r, idx) => (
                            <Button
                              key={r.testCaseIndex}
                              size="small"
                              variant={activeTestIndex === idx ? 'contained' : 'outlined'}
                              color={r.status === 'ACCEPTED' ? 'success' : 'error'}
                              onClick={() => setActiveTestIndex(idx)}
                              sx={{ textTransform: 'none', minWidth: 90 }}
                            >
                              Case {idx + 1} {r.status === 'ACCEPTED' ? '✓' : '✗'}
                            </Button>
                          ))}
                        </Box>

                        {activeSampleResult && (
                          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Test Case #{activeSampleResult.testCaseIndex}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                                {activeSampleResult.executionTime !== undefined && (
                                  <span>Time: {activeSampleResult.executionTime}s</span>
                                )}
                                {activeSampleResult.memoryUsed !== undefined && (
                                  <span>Memory: {activeSampleResult.memoryUsed} KB</span>
                                )}
                              </Box>
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Input:
                            </Typography>
                            <Box
                              sx={{
                                p: 1,
                                mb: 1,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.82rem',
                              }}
                            >
                              {activeSampleResult.input || '(empty)'}
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Expected Output:
                            </Typography>
                            <Box
                              sx={{
                                p: 1,
                                mb: 1,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.82rem',
                              }}
                            >
                              {activeSampleResult.expectedOutput}
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Your Output:
                            </Typography>
                            <Box
                              sx={{
                                p: 1,
                                bgcolor: activeSampleResult.status === 'ACCEPTED' ? 'success.light' : 'error.light',
                                color: activeSampleResult.status === 'ACCEPTED' ? 'success.contrastText' : 'error.contrastText',
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.82rem',
                              }}
                            >
                              {activeSampleResult.actualOutput || '(no output)'}
                            </Box>
                          </Paper>
                        )}
                      </Box>
                    )}

                    {/* Hidden Test Cases Summary (Confidential) */}
                    {executionResult.submissionType === 'SUBMIT' && executionResult.hiddenResultsSummary && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          bgcolor: 'background.default',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Hidden Evaluation Cases:
                          </Typography>
                          <Chip
                            label={`${executionResult.hiddenResultsSummary.passedTestCount} / ${executionResult.hiddenResultsSummary.totalHiddenCount} Passed`}
                            size="small"
                            color={
                              executionResult.hiddenResultsSummary.passedTestCount ===
                              executionResult.hiddenResultsSummary.totalHiddenCount
                                ? 'success'
                                : 'warning'
                            }
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          * Hidden test case inputs and outputs remain confidential.
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {/* Tab 1: Console Logs */}
            {activeTab === 1 && (
              <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: 'grey.900', color: 'grey.100', fontFamily: 'monospace' }}>
                {executionResult?.compileError ? (
                  <Box>
                    <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      COMPILATION ERROR:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'error.light' }}>
                      {executionResult.compileError}
                    </Typography>
                  </Box>
                ) : executionResult?.runtimeError ? (
                  <Box>
                    <Typography variant="caption" color="error.main" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      RUNTIME ERROR:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'error.light' }}>
                      {executionResult.runtimeError}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="grey.500">
                    No compilation or runtime errors detected. Output streams are clean.
                  </Typography>
                )}
              </Box>
            )}

            {/* Tab 2: Submissions History */}
            {activeTab === 2 && (
              <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                {history.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No submissions recorded yet for this question.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {history.map((item, idx) => (
                      <Paper
                        key={item.id || idx}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {getStatusChip(item.status)}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.submissionType} ({item.language.toUpperCase()})
                          </Typography>
                          <Chip
                            label={`${item.passedTestCount}/${item.totalTestCount} Passed`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
                          {item.executionTime && (
                            <Typography variant="caption">{item.executionTime}s</Typography>
                          )}
                          <Typography variant="caption">
                            {new Date(item.createdAt).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Confirmation Dialog for Resetting Code */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Source Code?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset your code to the default starter template for {LANGUAGE_LABELS[language]}?
            Any unsaved changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleResetCode}>
            Reset Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
