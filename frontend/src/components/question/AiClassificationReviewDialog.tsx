import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
  CATEGORY_TOPICS_MAP,
  AdminReviewClassificationInput,
} from '../../types/question.types.js';
import { questionService } from '../../services/question.service.js';

interface AiClassificationReviewDialogProps {
  open: boolean;
  question: Question | null;
  onClose: () => void;
  onSuccess: (updatedQuestion: Question) => void;
}

export const AiClassificationReviewDialog: React.FC<AiClassificationReviewDialogProps> = ({
  open,
  question,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'VIEW' | 'OVERRIDE'>('VIEW');

  // Override form states
  const [editCategory, setEditCategory] = useState<QuestionCategory>('QUANTITATIVE_APTITUDE');
  const [editTopic, setEditTopic] = useState<string>('Percentage');
  const [editDifficulty, setEditDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [editType, setEditType] = useState<QuestionType>('SINGLE_CHOICE');

  useEffect(() => {
    if (question) {
      setError(null);
      setMode('VIEW');
      const ai = question.aiClassification;
      setEditCategory(ai?.suggestedCategory || question.category);
      setEditTopic(ai?.suggestedTopic || question.topic);
      setEditDifficulty(ai?.suggestedDifficulty || question.difficulty);
      setEditType(ai?.suggestedQuestionType || question.questionType);
    }
  }, [question]);

  if (!question) return null;

  const ai = question.aiClassification;
  const availableTopics = CATEGORY_TOPICS_MAP[editCategory] || [];

  const handleAction = async (action: AdminReviewClassificationInput['action']) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: AdminReviewClassificationInput = {
        action,
        category: editCategory,
        topic: editTopic,
        difficulty: editDifficulty,
        questionType: editType,
      };

      const updated = await questionService.reviewClassification(question.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update review status');
    } finally {
      setSubmitting(false);
    }
  };

  const renderConfidenceMeter = (label: string, value: number) => {
    const percent = Math.round(value * 100);
    const color: 'success' | 'warning' | 'error' =
      percent >= 80 ? 'success' : percent >= 70 ? 'warning' : 'error';

    return (
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#405678' }}>
            {label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: color === 'success' ? '#16a34a' : color === 'warning' ? '#d97706' : '#dc2626',
            }}
          >
            {percent}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percent}
          color={color}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid #DCE6F5',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#0284c7' }} />
          <Typography variant="h6" fontWeight={700}>
            AI Classification & Intelligence Review
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Question Statement Preview */}
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2.5, bgcolor: '#EDF2FF', borderColor: '#DCE6F5', borderRadius: 2 }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#7182A0', textTransform: 'uppercase' }}>
            Question Statement
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#14264B', mt: 0.5 }}>
            {question.questionText}
          </Typography>

          {question.options && question.options.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#7182A0' }}>
                Options ({question.options.length}):
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                {question.options.map((opt, idx) => (
                  <Grid item xs={12} sm={6} key={opt.id || idx}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: opt.isCorrect ? '#f0fdf4' : '#ffffff',
                        border: '1px solid',
                        borderColor: opt.isCorrect ? '#86efac' : '#DCE6F5',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Chip
                        label={String.fromCharCode(65 + idx)}
                        size="small"
                        color={opt.isCorrect ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: opt.isCorrect ? 600 : 400 }}>
                        {opt.optionText}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>

        {/* AI Confidence Breakdown & Suggestions */}
        {ai ? (
          <Grid container spacing={2}>
            {/* Left: AI Scores & Meters */}
            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{ p: 2, height: '100%', borderColor: '#D1DEF0', borderRadius: 2 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#14264B' }}>
                    Confidence Analysis
                  </Typography>
                  <Chip
                    label={ai.status}
                    size="small"
                    color={
                      ai.status === 'CLASSIFIED'
                        ? 'success'
                        : ai.status === 'NEEDS_REVIEW'
                          ? 'warning'
                          : 'error'
                    }
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                </Box>

                {renderConfidenceMeter('Category Confidence', ai.categoryConfidence)}
                {renderConfidenceMeter('Topic Confidence', ai.topicConfidence)}
                {renderConfidenceMeter('Difficulty Confidence', ai.difficultyConfidence)}
                {renderConfidenceMeter('Question Type Confidence', ai.typeConfidence)}

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Overall Evaluation Confidence
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      color:
                        ai.overallConfidence >= 0.75
                          ? '#16a34a'
                          : ai.overallConfidence >= 0.65
                            ? '#d97706'
                            : '#dc2626',
                    }}
                  >
                    {Math.round(ai.overallConfidence * 100)}%
                  </Typography>
                </Box>

                {ai.overallConfidence < 0.75 && (
                  <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 2, fontSize: '0.8rem' }}>
                    Confidence is below 75%. Admin verification is recommended before approving.
                  </Alert>
                )}
              </Paper>
            </Grid>

            {/* Right: Suggested Classification & Conceptual Reasoning */}
            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{ p: 2, height: '100%', borderColor: '#D1DEF0', borderRadius: 2 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#14264B', mb: 1.5 }}>
                  AI Suggested Metadata
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Category
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {ai.suggestedCategory.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Topic
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {ai.suggestedTopic}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Difficulty
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {ai.suggestedDifficulty}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Question Type
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {ai.suggestedQuestionType.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                </Box>

                {ai.reasoning && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'block', mb: 0.5 }}>
                      Conceptual Analysis & Reasoning
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#14532d', fontSize: '0.82rem' }}>
                      {ai.reasoning}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            This question has not yet been processed by AI intelligence. Click "Classify Now" to generate automatic classification.
          </Alert>
        )}

        {/* Override Form (if toggled) */}
        {mode === 'OVERRIDE' && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2.5, borderColor: '#f59e0b', bgcolor: '#fffbeb', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#92400e', mb: 2 }}>
              Manual Override & Final Approval
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editCategory}
                    label="Category"
                    onChange={(e) => {
                      const newCat = e.target.value as QuestionCategory;
                      setEditCategory(newCat);
                      setEditTopic(CATEGORY_TOPICS_MAP[newCat][0]);
                    }}
                  >
                    {Object.keys(CATEGORY_TOPICS_MAP).map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Topic</InputLabel>
                  <Select
                    value={editTopic}
                    label="Topic"
                    onChange={(e) => setEditTopic(e.target.value)}
                  >
                    {availableTopics.map((top) => (
                      <MenuItem key={top} value={top}>
                        {top}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={editDifficulty}
                    label="Difficulty"
                    onChange={(e) => setEditDifficulty(e.target.value as QuestionDifficulty)}
                  >
                    <MenuItem value="EASY">EASY</MenuItem>
                    <MenuItem value="MEDIUM">MEDIUM</MenuItem>
                    <MenuItem value="HARD">DIFFICULT / HARD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Question Type</InputLabel>
                  <Select
                    value={editType}
                    label="Question Type"
                    onChange={(e) => setEditType(e.target.value as QuestionType)}
                  >
                    <MenuItem value="SINGLE_CHOICE">Single Choice</MenuItem>
                    <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                    <MenuItem value="TRUE_FALSE">True / False</MenuItem>
                    <MenuItem value="FILL_BLANK">Fill in Blank</MenuItem>
                    <MenuItem value="DESCRIPTIVE">Descriptive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #DCE6F5', justifyContent: 'space-between' }}>
        <Box>
          <Button
            variant="text"
            color="warning"
            onClick={() => handleAction('SEND_TO_REVIEW')}
            disabled={submitting}
            sx={{ fontWeight: 600 }}
          >
            Flag for Review
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          {mode === 'VIEW' ? (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setMode('OVERRIDE')}
                disabled={submitting}
              >
                Edit & Override
              </Button>

              {ai && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleAction('ACCEPT_AI')}
                  disabled={submitting}
                  sx={{ fontWeight: 700 }}
                >
                  Accept AI Classification
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="text" onClick={() => setMode('VIEW')} disabled={submitting}>
                Back to Preview
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleAction('OVERRIDE')}
                disabled={submitting}
                sx={{ fontWeight: 700 }}
              >
                Save & Approve Override
              </Button>
            </>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};
