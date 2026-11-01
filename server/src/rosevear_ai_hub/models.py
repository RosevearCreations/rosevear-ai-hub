"""Persistent data model for Rosevear AI Hub."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from rosevear_ai_hub.database import Base


class TimestampMixin:
    """Common created/updated timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )


class User(TimestampMixin, Base):
    """Local Hub account protected by Build 016 authentication."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(64), nullable=False, default="household_user")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class HubSession(Base):
    """Opaque local authentication session. Raw bearer tokens are never persisted."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AppSetting(TimestampMixin, Base):
    """Application-owned setting stored as JSON."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    value_json: Mapped[Any] = mapped_column(JSON, nullable=False)


class ModelProfile(TimestampMixin, Base):
    """Named local-AI behavior profile."""

    __tablename__ = "model_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    preferred_provider: Mapped[str] = mapped_column(String(64), nullable=False, default="ollama")
    preferred_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    privacy_policy: Mapped[str] = mapped_column(String(64), nullable=False, default="local_only")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    built_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Conversation(TimestampMixin, Base):
    """Persisted local chat conversation."""

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(64), nullable=False, default="ollama")
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)


class ChatMessage(Base):
    """One persisted message in a conversation."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="complete")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
        index=True,
    )


class KnowledgeCollection(Base):
    """Local knowledge collection; administration UI arrives in Build 015."""

    __tablename__ = "knowledge_collections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    local_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class KnowledgeDocument(Base):
    """Original ingested document plus extracted text and source metadata."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    collection_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_collections.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    source_path: Mapped[str] = mapped_column(String(512), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ingested")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
        index=True,
    )
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class KnowledgeChunk(Base):
    """Deterministic text chunk produced from one ingested document."""

    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint(
            "document_id",
            "ordinal",
            name="uq_document_chunks_document_ordinal",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    start_char: Mapped[int] = mapped_column(Integer, nullable=False)
    end_char: Mapped[int] = mapped_column(Integer, nullable=False)
    citation_metadata: Mapped[Any] = mapped_column(JSON, nullable=False)
    embedding_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class ChunkEmbedding(Base):
    """Portable JSON vector record behind the vector-store abstraction."""

    __tablename__ = "chunk_embeddings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chunk_id: Mapped[int] = mapped_column(
        ForeignKey("document_chunks.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    dimensions: Mapped[int] = mapped_column(Integer, nullable=False)
    vector_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class AuditEvent(Base):
    """Immutable audit record for significant application actions."""

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    object_type: Mapped[str] = mapped_column(String(128), nullable=False)
    object_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    tool_key: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    risk_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confirmation_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    sanitized_arguments: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    result: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    result_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
        index=True,
    )


class Integration(TimestampMixin, Base):
    """Persisted integration metadata used by tool and connector registries."""

    __tablename__ = "integrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    integration_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    configuration_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_health_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_health_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ToolRecord(TimestampMixin, Base):
    """Normalized persisted tool contract and administrative enable state."""

    __tablename__ = "tools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    integration_id: Mapped[int | None] = mapped_column(
        ForeignKey("integrations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tool_key: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    capabilities_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    input_schema_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    output_schema_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    built_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ConfirmationRequest(TimestampMixin, Base):
    """One exact-action confirmation with a single-use approval lifecycle."""

    __tablename__ = "confirmation_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    requested_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    decided_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    tool_id: Mapped[int] = mapped_column(
        ForeignKey("tools.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tool_key: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False)
    arguments_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    arguments_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    preview_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True, default="pending")
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SecretValue(TimestampMixin, Base):
    """Encrypted-at-rest secret value; plaintext is never persisted."""

    __tablename__ = "secret_values"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    secret_key: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    key_fingerprint: Mapped[str] = mapped_column(String(16), nullable=False)
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Camera(TimestampMixin, Base):
    """Persistent ONVIF camera registry entry introduced by Build 031."""

    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    endpoint_uuid: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    host: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    service_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    discovery_source: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="onvif_ws_discovery",
    )
    onvif_types: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    scopes: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )


class CameraStream(TimestampMixin, Base):
    """Encrypted RTSP source configuration for one camera."""

    __tablename__ = "camera_streams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    camera_id: Mapped[int] = mapped_column(
        ForeignKey("cameras.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    stream_name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    source_scheme: Mapped[str] = mapped_column(String(16), nullable=False)
    source_host: Mapped[str] = mapped_column(String(255), nullable=False)
    source_port: Mapped[int] = mapped_column(Integer, nullable=False)
    credentials_present: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    key_fingerprint: Mapped[str] = mapped_column(String(16), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_probe_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_probe_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    last_error: Mapped[str | None] = mapped_column(String(255), nullable=True)


class CameraEventReview(TimestampMixin, Base):
    """Owner-reviewed Frigate event metadata; no raw media or RTSP source."""

    __tablename__ = "camera_event_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    camera_name: Mapped[str] = mapped_column(String(160), nullable=False)
    object_label: Mapped[str] = mapped_column(String(100), nullable=False)
    event_start_time: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    review_status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reviewed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class Notification(Base):
    """Persistent local household notification introduced by Build 030."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    audience: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="household",
        index=True,
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="info", index=True)
    source_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="system",
        index=True,
    )
    source_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
        index=True,
    )


