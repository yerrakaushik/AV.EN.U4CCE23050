import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import { Notification } from "../lib/api";

const typeColors: Record<string, "success" | "warning" | "info"> = {
  Placement: "success",
  Result: "warning",
  Event: "info",
};

interface Props {
  notification: Notification;
  onMarkRead: (id: string) => void;
  rank?: number;
}

export default function NotificationCard({ notification, onMarkRead, rank }: Props) {
  const color = typeColors[notification.type] ?? "default";
  const isNew = !notification.isRead;

  return (
    <Card
      elevation={isNew ? 3 : 1}
      sx={{
        mb: 1.5,
        borderLeft: isNew ? "4px solid" : "4px solid transparent",
        borderLeftColor: isNew ? `${color}.main` : "transparent",
        opacity: notification.isRead ? 0.7 : 1,
        transition: "all 0.2s ease",
        "&:hover": { elevation: 4, transform: "translateY(-1px)" },
      }}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              {rank !== undefined && (
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  #{rank}
                </Typography>
              )}
              <Chip label={notification.type} color={color} size="small" />
              {isNew && (
                <Chip label="New" size="small" sx={{ bgcolor: "primary.main", color: "white", fontWeight: 700, fontSize: "0.65rem" }} />
              )}
            </Box>
            <Typography variant="body2" fontWeight={isNew ? 600 : 400} sx={{ wordBreak: "break-word" }}>
              {notification.message}
            </Typography>
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
              {new Date(notification.timestamp).toLocaleString()}
            </Typography>
          </Box>
          {isNew && (
            <Tooltip title="Mark as read">
              <IconButton size="small" onClick={() => onMarkRead(notification.id)} color="primary">
                <MarkEmailReadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
