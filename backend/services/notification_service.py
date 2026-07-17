"""
Notification service — creates in-app notifications.
"""
from extensions import db
from models.notification import Notification


def send_notification(user_id: int, title: str, message: str,
                      ntype: str = 'info', module: str = None,
                      reference_id: int = None, reference_type: str = None,
                      action_url: str = None):
    """Create an in-app notification for a user."""
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=ntype,
            module=module,
            reference_id=reference_id,
            reference_type=reference_type,
            action_url=action_url,
        )
        db.session.add(notif)
        db.session.commit()
        return notif
    except Exception as e:
        db.session.rollback()
        print(f'Notification error: {e}')
        return None


def send_bulk_notifications(user_ids: list, title: str, message: str, **kwargs):
    """Send the same notification to multiple users."""
    for uid in user_ids:
        send_notification(uid, title, message, **kwargs)
