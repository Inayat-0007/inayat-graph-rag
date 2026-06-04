"""
I.N.A.Y.A.T. Document Processing Service

Handles text extraction from PDF, DOCX, and TXT files,
file validation via magic bytes and extension, and text chunking.
"""
import io
import logging
from typing import List, Optional
from pathlib import Path

import magic
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)

# MIME types for validation
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/octet-stream",  # Some TXT files may detect as this
}


def validate_file(filename: str, content_bytes: bytes) -> Optional[str]:
    """
    Validate a file by checking both its extension and magic bytes.

    Args:
        filename: Original filename
        content_bytes: Raw file bytes

    Returns:
        None if valid, error message string if invalid
    """
    # Check file size
    if len(content_bytes) > MAX_FILE_SIZE:
        return f"File size {len(content_bytes)} exceeds maximum {MAX_FILE_SIZE} bytes (50 MB)"

    # Check extension
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return f"File extension '{ext}' not allowed. Allowed: {ALLOWED_EXTENSIONS}"

    # Check magic bytes
    try:
        detected_mime = magic.from_buffer(content_bytes[:8192], mime=True)
        logger.info(f"Detected MIME type: {detected_mime} for {filename}")

        # Special handling: TXT files may have various MIME types
        if ext == ".txt":
            # Accept text-like MIME types for .txt files
            if detected_mime and (
                detected_mime.startswith("text/")
                or detected_mime == "application/octet-stream"
            ):
                return None
            # If magic can't determine, still allow .txt
            return None

        if ext == ".pdf" and detected_mime != "application/pdf":
            return f"File claims to be PDF but magic bytes indicate: {detected_mime}"

        if ext == ".docx" and detected_mime not in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",  # DOCX is a ZIP container
            "application/octet-stream",
        }:
            return f"File claims to be DOCX but magic bytes indicate: {detected_mime}"

    except Exception as e:
        logger.warning(f"Magic byte detection failed: {e}, proceeding with extension check only")

    return None


def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Extract text content from a file based on its extension.

    Supports:
      - PDF: PyPDF2 page-by-page extraction
      - DOCX: python-docx paragraph extraction
      - TXT: UTF-8 decode with fallback to latin-1

    Args:
        file_bytes: Raw file bytes
        filename: Original filename (used to determine type)

    Returns:
        Extracted text content
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(file_bytes)
    elif ext == ".docx":
        return _extract_docx(file_bytes)
    elif ext == ".txt":
        return _extract_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")


def _extract_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyPDF2."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
        full_text = "\n\n".join(pages)
        logger.info(f"Extracted {len(full_text)} chars from PDF ({len(reader.pages)} pages)")
        return full_text
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise ValueError(f"Failed to extract text from PDF: {e}")


def _extract_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        doc = DocxDocument(io.BytesIO(file_bytes))
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                paragraphs.append(para.text.strip())
        full_text = "\n\n".join(paragraphs)
        logger.info(f"Extracted {len(full_text)} chars from DOCX ({len(paragraphs)} paragraphs)")
        return full_text
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        raise ValueError(f"Failed to extract text from DOCX: {e}")


def _extract_txt(file_bytes: bytes) -> str:
    """Extract text from TXT file with encoding fallback."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("latin-1")
        except Exception as e:
            logger.error(f"TXT decoding failed: {e}")
            raise ValueError(f"Failed to decode text file: {e}")


def chunk_text(text: str) -> List[str]:
    """
    Split text into chunks using RecursiveCharacterTextSplitter.

    Uses chunk_size=512 and chunk_overlap=64 as specified.

    Args:
        text: Full document text

    Returns:
        List of text chunks
    """
    if not text or not text.strip():
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_text(text)
    logger.info(f"Split text into {len(chunks)} chunks (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")
    return chunks
