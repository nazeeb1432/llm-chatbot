from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# kid -> JWK dict; replaced wholesale on a cache-miss re-fetch
_jwks_cache: dict[str, dict[str, Any]] = {}


async def _fetch_jwks() -> dict[str, dict[str, Any]]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(settings.CLERK_JWKS_URL)
        response.raise_for_status()
    return {key["kid"]: key for key in response.json()["keys"]}


async def _get_jwk(kid: str) -> dict[str, Any]:
    """Return the JWK for *kid*, re-fetching JWKS at most once on a miss."""
    global _jwks_cache
    if kid not in _jwks_cache:
        _jwks_cache = await _fetch_jwks()
    if kid not in _jwks_cache:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signing key not found in JWKS",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _jwks_cache[kid]


async def verify_token(token: str) -> str:
    """Verify a Clerk RS256 JWT and return the `sub` claim (Clerk user ID)."""
    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    kid = header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token header missing 'kid'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jwk = await _get_jwk(kid)

    try:
        payload = jwt.decode(token, jwk, algorithms=["RS256"])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing 'sub' claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    return await verify_token(token)
