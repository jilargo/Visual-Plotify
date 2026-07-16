import { useState } from "react";
import { Button, Stack, Typography } from "@mui/material";
import api from "../../services/api";
import type { ExcelPreview } from "../../types/excel";

interface Props {
    onUploadSuccess: (data: ExcelPreview) => void;
}

export default function FileUpload({ onUploadSuccess }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function upload() {
        if (!file)
            return;

        setUploading(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await api.post("/upload/", formData);
            onUploadSuccess(response.data as ExcelPreview);
            setMessage("Upload successful.");
        } catch (error) {
            console.error("Upload failed:", error);
            setMessage("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    }

    return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
            <Button variant="contained" component="label">
                Choose file
                <input
                    hidden
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                        if (e.target.files) {
                            setFile(e.target.files[0]);
                        }
                    }}
                />
            </Button>
            <Typography variant="body2" sx={{ minWidth: 240 }}>
                {file ? file.name : "No file selected"}
            </Typography>
            <Button variant="outlined" onClick={upload} disabled={!file || uploading}>
                {uploading ? "Uploading..." : "Upload"}
            </Button>
            {message && (
                <Typography
                    variant="caption"
                    sx={{ color: message.includes("failed") ? "error.main" : "success.main" }}
                >
                    {message}
                </Typography>
            )}
        </Stack>
    );
}