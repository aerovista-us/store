"""Initial fulfillment bridge schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "webhook_events",
    sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
    sa.Column("source_provider", sa.String(length=32), nullable=False),
    sa.Column("source_event_id", sa.String(length=128), nullable=False),
    sa.Column("signature_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    sa.Column("event_type", sa.String(length=128), nullable=False),
    sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.UniqueConstraint("source_provider", "source_event_id", name="ux_webhook_events_source_event"),
  )

  op.create_table(
    "orders",
    sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
    sa.Column("store_id", sa.String(length=64), nullable=True),
    sa.Column("source_provider", sa.String(length=32), nullable=False),
    sa.Column("source_order_id", sa.String(length=128), nullable=False),
    sa.Column("customer_name", sa.String(length=255), nullable=True),
    sa.Column("customer_email", sa.String(length=255), nullable=True),
    sa.Column("customer_phone", sa.String(length=64), nullable=True),
    sa.Column("ship_name", sa.String(length=255), nullable=True),
    sa.Column("ship_addr1", sa.String(length=255), nullable=True),
    sa.Column("ship_addr2", sa.String(length=255), nullable=True),
    sa.Column("ship_city", sa.String(length=128), nullable=True),
    sa.Column("ship_state", sa.String(length=64), nullable=True),
    sa.Column("ship_postal_code", sa.String(length=32), nullable=True),
    sa.Column("ship_country", sa.String(length=2), nullable=True),
    sa.Column("currency", sa.String(length=8), nullable=False),
    sa.Column("order_total", sa.Integer(), nullable=True),
    sa.Column("order_status", sa.String(length=32), nullable=False, server_default=sa.text("'received'")),
    sa.Column("fulfillment_status", sa.String(length=32), nullable=False, server_default=sa.text("'pending'")),
    sa.Column("raw_order_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.UniqueConstraint("source_provider", "source_order_id", name="ux_orders_source_order"),
  )

  op.create_table(
    "product_variant_map",
    sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
    sa.Column("store_id", sa.String(length=64), nullable=True),
    sa.Column("square_variation_id", sa.String(length=128), nullable=False),
    sa.Column("sku", sa.String(length=128), nullable=True),
    sa.Column("provider", sa.String(length=32), nullable=False, server_default=sa.text("'printful'")),
    sa.Column("provider_variant_id", sa.String(length=128), nullable=False),
    sa.Column("provider_external_id", sa.String(length=128), nullable=True),
    sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    sa.Column("notes", sa.Text(), nullable=True),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.UniqueConstraint("provider", "square_variation_id", name="ux_variant_map_provider_square_variation"),
  )

  op.create_table(
    "order_items",
    sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
    sa.Column("order_id", sa.BigInteger(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
    sa.Column("line_item_uid", sa.String(length=128), nullable=True),
    sa.Column("square_catalog_object_id", sa.String(length=128), nullable=True),
    sa.Column("square_variation_id", sa.String(length=128), nullable=True),
    sa.Column("sku", sa.String(length=128), nullable=True),
    sa.Column("title", sa.String(length=255), nullable=True),
    sa.Column("variant_name", sa.String(length=255), nullable=True),
    sa.Column("quantity", sa.Integer(), nullable=False),
    sa.Column("unit_price", sa.Integer(), nullable=True),
    sa.Column("raw_line_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
  )
  op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

  op.create_table(
    "fulfillment_jobs",
    sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
    sa.Column("order_id", sa.BigInteger(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
    sa.Column("provider", sa.String(length=32), nullable=False, server_default=sa.text("'printful'")),
    sa.Column("job_status", sa.String(length=32), nullable=False, server_default=sa.text("'pending'")),
    sa.Column("attempt_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
    sa.Column("last_attempt_at", sa.DateTime(), nullable=True),
    sa.Column("next_attempt_at", sa.DateTime(), nullable=True),
    sa.Column("error_text", sa.Text(), nullable=True),
    sa.Column("lock_token", postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column("locked_at", sa.DateTime(), nullable=True),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
  )
  op.create_index("ix_fulfillment_jobs_order_id", "fulfillment_jobs", ["order_id"])

  op.create_table(
    "provider_orders",
    sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
    sa.Column("fulfillment_job_id", sa.BigInteger(), sa.ForeignKey("fulfillment_jobs.id", ondelete="CASCADE"), nullable=False),
    sa.Column("provider", sa.String(length=32), nullable=False, server_default=sa.text("'printful'")),
    sa.Column("provider_order_id", sa.String(length=128), nullable=True),
    sa.Column("provider_status", sa.String(length=32), nullable=True),
    sa.Column("submitted_payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column("response_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
  )
  op.create_index("ix_provider_orders_fulfillment_job_id", "provider_orders", ["fulfillment_job_id"])


def downgrade() -> None:
  op.drop_index("ix_provider_orders_fulfillment_job_id", table_name="provider_orders")
  op.drop_table("provider_orders")
  op.drop_index("ix_fulfillment_jobs_order_id", table_name="fulfillment_jobs")
  op.drop_table("fulfillment_jobs")
  op.drop_index("ix_order_items_order_id", table_name="order_items")
  op.drop_table("order_items")
  op.drop_table("product_variant_map")
  op.drop_table("orders")
  op.drop_table("webhook_events")

