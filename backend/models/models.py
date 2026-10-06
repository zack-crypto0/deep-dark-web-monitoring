from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text
)

from sqlalchemy.sql import func

from backend.database import Base


# ==========================================
# USERS
# ==========================================

class User(Base):

    __tablename__ = "users"

    user_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    username = Column(
        String(100),
        unique=True,
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False
    )

    password_hash = Column(
        String(500),
        nullable=False
    )

    role = Column(
        String(50),
        default="analyst",
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==========================================
# AUTH SESSION
# ==========================================

class AuthSession(Base):

    __tablename__ = "auth_sessions"

    session_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    token_hash = Column(
        String(128),
        unique=True,
        nullable=False
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==========================================
# WATCHLIST
# ==========================================

class Watchlist(Base):

    __tablename__ = "watchlists"

    watchlist_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=True
    )

    asset_type = Column(
        String(50),
        nullable=False
    )

    asset_value = Column(
        String(255),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(50),
        default="Active"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==========================================
# SOURCES
# ==========================================

class Source(Base):

    __tablename__ = "sources"

    source_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    source_name = Column(
        String(255),
        nullable=False
    )

    source_type = Column(
        String(100),
        nullable=False
    )

    source_reference = Column(
        String(500),
        nullable=True
    )

    collected_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # SHA-256 hash of the extracted content
    # collected from this source.
    #
    # Nullable keeps compatibility with
    # sources created before provenance
    # hashing was introduced.
    content_hash = Column(
        String(64),
        nullable=True
    )


# ==========================================
# FINDINGS
# ==========================================

class Finding(Base):

    __tablename__ = "findings"

    # Hash of the exact UTF-8 extracted text
    # stored in content.
    #
    # Nullable for findings created before
    # provenance capture was introduced.
    content_hash = Column(
        String(64),
        nullable=True
    )

    collected_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    finding_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    watchlist_id = Column(
        Integer,
        ForeignKey("watchlists.watchlist_id"),
        nullable=False
    )

    source_id = Column(
        Integer,
        ForeignKey("sources.source_id"),
        nullable=False
    )

    matched_value = Column(
        String(255),
        nullable=False
    )

    content = Column(
        Text,
        nullable=True
    )

    threat_category = Column(
        String(100),
        nullable=True
    )

    risk_score = Column(
        Integer,
        default=0
    )

    severity = Column(
        String(50),
        default="Low"
    )

    status = Column(
        String(50),
        default="New"
    )

    detected_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==========================================
# ALERTS
# ==========================================

class Alert(Base):

    __tablename__ = "alerts"

    alert_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    finding_id = Column(
        Integer,
        ForeignKey("findings.finding_id"),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    severity = Column(
        String(50),
        default="Low"
    )

    status = Column(
        String(50),
        default="Unread"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==========================================
# AUDIT LOGS
# ==========================================

class AuditLog(Base):

    __tablename__ = "audit_logs"

    audit_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=True
    )

    action = Column(
        String(255),
        nullable=False
    )

    record_type = Column(
        String(100),
        nullable=True
    )

    record_id = Column(
        Integer,
        nullable=True
    )

    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==========================================
# REPORTS
# ==========================================

class Report(Base):

    __tablename__ = "reports"

    report_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=True
    )

    report_type = Column(
        String(100),
        nullable=False
    )

    generated_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )