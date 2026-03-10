from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
  JSON,
  Boolean,
  Column,
  DateTime,
  ForeignKey,
  Integer,
  String,
  Text,
  UniqueConstraint,
  BigInteger,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship
import uuid


Base = declarative_base()


def utcnow() -> datetime:
  return datetime.utcnow()


class WebhookEvent(Base):
  __tablename__ = "webhook_events"

  id = Column(BigInteger, primary_key=True, autoincrement=True)
  source_provider = Column(String(32), nullable=False)  # e.g. "square"
  source_event_id = Column(String(128), nullable=False)
  signature_verified = Column(Boolean, nullable=False, default=False)
  event_type = Column(String(128), nullable=False)
  payload_json = Column(JSONB, nullable=False)
  created_at = Column(DateTime, nullable=False, default=utcnow)

  __table_args__ = (
    UniqueConstraint("source_provider", "source_event_id", name="ux_webhook_events_source_event"),
  )


class Order(Base):
  __tablename__ = "orders"

  id = Column(BigInteger, primary_key=True, autoincrement=True)
  store_id = Column(String(64), nullable=True)
  source_provider = Column(String(32), nullable=False)  # "square"
  source_order_id = Column(String(128), nullable=False)

  customer_name = Column(String(255), nullable=True)
  customer_email = Column(String(255), nullable=True)
  customer_phone = Column(String(64), nullable=True)

  ship_name = Column(String(255), nullable=True)
  ship_addr1 = Column(String(255), nullable=True)
  ship_addr2 = Column(String(255), nullable=True)
  ship_city = Column(String(128), nullable=True)
  ship_state = Column(String(64), nullable=True)
  ship_postal_code = Column(String(32), nullable=True)
  ship_country = Column(String(2), nullable=True)

  currency = Column(String(8), nullable=False)
  order_total = Column(Integer, nullable=True)  # cents

  order_status = Column(String(32), nullable=False, default="received")
  fulfillment_status = Column(String(32), nullable=False, default="pending")

  raw_order_json = Column(JSONB, nullable=False)

  created_at = Column(DateTime, nullable=False, default=utcnow)
  updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

  items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
  jobs = relationship("FulfillmentJob", back_populates="order")

  __table_args__ = (
    UniqueConstraint("source_provider", "source_order_id", name="ux_orders_source_order"),
  )


class OrderItem(Base):
  __tablename__ = "order_items"

  id = Column(BigInteger, primary_key=True, autoincrement=True)
  order_id = Column(BigInteger, ForeignKey("orders.id"), nullable=False, index=True)

  line_item_uid = Column(String(128), nullable=True)
  square_catalog_object_id = Column(String(128), nullable=True)
  square_variation_id = Column(String(128), nullable=True)
  sku = Column(String(128), nullable=True)
  title = Column(String(255), nullable=True)
  variant_name = Column(String(255), nullable=True)
  quantity = Column(Integer, nullable=False)
  unit_price = Column(Integer, nullable=True)  # cents

  raw_line_json = Column(JSONB, nullable=False)
  created_at = Column(DateTime, nullable=False, default=utcnow)

  order = relationship("Order", back_populates="items")


class ProductVariantMap(Base):
  __tablename__ = "product_variant_map"

  id = Column(BigInteger, primary_key=True, autoincrement=True)
  store_id = Column(String(64), nullable=True)
  square_variation_id = Column(String(128), nullable=False)
  sku = Column(String(128), nullable=True)
  provider = Column(String(32), nullable=False, default="printful")
  provider_variant_id = Column(String(128), nullable=False)
  provider_external_id = Column(String(128), nullable=True)
  is_active = Column(Boolean, nullable=False, default=True)
  notes = Column(Text, nullable=True)
  created_at = Column(DateTime, nullable=False, default=utcnow)
  updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

  __table_args__ = (
    UniqueConstraint("provider", "square_variation_id", name="ux_variant_map_provider_square_variation"),
  )


class FulfillmentJob(Base):
  __tablename__ = "fulfillment_jobs"

  id = Column(BigInteger, primary_key=True, autoincrement=True)
  order_id = Column(BigInteger, ForeignKey("orders.id"), nullable=False, index=True)
  provider = Column(String(32), nullable=False, default="printful")
  job_status = Column(String(32), nullable=False, default="pending")
  attempt_count = Column(Integer, nullable=False, default=0)
  last_attempt_at = Column(DateTime, nullable=True)
  next_attempt_at = Column(DateTime, nullable=True)
  error_text = Column(Text, nullable=True)
  lock_token = Column(UUID(as_uuid=True), nullable=True, default=None)
  locked_at = Column(DateTime, nullable=True)
  created_at = Column(DateTime, nullable=False, default=utcnow)
  updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

  order = relationship("Order", back_populates="jobs")
  provider_orders = relationship("ProviderOrder", back_populates="job")


class ProviderOrder(Base):
  __tablename__ = "provider_orders"

  id = Column(BigInteger, primary_key=True, autoincrement=True)
  fulfillment_job_id = Column(BigInteger, ForeignKey("fulfillment_jobs.id"), nullable=False, index=True)
  provider = Column(String(32), nullable=False, default="printful")
  provider_order_id = Column(String(128), nullable=True)
  provider_status = Column(String(32), nullable=True)
  submitted_payload_json = Column(JSONB, nullable=True)
  response_json = Column(JSONB, nullable=True)
  created_at = Column(DateTime, nullable=False, default=utcnow)
  updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

  job = relationship("FulfillmentJob", back_populates="provider_orders")

