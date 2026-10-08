import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { companyService } from '../../services/company.service.js';
import { CompanyDto, QuestionDuplicateCandidateDto } from '../../types/company.types.js';

interface DuplicateReviewDialogProps {
  open: boolean;
  company: CompanyDto | null;
  onClose: () => void;
  onResolved: () => void;
}

export const DuplicateReviewDialog: React.FC<DuplicateReviewDialogProps> = ({
  open,
  company,
  onClose,
  onResolved,
}) => {
  const [candidates, setCandidates] = useState<QuestionDuplicateCandidateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const data = await companyService.getDuplicates(company.id);
      setCandidates(data.filter((c) => c.status === 'PENDING'));
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load duplicate candidates';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && company) {
      fetchCandidates();
    } else {
      setCandidates([]);
    }
  }, [open, company]);

  const handleResolve = async (id: string, status: 'CONFIRMED_DUPLICATE' | 'REJECTED') => {
    setActionLoading(id);
    try {
      await companyService.resolveDuplicate(id, status);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      onResolved();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to resolve duplicate candidate';
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (!company) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          color: '#14264B',
          borderBottom: '1px solid #DCE6F5',
          py: 2,
          px: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberIcon sx={{ color: '#b45309', fontSize: 22 }} />
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, color: '#14264B', fontSize: '1.05rem' }}>
              Review Possible Duplicates — {company.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7182A0', fontSize: '0.74rem' }}>
              Semantic similarity matches flagged for Admin review
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#7182A0', '&:hover': { color: '#14264B' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5, backgroundColor: '#EDF2FF' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: '#1765B5' }} />
            <Typography variant="body2" sx={{ mt: 2, color: '#7182A0' }}>
              Loading pending duplicate comparisons...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : candidates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleIcon sx={{ fontSize: 44, color: '#15803d', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={700} color="#14264B">
              No Pending Duplicate Reviews
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All question uploads for {company.name} have clean, verified fingerprints.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: '0.84rem' }}>
              The system detected potential semantic matches with existing questions. Review both questions below and select whether to confirm as a duplicate or keep as distinct questions.
            </Alert>

            {candidates.map((cand) => (
              <Card key={cand.id} variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${Math.round(cand.similarityScore * 100)}% Similarity`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {cand.reason}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    {/* Uploaded Question */}
                    <Box sx={{ p: 2, backgroundColor: '#EDF2FF', borderRadius: 1, border: '1px solid #DCE6F5' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#7182A0', display: 'block', mb: 0.5, letterSpacing: '0.04em' }}>
                        UPLOADED QUESTION
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#14264B' }}>
                        {cand.candidateText}
                      </Typography>
                    </Box>

                    {/* Matched Original Question */}
                    <Box sx={{ p: 2, backgroundColor: '#f0f4f9', borderRadius: 1, border: '1px solid #D1DEF0' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#1765B5', display: 'block', mb: 0.5, letterSpacing: '0.04em' }}>
                        EXISTING QUESTION IN DATABASE
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#14264B' }}>
                        {cand.originalQuestion?.questionText || 'Existing question record'}
                      </Typography>
                      {cand.originalQuestion && (
                        <Typography variant="caption" sx={{ color: '#526584', display: 'block', mt: 0.5 }}>
                          Topic: {cand.originalQuestion.topic}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: '#E7EEFA' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      disabled={actionLoading === cand.id}
                      startIcon={<BlockIcon />}
                      onClick={() => handleResolve(cand.id, 'REJECTED')}
                    >
                      Keep as Separate Questions
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      disabled={actionLoading === cand.id}
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleResolve(cand.id, 'CONFIRMED_DUPLICATE')}
                    >
                      Confirm Duplicate
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, backgroundColor: '#ffffff', borderTop: '1px solid #DCE6F5' }}>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
