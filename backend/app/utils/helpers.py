from typing import Any, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session


ModelT = TypeVar("ModelT")


def get_or_404(db: Session, model: type[ModelT], item_id: int, name: str) -> ModelT:
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{name} not found",
        )
    return item


def apply_update(model: Any, payload: BaseModel) -> Any:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(model, field, value)
    return model


def commit_refresh(db: Session, item: ModelT) -> ModelT:
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

