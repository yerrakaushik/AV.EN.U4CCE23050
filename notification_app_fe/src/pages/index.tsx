import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Pagination,
  CircularProgress,
  Alert,
  Skeleton,
  Divider,
  Stack,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import NavBar from "../components/NavBar";
import NotificationCard from "../components/NotificationCard";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationType } from "../lib/api";
import { Log } from "../lib/logger";

export default function HomePage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filterType, setFilterType] = useState<NotificationType | "">("");

  const { notifications, meta, loading, error, refetch, markRead, markAllRead } =
    useNotifications(page, limit, filterType || undefined);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleFilterChange = async (val: string) => {
    setPage(1);
    setFilterType(val as NotificationType | "");
    await Log("frontend", "info", "page", `Filter changed to: ${val || "all"}`);
  };

  const handleMarkAllRead = async () => {
    markAllRead();
    await Log("frontend", "info", "page", "User marked all notifications as read");
  };

  return (
    <>
      <NavBar unreadCount={unreadCount} />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              All Notifications
            </Typography>
            {!loading && meta && (
              <Typography variant="caption" color="text.secondary">
                {meta.total} total · {unreadCount} unread
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => handleFilterChange(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Placement">Placement</MenuItem>
                <MenuItem value="Result">Result</MenuItem>
                <MenuItem value="Event">Event</MenuItem>
              </Select>
            </FormControl>
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllRead}
              variant="outlined"
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={refetch}
              variant="outlined"
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={90} />
            ))}
          </Stack>
        ) : notifications.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography color="text.secondary">No notifications found.</Typography>
          </Box>
        ) : (
          <>
            {notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} onMarkRead={markRead} />
            ))}
            {meta && meta.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={meta.totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </>
  );
}
