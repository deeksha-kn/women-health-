"""
Minimal SMTP email sending for the forgot-password flow. Only invoked when
settings.EMAIL_ENABLED is True (i.e. SMTP_HOST etc. have been configured in
.env) — see app/api/routes/auth.py for the fallback behavior when email
isn't configured.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    subject = "Reset your Women's Health Prediction System password"
    body = (
        "We received a request to reset your password.\n\n"
        f"Click the link below to choose a new password:\n{reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email — "
        "your password will not be changed."
    )

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
    except Exception:
        # Don't let a transient SMTP failure leak as a 500 to the password
        # reset endpoint (which already returns a generic success message
        # regardless of whether the email exists/sends, to avoid account
        # enumeration) — log it server-side so it's debuggable instead.
        logger.exception("Failed to send password reset email to %s", to_email)
