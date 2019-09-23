const general = require('../_helpers/general');
const permissionHelpers = require('../_helpers/permissions');

const permissionQueries = require('../db/queries/permissions');
const generalQueries = require('../db/queries/general');

async function setOrganizationState(state, params) {
    try {

        let findOrganization = await permissionQueries.findOrganizationFromName(state.i18n, params);
        if (findOrganization instanceof Error) throw new Error(findOrganization.message);

        state.organization = {
            owner: findOrganization.owner,
            id: findOrganization.organization_id,
            language_id: findOrganization.language_id,
            public: findOrganization.public,
            name: findOrganization.name,
            profiles: findOrganization.profiles,
            cards: findOrganization.cards,
            files: findOrganization.files,
            location: findOrganization.location
        };

        state.organizationFiles = findOrganization.files;

        return true;
    }
    catch (err) {
        return err;
    }
}

async function editMemberPermissions(state, params, method) {
    try {
        let setOrg = await setOrganizationState(state, params);
        if (setOrg instanceof Error) throw new Error(setOrg.message);

        let user = state.user;


        if (state.organization.owner == user.id) {

            let getMember = await generalQueries.singleSelectQuery(null, '*', 'organization_member', {
                id: params.memberId,
                organization_id: state.organization.id
            });

            if (!getMember) throw new Error(state.i18n.__('cannotFindMember'));
            if (getMember instanceof Error) throw new Error(getMember.message);

            let getPermissions = await generalQueries.singleSelectQuery(null, permissionHelpers.returnMemberPermissions, 'organization_member_permissions', {id: getMember.organization_member_permissions_id});
            if (getPermissions instanceof Error) throw new Error(getPermissions.message);

            state.memberPermissions = getPermissions;
            user.permissions = true;

            return true;
        }
        else {
            // let getMembers = await generalQueries.selectWhereInWhereQuery(null, ['user_id', 'organization_member_permissions_id'], 'organization_member', {organization_id: state.organization.id}, 'user_id', [user.id, params.member]);

            let getMembers = await generalQueries.selectWhereOr(
                null,
                ['user_id', 'organization_member_permissions_id', 'id'],
                'organization_member',
                {organization_id: state.organization.id, user_id: user.id},
                {organization_id: state.organization.id, id: params.memberId}
            );


            let memberPermissions = {
                user: null,
                member: null
            };

            let permissions = getMembers.map(res => {
                let p = res.organization_member_permissions_id;
                if (res.user_id == user.id && res.id == params.memberId) throw new Error(state.i18n.__('cannotModifyOwnPermissions'))
                res.user_id == user.id ? memberPermissions.user = p : memberPermissions.member = p;
                return p
            });


            if (memberPermissions.user == null) throw new Error(state.i18n.__('doNotHaveRequiredPermissions'));
            if (memberPermissions.member == null) throw new Error(state.i18n.__('cannotFindMember'));

            let getPermissions = await generalQueries.selectWhereInQuery(null, permissionHelpers.returnMemberPermissions, 'organization_member_permissions', 'id', permissions);

            for (let record of getPermissions) {
                if (record.organization_member_permissions_id == memberPermissions.user) {
                    if (record['edit_member_permissions'] !== true) throw new Error(state.i18n.__('doNotHaveRequiredPermissions'));
                    user.permissions = record;
                }
                else state.memberPermissions = record;
            }

            //TODO: Add error check in case permissions do not exist? (even if it is logically impossible)?
            if (state.memberPermissions.level == null && typeof user.permissions.level == 'number' || user.permissions.level < state.memberPermissions.level)
                return true;
            else
                throw new Error(state.i18n.__('doNotHaveRequiredPermissionLevel'));
        }

    }
    catch (err) {
        return err
    }
}

