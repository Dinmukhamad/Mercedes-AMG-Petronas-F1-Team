from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.constructor import Constructor
from app.models.driver import Driver
from app.models.favorite import Favorite
from app.models.user import User
from app.schemas.favorite import FavoriteResponse
from app.utils.helpers import get_or_404


router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteResponse])
def list_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Favorite]:
    return db.query(Favorite).filter_by(user_id=current_user.id).order_by(Favorite.id.asc()).all()


@router.post(
    "/drivers/{driver_id}",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_driver_favorite(
    driver_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Favorite:
    get_or_404(db, Driver, driver_id, "Driver")
    existing = db.query(Favorite).filter_by(user_id=current_user.id, driver_id=driver_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver already in favorites",
        )
    favorite = Favorite(user_id=current_user.id, driver_id=driver_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete("/drivers/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver_favorite(
    driver_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    favorite = db.query(Favorite).filter_by(user_id=current_user.id, driver_id=driver_id).first()
    if favorite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )
    db.delete(favorite)
    db.commit()


@router.post(
    "/constructors/{constructor_id}",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_constructor_favorite(
    constructor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Favorite:
    get_or_404(db, Constructor, constructor_id, "Constructor")
    existing = (
        db.query(Favorite)
        .filter_by(user_id=current_user.id, constructor_id=constructor_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Constructor already in favorites",
        )
    favorite = Favorite(user_id=current_user.id, constructor_id=constructor_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete("/constructors/{constructor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_constructor_favorite(
    constructor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    favorite = (
        db.query(Favorite)
        .filter_by(user_id=current_user.id, constructor_id=constructor_id)
        .first()
    )
    if favorite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )
    db.delete(favorite)
    db.commit()

