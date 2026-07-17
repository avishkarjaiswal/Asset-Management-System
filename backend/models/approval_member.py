"""
Approval Member Model
Stores pre-defined approval members used in Capital Sanction forms.
"""
from datetime import datetime, timezone
from extensions import db


class ApprovalMember(db.Model):
    __tablename__ = 'approval_members'

    id = db.Column(db.Integer, primary_key=True)
    department  = db.Column(db.String(150), nullable=False)
    designation = db.Column(db.String(150), nullable=False)
    name        = db.Column(db.String(200), nullable=False)
    gppl_id     = db.Column(db.String(50), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            'id':          self.id,
            'department':  self.department,
            'designation': self.designation,
            'name':        self.name,
            'gppl_id':     self.gppl_id,
            'created_at':  self.created_at.isoformat() if self.created_at else None,
            'updated_at':  self.updated_at.isoformat() if self.updated_at else None,
        }