async function checkUserPermissions(state, params, method) {
    try {
        let setOrg = await setOrganizationState(state, params);
        if (setOrg instanceof Error) throw new Error(setOrg.message);

        let user = state.user;

        if (state.organization.owner == user.id) {
            user.level = 'owner';
            return true;
        }
        else {
            let findPermissions = await permissionQueries.checkMemberPermissions({
                user_id: user.id,
                organization_id: state.organization.id
            });
            if (findPermissions.length > 0 && findPermissions[0][method]) {
                state.user.memberId = findPermissions[0].id;
                user.permissions = findPermissions[0];
                return true;
            }
            else {
                throw new Error(state.i18n.__('doNotHaveRequiredPermissions'))
            }

        }

    }
    catch (err) {
        return err;
    }
}

async function checkOrganizationAccountPermissions(t, state, params) {
    try {
        let setOrg = await setOrganizationState(state, params);
        if (setOrg instanceof Error) throw new Error(setOrg.message);


        let user = state.user;

        let checkAccountExists = await generalQueries.singleSelectQuery(null, '*', 'organization_account', {id: params.orgAccount});

        if (!checkAccountExists) throw new Error(t.__('organizationAccountDoesNotExist'));

        if (setOrg.owner == user.id) {
            return checkAccountExists;
        }
        else {
            let checkAccountAccess = await permissionQueries.checkAccountPermissions(null, accountAccessParams);
            if (checkAccountAccess == null) {
                throw new Error(t.__('doNotHaveAccessToOrganizationAccount'))
            }
            else return checkAccountAccess;
        }

    }
    catch (err) {
        return err;
    }
}

async function checkOrganizationAccountAccess(state, params) {
    try {
        let setOrg = await setOrganizationState(state, params);
        if (setOrg instanceof Error) throw new Error(setOrg.message);

        let checkAccountExists = await generalQueries.singleSelectQuery(null, '*', 'organization_account', {id: params.accountId});
        if (checkAccountExists instanceof Error) throw new Error(checkAccountExists.message);
        if (!checkAccountExists) throw new Error(state.i18n.__('cannotFindOrganizationAccount'));
        else {
            state.account = checkAccountExists;
        }

        if (state.organization.owner == state.user.id) {
            return true;
        }
        else {
            let accountAccessParams = {
                "om.organization_id": state.organization.id,
                "om.user_id": state.user.id,
                "oa.id": params.accountId
            };

            let checkAccountAccess = await permissionQueries.checkAccountPermissions(null, accountAccessParams);
            if (checkAccountAccess instanceof Error) throw new Error(checkAccountAccess.message);
            if (checkAccountAccess == null) throw new Error(state.i18n.__('doNotHaveAccessToOrganizationAccount'))
            else return true;

        }

    }
    catch (err) {
        return err;
    }
}

async function checkProjectAccess(state, params) {
    try {
        let setOrg = await setOrganizationState(state, params);
        if (setOrg instanceof Error) throw new Error(setOrg.message);

        let getProject = await permissionQueries.getProjectAndDocuments({
            'p.organization_id': state.organization.id,
            'p.id': params.projectId
        });

        if (!getProject) throw new Error(state.i18n.__('projectDoesNotExist'));
        else {
            state.project = getProject.project;
            state.projectFiles = getProject.files;
        }

        if (state.organization.owner == state.user.id) {
            return true
        }
        else {

            let projectAccessParams = {
                "pa.project_id": state.project.project_id,
                "om.user_id": state.user.id,
                "om.organization_id": state.organization.id
            };

            let checkProfileAccess = await permissionQueries.checkProjectAccess(null, projectAccessParams);
            if (!checkProfileAccess) throw new Error(state.i18n.__('doNotHaveRequiredPermissions'));

            else return true;
        }
    }
    catch (err) {
        return err;
    }
}

module.exports = {
    checkUserPermissions,
    setOrganizationState,
    checkOrganizationAccountPermissions,
    editMemberPermissions,
    checkOrganizationAccountAccess,
    checkProjectAccess
}