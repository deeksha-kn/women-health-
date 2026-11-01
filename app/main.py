import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, history, predictions, reports, user
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Backend for a multimodal Women's Health Prediction System: "
        "XGBoost-based PCOS/PCOD/Thyroid text prediction and "
        "MobileNetV2-based acne severity image prediction."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves uploaded acne images back over HTTP (e.g. for the dashboard to show
# a thumbnail of a past upload). Predictions/history JSON only ever store
# the server-side path; this is what turns that path into a fetchable URL.
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Catches anything that isn't already an HTTPException (those are
    # handled by FastAPI's default handler with their intended status
    # code). Logs the real error server-side but never leaks internals
    # (stack traces, file paths, DB details) to the client.
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


app.include_router(auth.router, prefix=f"{settings.API_PREFIX}", tags=["auth"])
app.include_router(predictions.router, prefix=f"{settings.API_PREFIX}/predict", tags=["predictions"])
app.include_router(user.router, prefix=f"{settings.API_PREFIX}/user", tags=["user"])
app.include_router(history.router, prefix=f"{settings.API_PREFIX}/history", tags=["history"])
app.include_router(reports.router, prefix=f"{settings.API_PREFIX}/report", tags=["reports"])


@app.get("/")
def root():
    return {"name": settings.APP_NAME, "status": "running", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
