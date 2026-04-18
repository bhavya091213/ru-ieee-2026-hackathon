from __future__ import annotations

from pydantic import BaseModel, field_validator

from apps.api.schemas.chunk import VALID_FACETS


class Scenario(BaseModel):
    product_name: str
    description: str
    hypotheses: list[str]
    facets_to_explore: list[str]

    @field_validator("product_name")
    @classmethod
    def product_name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("product_name must not be empty or whitespace-only")
        if len(stripped) > 200:
            raise ValueError("product_name must be 200 characters or fewer")
        return stripped

    @field_validator("hypotheses")
    @classmethod
    def hypotheses_valid(cls, v: list[str]) -> list[str]:
        if len(v) < 1 or len(v) > 10:
            raise ValueError("hypotheses must contain 1-10 items")
        for h in v:
            if len(h) > 500:
                raise ValueError("each hypothesis must be 500 characters or fewer")
        return v

    @field_validator("facets_to_explore")
    @classmethod
    def facets_must_be_valid(cls, v: list[str]) -> list[str]:
        for facet in v:
            if facet not in VALID_FACETS:
                raise ValueError(f"invalid facet: {facet!r}")
        return v
