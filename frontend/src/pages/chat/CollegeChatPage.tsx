import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Button,
  Avatar,
  Chip,
  Badge,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  Divider,
  OutlinedInput,
  Drawer,
  CircularProgress,
  Tooltip,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ReplyIcon from '@mui/icons-material/Reply';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import ForumIcon from '@mui/icons-material/Forum';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import { useAuth } from '../../hooks/useAuth.js';
import { chatService } from '../../services/chat.service.js';
import {
  ChatGroup,
  ChatMessage,
  ChatGroupMember,
  ChatGroupType,
  CreateChatGroupInput,
} from '../../types/chat.types.js';

// Platform Theme Chip Styles
const GROUP_TYPE_METAS: Record<
  ChatGroupType,
  { label: string; bg: string; color: string; border: string }
> = {
  DEPARTMENT: { label: 'Department', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  CROSS_DEPARTMENT: { label: 'Cross-Dept', bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  UG_ALL: { label: 'UG Cohort', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  PG_ALL: { label: 'PG Cohort', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  CUSTOM: { label: 'Custom', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
  BROADCAST: { label: 'Broadcast', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  PLACEMENT_DRIVE: { label: 'Drive', bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' },
};

export const CollegeChatPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'PLACEMENT_ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'ALL';

  // State
  const [filter, setFilter] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatGroupMember[]>([]);

  // UI Loaders
  const [loadingGroups, setLoadingGroups] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [syncingDept, setSyncingDept] = useState<boolean>(false);

  // Message Composition
  const [inputContent, setInputContent] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);

  // Drawers & Modals
  const [infoDrawerOpen, setInfoDrawerOpen] = useState<boolean>(false);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Departments & Users for modals
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [newGroupDept, setNewGroupDept] = useState<string>('');

  // Create Group Form
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDescription, setNewGroupDescription] = useState<string>('');
  const [newGroupType, setNewGroupType] = useState<ChatGroupType>('DEPARTMENT');
  const [newGroupDeptIds, setNewGroupDeptIds] = useState<string[]>([]);
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);

  // Edit Group Form & State (Admin Only)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editGroupName, setEditGroupName] = useState<string>('');
  const [editGroupDescription, setEditGroupDescription] = useState<string>('');
  const [editGroupType, setEditGroupType] = useState<ChatGroupType>('DEPARTMENT');
  const [editGroupDeptIds, setEditGroupDeptIds] = useState<string[]>([]);
  const [updatingGroup, setUpdatingGroup] = useState<boolean>(false);

  // Delete Group State (Admin Only)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [deletingGroup, setDeletingGroup] = useState<boolean>(false);

  // Group Header Menu Anchor
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(null);

  // Toast feedback
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    setToast({ open: true, message, severity });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync URL filter parameter
  useEffect(() => {
    const f = searchParams.get('filter') || 'ALL';
    setFilter(f);
  }, [searchParams]);

  // Load Groups
  const fetchGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const apiFilter = filter === 'ALL' ? undefined : filter;
      const data = await chatService.getGroups(apiFilter, searchQuery);
      setGroups(data);

      if (selectedGroup) {
        const found = data.find((g) => g.id === selectedGroup.id);
        if (found) {
          setSelectedGroup(found);
        }
      }
    } catch (err) {
      console.error('Failed to load chat groups', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [filter, searchQuery, selectedGroup]);

  useEffect(() => {
    fetchGroups();
  }, [filter, searchQuery]);

  // Fetch departments for dropdowns
  useEffect(() => {
    chatService.getDepartments().then(setDepartmentsList).catch(console.error);
  }, []);

  // Real-time SSE Connection
  useEffect(() => {
    const unsubscribe = chatService.subscribeToChatEvents(
      (payload) => {
        if (payload.type === 'NEW_MESSAGE') {
          const newMsg: ChatMessage = payload.data;

          if (selectedGroup && newMsg.groupId === selectedGroup.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            chatService.markAsRead(selectedGroup.id).catch(console.error);
          }

          setGroups((prev) =>
            prev.map((g) => {
              if (g.id === newMsg.groupId) {
                const isCurrentViewing = selectedGroup && selectedGroup.id === newMsg.groupId;
                return {
                  ...g,
                  lastMessage: newMsg,
                  updatedAt: newMsg.createdAt,
                  unreadCount: isCurrentViewing
                    ? 0
                    : (g.unreadCount || 0) + (newMsg.senderId !== user?.id ? 1 : 0),
                };
              }
              return g;
            })
          );
        } else if (payload.type === 'GROUP_UPDATED') {
          fetchGroups();
          if (selectedGroup && payload.groupId === selectedGroup.id) {
            chatService
              .getGroupDetails(selectedGroup.id)
              .then(setSelectedGroup)
              .catch(console.error);
          }
        } else if (payload.type === 'MEMBER_JOINED' || payload.type === 'MEMBER_LEFT') {
          if (selectedGroup && payload.groupId === selectedGroup.id) {
            chatService.getGroupMembers(selectedGroup.id).then(setMembers).catch(console.error);
          }
        }
      },
      (error) => {
        console.warn('SSE stream error/reconnecting', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedGroup, user?.id, fetchGroups]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load Messages & Members when active group changes
  useEffect(() => {
    if (!selectedGroup) return;

    let isMounted = true;
    setLoadingMessages(true);

    Promise.all([
      chatService.getMessages(selectedGroup.id, 60),
      chatService.getGroupMembers(selectedGroup.id),
    ])
      .then(([msgs, mems]) => {
        if (!isMounted) return;
        setMessages(msgs);
        setMembers(mems);

        setGroups((prev) =>
          prev.map((g) => (g.id === selectedGroup.id ? { ...g, unreadCount: 0 } : g))
        );
      })
      .catch((err) => {
        console.error('Error fetching group data', err);
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGroup?.id]);

  // Handle Send Message
  const handleSendMessage = async () => {
    if (!selectedGroup || (!inputContent.trim() && !selectedFile)) return;

    try {
      setSendingMessage(true);
      let fileData: {
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      } | null = null;

      if (selectedFile) {
        setUploadingAttachment(true);
        fileData = await chatService.uploadAttachment(selectedFile);
        setUploadingAttachment(false);
      }

      let messageType: any = 'TEXT';
      if (fileData) {
        if (fileData.mimeType.startsWith('image/')) {
          messageType = 'IMAGE';
        } else if (fileData.mimeType.includes('pdf')) {
          messageType = 'DOCUMENT';
        } else {
          messageType = 'FILE';
        }
      }

      const created = await chatService.sendMessage(selectedGroup.id, {
        content: inputContent.trim() || undefined,
        messageType,
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileSize: fileData?.fileSize,
        mimeType: fileData?.mimeType,
        replyToId: replyingTo?.id,
      });

      setMessages((prev) => [...prev, created]);
      setInputContent('');
      setReplyingTo(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Failed to send message', err);
      showToast(err.response?.data?.message || 'Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
      setUploadingAttachment(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Trigger Department Synchronization
  const handleSyncDepartments = async () => {
    if (!selectedGroup) return;
    try {
      setSyncingDept(true);
      const res = await chatService.syncDepartments(selectedGroup.id);
      const updatedMembers = await chatService.getGroupMembers(selectedGroup.id);
      setMembers(updatedMembers);
      showToast(`Synchronized successfully! ${res.count} student(s) synchronized.`, 'success');
    } catch (err: any) {
      console.error('Sync failed', err);
      showToast(err.response?.data?.message || 'Sync failed', 'error');
    } finally {
      setSyncingDept(false);
    }
  };

  // Add Department to Group
  const handleAddDepartment = async () => {
    if (!selectedGroup || !newGroupDept) return;
    try {
      await chatService.addDepartment(selectedGroup.id, newGroupDept);
      setNewGroupDept('');
      const updated = await chatService.getGroupDetails(selectedGroup.id);
      setSelectedGroup(updated);
      const updatedMembers = await chatService.getGroupMembers(selectedGroup.id);
      setMembers(updatedMembers);
      showToast('Department mapped and students synchronized', 'success');
    } catch (err: any) {
      console.error('Failed to add department', err);
      showToast(err.response?.data?.message || 'Failed to add department', 'error');
    }
  };

  // Remove Department from Group
  const handleRemoveDepartment = async (deptId: string) => {
    if (!selectedGroup) return;
    if (!window.confirm('Remove this department mapping from the channel?')) return;
    try {
      await chatService.removeDepartment(selectedGroup.id, deptId);
      const updated = await chatService.getGroupDetails(selectedGroup.id);
      setSelectedGroup(updated);
      const updatedMembers = await chatService.getGroupMembers(selectedGroup.id);
      setMembers(updatedMembers);
      showToast('Department mapping removed', 'info');
    } catch (err: any) {
      console.error('Failed to remove department', err);
      showToast(err.response?.data?.message || 'Failed to remove department', 'error');
    }
  };

  // Create Group Handler
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showToast('Group name is required', 'warning');
      return;
    }

    try {
      setCreatingGroup(true);
      const payload: CreateChatGroupInput = {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        type: newGroupType,
        departmentIds: newGroupDeptIds.length > 0 ? newGroupDeptIds : undefined,
        initialMemberUserIds: newGroupMemberIds.length > 0 ? newGroupMemberIds : undefined,
      };

      const created = await chatService.createGroup(payload);
      setCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupType('DEPARTMENT');
      setNewGroupDeptIds([]);
      setNewGroupMemberIds([]);
      showToast('Channel created successfully!', 'success');
      await fetchGroups();
      setSelectedGroup(created);
    } catch (err: any) {
      console.error('Failed to create group', err);
      showToast(err.response?.data?.message || 'Failed to create group', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Search users when adding members
  const handleSearchUsers = async (query: string) => {
    setMemberSearchQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    try {
      const results = await chatService.searchUsers(query);
      setUserSearchResults(results);
    } catch (err) {
      console.error('Failed to search users', err);
    }
  };

  // Add Direct Member
  const handleAddDirectMember = async (targetUserId: string) => {
    if (!selectedGroup) return;
    try {
      await chatService.addMembers(selectedGroup.id, [targetUserId]);
      const updatedMembers = await chatService.getGroupMembers(selectedGroup.id);
      setMembers(updatedMembers);
      setUserSearchResults((prev) => prev.filter((u) => u.userId !== targetUserId));
      showToast('Member added successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add member', 'error');
    }
  };

  // Remove Member
  const handleRemoveMember = async (targetUserId: string) => {
    if (!selectedGroup) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await chatService.removeMember(selectedGroup.id, targetUserId);
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
      showToast('Member removed from group', 'info');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to remove member', 'error');
    }
  };

  // Open Edit Modal pre-populated with current group data
  const handleOpenEditModal = (groupToEdit?: ChatGroup) => {
    const target = groupToEdit || selectedGroup;
    if (!target) return;
    setEditGroupName(target.name);
    setEditGroupDescription(target.description || '');
    setEditGroupType(target.type);
    setEditGroupDeptIds(target.departments?.map((d) => d.departmentId) || []);
    setEditModalOpen(true);
    setHeaderMenuAnchor(null);
  };

  // Submit Edit Group
  const handleSaveGroupEdit = async () => {
    if (!selectedGroup) return;
    if (!editGroupName.trim()) {
      showToast('Group name is required', 'warning');
      return;
    }

    try {
      setUpdatingGroup(true);
      const updated = await chatService.updateGroup(selectedGroup.id, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim() || undefined,
        type: editGroupType,
        departmentIds: editGroupDeptIds,
      });

      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));

      // Reload members since departments might have changed
      chatService.getGroupMembers(selectedGroup.id).then(setMembers).catch(console.error);

      setEditModalOpen(false);
      showToast('Channel settings updated successfully!', 'success');
      fetchGroups();
    } catch (err: any) {
      console.error('Failed to update group', err);
      showToast(err.response?.data?.message || err.message || 'Failed to update channel', 'error');
    } finally {
      setUpdatingGroup(false);
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDeleteConfirm = () => {
    setHeaderMenuAnchor(null);
    setDeleteConfirmOpen(true);
  };

  // Confirm Delete Group
  const handleConfirmDeleteGroup = async () => {
    if (!selectedGroup) return;

    try {
      setDeletingGroup(true);
      const deletedName = selectedGroup.name;
      const deletedId = selectedGroup.id;
      await chatService.deleteGroup(deletedId);

      setGroups((prev) => prev.filter((g) => g.id !== deletedId));
      setSelectedGroup(null);
      setInfoDrawerOpen(false);
      setDeleteConfirmOpen(false);
      showToast(`Channel "${deletedName}" has been deleted permanently`, 'success');
      fetchGroups();
    } catch (err: any) {
      console.error('Failed to delete group', err);
      showToast(err.response?.data?.message || err.message || 'Failed to delete channel', 'error');
    } finally {
      setDeletingGroup(false);
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groupsMap: { [dateStr: string]: ChatMessage[] } = {};
    for (const msg of messages) {
      const d = new Date(msg.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateKey = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (d.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (d.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      }

      if (!groupsMap[dateKey]) groupsMap[dateKey] = [];
      groupsMap[dateKey].push(msg);
    }
    return groupsMap;
  }, [messages]);

  // Format timestamp
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const baseURL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api\/?$/, '');

  return (
    <Box
      sx={{
        height: 'calc(100vh - 88px)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#EDF2FF',
        overflow: 'hidden',
        borderRadius: { xs: 0, sm: 2.5 },
        border: '1px solid #DCE6F5',
        boxShadow: '0 4px 20px rgba(23, 101, 181, 0.08)',
        m: { xs: -2, sm: 0 },
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION LIST (PLATFORM NAVY / BLUE SYSTEM)              */}
        {/* ========================================================================= */}
        <Box
          sx={{
            width: { xs: '100%', md: 360, lg: 390 },
            display: {
              xs: selectedGroup ? 'none' : 'flex',
              md: 'flex',
            },
            flexDirection: 'column',
            borderRight: '1px solid #DCE6F5',
            bgcolor: '#FFFFFF',
            height: '100%',
          }}
        >
          {/* Header Bar: Platform Deep Navy Brand Banner */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#14264B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: '#1765B5',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  width: 40,
                  height: 40,
                  boxShadow: '0 2px 8px rgba(23, 101, 181, 0.35)',
                }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#FFFFFF' }}>
                  Campus Chat
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  {isAdmin ? 'Placement Admin' : user?.student?.department || 'Student'}
                </Typography>
              </Box>
            </Box>

            {isAdmin && (
              <Button
                variant="contained"
                size="small"
                startIcon={<GroupAddIcon sx={{ fontSize: 18 }} />}
                onClick={() => setCreateModalOpen(true)}
                sx={{
                  bgcolor: '#0284c7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  px: 1.8,
                  py: 0.6,
                  fontSize: '0.82rem',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                  '&:hover': { bgcolor: '#0369a1' },
                }}
              >
                New Group
              </Button>
            )}
          </Box>

          {/* Search Box */}
          <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search conversations, drives, cohorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#64748B', fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: '#FFFFFF',
                  borderRadius: 2,
                  fontSize: '0.88rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E2E8F0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1765B5',
                  },
                },
              }}
            />
          </Box>

          {/* Filter Pills */}
          <Box
            sx={{
              px: 1.5,
              py: 1,
              display: 'flex',
              gap: 0.8,
              overflowX: 'auto',
              borderBottom: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DEPARTMENT', label: 'Departments' },
              { id: 'PLACEMENT_DRIVE', label: 'Drives' },
              { id: 'CUSTOM', label: 'Custom' },
              { id: 'UNREAD', label: 'Unread' },
            ].map((f) => {
              const active = filter === f.id;
              return (
                <Chip
                  key={f.id}
                  label={f.label}
                  size="small"
                  clickable
                  onClick={() => {
                    setFilter(f.id);
                    setSearchParams({ filter: f.id });
                  }}
                  sx={{
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? '#1765B5' : '#F1F5F9',
                    color: active ? '#FFFFFF' : '#475569',
                    border: active ? '1px solid #1765B5' : '1px solid #E2E8F0',
                    fontSize: '0.78rem',
                    borderRadius: 1.5,
                    '&:hover': {
                      bgcolor: active ? '#104B91' : '#E2E8F0',
                    },
                  }}
                />
              );
            })}
          </Box>

          {/* Groups List */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loadingGroups ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={30} sx={{ color: '#1765B5' }} />
              </Box>
            ) : groups.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4, color: '#64748B' }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#14264B' }}>
                  No channels found
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                  {isAdmin
                    ? 'Click "+ New Group" to create department or placement channels.'
                    : 'You will see conversations here once enrolled in department cohorts or placement drives.'}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {groups.map((group) => {
                  const isSelected = selectedGroup?.id === group.id;
                  const typeMeta = GROUP_TYPE_METAS[group.type] || {
                    label: group.type,
                    bg: '#F1F5F9',
                    color: '#334155',
                    border: '#CBD5E1',
                  };

                  let lastMsgText = 'No messages yet';
                  if (group.lastMessage) {
                    if (group.lastMessage.messageType === 'IMAGE') {
                      lastMsgText = '📷 Photo';
                    } else if (
                      group.lastMessage.messageType === 'DOCUMENT' ||
                      group.lastMessage.messageType === 'FILE'
                    ) {
                      lastMsgText = `📄 ${group.lastMessage.fileName || 'Document'}`;
                    } else {
                      lastMsgText = group.lastMessage.content || '';
                    }
                  }

                  return (
                    <ListItemButton
                      key={group.id}
                      selected={isSelected}
                      onClick={() => {
                        setSelectedGroup(group);
                      }}
                      sx={{
                        py: 1.4,
                        px: 2,
                        borderBottom: '1px solid #F1F5F9',
                        borderLeft: isSelected ? '4px solid #1765B5' : '4px solid transparent',
                        bgcolor: isSelected ? '#EDF2FF' : '#FFFFFF',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          bgcolor: isSelected ? '#E2ECFF' : '#F8FAFC',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          badgeContent={group.unreadCount || 0}
                          max={99}
                          invisible={!group.unreadCount}
                          sx={{
                            '& .MuiBadge-badge': {
                              bgcolor: '#0284c7',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                            },
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor:
                                group.type === 'PLACEMENT_DRIVE'
                                  ? '#0284c7'
                                  : group.type === 'DEPARTMENT'
                                  ? '#1765B5'
                                  : '#334155',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              width: 42,
                              height: 42,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            }}
                          >
                            {group.type === 'PLACEMENT_DRIVE' ? (
                              <WorkIcon sx={{ fontSize: 20 }} />
                            ) : group.type === 'DEPARTMENT' ? (
                              <SchoolIcon sx={{ fontSize: 20 }} />
                            ) : (
                              <GroupsIcon sx={{ fontSize: 20 }} />
                            )}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: (group.unreadCount || 0) > 0 ? 800 : 700,
                                color: isSelected ? '#1765B5' : '#14264B',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '70%',
                                fontSize: '0.9rem',
                              }}
                            >
                              {group.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: (group.unreadCount || 0) > 0 ? '#0284c7' : '#64748B',
                                fontWeight: (group.unreadCount || 0) > 0 ? 700 : 500,
                                fontSize: '0.74rem',
                              }}
                            >
                              {group.lastMessage ? formatTime(group.lastMessage.createdAt) : ''}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.4 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: (group.unreadCount || 0) > 0 ? '#1E293B' : '#64748B',
                                fontSize: '0.8rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '75%',
                                fontWeight: (group.unreadCount || 0) > 0 ? 600 : 400,
                              }}
                            >
                              {group.lastMessage && group.lastMessage.senderName ? (
                                <span style={{ fontWeight: 600, color: '#334155' }}>
                                  {group.lastMessage.senderName}:{' '}
                                </span>
                              ) : null}
                              {lastMsgText}
                            </Typography>
                            <Chip
                              label={typeMeta.label}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                borderRadius: 1,
                                bgcolor: typeMeta.bg,
                                color: typeMeta.color,
                                border: `1px solid ${typeMeta.border}`,
                              }}
                            />
                          </Box>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: ACTIVE CHAT CONVERSATION VIEWPORT                         */}
        {/* ========================================================================= */}
        <Box
          sx={{
            flex: 1,
            display: {
              xs: selectedGroup ? 'flex' : 'none',
              md: 'flex',
            },
            flexDirection: 'column',
            bgcolor: '#F8FAFC',
            height: '100%',
            position: 'relative',
          }}
        >
          {selectedGroup ? (
            <>
              {/* Conversation Top Header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  bgcolor: '#FFFFFF',
                  borderBottom: '1px solid #DCE6F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 2,
                  boxShadow: '0 1px 4px rgba(20, 38, 75, 0.04)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {isMobile && (
                    <IconButton
                      size="small"
                      onClick={() => setSelectedGroup(null)}
                      sx={{ color: '#1765B5', mr: 0.5 }}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                  )}
                  <Avatar
                    sx={{
                      bgcolor:
                        selectedGroup.type === 'PLACEMENT_DRIVE'
                          ? '#0284c7'
                          : selectedGroup.type === 'DEPARTMENT'
                          ? '#1765B5'
                          : '#334155',
                      cursor: 'pointer',
                      width: 44,
                      height: 44,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                    onClick={() => setInfoDrawerOpen(true)}
                  >
                    {selectedGroup.type === 'PLACEMENT_DRIVE' ? (
                      <WorkIcon sx={{ fontSize: 22 }} />
                    ) : selectedGroup.type === 'DEPARTMENT' ? (
                      <SchoolIcon sx={{ fontSize: 22 }} />
                    ) : (
                      <GroupsIcon sx={{ fontSize: 22 }} />
                    )}
                  </Avatar>
                  <Box
                    onClick={() => setInfoDrawerOpen(true)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#14264B', lineHeight: 1.2 }}>
                        {selectedGroup.name}
                      </Typography>
                      <Chip
                        label={GROUP_TYPE_METAS[selectedGroup.type]?.label || selectedGroup.type}
                        size="small"
                        sx={{
                          height: 19,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          bgcolor: GROUP_TYPE_METAS[selectedGroup.type]?.bg || '#F1F5F9',
                          color: GROUP_TYPE_METAS[selectedGroup.type]?.color || '#334155',
                          border: `1px solid ${GROUP_TYPE_METAS[selectedGroup.type]?.border || '#CBD5E1'}`,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#5E7191', fontWeight: 500 }}>
                      {members.length} member{members.length !== 1 ? 's' : ''}
                      {selectedGroup.departments && selectedGroup.departments.length > 0
                        ? ` • ${selectedGroup.departments.map((d) => d.departmentCode).join(', ')}`
                        : ''}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title="Refresh Messages">
                    <IconButton
                      size="small"
                      onClick={() => {
                        chatService.getMessages(selectedGroup.id, 60).then(setMessages);
                      }}
                      sx={{ color: '#5E7191', '&:hover': { color: '#1765B5' } }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {isAdmin && (
                    <Tooltip title="Edit Channel Details">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditModal(selectedGroup)}
                        sx={{
                          color: '#1765B5',
                          '&:hover': { bgcolor: '#EDF2FF' },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Channel Info & Members">
                    <IconButton
                      size="small"
                      onClick={() => setInfoDrawerOpen(true)}
                      sx={{
                        color: '#1765B5',
                        bgcolor: '#EDF2FF',
                        '&:hover': { bgcolor: '#DCE6F5' },
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {isAdmin && (
                    <>
                      <Tooltip title="Channel options">
                        <IconButton
                          size="small"
                          onClick={(e) => setHeaderMenuAnchor(e.currentTarget)}
                          sx={{ color: '#5E7191', '&:hover': { color: '#1765B5' } }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Menu
                        anchorEl={headerMenuAnchor}
                        open={Boolean(headerMenuAnchor)}
                        onClose={() => setHeaderMenuAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                          sx: {
                            borderRadius: 2,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            minWidth: 190,
                            py: 0.5,
                          },
                        }}
                      >
                        <MenuItem
                          onClick={() => {
                            setHeaderMenuAnchor(null);
                            setInfoDrawerOpen(true);
                          }}
                        >
                          <ListItemIcon>
                            <InfoOutlinedIcon fontSize="small" sx={{ color: '#1765B5' }} />
                          </ListItemIcon>
                          <ListItemText primary="Channel Info" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600 }} />
                        </MenuItem>

                        <MenuItem
                          onClick={() => {
                            setHeaderMenuAnchor(null);
                            handleOpenEditModal(selectedGroup);
                          }}
                        >
                          <ListItemIcon>
                            <EditIcon fontSize="small" sx={{ color: '#1765B5' }} />
                          </ListItemIcon>
                          <ListItemText primary="Edit Channel" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600 }} />
                        </MenuItem>

                        <Divider sx={{ my: 0.5 }} />

                        <MenuItem
                          onClick={() => {
                            setHeaderMenuAnchor(null);
                            handleOpenDeleteConfirm();
                          }}
                          sx={{ color: '#EF4444' }}
                        >
                          <ListItemIcon>
                            <DeleteOutlineIcon fontSize="small" sx={{ color: '#EF4444' }} />
                          </ListItemIcon>
                          <ListItemText primary="Delete Channel" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 700 }} />
                        </MenuItem>
                      </Menu>
                    </>
                  )}
                </Box>
              </Box>

              {/* Messages Viewport */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: { xs: 1.5, sm: 2.5 },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  bgcolor: '#F1F5F9',
                }}
              >
                {loadingMessages ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 'auto' }}>
                    <CircularProgress size={36} sx={{ color: '#1765B5' }} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box
                    sx={{
                      my: 'auto',
                      textAlign: 'center',
                      bgcolor: '#FFFFFF',
                      p: 3.5,
                      borderRadius: 3,
                      maxWidth: 440,
                      mx: 'auto',
                      border: '1px solid #DCE6F5',
                      boxShadow: '0 4px 16px rgba(23, 101, 181, 0.06)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: '#EDF2FF', color: '#1765B5', width: 56, height: 56 }}>
                        <ForumIcon fontSize="medium" />
                      </Avatar>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#14264B' }}>
                      Institutional Communication Channel
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#5E7191', mt: 0.8, lineHeight: 1.5 }}>
                      Messages and attachments posted here are synchronized in real time with all
                      authorized members of this group.
                    </Typography>
                  </Box>
                ) : (
                  Object.entries(groupedMessages).map(([dateLabel, dateMsgs]) => (
                    <React.Fragment key={dateLabel}>
                      {/* Date Divider Pill */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                        <Chip
                          label={dateLabel}
                          size="small"
                          sx={{
                            bgcolor: '#FFFFFF',
                            color: '#475569',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            borderRadius: 1.5,
                          }}
                        />
                      </Box>

                      {/* Messages within this date */}
                      {dateMsgs.map((msg) => {
                        const isMine = msg.senderId === user?.id;

                        return (
                          <Box
                            key={msg.id}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isMine ? 'flex-end' : 'flex-start',
                              width: '100%',
                            }}
                          >
                            <Box
                              sx={{
                                maxWidth: { xs: '88%', sm: '75%', md: '65%' },
                                minWidth: 150,
                                bgcolor: isMine ? '#1765B5' : '#FFFFFF',
                                background: isMine
                                  ? 'linear-gradient(135deg, #1765B5 0%, #1685C4 100%)'
                                  : '#FFFFFF',
                                color: isMine ? '#FFFFFF' : '#14264B',
                                borderRadius: isMine
                                  ? '14px 14px 3px 14px'
                                  : '14px 14px 14px 3px',
                                p: 1.5,
                                border: isMine ? 'none' : '1px solid #DCE6F5',
                                boxShadow: isMine
                                  ? '0 3px 10px rgba(23, 101, 181, 0.25)'
                                  : '0 2px 6px rgba(20, 38, 75, 0.05)',
                                position: 'relative',
                                '&:hover .message-actions': {
                                  opacity: 1,
                                },
                              }}
                            >
                              {/* Sender Header for Received messages */}
                              {!isMine && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.6 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 800,
                                      color:
                                        msg.senderRole === 'SUPER_ADMIN' ||
                                        msg.senderRole === 'PLACEMENT_ADMIN'
                                          ? '#1765B5'
                                          : '#0284c7',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    {msg.senderName}
                                  </Typography>
                                  {(msg.senderRole === 'SUPER_ADMIN' ||
                                    msg.senderRole === 'PLACEMENT_ADMIN') && (
                                    <Chip
                                      label="Admin"
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        bgcolor: '#e0f2fe',
                                        color: '#0369a1',
                                        border: '1px solid #bae6fd',
                                      }}
                                    />
                                  )}
                                </Box>
                              )}

                              {/* Quoted Reply Box */}
                              {msg.replyTo && (
                                <Box
                                  sx={{
                                    bgcolor: isMine ? 'rgba(255, 255, 255, 0.16)' : '#EDF2FF',
                                    borderLeft: isMine ? '3px solid #FFFFFF' : '3px solid #1765B5',
                                    borderRadius: 1,
                                    p: 0.8,
                                    mb: 1,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 800,
                                      color: isMine ? '#FFFFFF' : '#1765B5',
                                      display: 'block',
                                    }}
                                  >
                                    {msg.replyTo.senderName}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: '0.78rem',
                                      color: isMine ? 'rgba(255,255,255,0.9)' : '#5E7191',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {msg.replyTo.content ||
                                      (msg.replyTo.messageType === 'IMAGE' ? '📷 Photo' : '📄 File')}
                                  </Typography>
                                </Box>
                              )}

                              {/* Media / Attachment Display */}
                              {msg.messageType === 'IMAGE' && msg.fileUrl && (
                                <Box sx={{ mb: 1 }}>
                                  <img
                                    src={`${baseURL}${msg.fileUrl}`}
                                    alt={msg.fileName || 'Image'}
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: 280,
                                      borderRadius: 8,
                                      cursor: 'pointer',
                                      objectFit: 'cover',
                                      display: 'block',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    }}
                                    onClick={() => setPreviewImage(`${baseURL}${msg.fileUrl}`)}
                                  />
                                </Box>
                              )}

                              {(msg.messageType === 'DOCUMENT' || msg.messageType === 'FILE') &&
                                msg.fileUrl && (
                                  <Paper
                                    elevation={0}
                                    sx={{
                                      p: 1.2,
                                      mb: 1,
                                      bgcolor: isMine ? 'rgba(255, 255, 255, 0.18)' : '#F8FAFC',
                                      borderRadius: 1.5,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 1.5,
                                      border: isMine
                                        ? '1px solid rgba(255, 255, 255, 0.25)'
                                        : '1px solid #E2E8F0',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                                      {msg.mimeType?.includes('pdf') ? (
                                        <PictureAsPdfIcon
                                          sx={{ color: isMine ? '#FFFFFF' : '#b91c1c', fontSize: 26 }}
                                        />
                                      ) : (
                                        <InsertDriveFileIcon
                                          sx={{ color: isMine ? '#FFFFFF' : '#1765B5', fontSize: 26 }}
                                        />
                                      )}
                                      <Box sx={{ overflow: 'hidden' }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            color: isMine ? '#FFFFFF' : '#14264B',
                                          }}
                                        >
                                          {msg.fileName || 'Attachment'}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{ color: isMine ? 'rgba(255,255,255,0.8)' : '#64748B' }}
                                        >
                                          {msg.fileSize
                                            ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                                            : 'Document'}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      component="a"
                                      href={`${baseURL}${msg.fileUrl}`}
                                      download={msg.fileName || 'download'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{
                                        color: isMine ? '#FFFFFF' : '#1765B5',
                                        bgcolor: isMine ? 'rgba(255,255,255,0.2)' : '#EDF2FF',
                                        '&:hover': {
                                          bgcolor: isMine ? 'rgba(255,255,255,0.3)' : '#DCE6F5',
                                        },
                                      }}
                                    >
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </Paper>
                                )}

                              {/* Message Text Content */}
                              {msg.content && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontSize: '0.92rem',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.45,
                                    color: isMine ? '#FFFFFF' : '#14264B',
                                  }}
                                >
                                  {msg.content}
                                </Typography>
                              )}

                              {/* Footer: Time + Status Ticks */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 0.5,
                                  mt: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: '0.7rem',
                                    color: isMine ? 'rgba(255,255,255,0.85)' : '#64748B',
                                    fontWeight: 500,
                                  }}
                                >
                                  {formatTime(msg.createdAt)}
                                </Typography>
                                {isMine && (
                                  <DoneAllIcon
                                    sx={{
                                      fontSize: 15,
                                      color: (msg.readByCount || 0) > 0 ? '#67e8f9' : 'rgba(255,255,255,0.7)',
                                    }}
                                  />
                                )}
                              </Box>

                              {/* Hover Action: Quote Reply */}
                              <IconButton
                                className="message-actions"
                                size="small"
                                onClick={() => setReplyingTo(msg)}
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  bgcolor: isMine ? 'rgba(0,0,0,0.3)' : '#FFFFFF',
                                  color: isMine ? '#FFFFFF' : '#1765B5',
                                  border: isMine ? 'none' : '1px solid #E2E8F0',
                                  '&:hover': {
                                    bgcolor: isMine ? 'rgba(0,0,0,0.5)' : '#EDF2FF',
                                  },
                                  p: 0.4,
                                }}
                              >
                                <ReplyIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Bottom Message Composer */}
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  borderTop: '1px solid #DCE6F5',
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {/* Replying Banner */}
                {replyingTo && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.2,
                      bgcolor: '#EDF2FF',
                      borderLeft: '4px solid #1765B5',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#1765B5' }}>
                        Replying to {replyingTo.senderName}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.82rem',
                          color: '#5E7191',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {replyingTo.content || 'Attachment'}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setReplyingTo(null)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                )}

                {/* Selected File Banner */}
                {selectedFile && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.2,
                      bgcolor: '#EDF2FF',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px dashed #1765B5',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageOutlinedIcon sx={{ color: '#1765B5' }} />
                      ) : (
                        <InsertDriveFileIcon sx={{ color: '#1765B5' }} />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#14264B' }}>
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setSelectedFile(null)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                )}

                {/* Input Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Hidden File Picker */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Tooltip title="Attach document or image">
                    <IconButton
                      size="medium"
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        color: '#64748B',
                        bgcolor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        '&:hover': {
                          bgcolor: '#EDF2FF',
                          color: '#1765B5',
                          borderColor: '#1765B5',
                        },
                      }}
                    >
                      <AttachFileIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message... (Press Enter to send)"
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendingMessage || uploadingAttachment}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#F8FAFC',
                        borderRadius: 2,
                        fontSize: '0.92rem',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#E2E8F0',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1765B5',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1765B5',
                          borderWidth: 1.5,
                        },
                      },
                    }}
                  />

                  <IconButton
                    disabled={
                      (!inputContent.trim() && !selectedFile) ||
                      sendingMessage ||
                      uploadingAttachment
                    }
                    onClick={handleSendMessage}
                    sx={{
                      bgcolor: '#1765B5',
                      background: 'linear-gradient(135deg, #1765B5 0%, #1685C4 100%)',
                      color: '#FFFFFF',
                      '&:hover': {
                        bgcolor: '#104B91',
                        background: 'linear-gradient(135deg, #104B91 0%, #12659A 100%)',
                      },
                      '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(23, 101, 181, 0.3)',
                    }}
                  >
                    {sendingMessage || uploadingAttachment ? (
                      <CircularProgress size={20} sx={{ color: '#FFFFFF' }} />
                    ) : (
                      <SendIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            /* Empty State */
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                textAlign: 'center',
                bgcolor: '#F8FAFC',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: '#EDF2FF',
                  color: '#1765B5',
                  width: 80,
                  height: 80,
                  mb: 2.5,
                  boxShadow: '0 4px 16px rgba(23, 101, 181, 0.15)',
                }}
              >
                <ForumIcon sx={{ fontSize: 44 }} />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#14264B', mb: 1 }}>
                College Communication & Groups
              </Typography>
              <Typography variant="body1" sx={{ color: '#5E7191', maxWidth: 480, mb: 3.5, lineHeight: 1.6 }}>
                Real-time departmental cohorts, academic team channels, and placement drive
                announcements in one centralized workspace.
              </Typography>

              {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<GroupAddIcon />}
                  onClick={() => setCreateModalOpen(true)}
                  sx={{
                    bgcolor: '#1765B5',
                    background: 'linear-gradient(135deg, #1765B5 0%, #1685C4 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #104B91 0%, #12659A 100%)',
                    },
                    fontWeight: 700,
                    px: 3.5,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(23, 101, 181, 0.25)',
                  }}
                >
                  Create Channel / Cohort
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* ========================================================================= */}
        {/* RIGHT DRAWER: GROUP INFO & ADMINISTRATION                                 */}
        {/* ========================================================================= */}
        <Drawer
          anchor="right"
          open={infoDrawerOpen && !!selectedGroup}
          onClose={() => setInfoDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: 380, md: 420 },
              bgcolor: '#F8FAFC',
              borderLeft: '1px solid #DCE6F5',
            },
          }}
        >
          {selectedGroup && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Drawer Top Header */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#14264B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                  Channel Overview
                </Typography>
                <IconButton size="small" onClick={() => setInfoDrawerOpen(false)} sx={{ color: '#FFFFFF' }}>
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Scrollable Details */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Profile Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    border: '1px solid #DCE6F5',
                    bgcolor: '#FFFFFF',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 68,
                      height: 68,
                      bgcolor:
                        selectedGroup.type === 'PLACEMENT_DRIVE'
                          ? '#0284c7'
                          : selectedGroup.type === 'DEPARTMENT'
                          ? '#1765B5'
                          : '#334155',
                      mx: 'auto',
                      mb: 1.5,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}
                  >
                    {selectedGroup.type === 'PLACEMENT_DRIVE' ? (
                      <WorkIcon sx={{ fontSize: 32 }} />
                    ) : (
                      <SchoolIcon sx={{ fontSize: 32 }} />
                    )}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#14264B' }}>
                    {selectedGroup.name}
                  </Typography>
                  <Chip
                    label={GROUP_TYPE_METAS[selectedGroup.type]?.label || selectedGroup.type}
                    size="small"
                    sx={{
                      mt: 0.8,
                      fontWeight: 700,
                      bgcolor: GROUP_TYPE_METAS[selectedGroup.type]?.bg || '#F1F5F9',
                      color: GROUP_TYPE_METAS[selectedGroup.type]?.color || '#334155',
                      border: `1px solid ${GROUP_TYPE_METAS[selectedGroup.type]?.border || '#CBD5E1'}`,
                    }}
                  />
                  {selectedGroup.description && (
                    <Typography variant="body2" sx={{ color: '#5E7191', mt: 1.5, lineHeight: 1.5 }}>
                      {selectedGroup.description}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 1.5 }}>
                    Created by {selectedGroup.createdByName} •{' '}
                    {new Date(selectedGroup.createdAt).toLocaleDateString()}
                  </Typography>

                  {isAdmin && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => handleOpenEditModal(selectedGroup)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 2,
                          color: '#1765B5',
                          borderColor: '#DCE6F5',
                          bgcolor: '#EDF2FF',
                          '&:hover': {
                            bgcolor: '#DCE6F5',
                            borderColor: '#1765B5',
                          },
                        }}
                      >
                        Edit Channel Info
                      </Button>
                    </Box>
                  )}
                </Paper>

                {/* Academic Departments Mapping Section */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: '1px solid #DCE6F5',
                    bgcolor: '#FFFFFF',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon sx={{ color: '#1765B5', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#14264B' }}>
                        Mapped Departments
                      </Typography>
                    </Box>
                    {isAdmin && (
                      <Tooltip title="Synchronize student memberships from mapped departments">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SyncIcon />}
                          disabled={syncingDept}
                          onClick={handleSyncDepartments}
                          sx={{
                            textTransform: 'none',
                            py: 0.3,
                            borderColor: '#DCE6F5',
                            color: '#1765B5',
                            '&:hover': { borderColor: '#1765B5', bgcolor: '#EDF2FF' },
                          }}
                        >
                          Sync
                        </Button>
                      </Tooltip>
                    )}
                  </Box>

                  {selectedGroup.departments && selectedGroup.departments.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                      {selectedGroup.departments.map((dept) => (
                        <Chip
                          key={dept.id}
                          label={`${dept.departmentName} (${dept.departmentCode})`}
                          variant="outlined"
                          onDelete={isAdmin ? () => handleRemoveDepartment(dept.departmentId) : undefined}
                          sx={{
                            fontWeight: 600,
                            bgcolor: '#EDF2FF',
                            color: '#1765B5',
                            borderColor: '#DCE6F5',
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontStyle: 'italic', mb: 1.5 }}>
                      No departments mapped to this channel.
                    </Typography>
                  )}

                  {/* Admin Add Department Picker */}
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Add Department</InputLabel>
                        <Select
                          value={newGroupDept}
                          label="Add Department"
                          onChange={(e) => setNewGroupDept(e.target.value)}
                        >
                          {departmentsList
                            .filter(
                              (d) =>
                                !selectedGroup.departments?.some((gd) => gd.departmentId === d.id)
                            )
                            .map((dept) => (
                              <MenuItem key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!newGroupDept}
                        onClick={handleAddDepartment}
                        sx={{
                          bgcolor: '#1765B5',
                          minWidth: 64,
                          '&:hover': { bgcolor: '#104B91' },
                        }}
                      >
                        Add
                      </Button>
                    </Box>
                  )}
                </Paper>

                {/* Members Roster Section */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: '1px solid #DCE6F5',
                    bgcolor: '#FFFFFF',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#14264B' }}>
                      Members ({members.length})
                    </Typography>
                    {isAdmin && (
                      <Button
                        size="small"
                        startIcon={<PersonAddIcon />}
                        onClick={() => setAddMemberModalOpen(true)}
                        sx={{ textTransform: 'none', color: '#1765B5', fontWeight: 600 }}
                      >
                        Add Member
                      </Button>
                    )}
                  </Box>

                  <List disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
                    {members.map((member) => (
                      <ListItem
                        key={member.id}
                        disableGutters
                        secondaryAction={
                          isAdmin && member.userId !== user?.id ? (
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveMember(member.userId)}
                              sx={{ color: '#b91c1c' }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          ) : null
                        }
                        sx={{ py: 1, borderBottom: '1px solid #F1F5F9' }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: member.role === 'ADMIN' ? '#1765B5' : '#E2E8F0',
                              color: member.role === 'ADMIN' ? '#FFFFFF' : '#334155',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            {member.userName.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#14264B' }}>
                                {member.userName}
                              </Typography>
                              {member.role === 'ADMIN' && (
                                <Chip
                                  label="Admin"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    bgcolor: '#e0f2fe',
                                    color: '#0369a1',
                                    border: '1px solid #bae6fd',
                                  }}
                                />
                              )}
                              {!member.isDirectAdded && (
                                <Chip
                                  label="Dept Synced"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.62rem',
                                    bgcolor: '#F1F5F9',
                                    color: '#64748B',
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                              {member.departmentName || member.userEmail}
                              {member.registerNumber ? ` • ${member.registerNumber}` : ''}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>

                {/* Danger Zone: Delete Channel (Admin Only, WhatsApp style) */}
                {isAdmin && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid #FECACA',
                      bgcolor: '#FEF2F2',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DeleteOutlineIcon sx={{ color: '#DC2626', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991B1B' }}>
                        Delete Channel
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#7F1D1D', display: 'block', mb: 1.5, lineHeight: 1.4 }}>
                      Permanently delete this communication channel, its message history, and all mapped memberships. This action cannot be undone.
                    </Typography>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={handleOpenDeleteConfirm}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        borderColor: '#F87171',
                        bgcolor: '#FFFFFF',
                        '&:hover': {
                          bgcolor: '#FEE2E2',
                          borderColor: '#DC2626',
                        },
                      }}
                    >
                      Delete Channel
                    </Button>
                  </Paper>
                )}
              </Box>
            </Box>
          )}
        </Drawer>
      </Box>

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW GROUP (ADMIN ONLY)                                      */}
      {/* ========================================================================= */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            border: '1px solid #DCE6F5',
            boxShadow: '0 8px 32px rgba(20, 38, 75, 0.16)',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#14264B', color: '#FFFFFF', fontWeight: 800 }}>
          Create Communication Channel
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Channel Name"
            fullWidth
            required
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g. B.Sc CS Final Year 2026 / TCS Campus Drive"
            sx={{ mt: 1 }}
          />

          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={2}
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
            placeholder="Purpose, announcements, guidelines..."
          />

          <FormControl fullWidth>
            <InputLabel>Channel Type</InputLabel>
            <Select
              value={newGroupType}
              label="Channel Type"
              onChange={(e) => setNewGroupType(e.target.value as ChatGroupType)}
            >
              <MenuItem value="DEPARTMENT">Department Channel</MenuItem>
              <MenuItem value="CROSS_DEPARTMENT">Cross-Department Group</MenuItem>
              <MenuItem value="UG_ALL">UG All Students</MenuItem>
              <MenuItem value="PG_ALL">PG All Students</MenuItem>
              <MenuItem value="PLACEMENT_DRIVE">Placement Drive Channel</MenuItem>
              <MenuItem value="CUSTOM">Custom Group</MenuItem>
              <MenuItem value="BROADCAST">College Broadcast</MenuItem>
            </Select>
          </FormControl>

          {/* Academic Department Multi-Select */}
          <FormControl fullWidth>
            <InputLabel>Link Academic Departments</InputLabel>
            <Select
              multiple
              value={newGroupDeptIds}
              onChange={(e) => {
                const val = e.target.value;
                setNewGroupDeptIds(typeof val === 'string' ? val.split(',') : val);
              }}
              input={<OutlinedInput label="Link Academic Departments" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((val) => {
                    const dept = departmentsList.find((d) => d.id === val);
                    return (
                      <Chip
                        key={val}
                        label={dept ? `${dept.name} (${dept.code})` : val}
                        size="small"
                        sx={{ bgcolor: '#EDF2FF', color: '#1765B5', borderColor: '#DCE6F5' }}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {departmentsList.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code}) — {dept._count?.students || 0} students
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ fontSize: '0.85rem', bgcolor: '#EDF2FF', color: '#14264B' }}>
            Linking departments automatically synchronizes all enrolled students in those
            departments as channel members without requiring manual invitations.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setCreateModalOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!newGroupName.trim() || creatingGroup}
            onClick={handleCreateGroup}
            sx={{
              bgcolor: '#1765B5',
              background: 'linear-gradient(135deg, #1765B5 0%, #1685C4 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #104B91 0%, #12659A 100%)',
              },
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 1.5,
              px: 2.5,
            }}
          >
            {creatingGroup ? (
              <CircularProgress size={22} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Create Channel'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ADD DIRECT MEMBER TO GROUP                                         */}
      {/* ========================================================================= */}
      <Dialog
        open={addMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            border: '1px solid #DCE6F5',
            boxShadow: '0 8px 32px rgba(20, 38, 75, 0.16)',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#14264B', color: '#FFFFFF', fontWeight: 800 }}>
          Add Direct Member
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Search Student or Staff"
            fullWidth
            placeholder="Type name, email, or register number..."
            value={memberSearchQuery}
            onChange={(e) => handleSearchUsers(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#64748B' }} />
                </InputAdornment>
              ),
            }}
            sx={{ mt: 1 }}
          />

          <List sx={{ maxHeight: 280, overflowY: 'auto' }}>
            {userSearchResults.map((u) => {
              const alreadyMember = members.some((m) => m.userId === u.userId);
              return (
                <ListItem
                  key={u.userId}
                  secondaryAction={
                    alreadyMember ? (
                      <Chip label="Member" size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569' }} />
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleAddDirectMember(u.userId)}
                        sx={{
                          bgcolor: '#1765B5',
                          textTransform: 'none',
                          fontWeight: 700,
                          '&:hover': { bgcolor: '#104B91' },
                        }}
                      >
                        Add
                      </Button>
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#EDF2FF', color: '#1765B5', fontWeight: 700 }}>
                      {u.name?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#14264B' }}>
                        {u.name}
                      </Typography>
                    }
                    secondary={`${u.email} • ${u.departmentName || u.role}`}
                  />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setAddMemberModalOpen(false)} sx={{ color: '#64748B' }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* LIGHTBOX MODAL: FULL IMAGE PREVIEW                                        */}
      {/* ========================================================================= */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        PaperProps={{
          sx: { bgcolor: '#000000', borderRadius: 2 },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative', bgcolor: '#000000' }}>
          <IconButton
            onClick={() => setPreviewImage(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#FFFFFF',
              bgcolor: 'rgba(0,0,0,0.6)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDIT EXISTING GROUP (ADMIN ONLY)                                    */}
      {/* ========================================================================= */}
      <Dialog
        open={editModalOpen}
        onClose={() => !updatingGroup && setEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            border: '1px solid #DCE6F5',
            boxShadow: '0 8px 32px rgba(20, 38, 75, 0.16)',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#14264B', color: '#FFFFFF', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon fontSize="small" />
            Edit Communication Channel
          </Box>
          <IconButton
            size="small"
            onClick={() => setEditModalOpen(false)}
            disabled={updatingGroup}
            sx={{ color: '#FFFFFF' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Channel Name"
            fullWidth
            required
            value={editGroupName}
            onChange={(e) => setEditGroupName(e.target.value)}
            placeholder="e.g. B.Sc CS Final Year 2026 / TCS Campus Drive"
            sx={{ mt: 1 }}
          />

          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={2}
            value={editGroupDescription}
            onChange={(e) => setEditGroupDescription(e.target.value)}
            placeholder="Purpose, announcements, guidelines..."
          />

          <FormControl fullWidth>
            <InputLabel>Channel Type</InputLabel>
            <Select
              value={editGroupType}
              label="Channel Type"
              onChange={(e) => setEditGroupType(e.target.value as ChatGroupType)}
            >
              <MenuItem value="DEPARTMENT">Department Channel</MenuItem>
              <MenuItem value="CROSS_DEPARTMENT">Cross-Department Group</MenuItem>
              <MenuItem value="UG_ALL">UG All Students</MenuItem>
              <MenuItem value="PG_ALL">PG All Students</MenuItem>
              <MenuItem value="PLACEMENT_DRIVE">Placement Drive Channel</MenuItem>
              <MenuItem value="CUSTOM">Custom Group</MenuItem>
              <MenuItem value="BROADCAST">College Broadcast</MenuItem>
            </Select>
          </FormControl>

          {/* Academic Department Multi-Select */}
          <FormControl fullWidth>
            <InputLabel>Link Academic Departments</InputLabel>
            <Select
              multiple
              value={editGroupDeptIds}
              onChange={(e) => {
                const val = e.target.value;
                setEditGroupDeptIds(typeof val === 'string' ? val.split(',') : val);
              }}
              input={<OutlinedInput label="Link Academic Departments" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((val) => {
                    const dept = departmentsList.find((d) => d.id === val);
                    return (
                      <Chip
                        key={val}
                        label={dept ? `${dept.name} (${dept.code})` : val}
                        size="small"
                        sx={{ bgcolor: '#EDF2FF', color: '#1765B5', borderColor: '#DCE6F5' }}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {departmentsList.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code}) — {dept._count?.students || 0} students
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ fontSize: '0.85rem', bgcolor: '#EDF2FF', color: '#14264B' }}>
            Updating linked departments will automatically synchronize student memberships: enrolled
            students in the selected departments will become members, and students from unlinked departments
            will be removed.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
          <Button
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => {
              setEditModalOpen(false);
              handleOpenDeleteConfirm();
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Delete Channel
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => setEditModalOpen(false)}
              disabled={updatingGroup}
              sx={{ color: '#64748B', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!editGroupName.trim() || updatingGroup}
              onClick={handleSaveGroupEdit}
              sx={{
                bgcolor: '#1765B5',
                background: 'linear-gradient(135deg, #1765B5 0%, #1685C4 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #104B91 0%, #12659A 100%)',
                },
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 1.5,
                px: 2.5,
              }}
            >
              {updatingGroup ? (
                <CircularProgress size={22} sx={{ color: '#FFFFFF' }} />
              ) : (
                'Save Changes'
              )}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: DELETE GROUP CONFIRMATION (ADMIN ONLY)                             */}
      {/* ========================================================================= */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deletingGroup && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            border: '1px solid #FECACA',
            boxShadow: '0 8px 32px rgba(220, 38, 38, 0.16)',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#FEF2F2', color: '#991B1B', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteOutlineIcon color="error" />
          Delete Channel?
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body1" sx={{ color: '#14264B', mb: 1.5 }}>
            Are you sure you want to permanently delete <strong>{selectedGroup?.name}</strong>?
          </Typography>
          <Alert severity="error" sx={{ fontSize: '0.85rem' }}>
            This will permanently delete this channel, its complete message history, attachments, and remove all member associations. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #FEE2E2' }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deletingGroup}
            sx={{ color: '#64748B', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deletingGroup}
            onClick={handleConfirmDeleteGroup}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 1.5,
              px: 2.5,
            }}
          >
            {deletingGroup ? (
              <CircularProgress size={20} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Delete Channel'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Toast Notification Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%', boxShadow: 3, fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
