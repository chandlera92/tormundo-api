const returnMemberPermissions = [
    'id as organization_member_permissions_id',
    'level',
    'invite_members',
    'create_profile',
    'edit_profile',
    'edit_settings',
    'edit_member_permissions',
    'delete_member',
    'delete_profile',
    'create_account',
    'edit_account',
    'delete_account',
    'create_account_access',
    'delete_account_access',
    'create_project_access',
    'delete_project_access',
    'create_project',
    'created_at',
    'created_by'
];

module.exports = {
    returnMemberPermissions: returnMemberPermissions
}