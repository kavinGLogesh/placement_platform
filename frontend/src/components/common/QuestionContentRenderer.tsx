import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Paper,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';

interface QuestionContentRendererProps {
  content?: string | null;
  imageUrl?: string | null;
  variant?: 'body1' | 'body2';
  color?: string;
  sx?: Record<string, unknown>;
}

interface Segment {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  altText?: string;
}

/**
 * Appends JWT access token to internal question diagram requests if needed,
 * ensuring secure authenticated rendering in standard HTML img tags.
 */
function resolveAuthenticatedImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const token = localStorage.getItem('placement_access_token');
  if (!token) return rawUrl;

  // If internal endpoint and token not yet attached
  if (rawUrl.includes('/api/questions/images/') && !rawUrl.includes('token=')) {
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  return rawUrl;
}

export const QuestionContentRenderer: React.FC<QuestionContentRendererProps> = ({
  content,
  imageUrl,
  variant = 'body1',
  color = '#14264B',
  sx = {},
}) => {
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [activeZoomUrl, setActiveZoomUrl] = useState<string>('');
  const [activeZoomAlt, setActiveZoomAlt] = useState<string>('Question Diagram');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleOpenZoom = (url: string, alt: string) => {
    setActiveZoomUrl(url);
    setActiveZoomAlt(alt);
    setZoomScale(1);
    setZoomDialogOpen(true);
  };

  const handleCloseZoom = () => {
    setZoomDialogOpen(false);
    setZoomScale(1);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.3, 3.5));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.3, 0.6));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  const handleImageError = (key: string) => {
    setImageErrors((prev) => ({ ...prev, [key]: true }));
  };

  const handleRetryImage = (key: string) => {
    setImageErrors((prev) => ({ ...prev, [key]: false }));
  };

  // Parser for inline markdown images, html img tags, and direct image links
  const segments: Segment[] = [];
  const textContent = content || '';

  if (textContent) {
    const regex = /!\[([^\]]*)\]\(([^)]+)\)|<img[^>]*src=["']([^"']+)["'][^>]*>|(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S*)?)/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(textContent)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          text: textContent.substring(lastIndex, match.index),
        });
      }

      if (match[1] !== undefined && match[2] !== undefined) {
        segments.push({
          type: 'image',
          altText: match[1] || 'Question Graphic',
          imageUrl: match[2].trim(),
        });
      } else if (match[3] !== undefined) {
        segments.push({
          type: 'image',
          altText: 'Question Graphic',
          imageUrl: match[3].trim(),
        });
      } else if (match[4] !== undefined) {
        segments.push({
          type: 'image',
          altText: 'Question Graphic',
          imageUrl: match[4].trim(),
        });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < textContent.length) {
      segments.push({
        type: 'text',
        text: textContent.substring(lastIndex),
      });
    }
  }

  // Resolved direct question diagram image if provided via prop
  const resolvedDirectImageUrl = imageUrl ? resolveAuthenticatedImageUrl(imageUrl) : null;

  return (
    <Box sx={{ width: '100%', ...sx }}>
      {/* 1. Question Text & Inline Markdown Graphics */}
      {segments.map((seg, idx) => {
        if (seg.type === 'image' && seg.imageUrl) {
          const authSegUrl = resolveAuthenticatedImageUrl(seg.imageUrl);
          const errKey = `inline-${idx}`;
          const isError = Boolean(imageErrors[errKey]);

          return (
            <Box
              key={idx}
              sx={{
                my: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isError ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: '#FEF2F2',
                    borderColor: '#FCA5A5',
                    borderRadius: 2,
                  }}
                >
                  <BrokenImageIcon sx={{ color: '#EF4444' }} />
                  <Typography variant="body2" sx={{ color: '#991B1B', fontWeight: 500 }}>
                    Diagram image could not be loaded.
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<RefreshIcon />}
                    onClick={() => handleRetryImage(errKey)}
                    sx={{ color: '#DC2626' }}
                  >
                    Retry
                  </Button>
                </Paper>
              ) : (
                <Box
                  sx={{
                    position: 'relative',
                    maxWidth: '100%',
                    display: 'inline-block',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #DCE6F5',
                    boxShadow: '0 2px 4px rgba(20, 38, 75, 0.06)',
                    bgcolor: '#ffffff',
                    '&:hover .zoom-overlay': {
                      opacity: 1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={authSegUrl}
                    alt={seg.altText || 'Question graphic'}
                    onError={() => handleImageError(errKey)}
                    onClick={() => handleOpenZoom(authSegUrl, seg.altText || 'Question Graphic')}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 380,
                      display: 'block',
                      objectFit: 'contain',
                      cursor: 'zoom-in',
                    }}
                  />
                  <Box
                    className="zoom-overlay"
                    onClick={() => handleOpenZoom(authSegUrl, seg.altText || 'Question Graphic')}
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      bgcolor: 'rgba(20, 38, 75, 0.75)',
                      color: '#ffffff',
                      borderRadius: 1.5,
                      px: 1,
                      py: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <ZoomInIcon fontSize="small" />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Enlarge
                    </Typography>
                  </Box>
                </Box>
              )}

              {seg.altText && seg.altText !== 'Question Graphic' && (
                <Typography variant="caption" sx={{ color: '#7182A0', mt: 0.75, fontStyle: 'italic' }}>
                  {seg.altText}
                </Typography>
              )}
            </Box>
          );
        }

        return (
          <Typography
            key={idx}
            variant={variant}
            component="span"
            sx={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.65,
              color,
              display: 'inline',
            }}
          >
            {seg.text}
          </Typography>
        );
      })}

      {/* 2. Direct Question Diagram / Figure (Primary Associated Visual) */}
      {resolvedDirectImageUrl && (
        <Box sx={{ mt: 2.5, mb: 2 }}>
          {imageErrors['direct-diagram'] ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#FEF2F2',
                borderColor: '#FCA5A5',
                borderRadius: 2,
                maxWidth: 520,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <BrokenImageIcon sx={{ color: '#EF4444' }} />
                <Typography variant="body2" sx={{ color: '#991B1B', fontWeight: 500 }}>
                  Question diagram failed to load.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<RefreshIcon />}
                onClick={() => handleRetryImage('direct-diagram')}
              >
                Retry
              </Button>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: '#F8FAFC',
                border: '1px solid #DCE6F5',
                borderRadius: 2.5,
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                maxWidth: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  mb: 1.25,
                }}
              >
                <Chip
                  icon={<ImageIcon sx={{ fontSize: '1rem !important' }} />}
                  label="Question Diagram / Visual"
                  size="small"
                  sx={{
                    bgcolor: '#EBF3FE',
                    color: '#2563EB',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
                <Tooltip title="Click to Enlarge / Inspect Diagram">
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<ZoomInIcon />}
                    onClick={() => handleOpenZoom(resolvedDirectImageUrl, 'Question Diagram')}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#1E40AF',
                      textTransform: 'none',
                    }}
                  >
                    Zoom Diagram
                  </Button>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: '#ffffff',
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  cursor: 'zoom-in',
                  '&:hover .zoom-badge': {
                    opacity: 1,
                  },
                }}
                onClick={() => handleOpenZoom(resolvedDirectImageUrl, 'Question Diagram')}
              >
                <Box
                  component="img"
                  src={resolvedDirectImageUrl}
                  alt="Question Diagram"
                  onError={() => handleImageError('direct-diagram')}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: { xs: 260, sm: 360, md: 420 },
                    objectFit: 'contain',
                    borderRadius: 1,
                    transition: 'transform 0.2s ease',
                  }}
                />
                <Box
                  className="zoom-badge"
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    bgcolor: 'rgba(20, 38, 75, 0.8)',
                    color: '#ffffff',
                    borderRadius: 1.5,
                    px: 1.25,
                    py: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    opacity: 0.85,
                    transition: 'opacity 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  <ZoomInIcon fontSize="small" />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Click to Zoom
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {/* 3. Full-Featured Lightbox Inspection Modal Dialog */}
      <Dialog
        open={zoomDialogOpen}
        onClose={handleCloseZoom}
        maxWidth="lg"
        fullWidth
        aria-labelledby="diagram-zoom-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: '#0F172A',
            color: '#ffffff',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          id="diagram-zoom-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155',
            py: 1.5,
            px: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon sx={{ color: '#38BDF8' }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#F8FAFC' }}>
              {activeZoomAlt}
            </Typography>
            <Chip
              label={`${Math.round(zoomScale * 100)}%`}
              size="small"
              sx={{ bgcolor: '#1E293B', color: '#94A3B8', fontWeight: 600 }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Zoom Out">
              <span>
                <IconButton
                  size="small"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 0.6}
                  sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#1E293B' } }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Zoom In">
              <span>
                <IconButton
                  size="small"
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 3.5}
                  sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#1E293B' } }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Reset Zoom">
              <IconButton
                size="small"
                onClick={handleResetZoom}
                sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#1E293B' } }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={handleCloseZoom}
              sx={{ color: '#94A3B8', '&:hover': { color: '#ffffff', bgcolor: '#334155' }, ml: 1 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: 320, md: 520 },
            maxHeight: '80vh',
            overflow: 'auto',
            bgcolor: '#020617',
          }}
        >
          <Box
            component="img"
            src={activeZoomUrl}
            alt={activeZoomAlt}
            sx={{
              maxWidth: '100%',
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease',
              borderRadius: 1.5,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
              bgcolor: '#ffffff',
              p: 0.5,
            }}
          />
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #334155', px: 2.5, py: 1.25, justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Use the + / - buttons to inspect detailed circuits, graphs, tables, and mathematical notations.
          </Typography>
          <Button variant="contained" size="small" onClick={handleCloseZoom} sx={{ bgcolor: '#3B82F6', textTransform: 'none' }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
