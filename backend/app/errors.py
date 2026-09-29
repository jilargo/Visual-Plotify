"""Application error types mapped to HTTP responses by the API layer."""

from __future__ import annotations


class VisualPlotifyError(Exception):
    """Base class for errors that are safe to show to the user."""

    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class UnsupportedFileError(VisualPlotifyError):
    """Raised when an upload is not a spreadsheet the app can parse."""

    status_code = 415


class FileTooLargeError(VisualPlotifyError):
    """Raised when an upload exceeds the configured size ceiling."""

    status_code = 413


class DatasetNotFoundError(VisualPlotifyError):
    """Raised when a workbook or worksheet cannot be located."""

    status_code = 404


class ChartRequestError(VisualPlotifyError):
    """Raised when a chart cannot be built from the requested columns."""


class ParseError(VisualPlotifyError):
    """Raised when a file cannot be parsed as tabular data."""
