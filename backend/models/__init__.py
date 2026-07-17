"""Models package — imports all models so Flask-Migrate can discover them."""
from .user import User, Role, Permission, RolePermission, UserSession
from .employee import Employee, Department, Location, Branch
from .asset import Asset, AssetCategory, AssetSubcategory
from .allocation import AssetAllocation, AllocationApproval
from .return_model import AssetReturn, ReturnItem
from .transfer import AssetTransfer
from .history import AssetHistory
from .maintenance import Maintenance, AMCContract
from .complaint import Complaint, ComplaintUpdate
from .vendor import Vendor
from .purchase import PurchaseOrder, PurchaseItem
from .notification import Notification
from .audit_log import AuditLog
from .attachment import Attachment
from .settings import SystemSettings
from .capital_sanction import CapitalSanction
from .approval_member import ApprovalMember

__all__ = [
    'User', 'Role', 'Permission', 'RolePermission', 'UserSession',
    'Employee', 'Department', 'Location', 'Branch',
    'Asset', 'AssetCategory', 'AssetSubcategory',
    'AssetAllocation', 'AllocationApproval',
    'AssetReturn', 'ReturnItem',
    'AssetTransfer',
    'AssetHistory',
    'Maintenance', 'AMCContract',
    'Complaint', 'ComplaintUpdate',
    'Vendor',
    'PurchaseOrder', 'PurchaseItem',
    'Notification',
    'AuditLog',
    'Attachment',
    'SystemSettings',
    'CapitalSanction',
    'ApprovalMember',
]
