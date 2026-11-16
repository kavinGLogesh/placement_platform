import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import WorkIcon from '@mui/icons-material/Work';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { placementStudentService, StudentNotificationItem } from '../../services/placement-student.service.js';

interface NotificationBellProps {
  isStudent?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ isStudent = true }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['studentNotifications'],
    queryFn: () => placementStudentService.getNotifications(30),
    enabled: isStudent,
    refetchInterval: 30_000, // Poll every 30s for real-time notifications
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => placementStudentService.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => placementStudentService.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
    },
  });

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (item: StudentNotificationItem) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    handleClose();
    if (isStudent) {
      navigate('/student/drives');
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'DRIVE_AVAILABLE':
        return <WorkIcon sx={{ color: '#0D9488', fontSize: 20 }} />;
      case 'STATUS_CHANGED':
        return <HowToRegIcon sx={{ color: '#2563EB', fontSize: 20 }} />;
      case 'DRIVE_RESULT':
        return <EmojiEventsIcon sx={{ color: '#EA580C', fontSize: 20 }} />;
      default:
        return <NotificationsOutlinedIcon sx={{ color: '#64748B', fontSize: 20 }} />;
    }
  };

  if (!isStudent) return null;

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleOpen}
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            bgcolor: open ? '#F1F5F9' : '#FFFFFF',
            transition: 'all 0.15s ease',
            '&:hover': { bgcolor: '#F8FAFC' },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                height: 18,
                minWidth: 18,
                fontWeight: 700,
              },
            }}
          >
            <NotificationsOutlinedIcon sx={{ fontSize: 20, color: '#475569' }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: { xs: 320, sm: 380 },
            maxHeight: 480,
            borderRadius: 3,
            boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.15)',
            border: '1px solid #E2E8F0',
            mt: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Popover Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0F172A' }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Box
                sx={{
                  bgcolor: '#ECFDF5',
                  color: '#059669',
                  borderRadius: '12px',
                  px: 1,
                  py: 0.1,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {unreadCount} new
              </Box>
            )}
          </Box>

          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              startIcon={<DoneAllIcon sx={{ fontSize: 15 }} />}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0D9488',
                p: 0.5,
              }}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        {/* Notifications List */}
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={24} sx={{ color: '#0D9488' }} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
              <NotificationsOutlinedIcon sx={{ fontSize: 36, color: '#94A3B8', mb: 1 }} />
              <Typography variant="body2" fontWeight={700} sx={{ color: '#334155' }}>
                No notifications yet
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                You will be notified when placement drives, results, or interview schedules are announced.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleNotificationClick(item)}
                      sx={{
                        p: 1.75,
                        alignItems: 'flex-start',
                        bgcolor: !item.read ? '#F0FDF4' : '#FFFFFF',
                        transition: 'background-color 0.15s ease',
                        '&:hover': { bgcolor: '#F8FAFC' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                        {getNotifIcon(item.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                            <Typography
                              variant="caption"
                              fontWeight={!item.read ? 800 : 700}
                              sx={{ color: !item.read ? '#0F172A' : '#334155', fontSize: '0.8rem' }}
                            >
                              {item.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.68rem', whiteSpace: 'nowrap', ml: 1 }}>
                              {getRelativeTime(item.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#475569',
                              fontSize: '0.75rem',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.message}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {idx < notifications.length - 1 && <Divider component="li" sx={{ borderColor: '#F1F5F9' }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1.25,
              textAlign: 'center',
              borderTop: '1px solid #F1F5F9',
              bgcolor: '#FAFAFA',
            }}
          >
            <Button
              size="small"
              onClick={() => {
                handleClose();
                navigate('/student/drives');
              }}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#0D9488' }}
            >
              View All Placement Drives
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};
