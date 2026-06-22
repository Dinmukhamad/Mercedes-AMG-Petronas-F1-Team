from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RaceResult(Base):
    __tablename__ = "race_results"
    __table_args__ = (
        UniqueConstraint("race_id", "driver_id", name="uq_race_results_race_driver"),
        # Самый частый запрос — все результаты конкретной гонки по позиции
        Index("ix_race_results_race_position", "race_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    race_id: Mapped[int] = mapped_column(ForeignKey("races.id", ondelete="CASCADE"), index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), index=True)
    constructor_id: Mapped[int | None] = mapped_column(ForeignKey("constructors.id"))
    position: Mapped[int | None] = mapped_column(Integer, index=True)
    grid_position: Mapped[int | None] = mapped_column(Integer)
    points: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    laps: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(String(120))
    fastest_lap: Mapped[bool] = mapped_column(Boolean, default=False)
    race_time: Mapped[str | None] = mapped_column(String(80))

    race: Mapped["Race"] = relationship(back_populates="race_results")
    driver: Mapped["Driver"] = relationship(back_populates="race_results")
    constructor: Mapped["Constructor | None"] = relationship(back_populates="race_results")


class QualifyingResult(Base):
    __tablename__ = "qualifying_results"
    __table_args__ = (
        UniqueConstraint("race_id", "driver_id", name="uq_qualifying_results_race_driver"),
        Index("ix_qualifying_results_race_position", "race_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    race_id: Mapped[int] = mapped_column(ForeignKey("races.id", ondelete="CASCADE"), index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), index=True)
    constructor_id: Mapped[int | None] = mapped_column(ForeignKey("constructors.id"))
    position: Mapped[int | None] = mapped_column(Integer, index=True)
    q1: Mapped[str | None] = mapped_column(String(40))
    q2: Mapped[str | None] = mapped_column(String(40))
    q3: Mapped[str | None] = mapped_column(String(40))

    race: Mapped["Race"] = relationship(back_populates="qualifying_results")
    driver: Mapped["Driver"] = relationship(back_populates="qualifying_results")
    constructor: Mapped[
        "Constructor | None"
    ] = relationship(back_populates="qualifying_results")


class PracticeResult(Base):
    __tablename__ = "practice_results"
    __table_args__ = (
        UniqueConstraint(
            "race_id",
            "session_type",
            "driver_id",
            name="uq_practice_results_race_session_driver",
        ),
        # Запросы по конкретной сессии практики
        Index("ix_practice_results_race_session", "race_id", "session_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    race_id: Mapped[int] = mapped_column(ForeignKey("races.id", ondelete="CASCADE"), index=True)
    session_type: Mapped[str] = mapped_column(String(40), index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), index=True)
    constructor_id: Mapped[int | None] = mapped_column(ForeignKey("constructors.id"))
    position: Mapped[int | None] = mapped_column(Integer, index=True)
    lap_time: Mapped[str | None] = mapped_column(String(40))

    race: Mapped["Race"] = relationship(back_populates="practice_results")
    driver: Mapped["Driver"] = relationship(back_populates="practice_results")
    constructor: Mapped["Constructor | None"] = relationship(
        back_populates="practice_results",
    )
