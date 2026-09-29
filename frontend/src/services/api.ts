import axios, { AxiosError } from "axios";
import type { ChartData, ChartRequest } from "../types/chart";
import type { ExcelPreview, SampleInfo } from "../types/excel";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
    timeout: 60_000,
});

/** Turn a FastAPI error payload into a single readable sentence. */
export function describeApiError(error: unknown, fallback: string): string {
    if (error instanceof AxiosError) {
        const detail = error.response?.data?.detail;
        if (typeof detail === "string") {
            return detail;
        }
        if (Array.isArray(detail) && detail.length > 0) {
            const first = detail[0] as { msg?: string };
            return first.msg?.replace(/^Value error, /, "") ?? fallback;
        }
        if (error.code === "ECONNABORTED") {
            return "The request timed out. Try a smaller file or fewer rows.";
        }
        if (!error.response) {
            return "Cannot reach the Visual Plotify API. Is the backend running on port 8000?";
        }
    }
    return fallback;
}

export interface PreviewQuery {
    filePath: string;
    sheetName?: string | null;
    offset?: number;
    limit?: number;
}

export const datasetApi = {
    health: async (): Promise<string> => {
        const response = await api.get<{ status: string }>("/health");
        return response.data.status;
    },

    upload: async (file: File, onProgress?: (percent: number) => void): Promise<ExcelPreview> => {
        const body = new FormData();
        body.append("file", file);
        const response = await api.post<ExcelPreview>("/upload/", body, {
            onUploadProgress: (event) => {
                if (onProgress && event.total) {
                    onProgress(Math.round((event.loaded / event.total) * 100));
                }
            },
        });
        return response.data;
    },

    preview: async ({ filePath, sheetName, offset, limit }: PreviewQuery): Promise<ExcelPreview> => {
        const response = await api.get<ExcelPreview>("/upload/preview", {
            params: { file_path: filePath, sheet_name: sheetName ?? undefined, offset, limit },
        });
        return response.data;
    },

    samples: async (): Promise<SampleInfo[]> => {
        const response = await api.get<{ samples: SampleInfo[] }>("/upload/samples");
        return response.data.samples;
    },

    loadSample: async (sampleId: string): Promise<ExcelPreview> => {
        const response = await api.post<ExcelPreview>(`/upload/samples/${sampleId}`);
        return response.data;
    },
};

export const chartApi = {
    create: async (request: ChartRequest): Promise<ChartData> => {
        const response = await api.post<ChartData>("/chart/", request);
        return response.data;
    },
};

export default api;
