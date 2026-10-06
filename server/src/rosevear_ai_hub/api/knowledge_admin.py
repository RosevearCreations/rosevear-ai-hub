"""Knowledge administration API for collections, documents, and index status."""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.knowledge import get_knowledge_ingestion_service
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.confirmations import consume_confirmation
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.knowledge.ingestion import KnowledgeIngestionService
from rosevear_ai_hub.models import (
    ChunkEmbedding,
    KnowledgeChunk,
    KnowledgeCollection,
    KnowledgeDocument,
    User,
)
from rosevear_ai_hub.schemas import KnowledgeCollectionResponse, KnowledgeDocumentResponse

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge-admin"])
SessionDependency = Annotated[Session, Depends(get_session)]
IngestionDependency = Annotated[
    KnowledgeIngestionService,
    Depends(get_knowledge_ingestion_service),
]


class KnowledgeCollectionCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=2000)
    local_only: bool = True


class KnowledgeCollectionUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=2000)
    local_only: bool | None = None


class KnowledgeDocumentMoveRequest(BaseModel):
    collection_id: int = Field(ge=1)


class KnowledgeDeleteResponse(BaseModel):
    deleted: bool
    source_deleted: bool = False


class KnowledgeAdminStatusResponse(BaseModel):
    collection_count: int
    local_only_collection_count: int
    document_count: int
    indexed_document_count: int
    needs_indexing_count: int
    chunk_count: int
    embedding_count: int
    total_source_bytes: int
    documents_by_status: dict[str, int]


def _collection_response(collection: KnowledgeCollection) -> KnowledgeCollectionResponse:
    return KnowledgeCollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        local_only=collection.local_only,
        created_at=collection.created_at,
    )


def _document_response(document: KnowledgeDocument) -> KnowledgeDocumentResponse:
    metadata = document.metadata_json if isinstance(document.metadata_json, dict) else {}
    page_count = metadata.get("page_count")
    return KnowledgeDocumentResponse(
        id=document.id,
        collection_id=document.collection_id,
        filename=document.filename,
        content_hash=document.content_hash,
        mime_type=document.mime_type,
        source_path=document.source_path,
        size_bytes=document.size_bytes,
        status=document.status,
        extracted_characters=len(document.extracted_text),
        page_count=page_count if isinstance(page_count, int) else None,
        created_at=document.created_at,
        indexed_at=document.indexed_at,
    )


@router.get("/admin/status", response_model=KnowledgeAdminStatusResponse)
def knowledge_admin_status(session: SessionDependency) -> KnowledgeAdminStatusResponse:
    collections = session.scalars(select(KnowledgeCollection)).all()
    documents = session.scalars(select(KnowledgeDocument)).all()

    status_counts = Counter(document.status for document in documents)
    chunk_count = session.scalar(select(func.count()).select_from(KnowledgeChunk)) or 0
    embedding_count = session.scalar(select(func.count()).select_from(ChunkEmbedding)) or 0
    total_source_bytes = sum(document.size_bytes for document in documents)

    indexed_count = status_counts.get("indexed", 0)
    return KnowledgeAdminStatusResponse(
        collection_count=len(collections),
        local_only_collection_count=sum(1 for item in collections if item.local_only),
        document_count=len(documents),
        indexed_document_count=indexed_count,
        needs_indexing_count=max(0, len(documents) - indexed_count),
        chunk_count=int(chunk_count),
        embedding_count=int(embedding_count),
        total_source_bytes=total_source_bytes,
        documents_by_status=dict(sorted(status_counts.items())),
    )


@router.post(
    "/collections",
    response_model=KnowledgeCollectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_collection(
    request: KnowledgeCollectionCreateRequest,
    session: SessionDependency,
) -> KnowledgeCollectionResponse:
    collection = KnowledgeCollection(
        name=request.name.strip(),
        description=request.description.strip() if request.description else None,
        local_only=request.local_only,
    )
    session.add(collection)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A knowledge collection with that name already exists.",
        ) from exc

    session.refresh(collection)
    return _collection_response(collection)


@router.patch(
    "/collections/{collection_id}",
    response_model=KnowledgeCollectionResponse,
)
def update_collection(
    collection_id: int,
    request: KnowledgeCollectionUpdateRequest,
    session: SessionDependency,
) -> KnowledgeCollectionResponse:
    collection = session.get(KnowledgeCollection, collection_id)
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge collection not found.",
        )

    if request.name is not None:
        collection.name = request.name.strip()
    if request.description is not None:
        collection.description = request.description.strip() or None
    if request.local_only is not None:
        collection.local_only = request.local_only

    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A knowledge collection with that name already exists.",
        ) from exc

    session.refresh(collection)
    return _collection_response(collection)


@router.delete(
    "/collections/{collection_id}",
    response_model=KnowledgeDeleteResponse,
)
def delete_collection(
    collection_id: int,
    session: SessionDependency,
) -> KnowledgeDeleteResponse:
    collection = session.get(KnowledgeCollection, collection_id)
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge collection not found.",
        )

    document_count = (
        session.scalar(
            select(func.count())
            .select_from(KnowledgeDocument)
            .where(KnowledgeDocument.collection_id == collection_id)
        )
        or 0
    )
    if document_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Move or delete all documents in this collection before deleting it.",
        )

    if collection.name == "Inbox":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The default Inbox collection cannot be deleted.",
        )

    session.delete(collection)
    session.commit()
    return KnowledgeDeleteResponse(deleted=True)


@router.patch(
    "/documents/{document_id}/collection",
    response_model=KnowledgeDocumentResponse,
)
def move_document(
    document_id: int,
    request: KnowledgeDocumentMoveRequest,
    session: SessionDependency,
) -> KnowledgeDocumentResponse:
    document = session.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    collection = session.get(KnowledgeCollection, request.collection_id)
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge collection not found.",
        )

    document.collection_id = collection.id
    session.commit()
    session.refresh(document)
    return _document_response(document)


@router.delete(
    "/documents/{document_id}",
    response_model=KnowledgeDeleteResponse,
)
def delete_document(
    document_id: int,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    session: SessionDependency,
    ingestion: IngestionDependency,
    confirmation_id: str | None = Query(default=None),
) -> KnowledgeDeleteResponse:
    if confirmation_id is None:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="An approved confirmation is required to delete a knowledge document.",
        )

    document = session.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    consume_confirmation(
        session,
        confirmation_id=confirmation_id,
        actor=actor,
        tool_key="knowledge.document.delete",
        arguments={"document_id": document_id},
    )

    source_path = document.source_path
    chunk_ids = select(KnowledgeChunk.id).where(KnowledgeChunk.document_id == document_id)
    session.execute(delete(ChunkEmbedding).where(ChunkEmbedding.chunk_id.in_(chunk_ids)))
    session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document_id))
    session.delete(document)
    session.commit()

    source_deleted = _delete_source_file(ingestion.storage_root, source_path)
    return KnowledgeDeleteResponse(deleted=True, source_deleted=source_deleted)


def _delete_source_file(storage_root: Path, source_path: str) -> bool:
    root = storage_root.resolve()
    target = (root / source_path).resolve()
    if root not in target.parents:
        return False

    try:
        target.unlink(missing_ok=True)
    except OSError:
        return False
    return not target.exists()
