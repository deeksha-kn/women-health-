"""
Validates and persists uploaded acne images to disk. Validation checks both
the claimed file extension AND the actual image content (via PIL actually
decoding it), since a malicious upload could have an innocuous extension
with arbitrary bytes inside.
"""
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import settings


class InvalidImageError(Exception):
    pass


class ImageTooLargeError(Exception):
    pass


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lstrip(".").lower()
    if ext not in settings.allowed_image_extensions_list:
        raise InvalidImageError(
            f"File extension '.{ext}' is not allowed. "
            f"Allowed: {', '.join(settings.allowed_image_extensions_list)}."
        )
    return ext


async def validate_and_save_acne_image(file: UploadFile, user_id: str) -> tuple[str, bytes]:
    """
    Returns (saved_path, raw_bytes). Raises InvalidImageError or
    ImageTooLargeError on validation failure — callers should turn these
    into 400 responses.
    """
    if file.filename is None:
        raise InvalidImageError("Uploaded file has no filename.")

    ext = _validate_extension(file.filename)

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise ImageTooLargeError(
            f"Image is {len(contents) / (1024*1024):.1f}MB, which exceeds "
            f"the {settings.MAX_UPLOAD_SIZE_MB}MB limit."
        )
    if len(contents) == 0:
        raise InvalidImageError("Uploaded file is empty.")

    # Actually decode the bytes as an image (not just trust the extension /
    # declared content-type) to reject disguised non-image uploads.
    try:
        img = Image.open(BytesIO(contents))
        img.verify()
    except UnidentifiedImageError as e:
        raise InvalidImageError("File content is not a valid image.") from e

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Filename is fully server-generated (never derived from the user's
    # original filename) to avoid path traversal or collision issues.
    safe_filename = f"{user_id}_{uuid.uuid4().hex}.{ext}"
    save_path = upload_dir / safe_filename

    with open(save_path, "wb") as f:
        f.write(contents)

    return str(save_path), contents