class NotificationReceipt(Base):
    """Per-user read/dismiss state without changing the shared notification."""

    __tablename__ = "notification_receipts"
    __table_args__ = (
        UniqueConstraint(
            "notification_id",
            "user_id",
            name="uq_notification_receipts_notification_user",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_id: Mapped[int] = mapped_column(
        ForeignKey("notifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class Automation(TimestampMixin, Base):
    """Persisted deterministic automation definition introduced by Build 026."""

    __tablename__ = "automations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    definition_json: Mapped[Any] = mapped_column(JSON, nullable=False)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )


class AutomationRun(Base):
    """One persisted deterministic Event Engine evaluation/execution attempt."""

    __tablename__ = "automation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    automation_id: Mapped[int] = mapped_column(
        ForeignKey("automations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
        index=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    result_summary: Mapped[Any] = mapped_column(JSON, nullable=False, default=dict)


class WorkshopStation(TimestampMixin, Base):
    """Named local workstation for any project. Not a machine controller."""

    __tablename__ = "workshop_stations"
    __table_args__ = (
        UniqueConstraint("project_key", "name", name="uq_workshop_station_project_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    hazards_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class WorkshopEquipment(TimestampMixin, Base):
    """Local equipment record, never permission to activate hazardous machinery."""

    __tablename__ = "workshop_equipment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    station_id: Mapped[int | None] = mapped_column(
        ForeignKey("workshop_stations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    equipment_type: Mapped[str] = mapped_column(String(80), nullable=False)
    model_reference: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    accessories_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    activity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    readiness_status: Mapped[str] = mapped_column(
        String(24), nullable=False, default="unverified", index=True
    )
    maintenance_due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_inspected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class WorkshopInspection(Base):
    """Append-only manual workshop observation, not a certification or run command."""

    __tablename__ = "workshop_inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey("workshop_equipment.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    review_status: Mapped[str] = mapped_column(String(24), nullable=False)
    note: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    checked_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class WorkshopJob(TimestampMixin, Base):
    """Manual project progress and material estimates, without machine or inventory authority."""

    __tablename__ = "workshop_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    equipment_id: Mapped[int | None] = mapped_column(
        ForeignKey("workshop_equipment.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="planned")
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    actual_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    materials_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    notes: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class WorkshopJobPhoto(Base):
    """Locally stored private photo bytes, fetched only after authentication."""

    __tablename__ = "workshop_job_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("workshop_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mime_type: Mapped[str] = mapped_column(String(24), nullable=False)
    photo_bytes: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class WorkshopMaintenancePlan(TimestampMixin, Base):
    """Owner-maintained schedule and checklist; never equipment permission."""

    __tablename__ = "workshop_maintenance_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey("workshop_equipment.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False)
    reminder_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    next_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    assigned_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    checklist_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    parts_refs_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    notes: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    last_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class WorkshopMaintenanceEvent(Base):
    """Append-only manual maintenance observations and scheduling provenance."""

    __tablename__ = "workshop_maintenance_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("workshop_maintenance_plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    outcome: Mapped[str] = mapped_column(String(24), nullable=False)
    note: Mapped[str] = mapped_column(String(500), nullable=False)
    completed_checklist_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    parts_used_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    previous_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    next_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    schedule_updated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recorded_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )


class CameraCompatibilityRecord(TimestampMixin, Base):
    """Manual, server-backed compatibility plan; does not activate a camera."""

    __tablename__ = "camera_compatibility_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    identity_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    brand: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    method: Mapped[str] = mapped_column(String(32), nullable=False, default="unverified")
    evidence: Mapped[str] = mapped_column(String(400), nullable=False, default="")
    approved_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class CameraCompatibilityLedger(Base):
    """Append-only manual approval evidence for an exact record revision."""

    __tablename__ = "camera_compatibility_ledger"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(
        ForeignKey("camera_compatibility_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(24), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    method: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class CameraImportReview(Base):
    """Owner-bound, one-use review receipt; never stores raw tokens or camera secrets."""

    __tablename__ = "camera_import_reviews"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    inventory_snapshot: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )


class CameraImportAcceptanceEvidence(Base):
    """Immutable manual field observations; not automatic device health certification."""

    __tablename__ = "camera_import_acceptance_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    inventory_snapshot: Mapped[str] = mapped_column(String(64), nullable=False)
    migration_revision: Mapped[str] = mapped_column(String(32), nullable=False)
    camera_count: Mapped[int] = mapped_column(Integer, nullable=False)
    imported_count: Mapped[int] = mapped_column(Integer, nullable=False)
    backup_drill_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ha_connected_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    mqtt_connected_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    camera_status_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    decision: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class DeviceRegistryAnnotation(TimestampMixin, Base):
    """Reviewed labels only; never alters upstream HA, MQTT or camera identities."""

    __tablename__ = "device_registry_annotations"
    __table_args__ = (UniqueConstraint("source", "source_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(24), nullable=False)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    alias: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    room_label: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    disposition: Mapped[str] = mapped_column(String(32), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reviewed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class DeviceRegistryMatchReview(TimestampMixin, Base):
    """Proposed relationship review, not a linkage or consolidation operation."""

    __tablename__ = "device_registry_match_reviews"
    __table_args__ = (UniqueConstraint("left_source", "left_id", "right_source", "right_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    left_source: Mapped[str] = mapped_column(String(24), nullable=False)
    left_id: Mapped[str] = mapped_column(String(255), nullable=False)
    right_source: Mapped[str] = mapped_column(String(24), nullable=False)
    right_id: Mapped[str] = mapped_column(String(255), nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reviewed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class DeviceDiscoveryReview(TimestampMixin, Base):
    """Operator decision about one exact discovery reference; never a provider adoption."""

    __tablename__ = "device_discovery_reviews"
    __table_args__ = (UniqueConstraint("source", "source_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(24), nullable=False)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reviewed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class CameraWallPreference(TimestampMixin, Base):
    """Account-private camera wall layout, never playback sources or credentials."""

    __tablename__ = "camera_wall_preferences"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    favorite_camera_ids: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    compact: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
