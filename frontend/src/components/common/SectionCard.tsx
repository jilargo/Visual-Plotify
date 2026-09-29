import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { tokens } from "../../theme";

interface SectionCardProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    action?: ReactNode;
    dense?: boolean;
    children: ReactNode;
}

/**
 * The single card primitive used across the workspace: icon, title, optional
 * action and body. Keeping this in one place is what makes the layout consistent.
 */
export default function SectionCard({ title, subtitle, icon, action, dense, children }: SectionCardProps) {
    return (
        <Card>
            <Stack
                direction="row"
                spacing={2}
                sx={{
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    px: { xs: 2, sm: 2.5 },
                    pt: 2.25,
                    pb: dense ? 1.5 : 2,
                }}
            >
                <Stack direction="row" spacing={1.25} sx={{ minWidth: 0 }}>
                    {icon ? (
                        <Box
                            sx={{
                                display: "grid",
                                placeItems: "center",
                                width: 34,
                                height: 34,
                                flex: "0 0 auto",
                                borderRadius: tokens.radius.sm,
                                color: "primary.main",
                                bgcolor: (theme) => `${theme.palette.primary.main}14`,
                                "& svg": { fontSize: 19 },
                            }}
                        >
                            {icon}
                        </Box>
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h3" component="h2" noWrap>
                            {title}
                        </Typography>
                        {subtitle ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {subtitle}
                            </Typography>
                        ) : null}
                    </Box>
                </Stack>
                {action ? <Box sx={{ flex: "0 0 auto" }}>{action}</Box> : null}
            </Stack>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 } }}>{children}</Box>
        </Card>
    );
}
