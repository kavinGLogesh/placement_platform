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
  CircularProgress,
  Skeleton,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export interface QuestionContentRendererProps {
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

interface ZoomItem {
  url: string;
  altText: string;
  key: string;
}

/**
 * Parses single URL, comma/newline-separated URLs, or JSON array string of URLs
 * to reliably handle multiple diagrammatic graphics for a question.
 */
export function parseImageUrls(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Case 1: JSON array e.g. ["url1", "url2"]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }
    } catch {
      // Fall through to other delimiters
    }
  }

  // Case 2: Comma or newline separated list of URLs / filenames
  if (trimmed.includes(',') || trimmed.includes('\n')) {
    const parts = trimmed
      .split(/[\r\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      return parts;
    }
  }

  // Case 3: Single URL or filename
  return [trimmed];
}

/**
 * Normalizes question image paths (filenames, relative uploads paths, API paths)
 * and attaches JWT access token to ensure authorized image rendering.
 */
export function resolveAuthenticatedImageUrl(rawUrl: string, retrySeed?: number): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // 1. Normalize if just a filename (e.g. qimg_123.png)
  if (/^qimg_[a-zA-Z0-9_\-.]+\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed)) {
    trimmed = `/api/questions/images/${trimmed}`;
  } else if (trimmed.startsWith('uploads/questions/') || trimmed.startsWith('/uploads/questions/')) {
    const filename = trimmed.split('/').pop() || '';
    trimmed = `/api/questions/images/${filename}`;
  }

  // 2. Attach JWT token for internal endpoints if not already attached
  const token = localStorage.getItem('placement_access_token');
  const params: string[] = [];

  if (retrySeed) {
    params.push(`_retry=${retrySeed}`);
  }

  if (token && (trimmed.includes('/api/questions/images/') || trimmed.startsWith('/api/')) && !trimmed.includes('token=')) {
    params.push(`token=${encodeURIComponent(token)}`);
  }

  if (params.length === 0) return trimmed;

  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}${params.join('&')}`;
}

export const QuestionContentRenderer: React.FC<QuestionContentRendererProps> = ({
  content,
  imageUrl,
  variant = 'body1',
  color = '#14264B',
  sx = {},
}) => {
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [zoomItems, setZoomItems] = useState<ZoomItem[]>([]);
  const [activeZoomIndex, setActiveZoomIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [retrySeeds, setRetrySeeds] = useState<Record<string, number>>({});
  const [zoomLoading, setZoomLoading] = useState<boolean>(true);
  const [zoomError, setZoomError] = useState<boolean>(false);

  const handleOpenZoom = (items: ZoomItem[], startIndex = 0) => {
    setZoomItems(items);
    setActiveZoomIndex(startIndex);
    setZoomScale(1);
    setZoomLoading(true);
    setZoomError(false);
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

  const handlePrevZoom = () => {
    if (activeZoomIndex > 0) {
      setActiveZoomIndex((prev) => prev - 1);
      setZoomScale(1);
      setZoomLoading(true);
      setZoomError(false);
    }
  };

  const handleNextZoom = () => {
    if (activeZoomIndex < zoomItems.length - 1) {
      setActiveZoomIndex((prev) => prev + 1);
      setZoomScale(1);
      setZoomLoading(true);
      setZoomError(false);
    }
  };

  const handleImageError = (key: string) => {
    setImageErrors((prev) => ({ ...prev, [key]: true }));
    setImageLoaded((prev) => ({ ...prev, [key]: false }));
  };

  const handleImageLoad = (key: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Detect dummy 1x1 or corrupted 0x0 images and treat as failure
    if (img.naturalWidth <= 2 && img.naturalHeight <= 2) {
      handleImageError(key);
    } else {
      setImageLoaded((prev) => ({ ...prev, [key]: true }));
      setImageErrors((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRetryImage = (key: string) => {
    setImageErrors((prev) => ({ ...prev, [key]: false }));
    setImageLoaded((prev) => ({ ...prev, [key]: false }));
    setRetrySeeds((prev) => ({ ...prev, [key]: Date.now() }));
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

  // Parse all direct question diagrams from prop
  const rawDirectImageUrls = parseImageUrls(imageUrl);
  const directDiagramItems: ZoomItem[] = rawDirectImageUrls.map((url, idx) => ({
    url,
    altText: rawDirectImageUrls.length > 1 ? `Question Diagram ${idx + 1}` : 'Question Diagram',
    key: `direct-diagram-${idx}`,
  }));

  const activeZoomItem = zoomItems[activeZoomIndex];
  const activeZoomUrl = activeZoomItem
    ? resolveAuthenticatedImageUrl(activeZoomItem.url, retrySeeds[activeZoomItem.key])
    : '';

  return (
    <Box sx={{ width: '100%', ...sx }}>
      {/* 1. Question Text & Inline Markdown Graphics */}
      {segments.map((seg, idx) => {
        if (seg.type === 'image' && seg.imageUrl) {
          const errKey = `inline-${idx}`;
          const authSegUrl = resolveAuthenticatedImageUrl(seg.imageUrl, retrySeeds[errKey]);
          const isError = Boolean(imageErrors[errKey]);
          const isLoaded = Boolean(imageLoaded[errKey]);

          return (
            <Box
              key={idx}
              sx={{
                my: 2.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                width: '100%',
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
                    maxWidth: 520,
                  }}
                >
                  <BrokenImageIcon sx={{ color: '#EF4444' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ color: '#991B1B', fontWeight: 600 }}>
                      Diagram image failed to load.
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B91C1C' }}>
                      Verify your connection and authentication.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<RefreshIcon />}
                    onClick={() => handleRetryImage(errKey)}
                  >
                    Retry
                  </Button>
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: '#F8FAFC',
                    borderColor: '#DCE6F5',
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
                      mb: 1,
                    }}
                  >
                    <Chip
                      icon={<ImageIcon sx={{ fontSize: '1rem !important' }} />}
                      label={seg.altText || 'Inline Visual'}
                      size="small"
                      sx={{
                        bgcolor: '#EBF3FE',
                        color: '#2563EB',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                    <Tooltip title="Click to inspect enlarged diagram">
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<ZoomInIcon />}
                        onClick={() =>
                          handleOpenZoom([{ url: seg.imageUrl!, altText: seg.altText || 'Diagram', key: errKey }])
                        }
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
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      bgcolor: '#ffffff',
                      p: 1,
                      borderRadius: 2,
                      border: '1px solid #E2E8F0',
                      cursor: 'zoom-in',
                      minHeight: isLoaded ? 'auto' : 160,
                      minWidth: { xs: 240, sm: 320 },
                      maxWidth: '100%',
                      '&:hover .zoom-badge': {
                        opacity: 1,
                      },
                    }}
                    onClick={() =>
                      handleOpenZoom([{ url: seg.imageUrl!, altText: seg.altText || 'Diagram', key: errKey }])
                    }
                  >
                    {!isLoaded && !isError && (
                      <Skeleton variant="rectangular" width="100%" height={220} sx={{ borderRadius: 1.5 }} />
                    )}
                    <Box
                      component="img"
                      src={authSegUrl}
                      alt={seg.altText || 'Question graphic'}
                      onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => handleImageLoad(errKey, e)}
                      onError={() => handleImageError(errKey)}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: { xs: 260, sm: 380, md: 440 },
                        display: isLoaded ? 'block' : 'none',
                        objectFit: 'contain',
                        borderRadius: 1,
                      }}
                    />
                    {isLoaded && (
                      <Box
                        className="zoom-badge"
                        sx={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          bgcolor: 'rgba(20, 38, 75, 0.82)',
                          color: '#ffffff',
                          borderRadius: 1.5,
                          px: 1,
                          py: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        <ZoomInIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          Click to Zoom
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
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

      {/* 2. Direct Question Diagram(s) (Primary Associated Visuals) */}
      {directDiagramItems.length > 0 && (
        <Box sx={{ mt: 2.5, mb: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {directDiagramItems.map((item, index) => {
            const errKey = item.key;
            const resolvedUrl = resolveAuthenticatedImageUrl(item.url, retrySeeds[errKey]);
            const isError = Boolean(imageErrors[errKey]);
            const isLoaded = Boolean(imageLoaded[errKey]);
            const chipLabel =
              directDiagramItems.length > 1
                ? `Question Diagram ${index + 1} of ${directDiagramItems.length}`
                : 'Question Diagram / Visual';

            return (
              <Box key={errKey} sx={{ width: '100%' }}>
                {isError ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: '#FEF2F2',
                      borderColor: '#FCA5A5',
                      borderRadius: 2.5,
                      maxWidth: 580,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                      <BrokenImageIcon sx={{ color: '#EF4444', fontSize: 28 }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#991B1B', fontWeight: 600 }}>
                          Diagram image could not be displayed.
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#B91C1C' }}>
                          Resource: {item.url}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<RefreshIcon />}
                      onClick={() => handleRetryImage(errKey)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
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
                      boxShadow: '0 2px 8px rgba(20, 38, 75, 0.04)',
                    }}
                  >
                    {/* Header Bar */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        mb: 1.5,
                        gap: 2,
                      }}
                    >
                      <Chip
                        icon={<ImageIcon sx={{ fontSize: '1rem !important' }} />}
                        label={chipLabel}
                        size="small"
                        sx={{
                          bgcolor: '#EBF3FE',
                          color: '#2563EB',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          border: '1px solid #BFDBFE',
                        }}
                      />
                      <Tooltip title="Click to inspect enlarged high-resolution diagram">
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<ZoomInIcon />}
                          onClick={() => handleOpenZoom(directDiagramItems, index)}
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#1E40AF',
                            textTransform: 'none',
                            bgcolor: 'rgba(37, 99, 235, 0.06)',
                            borderRadius: 1.5,
                            px: 1.25,
                            '&:hover': {
                              bgcolor: 'rgba(37, 99, 235, 0.12)',
                            },
                          }}
                        >
                          Zoom Diagram
                        </Button>
                      </Tooltip>
                    </Box>

                    {/* Image Render Area */}
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        bgcolor: '#ffffff',
                        p: { xs: 1, sm: 1.5 },
                        borderRadius: 2,
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        cursor: 'zoom-in',
                        minHeight: isLoaded ? 'auto' : 180,
                        minWidth: { xs: 260, sm: 360 },
                        '&:hover .zoom-badge': {
                          opacity: 1,
                        },
                      }}
                      onClick={() => handleOpenZoom(directDiagramItems, index)}
                    >
                      {!isLoaded && !isError && (
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                          <CircularProgress size={32} sx={{ color: '#3B82F6', mb: 1.5 }} />
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            Loading question diagram...
                          </Typography>
                        </Box>
                      )}
                      <Box
                        component="img"
                        src={resolvedUrl}
                        alt={item.altText}
                        onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => handleImageLoad(errKey, e)}
                        onError={() => handleImageError(errKey)}
                        sx={{
                          maxWidth: '100%',
                          maxHeight: { xs: 260, sm: 380, md: 440 },
                          display: isLoaded ? 'block' : 'none',
                          objectFit: 'contain',
                          borderRadius: 1,
                          transition: 'transform 0.2s ease',
                        }}
                      />
                      {isLoaded && (
                        <Box
                          className="zoom-badge"
                          sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            bgcolor: 'rgba(20, 38, 75, 0.85)',
                            color: '#ffffff',
                            borderRadius: 1.5,
                            px: 1.25,
                            py: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            opacity: 0.85,
                            transition: 'opacity 0.2s ease',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          }}
                        >
                          <ZoomInIcon fontSize="small" />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            Click to Zoom
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                )}
              </Box>
            );
          })}
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
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
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
            bgcolor: '#1E293B',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ImageIcon sx={{ color: '#38BDF8' }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#F8FAFC' }}>
              {activeZoomItem ? activeZoomItem.altText : 'Question Diagram'}
            </Typography>
            {zoomItems.length > 1 && (
              <Chip
                label={`${activeZoomIndex + 1} of ${zoomItems.length}`}
                size="small"
                sx={{ bgcolor: '#0F172A', color: '#38BDF8', fontWeight: 600, fontSize: '0.75rem' }}
              />
            )}
            <Chip
              label={`${Math.round(zoomScale * 100)}%`}
              size="small"
              sx={{ bgcolor: '#334155', color: '#94A3B8', fontWeight: 600 }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {zoomItems.length > 1 && (
              <>
                <Tooltip title="Previous Diagram">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handlePrevZoom}
                      disabled={activeZoomIndex === 0}
                      sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#334155' } }}
                    >
                      <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Next Diagram">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleNextZoom}
                      disabled={activeZoomIndex === zoomItems.length - 1}
                      sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#334155' } }}
                    >
                      <NavigateNextIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}

            <Tooltip title="Zoom Out">
              <span>
                <IconButton
                  size="small"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 0.6}
                  sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#334155' } }}
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
                  sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#334155' } }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Reset Zoom">
              <IconButton
                size="small"
                onClick={handleResetZoom}
                sx={{ color: '#CBD5E1', '&:hover': { bgcolor: '#334155' } }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={handleCloseZoom}
              sx={{ color: '#94A3B8', '&:hover': { color: '#ffffff', bgcolor: '#475569' }, ml: 1 }}
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
            minHeight: { xs: 340, md: 540 },
            maxHeight: '80vh',
            overflow: 'auto',
            bgcolor: '#0B132B',
            position: 'relative',
          }}
        >
          {zoomLoading && !zoomError && (
            <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={40} sx={{ color: '#38BDF8' }} />
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                Loading visual inspection viewer...
              </Typography>
            </Box>
          )}

          {zoomError ? (
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: '#1E293B',
                borderColor: '#EF4444',
                border: '1px solid #EF4444',
                borderRadius: 2,
                maxWidth: 420,
                textAlign: 'center',
              }}
            >
              <BrokenImageIcon sx={{ color: '#EF4444', fontSize: 40 }} />
              <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                High-resolution diagram failed to load
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                The requested visual could not be rendered in the inspection window.
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setZoomError(false);
                  setZoomLoading(true);
                  if (activeZoomItem) {
                    handleRetryImage(activeZoomItem.key);
                  }
                }}
                sx={{ bgcolor: '#2563EB', textTransform: 'none', mt: 1 }}
              >
                Retry Loading
              </Button>
            </Paper>
          ) : (
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2.5,
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
                display: zoomLoading ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${zoomScale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
                maxWidth: '96%',
              }}
            >
              <Box
                component="img"
                src={activeZoomUrl}
                alt={activeZoomItem ? activeZoomItem.altText : 'Question Diagram'}
                onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth <= 2 && img.naturalHeight <= 2) {
                    setZoomError(true);
                    setZoomLoading(false);
                  } else {
                    setZoomLoading(false);
                    setZoomError(false);
                  }
                }}
                onError={() => {
                  setZoomLoading(false);
                  setZoomError(true);
                }}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 'calc(80vh - 160px)',
                  objectFit: 'contain',
                  borderRadius: 1,
                  display: 'block',
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: '1px solid #334155',
            px: 2.5,
            py: 1.5,
            justifyContent: 'space-between',
            bgcolor: '#1E293B',
          }}
        >
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            Use the + / - buttons to inspect detailed circuits, graphs, tables, and mathematical notations.
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleCloseZoom}
            sx={{ bgcolor: '#2563EB', textTransform: 'none', px: 2.5, fontWeight: 600 }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
