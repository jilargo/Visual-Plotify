import { useRef, useState, type DragEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { datasetApi, describeApiError } from "../../services/api";
import type { ExcelPreview, SampleInfo } from "../../types/excel";
import { tokens } from "../../theme";

const ACCEPTED = ".xlsx,.xlsm,.csv";
const MAX_BYTES = 25 * 1024 * 1024;

interface Props {
    onDatasetLoaded: (data: ExcelPreview) => void;
    disabled?: boolean;
}

export default function FileUpload({ onDatasetLoaded, disabled }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [samples, setSamples] = useState<SampleInfo[]>([]);
    const [loadingSample, setLoadingSample] = useState<string | null>(null);

    async function loadSamples() {
        try {
            setSamples(await datasetApi.samples());
        } catch {
            setSamples([]);
        }
    }

    function acceptFile(candidate: File | null) {
        setError(null);
        setSuccess(null);
        if (!candidate) {
            return;
        }
        const extension = candidate.name.slice(candidate.name.lastIndexOf(".")).toLowerCase();
        if (![".xlsx", ".xlsm", ".csv"].includes(extension)) {
            setFile(null);
            setError("Only .xlsx, .xlsm and .csv files are supported.");
            return;
        }
        if (candidate.size > MAX_BYTES) {
            setFile(null);
            setError("That file is larger than the 25 MB upload limit.");
            return;
        }
        setFile(candidate);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setDragging(false);
        if (disabled) {
            return;
        }
        acceptFile(event.dataTransfer.files?.[0] ?? null);
    }

    async function upload() {
        if (!file) {
            return;
        }
        setBusy(true);
        setProgress(0);
        setError(null);
        setSuccess(null);

        try {
            const data = await datasetApi.upload(file, setProgress);
            setSuccess("Upload successful.");
            onDatasetLoaded(data);
        } catch (uploadError) {
            setError(describeApiError(uploadError, "Upload failed. Please try again."));
        } finally {
            setBusy(false);
            setProgress(0);
        }
    }

    async function loadSample(sample: SampleInfo) {
        setBusy(true);
        setError(null);
        setSuccess(null);
        setLoadingSample(sample.id);
        setFile(null);

        try {
            onDatasetLoaded(await datasetApi.loadSample(sample.id));
            setSuccess(`Loaded sample dataset “${sample.label}”.`);
        } catch (sampleError) {
            setError(describeApiError(sampleError, "Could not load the sample dataset."));
        } finally {
            setBusy(false);
            setLoadingSample(null);
        }
    }

    return (
        <Stack spacing={1.75}>
            <Box
                onDragOver={(event) => {
                    event.preventDefault();
                    if (!disabled) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !disabled && inputRef.current?.click()}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !disabled) {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                aria-label="Upload a spreadsheet"
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    textAlign: "center",
                    py: 3,
                    px: 2,
                    cursor: disabled ? "default" : "pointer",
                    borderRadius: tokens.radius.md,
                    border: "1.5px dashed",
                    borderColor: dragging ? "primary.main" : "divider",
                    bgcolor: (theme) =>
                        dragging
                            ? `${theme.palette.primary.main}10`
                            : theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.02)"
                              : "transparent",
                    transition: "border-color 120ms ease, background-color 120ms ease",
                    "&:hover": disabled ? undefined : { borderColor: "primary.light" },
                    "&:focus-visible": { outline: `2px solid`, outlineColor: "primary.main", outlineOffset: 2 },
                }}
            >
                <UploadFileRoundedIcon sx={{ fontSize: 30, color: dragging ? "primary.main" : "text.disabled" }} />
                <Box>
                    <Typography variant="subtitle2" color="text.primary">
                        {file ? file.name : "Drop a spreadsheet here"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {file
                            ? `${(file.size / 1024).toFixed(0)} KB · ready to upload`
                            : "or click to browse — .xlsx, .xlsm and .csv up to 25 MB"}
                    </Typography>
                </Box>
                <input
                    ref={inputRef}
                    hidden
                    type="file"
                    accept={ACCEPTED}
                    onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
                />
            </Box>

            {busy && progress > 0 ? (
                <Box>
                    <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 999 }} />
                    <Typography variant="caption" color="text.secondary">
                        Uploading… {progress}%
                    </Typography>
                </Box>
            ) : null}

            <Stack direction="row" spacing={1}>
                <Button
                    variant="contained"
                    startIcon={<InsertDriveFileOutlinedIcon />}
                    onClick={upload}
                    disabled={!file || busy}
                    fullWidth
                >
                    {busy ? "Working…" : "Upload"}
                </Button>
                {file ? (
                    <Button
                        variant="text"
                        color="inherit"
                        onClick={() => {
                            setFile(null);
                            setError(null);
                        }}
                        disabled={busy}
                    >
                        Clear
                    </Button>
                ) : null}
            </Stack>

            <Box>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: "secondary.main" }} />
                    <Typography variant="overline" color="text.secondary">
                        Or start with a sample
                    </Typography>
                </Stack>
                {samples.length > 0 ? (
                    <Stack spacing={0.75}>
                        {samples.map((sample) => (
                            <Button
                                key={sample.id}
                                variant="outlined"
                                color="inherit"
                                size="small"
                                disabled={busy}
                                onClick={() => void loadSample(sample)}
                                sx={{ justifyContent: "flex-start", textAlign: "left", py: 0.75 }}
                            >
                                {loadingSample === sample.id ? "Loading…" : sample.label}
                            </Button>
                        ))}
                    </Stack>
                ) : (
                    <Button
                        variant="text"
                        size="small"
                        color="inherit"
                        onClick={() => void loadSamples()}
                        disabled={busy}
                        sx={{ px: 0 }}
                    >
                        Show sample datasets
                    </Button>
                )}
            </Box>

            {error ? (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            ) : null}

            {success ? (
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            ) : null}
        </Stack>
    );
}
