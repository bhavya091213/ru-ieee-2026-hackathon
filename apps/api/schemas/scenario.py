"""Scenario schema with custom validators."""

from pydantic import BaseModel, field_validator
from typing import List
from .chunk import Facet


class Scenario(BaseModel):
    """A scenario defining the product and hypotheses to explore."""
    product_name: str
    description: str
    hypotheses: List[str]
    facets_to_explore: List[str]

    @field_validator("product_name", mode="after")
    @classmethod
    def validate_product_name(cls, v: str) -> str:
        """Validate product_name is non-empty and max 200 characters."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("product_name cannot be empty or whitespace-only")
        if len(stripped) > 200:
            raise ValueError("product_name cannot exceed 200 characters")
        return stripped

    @field_validator("hypotheses", mode="after")
    @classmethod
    def validate_hypotheses(cls, v: List[str]) -> List[str]:
        """Validate hypotheses list has 1-10 items, each max 500 characters."""
        if not (1 <= len(v) <= 10):
            raise ValueError("hypotheses must contain between 1 and 10 items")
        for hypothesis in v:
            if len(hypothesis) > 500:
                raise ValueError("each hypothesis cannot exceed 500 characters")
        return v

    @field_validator("facets_to_explore", mode="after")
    @classmethod
    def validate_facets_to_explore(cls, v: List[str]) -> List[str]:
        """Validate each facet is a valid Facet literal."""
        valid_facets = {"camera", "battery", "price", "design", "privacy", "ecosystem", "other"}
        for facet in v:
            if facet not in valid_facets:
                raise ValueError(f"invalid facet '{facet}'; must be one of: {', '.join(sorted(valid_facets))}")
        return v