import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Slider,
  Button,
  CircularProgress,
  Alert,
  Skeleton,
  Divider,
  Stack,
  Paper,
  Chip,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import NavBar from "../components/NavBar";
import NotificationCard from "../components/NotificationCard";
import { usePriorityNotifications } from "../hooks/useNotifications";
import { Log } from "../lib/logger";

export default function PriorityPage() {
  const [topN, setTopN] = useState(10);
  const [committed, setCommitted] = useState(10);

  const { notifications, loading, error, refetch, markRead } = usePriorityNotifications(committed);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleApply = async () => {
    setCommitted(topN);
    await Log("frontend", "info", "page", `User requested top ${topN} priority notifications`);
  };

  return (
    <>
      <NavBar unreadCount={unreadCount} />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <StarIcon color="warning" />
          <Typography variant="h5" fontWeight={700}>
            Priority Inbox
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Notifications ranked by type weight (Placement &gt; Result &gt; Event) and recency.
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" mb={1}>
            Show top <strong>{topN}</strong> notifications
          </Typography>
          <Slider
            value={topN}
            onChange={(_, val) => setTopN(val as number)}
            min={5}
            max={50}
            step={5}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 1 }}
          />
          <Button variant="contained" size="small" onClick={handleApply}>
            Apply
          </Button>
        </Paper>

        <Divider sx={{ mb: 2 }} />

        {!loading && !error && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Chip label={`${notifications.length} notifications`} size="small" />
            <Button size="small" startIcon={<RefreshIcon />} onClick={refetch} variant="outlined">
              Refresh
            </Button>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: committed }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={90} />
            ))}
          </Stack>
        ) : notifications.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography color="text.secondary">No priority notifications found.</Typography>
          </Box>
        ) : (
          notifications.map((n, index) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={markRead} rank={index + 1} />
          ))
        )}
      </Container>
    </>
  );
}
