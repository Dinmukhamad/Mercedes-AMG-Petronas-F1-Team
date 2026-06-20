from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        CheckConstraint(
            "(driver_id IS NOT NULL AND constructor_id IS NULL) OR "
            "(driver_id IS NULL AND constructor_id IS NOT NULL)",
            name="ck_favorites_exactly_one_target",
        ),
        UniqueConstraint("user_id", "driver_id", name="uq_favorites_user_driver"),
        UniqueConstraint(
            "user_id",
            "constructor_id",
            name="uq_favorites_user_constructor",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"))
    constructor_id: Mapped[int | None] = mapped_column(
        ForeignKey("constructors.id", ondelete="CASCADE"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="favorites")
    driver: Mapped["Driver | None"] = relationship(back_populates="favorites")
    constructor: Mapped["Constructor | None"] = relationship(back_populates="favorites")

