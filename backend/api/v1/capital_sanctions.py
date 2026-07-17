"""
Capital Sanctions API Blueprint
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime, timezone
from extensions import db
from models.capital_sanction import CapitalSanction
from models.notification import Notification
from models.user import User
from sqlalchemy import or_ as sql_or

capital_sanctions_bp = Blueprint('capital_sanctions', __name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _user_identifiers(user):
    """Return the set of non-null identifiers for a User (employee_id + email)."""
    return {i for i in [user.employee_id, user.email] if i}


def _find_user_for_member(member):
    """
    Locate the portal User account for an approval_member dict.
    Tries employee_id first, then email, using the member's gppl_id field.
    Returns (User | None, reason_string).
    """
    gppl_id = (member.get('gppl_id') or '').strip()
    name    = (member.get('name') or '').strip()

    if not gppl_id:
        return None, f"member '{name}' has no gppl_id set"

    user = (
        User.query.filter_by(employee_id=gppl_id).first() or
        User.query.filter_by(email=gppl_id).first()
    )
    if not user:
        return None, (
            f"no User account found with employee_id or email == '{gppl_id}' "
            f"(member: '{name}'). Make sure this person has a portal account."
        )

    return user, "ok"


def _notify_member(member, subject, cs_id):
    """
    Create an in-app notification for the approval member.
    Logs a warning (visible in the Flask console) when the member is skipped.
    """
    user, reason = _find_user_for_member(member)
    if not user:
        current_app.logger.warning(
            "[CapitalSanction #%s] Notification SKIPPED — %s", cs_id, reason
        )
        return

    db.session.add(Notification(
        user_id        = user.id,
        title          = 'Capital Sanction Approval Required',
        message        = (
            f'You have been requested to approve Capital Sanction: "{subject}". '
            f'Please log in to review and take action.'
        ),
        type           = 'approval',
        module         = 'capital_sanction',
        reference_id   = cs_id,
        reference_type = 'capital_sanction',
        action_url     = f'/capital-sanctions/{cs_id}',
    ))
    current_app.logger.info(
        "[CapitalSanction #%s] Notification queued for user_id=%s (%s)",
        cs_id, user.id, user.email
    )


def _is_my_turn(members, user_ids):
    """
    Return (True, index) if it is the current user's turn to approve.
    A member's turn is valid only when all preceding members have 'approved'.
    """
    for i, m in enumerate(members):
        gppl_id = (m.get('gppl_id') or '').strip()
        if gppl_id in user_ids:
            all_prev_approved = all(
                members[j].get('status') == 'approved'
                for j in range(i)
            )
            if m.get('status') == 'pending' and all_prev_approved:
                return True, i
    return False, -1


# ── routes ────────────────────────────────────────────────────────────────────

@capital_sanctions_bp.route('', methods=['GET'])
@jwt_required()
def list_capital_sanctions():
    page     = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    query    = CapitalSanction.query.order_by(CapitalSanction.created_at.desc())
    current_user_id = get_jwt_identity()

    if request.args.get('pending_for_me') == 'true':
        user = User.query.get(current_user_id)
        if user:
            ids = _user_identifiers(user)
            if ids:
                filters = [
                    db.cast(CapitalSanction.approval_members, db.String).like(f'%{i}%')
                    for i in ids
                ]
                query = query.filter(sql_or(*filters))
            else:
                query = query.filter(db.false())
        else:
            query = query.filter(db.false())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    if request.args.get('pending_for_me') == 'true':
        user = User.query.get(current_user_id)
        if user:
            user_ids = _user_identifiers(user)
            filtered = [
                cs for cs in paginated.items
                if _is_my_turn(cs.approval_members or [], user_ids)[0]
                   or any((m.get('gppl_id') or '').strip() in user_ids and m.get('status') in ['approved', 'rejected'] for m in (cs.approval_members or []))
            ]
            items = [cs.to_dict() for cs in filtered]
        else:
            items = []
    else:
        items = [cs.to_dict() for cs in paginated.items]

    return jsonify({
        'items': items,
        'total': paginated.total,
        'pages': paginated.pages,
        'page':  page,
    }), 200


@capital_sanctions_bp.route('/<int:cs_id>', methods=['GET'])
@jwt_required()
def get_capital_sanction(cs_id):
    cs = CapitalSanction.query.get_or_404(cs_id)
    return jsonify(cs.to_dict()), 200


@capital_sanctions_bp.route('', methods=['POST'])
@jwt_required()
def create_capital_sanction():
    data = request.get_json()
    if not data.get('subject') or not data.get('item_description'):
        return jsonify({'error': 'Subject and Item Description are required'}), 400

    approval_members = data.get('approval_members', [])
    for m in approval_members:
        m['status'] = 'pending'

    cs = CapitalSanction(
        subject          = data['subject'],
        item_description = data['item_description'],
        specification    = data.get('specification'),
        quantity         = data.get('quantity', 1),
        supplier_id      = data.get('supplier_id') or None,
        department_id    = data.get('department_id') or None,
        justification    = data.get('justification', ''),
        total_amount     = data.get('total_amount', 0),
        officer_id       = data.get('officer_id') or None,
        status           = 'sent_for_approval',
        approval_members = approval_members,
    )
    db.session.add(cs)
    db.session.flush()  # get cs.id before commit

    # SEQUENTIAL: notify only the first member with a valid gppl_id
    for m in approval_members:
        if (m.get('gppl_id') or '').strip():
            _notify_member(m, cs.subject, cs.id)
            break

    db.session.commit()
    return jsonify(cs.to_dict()), 201


@capital_sanctions_bp.route('/<int:cs_id>', methods=['PUT'])
@jwt_required()
def update_capital_sanction(cs_id):
    cs   = CapitalSanction.query.get_or_404(cs_id)
    data = request.get_json()
    cs.subject          = data.get('subject',          cs.subject)
    cs.item_description = data.get('item_description', cs.item_description)
    cs.specification    = data.get('specification',    cs.specification)
    cs.quantity         = data.get('quantity',         cs.quantity)
    cs.supplier_id      = data.get('supplier_id',      cs.supplier_id)
    cs.department_id    = data.get('department_id',    cs.department_id)
    cs.justification    = data.get('justification',    cs.justification)
    cs.total_amount     = data.get('total_amount',     cs.total_amount)
    cs.officer_id       = data.get('officer_id',       cs.officer_id)
    cs.status           = data.get('status',           cs.status)
    cs.approval_members = data.get('approval_members', cs.approval_members)
    db.session.commit()
    return jsonify(cs.to_dict()), 200


@capital_sanctions_bp.route('/<int:cs_id>', methods=['DELETE'])
@jwt_required()
def delete_capital_sanction(cs_id):
    cs = CapitalSanction.query.get_or_404(cs_id)
    db.session.delete(cs)
    db.session.commit()
    return jsonify({'message': 'Capital Sanction deleted'}), 200


@capital_sanctions_bp.route('/<int:cs_id>/approve', methods=['POST'])
@jwt_required()
def approve_capital_sanction(cs_id):
    cs     = CapitalSanction.query.get_or_404(cs_id)
    data   = request.get_json()
    action = data.get('action')

    if action not in ('accept', 'reject'):
        return jsonify({'error': 'Invalid action. Must be accept or reject'}), 400

    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_ids = _user_identifiers(user)
    if not user_ids:
        return jsonify({'error': 'Your user profile has no Employee ID or email'}), 400

    members = list(cs.approval_members or [])
    is_turn, my_index = _is_my_turn(members, user_ids)

    if not is_turn:
        in_list = any((m.get('gppl_id') or '').strip() in user_ids for m in members)
        if not in_list:
            return jsonify({'error': 'You are not assigned as an approval member'}), 403
        return jsonify({'error': 'It is not your turn yet. Wait for previous members to approve.'}), 403

    # Record this member's decision
    members[my_index]['status'] = 'approved' if action == 'accept' else 'rejected'
    members[my_index]['acted_at'] = datetime.now(timezone.utc).isoformat()

    any_rejected = any(m.get('status') == 'rejected' for m in members)
    required     = [m for m in members if (m.get('gppl_id') or '').strip()]
    all_approved = bool(required) and all(m.get('status') == 'approved' for m in required)

    if any_rejected:
        cs.status = 'rejected'
        # Notify all other members of the rejection
        for m in members:
            u, _ = _find_user_for_member(m)
            if u and u.id != current_user_id:
                db.session.add(Notification(
                    user_id        = u.id,
                    title          = 'Capital Sanction Rejected',
                    message        = (
                        f'Capital Sanction "{cs.subject}" has been rejected by '
                        f'{user.full_name}.'
                    ),
                    type           = 'warning',
                    module         = 'capital_sanction',
                    reference_id   = cs.id,
                    reference_type = 'capital_sanction',
                    action_url     = f'/capital-sanctions/{cs.id}',
                ))

    elif all_approved:
        cs.status = 'completed'
        # Notify all members of full approval
        for m in members:
            u, _ = _find_user_for_member(m)
            if u:
                db.session.add(Notification(
                    user_id        = u.id,
                    title          = 'Capital Sanction Fully Approved',
                    message        = (
                        f'Capital Sanction "{cs.subject}" has been approved by all members.'
                    ),
                    type           = 'success',
                    module         = 'capital_sanction',
                    reference_id   = cs.id,
                    reference_type = 'capital_sanction',
                    action_url     = f'/capital-sanctions/{cs.id}',
                ))

    else:
        cs.status = 'sent_for_approval'
        # SEQUENTIAL: notify the next member with a valid gppl_id
        next_index = my_index + 1
        notified   = False
        while next_index < len(members):
            nxt  = members[next_index]
            gppl = (nxt.get('gppl_id') or '').strip()
            if gppl:
                _notify_member(nxt, cs.subject, cs.id)
                notified = True
                break
            else:
                current_app.logger.info(
                    "[CapitalSanction #%s] Slot %d has no gppl_id — skipping in chain",
                    cs.id, next_index
                )
                next_index += 1

        if not notified:
            current_app.logger.warning(
                "[CapitalSanction #%s] No next member to notify after index %d",
                cs.id, my_index
            )

    cs.approval_members = members
    flag_modified(cs, 'approval_members')
    db.session.commit()
    return jsonify(cs.to_dict()), 200
