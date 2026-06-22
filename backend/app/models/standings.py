from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DriverStanding(Base):
    __tablename__ = "driver_standings"
    __table_args__ = (
        UniqueConstraint("season_id", "driver_id", name="uq_driver_standings_season_driver"),
        # Составной индекс: самый частый запрос — все гонщики сезона, отсортированные по позиции
        Index("ix_driver_standings_season_position", "season_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"), index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), index=True)
    constructor_id: Mapped[int | None] = mapped_column(ForeignKey("constructors.id"))
    position: Mapped[int | None] = mapped_column(Integer, index=True)
    previous_position: Mapped[int | None] = mapped_column(Integer)
    points: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    podiums: Mapped[int] = mapped_column(Integer, default=0)
    starts: Mapped[int] = mapped_column(Integer, default=0)
    finishes: Mapped[int] = mapped_column(Integer, default=0)
    dnfs: Mapped[int] = mapped_column(Integer, default=0)

    season: Mapped["Season"] = relationship(back_populates="driver_standings")
    driver: Mapped["Driver"] = relationship(back_populates="standings")
    constructor: Mapped["Constructor | None"] = relationship(back_populates="driver_standings")


class ConstructorStanding(Base):
    __tablename__ = "constructor_standings"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "constructor_id",
            name="uq_constructor_standings_season_constructor",
        ),
        # Составной индекс: команды сезона по позиции
        Index("ix_constructor_standings_season_position", "season_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"), index=True)
    constructor_id: Mapped[int] = mapped_column(
        ForeignKey("constructors.id", ondelete="CASCADE"),
        index=True,
    )
    position: Mapped[int | None] = mapped_column(Integer, index=True)
    previous_position: Mapped[int | None] = mapped_column(Integer)
    points: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    podiums: Mapped[int] = mapped_column(Integer, default=0)

    season: Mapped["Season"] = relationship(back_populates="constructor_standings")
    constructor: Mapped["Constructor"] = relationship(back_populates="constructor_standings")
