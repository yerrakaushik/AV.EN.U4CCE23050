import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Badge,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import { useRouter } from "next/router";

interface Props {
  unreadCount?: number;
}

export default function NavBar({ unreadCount = 0 }: Props) {
  const router = useRouter();

  return (
    <AppBar position="sticky" elevation={1} sx={{ bgcolor: "background.paper", color: "text.primary" }}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          NotifyHub
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            component={Link}
            href="/"
            startIcon={
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsIcon />
              </Badge>
            }
            variant={router.pathname === "/" ? "contained" : "outlined"}
            size="small"
          >
            All
          </Button>
          <Button
            component={Link}
            href="/priority"
            startIcon={<StarIcon />}
            variant={router.pathname === "/priority" ? "contained" : "outlined"}
            size="small"
          >
            Priority
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
