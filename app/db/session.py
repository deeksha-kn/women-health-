"""
SQLAlchemy engine/session setup. Works with both PostgreSQL
(postgresql+psycopg://...) and MySQL (mysql+pymysql://...) connection
strings — the rest of the app never imports a driver directly, only this
module, so switching databases is a one-line .env change plus installing
the matching driver package.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # avoids "server has gone away" errors on idle connections
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a DB session and guarantees it's closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
