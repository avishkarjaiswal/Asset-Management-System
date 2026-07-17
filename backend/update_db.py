import os
from flask import Flask
from config import get_config
from extensions import db

app = Flask(__name__)
app.config.from_object(get_config())
db.init_app(app)

with app.app_context():
    try:
        # Check if is_approved exists
        db.session.execute(db.text("SELECT is_approved FROM users LIMIT 1"))
        print("Column is_approved already exists")
    except Exception as e:
        db.session.rollback()
        print("Adding is_approved column...")
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;"))
        db.session.execute(db.text("UPDATE users SET is_approved = TRUE;"))
        db.session.commit()
        print("Column added and users updated.")

    try:
        db.session.execute(db.text("INSERT INTO roles (name, display_name, description) VALUES ('approval_member', 'Approval Member', 'Review and approve requests') ON CONFLICT (name) DO NOTHING;"))
        db.session.commit()
        print("Role approval_member ensured.")
    except Exception as e:
        print("Error inserting role:", e)
        
    try:
        # Check if approved_at exists
        db.session.execute(db.text("SELECT approved_at FROM users LIMIT 1"))
        print("Column approved_at already exists")
    except Exception as e:
        db.session.rollback()
        print("Adding approved_at column...")
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN approved_at TIMESTAMPTZ;"))
        db.session.execute(db.text("UPDATE users SET approved_at = CURRENT_TIMESTAMP WHERE is_approved = TRUE;"))
        db.session.commit()
        print("Column added and users updated.")
