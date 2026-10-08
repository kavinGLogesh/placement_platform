import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  TextField,
  InputAdornment,
  TablePagination,
  Skeleton,
  TableSortLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export interface Column<T> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data?: T[];
  loading?: boolean;
  totalCount?: number;
  page?: number;
  rowsPerPage?: number;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  onPageChange?: (newPage: number) => void;
  onRowsPerPageChange?: (newLimit: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (columnId: string) => void;
  actions?: React.ReactNode;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data = [],
  loading = false,
  totalCount,
  page = 0,
  rowsPerPage = 10,
  searchValue,
  searchPlaceholder = 'Filter records...',
  onSearchChange,
  onPageChange,
  onRowsPerPageChange,
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  actions,
  emptyMessage = 'No records found in this view',
}: DataTableProps<T>): React.ReactElement {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        border: '1px solid #DCE6F5',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Header Toolbar */}
      {(onSearchChange || actions) && (
        <Box
          sx={{
            p: 1.75,
            px: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            borderBottom: '1px solid #E7EEFA',
            backgroundColor: '#ffffff',
          }}
        >
          {onSearchChange ? (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#8293B0', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: '100%', sm: 280 },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#EDF2FF',
                  borderRadius: 1.25,
                  fontSize: '0.84rem',
                  height: 36,
                },
              }}
            />
          ) : (
            <Box />
          )}

          {actions && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {actions}
            </Box>
          )}
        </Box>
      )}

      {/* Table Container */}
      <TableContainer sx={{ maxHeight: 680, overflowX: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    minWidth: col.minWidth,
                    backgroundColor: '#EDF2FF',
                    color: '#526584',
                    fontWeight: 600,
                    fontSize: '0.74rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderBottom: '1px solid #DCE6F5',
                    py: 1.25,
                    px: 2,
                  }}
                >
                  {col.sortable && onSortChange ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortOrder : 'asc'}
                      onClick={() => onSortChange(col.id)}
                      sx={{
                        '&.Mui-active': { color: '#1765B5' },
                        '& .MuiTableSortLabel-icon': { color: '#1765B5 !important' },
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, rIdx) => (
                <TableRow key={`skeleton-${rIdx}`}>
                  {columns.map((_, cIdx) => (
                    <TableCell key={`cell-sk-${cIdx}`} sx={{ py: 1.5, px: 2 }}>
                      <Skeleton variant="text" sx={{ bgcolor: '#E7EEFA' }} height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : safeData.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 7, px: 2 }}>
                  <InboxOutlinedIcon sx={{ fontSize: 40, color: '#8293B0', mb: 1, opacity: 0.7 }} />
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mb: 0.5 }}>
                    {emptyMessage}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    No records match the current filter criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              safeData.map((row) => (
                <TableRow
                  key={String(row.id)}
                  hover
                  sx={{
                    '&:hover': {
                      backgroundColor: '#EDF2FF !important',
                    },
                    borderBottom: '1px solid #E7EEFA',
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align || 'left'}
                      sx={{
                        borderBottom: '1px solid #E7EEFA',
                        color: '#33466A',
                        fontSize: '0.84rem',
                        py: 1.25,
                        px: 2,
                      }}
                    >
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.id] as React.ReactNode) ?? '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalCount !== undefined && onPageChange && onRowsPerPageChange && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_e, newPage) => onPageChange(newPage)}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          sx={{
            borderTop: '1px solid #DCE6F5',
            color: '#7182A0',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.8rem',
            },
          }}
        />
      )}
    </Paper>
  );
}
