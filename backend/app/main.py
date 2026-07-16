from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chart import router as chart_router
from app.api.upload import router as upload_router

app = FastAPI(
    title="Visual Plotify",
    version="1.0.0"
)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Visual Plotify Backend is Running!"
    }


@app.get("/health")
def health():
    return {
        "status": "OK",
        "version": "1.0.0"
    }


app.include_router(upload_router)
app.include_router(chart_router)