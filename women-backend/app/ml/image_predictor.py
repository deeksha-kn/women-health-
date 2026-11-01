"""
Loads the MobileNetV2 acne-severity model and runs inference on uploaded
images.

IMPORTANT — model quality caveat (read before changing the threshold below):
The model file currently shipped (mobilenetv2_skin_severity.keras) was
verified to have collapsed during training: it outputs an almost-identical
probability vector regardless of input. Pushing 5 maximally different probe
images (solid white, solid black, a gradient, random noise, a checkerboard)
through it produces probabilities that agree to 4-5 decimal places
(std ~5e-7 across classes). The shipped classification_report.txt confirms
this independently: 33% test accuracy with 100% recall on one class and 0%
recall on the other two, i.e. it always predicts the same class.

Rather than hide this, `is_model_degraded()` below runs the same kind of
diagnostic probe at startup and flags it. Every prediction response
includes a `model_degraded` flag so the API/UI can warn the user instead of
presenting an unreliable number as a confident severity reading. The
probe-based check is intentionally conservative (threshold far below what a
healthy model would ever produce — see DEGRADED_STD_THRESHOLD) so a future,
correctly-retrained model dropped into this same file path will *not* be
flagged as degraded.

To fix this for real: retrain using train_mobilenetv2.py (see
image_train.zip) on a real image dataset placed at
dataset_split/{train,test}/{low,moderate,high}/, ideally with internet
access available so `weights="imagenet"` actually succeeds instead of
silently falling back to from-scratch training (which is what produced the
current collapsed model — see the docstring in that script).
"""
from functools import lru_cache
from io import BytesIO

import numpy as np
from PIL import Image
from tensorflow import keras

from app.core.config import settings

IMG_SIZE = (128, 128)  # must match IMG_SIZE in train_mobilenetv2.py exactly
CLASS_NAMES = ["high", "low", "moderate"]  # alphabetical order from image_dataset_from_directory

# Below this cross-probe standard deviation, treat the model as degenerate
# (effectively constant output regardless of input). The actual shipped
# model measures ~5e-7; a healthy model's outputs across 5 very different
# probe images should vary far more than 0.01, so this threshold has wide
# margin in both directions.
DEGRADED_STD_THRESHOLD = 0.01


@lru_cache(maxsize=1)
def _load_model():
    return keras.models.load_model(settings.ML_IMAGE_MODEL_PATH)


@lru_cache(maxsize=1)
def _diagnostic_probe_std() -> float:
    """
    Runs a small set of maximally-different synthetic images through the
    model once (cached) and returns the standard deviation of its output
    probabilities across them. A near-zero value means the model is
    ignoring its input entirely.
    """
    model = _load_model()
    probes = []
    probes.append(np.full((*IMG_SIZE, 3), 200, dtype="float32"))
    probes.append(np.full((*IMG_SIZE, 3), 50, dtype="float32"))
    grad = np.zeros((*IMG_SIZE, 3), dtype="float32")
    for i in range(IMG_SIZE[0]):
        grad[i, :, :] = (i / IMG_SIZE[0]) * 255
    probes.append(grad)
    rng = np.random.default_rng(42)
    probes.append(rng.integers(0, 256, size=(*IMG_SIZE, 3)).astype("float32"))
    check = np.zeros((*IMG_SIZE, 3), dtype="float32")
    check[::8, :, :] = 255
    probes.append(check)

    batch = np.stack(probes)
    preds = model.predict(batch, verbose=0)
    return float(preds.std(axis=0).max())


def is_model_degraded() -> bool:
    return _diagnostic_probe_std() < DEGRADED_STD_THRESHOLD


class ImagePredictionResult:
    def __init__(self, predicted_label: str, confidence_score: float, probabilities: dict[str, float], degraded: bool):
        self.predicted_label = predicted_label
        self.confidence_score = confidence_score  # 0-100
        self.probabilities = probabilities
        self.degraded = degraded

    def to_dict(self) -> dict:
        return {
            "severity": self.predicted_label,
            "confidence_score": round(self.confidence_score, 2),
            "probabilities": {k: round(v, 4) for k, v in self.probabilities.items()},
            "model_degraded": self.degraded,
            **(
                {
                    "warning": (
                        "This image model's predictions are currently unreliable "
                        "(it was found to produce nearly identical output regardless "
                        "of the image submitted). Treat this result as a placeholder, "
                        "not an actual severity assessment, until the model has been "
                        "retrained on a real labeled image dataset."
                    )
                }
                if self.degraded
                else {}
            ),
        }


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Decodes raw image bytes and resizes to the model's expected input size.
    Pixel rescaling to MobileNetV2's [-1, 1] range is NOT done here — it's
    baked into the model graph itself as a Rescaling layer (see
    train_mobilenetv2.py), so raw 0-255 float pixels are the correct input.
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype="float32")
    return np.expand_dims(arr, axis=0)  # (1, H, W, 3)


def predict_image(image_bytes: bytes) -> ImagePredictionResult:
    model = _load_model()
    batch = preprocess_image(image_bytes)
    proba = model.predict(batch, verbose=0)[0]

    probabilities = {label: float(p) for label, p in zip(CLASS_NAMES, proba)}
    top_idx = int(np.argmax(proba))
    predicted_label = CLASS_NAMES[top_idx]
    confidence_score = float(proba[top_idx]) * 100

    return ImagePredictionResult(
        predicted_label=predicted_label,
        confidence_score=confidence_score,
        probabilities=probabilities,
        degraded=is_model_degraded(),
    )
