"""Database engine, declarative base, and session utilities."""

from collections.abc import Generator
from typing import Any

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from rosevear_ai_hub.config import get_settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def _enable_sqlite_foreign_keys(dbapi_connection: Any, _connection_record: Any) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def build_engine(database_url: str) -> Engine:
    """Create an engine with SQLite-safe defaults when applicable."""

    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    created_engine = create_engine(database_url, connect_args=connect_args, future=True)

    if database_url.startswith("sqlite"):
        event.listen(created_engine, "connect", _enable_sqlite_foreign_keys)

    return created_engine


_settings = get_settings()
engine = build_engine(_settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Generator[Session, None, None]:
    """Provide a request-scoped database session."""

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
