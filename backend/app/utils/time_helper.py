"""
time_helper.py — Utility functions cho thời gian
===================================================
"""

from datetime import datetime, timezone, timedelta


# Timezone Việt Nam (UTC+7)
VN_TIMEZONE = timezone(timedelta(hours=7))


def get_timestamp() -> str:
    """
    Trả về timestamp hiện tại dạng ISO 8601.
    Ví dụ: "2026-05-29T10:30:00+07:00"
    """
    return datetime.now(VN_TIMEZONE).isoformat(timespec="seconds")


def format_duration(seconds: float) -> str:
    """
    Format số giây thành chuỗi dễ đọc.
    Ví dụ: 150 → "2 phút 30 giây"
    """
    if seconds < 60:
        return f"{int(seconds)} giây"

    minutes = int(seconds // 60)
    remaining_seconds = int(seconds % 60)

    if minutes < 60:
        if remaining_seconds > 0:
            return f"{minutes} phút {remaining_seconds} giây"
        return f"{minutes} phút"

    hours = minutes // 60
    remaining_minutes = minutes % 60
    if remaining_minutes > 0:
        return f"{hours} giờ {remaining_minutes} phút"
    return f"{hours} giờ"
