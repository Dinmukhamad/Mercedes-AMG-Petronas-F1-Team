from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models.sync_status import SyncStatus


@dataclass(slots=True)
class SyncResult:
    success: bool
    message: str
    synced_count: int = 0
    details: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "synced_count": self.synced_count,
            "details": self.details,
        }


def parse_int(value: Any) -> int | None:
    if value in (None, "", "\\N"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_decimal(value: Any) -> Decimal:
    if value in (None, "", "\\N"):
        return Decimal("0")
    return Decimal(str(value))


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def race_status(race_date: date | None) -> str:
    if race_date is None:
        return "upcoming"
    return "finished" if race_date < date.today() else "upcoming"


def upsert_by_external_id(db: Session, model: type, external_id: str, data: dict[str, Any]):
    existing = db.query(model).filter_by(external_id=external_id).first()
    if existing:
        for key, value in data.items():
            setattr(existing, key, value)
        return existing, False
    item = model(**data)
    db.add(item)
    return item, True


def record_sync_status(db: Session, name: str, result: SyncResult) -> None:
    status = db.query(SyncStatus).filter_by(name=name).first()
    now = datetime.now(timezone.utc)
    if status is None:
        status = SyncStatus(name=name)
        db.add(status)
    status.success = result.success
    status.message = result.message
    status.details = result.details
    status.synced_count = result.synced_count
    if result.success:
        status.last_success_at = now
    status.updated_at = now
    db.commit()

