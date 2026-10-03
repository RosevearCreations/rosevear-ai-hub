"""Local knowledge ingestion and indexing API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.ollama import OllamaClient
from rosevear_ai_hub.knowledge.chunking import ChunkingError
from rosevear_ai_hub.knowledge.indexing import (
    KnowledgeIndexingError,
    KnowledgeIndexingService,
)
from rosevear_ai_hub.knowledge.ingestion import (
    KnowledgeIngestionError,
    KnowledgeIngestionService,
)
from rosevear_ai_hub.knowledge.vector_store import SQLAlchemyVectorStore
from rosevear_ai_hub.models import KnowledgeChunk, KnowledgeCollection, KnowledgeDocument
from rosevear_ai_hub.providers.base import ProviderError
from rosevear_ai_hub.schemas import (
    KnowledgeChunkResponse,
    KnowledgeCollectionResponse,
    KnowledgeDocumentResponse,
    KnowledgeIndexResponse,
    KnowledgeUploadResponse,
)

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])
SessionDependency = Annotated[Session, Depends(get_session)]


def get_knowledge_ingestion_service() -> KnowledgeIngestionService:
    settings = get_settings()
    return KnowledgeIngestionService(
        settings.knowledge_storage_dir,
        max_upload_bytes=settings.knowledge_max_upload_bytes,
        max_expanded_docx_bytes=settings.knowledge_max_expanded_docx_bytes,
    )


def get_knowledge_indexing_service() -> KnowledgeIndexingService:
    settings = get_settings()
    if settings.knowledge_embedding_provider != "ollama":
        raise RuntimeError("Build 012 currently supports the Ollama embedding provider only.")

    client = OllamaClient(
        settings.ollama_base_url,
        timeout_seconds=settings.ollama_timeout_seconds,
        generation_timeout_seconds=settings.ollama_generation_timeout_seconds,
    )
    return KnowledgeIndexingService(
        embed=client.embed,
        vector_store=SQLAlchemyVectorStore(),
        embedding_provider="ollama",
        embedding_model=settings.knowledge_embedding_model,
        chunk_characters=settings.knowledge_chunk_characters,
        chunk_overlap_characters=settings.knowledge_chunk_overlap_characters,
        embedding_batch_size=settings.knowledge_embedding_batch_size,
    )


IngestionDependency = Annotated[
    KnowledgeIngestionService,
    Depends(get_knowledge_ingestion_service),
]
IndexingDependency = Annotated[
    KnowledgeIndexingService,
    Depends(get_knowledge_indexing_service),
]


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


def _chunk_response(chunk: KnowledgeChunk) -> KnowledgeChunkResponse:
    metadata = chunk.citation_metadata if isinstance(chunk.citation_metadata, dict) else {}
    normalized_metadata = {
        str(key): value for key, value in metadata.items() if isinstance(value, (int, str))
    }
    return KnowledgeChunkResponse(
        id=chunk.id,
        document_id=chunk.document_id,
        ordinal=chunk.ordinal,
        text=chunk.text,
        start_char=chunk.start_char,
        end_char=chunk.end_char,
        citation_metadata=normalized_metadata,
        embedding_reference=chunk.embedding_reference,
    )


async def _read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    chunk_size = 1024 * 1024

    while True:
        chunk = await upload.read(chunk_size)
        if not chunk:
            break

        total += len(chunk)
        if total > max_bytes:
            raise KnowledgeIngestionError(
                f"File exceeds the {max_bytes // (1024 * 1024)} MB upload limit.",
                status_code=413,
            )
        chunks.append(chunk)

    return b"".join(chunks)


@router.get("/collections", response_model=list[KnowledgeCollectionResponse])
def list_collections(session: SessionDependency) -> list[KnowledgeCollectionResponse]:
    collections = session.scalars(
        select(KnowledgeCollection).order_by(KnowledgeCollection.name.asc())
    ).all()
    return [
        KnowledgeCollectionResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            local_only=item.local_only,
            created_at=item.created_at,
        )
        for item in collections
    ]


@router.get("/documents", response_model=list[KnowledgeDocumentResponse])
def list_documents(session: SessionDependency) -> list[KnowledgeDocumentResponse]:
    documents = session.scalars(
        select(KnowledgeDocument)
        .order_by(KnowledgeDocument.created_at.desc(), KnowledgeDocument.id.desc())
        .limit(500)
    ).all()
    return [_document_response(document) for document in documents]


@router.get("/documents/{document_id}", response_model=KnowledgeDocumentResponse)
def get_document(document_id: int, session: SessionDependency) -> KnowledgeDocumentResponse:
    document = session.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return _document_response(document)


@router.get(
    "/documents/{document_id}/chunks",
    response_model=list[KnowledgeChunkResponse],
)
def list_document_chunks(
    document_id: int,
    session: SessionDependency,
) -> list[KnowledgeChunkResponse]:
    document = session.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    chunks = session.scalars(
        select(KnowledgeChunk)
        .where(KnowledgeChunk.document_id == document_id)
        .order_by(KnowledgeChunk.ordinal.asc())
    ).all()
    return [_chunk_response(chunk) for chunk in chunks]


@router.post(
    "/documents/{document_id}/index",
    response_model=KnowledgeIndexResponse,
)
async def index_document(
    document_id: int,
    session: SessionDependency,
    indexing: IndexingDependency,
) -> KnowledgeIndexResponse:
    document = session.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    try:
        result = await indexing.index_document(session, document)
    except (ProviderError, KnowledgeIndexingError, ChunkingError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return KnowledgeIndexResponse(
        document_id=result.document_id,
        status=result.status,
        chunk_count=result.chunk_count,
        embedding_provider=result.embedding_provider,
        embedding_model=result.embedding_model,
        dimensions=result.dimensions,
    )


@router.post(
    "/documents",
    response_model=KnowledgeUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ingest_document(
    session: SessionDependency,
    ingestion: IngestionDependency,
    response: Response,
    file: Annotated[UploadFile, File(...)],
    collection_id: Annotated[int, Form(ge=1)] = 1,
) -> KnowledgeUploadResponse:
    collection = session.get(KnowledgeCollection, collection_id)
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge collection not found.",
        )

    try:
        data = await _read_limited(file, ingestion.max_upload_bytes)
        prepared = ingestion.prepare(
            filename=file.filename or "",
            content_type=file.content_type,
            data=data,
        )
    except KnowledgeIngestionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    finally:
        await file.close()

    duplicate = session.scalar(
        select(KnowledgeDocument).where(KnowledgeDocument.content_hash == prepared.content_hash)
    )
    if duplicate is not None:
        response.status_code = status.HTTP_200_OK
        return KnowledgeUploadResponse(
            document=_document_response(duplicate),
            duplicate=True,
        )

    try:
        source_path = ingestion.store(prepared, data)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be stored locally.",
        ) from exc

    document = KnowledgeDocument(
        collection_id=collection.id,
        filename=prepared.filename,
        content_hash=prepared.content_hash,
        mime_type=prepared.mime_type,
        source_path=source_path,
        size_bytes=prepared.size_bytes,
        extracted_text=prepared.extracted_text,
        metadata_json=prepared.metadata,
        status="ingested",
    )
    session.add(document)
    session.commit()
    session.refresh(document)

    return KnowledgeUploadResponse(
        document=_document_response(document),
        duplicate=False,
    )
