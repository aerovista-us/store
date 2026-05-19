from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session


def get_database_url() -> str:
  """
  Resolve the DATABASE_URL for Postgres.

  Example:
    DATABASE_URL=postgresql+psycopg://user:pass@postgres:5432/av_storefront
  """
  url = os.getenv("DATABASE_URL", "").strip()
  if not url:
    raise RuntimeError("DATABASE_URL is not set")
  return url


def create_db_engine(echo: bool | None = None) -> Engine:
  url = get_database_url()
  if echo is None:
    echo = os.getenv("SQLALCHEMY_ECHO", "0").strip() == "1"
  return create_engine(url, echo=echo, future=True)


engine: Engine = create_db_engine()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True, expire_on_commit=False)


@contextmanager
def get_session() -> Iterator[Session]:
  """Context manager style session for use in request/worker code."""
  db: Session = SessionLocal()
  try:
    yield db
    db.commit()
  except Exception:
    db.rollback()
    raise
  finally:
    db.close()

