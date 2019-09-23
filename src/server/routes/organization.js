const queries = require('../db/queries/organization');
const permissionQueries = require('../db/queries/permissions');
const generalQueries = require('../db/queries/general');

const helpers = require('../_helpers/general');
const validateOrganizationRoutes = require('../validation/organization');
const validateMemberPermissions = require('../validation/permissions');

/*
* {
    "Version": "2012-10-17",
    "Id": "Policy1517408675629",
    "Statement": [
        {
            "Sid": "Stmt1517408674208",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::tormundo/*"
        }
    ]
}
*
*
* */


// TODO: Set up method to change organization owner
// GET: /organizations/
async function getAllOrganizations(ctx) {
    try {
        let getOrganizations = await queries.getAllOrganizations(ctx.i18n);

        if (getOrganizations instanceof Error) throw new Error(getOrganizations.message);

        return helpers.handleResponse(ctx, 200, {organizations: getOrganizations})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

// GET: /organization/:id
async function getSingleOrganization(ctx) {
    try {
        let params = ctx.params;
        let getOrganization = await queries.getSingleOrganizationByName(ctx.i18n, params);

        if (!getOrganization.profile.public) throw new Error(ctx.i18n.__('organizationPrivateOrNotExists'));

        return helpers.handleResponse(ctx, 200, {organization: getOrganization.profile})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// GET: /admin/organization/:id
/* TODO: TEST THIS */

/* TODO: TRANSLATIONS */
async function checkOrganizationAdminAccess(ctx) {
    try {
        let checkAccess = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, null);
        if (checkAccess instanceof Error) throw new Error(checkAccess.message);

        console.log(ctx.state.organization)

        return helpers.handleResponse(ctx, 200, {message: 'success', organization: ctx.state.organization})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// GET: /admin/organization/:organizationName/getMembers
async function fetchOrganizationMembers(ctx) {
    try {
        let checkAccess = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, null);
        if (checkAccess instanceof Error) throw new Error(checkAccess.message);


        let getMembers = await queries.getOrganizationMembers(ctx.params);

        if (getMembers instanceof Error) throw new Error(getMembers.message);


        return helpers.handleResponse(ctx, 200, {message: 'success', members: getMembers.members})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// POST: /organization
async function createOrganization(ctx) {
    try {

        // TODO: Completely redo testing framework as we no longer upload image first.

        let state = ctx.state;
        let info = ctx.request.body;

        let createOrg = await queries.createOrganization(state, info);
        if (createOrg instanceof Error) throw new Error(createOrg.message);

        return helpers.handleResponse(ctx, 200, createOrg)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// POST: /organization/:name/upload/official
async function createOrganizationOfficialDocument(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let createOrganizationFile = await queries.createOrganizationOfficialDocument(state, params, info);
        if (createOrganizationFile instanceof Error) throw new Error(createOrganizationFile.message);

        return helpers.handleResponse(ctx, 200, createOrganizationFile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// POST: /organization/:name/file
async function createOrganizationFile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let createOrganizationFile = await queries.createOrganizationFile(state, params, info);
        if (createOrganizationFile instanceof Error) throw new Error(createOrganizationFile.message);

        return helpers.handleResponse(ctx, 200, createOrganizationFile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// PATCH: /organization/:name/file/:fileId
async function modifyOrganizationFile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let modifyOrganizationFile = await queries.modifyOrganizationFile(state, params, info);
        if (modifyOrganizationFile instanceof Error) throw new Error(modifyOrganizationFile.message);

        return helpers.handleResponse(ctx, 200, modifyOrganizationFile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// GET: /admin/organization/:id/cards
async function getOrganizationCards(ctx) {
    try {
        let params = ctx.params;

        let getOrganizationCards = await generalQueries.multiSelectQuery(null, '*', 'organization_card', {organization_id: params.organizationId})
        if (getOrganizationCards instanceof Error) ctx.throw(400, getOrganizationCards.message)
        return helpers.handleResponse(ctx, 200, getOrganizationCards)
    }
    catch (err) {
        return helpers.handleResponse(ctx, err.status, {message: err.message})
    }

}

// PATCH: /admin/organization/:name/card/:cardId
async function modifyOrganizationCard(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        console.log(info)

        let modifyOrganizationCard = await queries.modifyOrganizationCard(state, params, info);
        if (modifyOrganizationCard instanceof Error) throw new Error(modifyOrganizationCard.message);

        return helpers.handleResponse(ctx, 200, modifyOrganizationCard)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// POST: /organization/create_organization_profile
async function createOrganizationProfile(ctx) {
    try {
        let info = ctx.request.body;
        let state = ctx.state;
        let params = ctx.params;
        let fields = info.fields;

        let getCurrentProfiles = await generalQueries.multiSelectQuery(null, '*', 'organization_profile', {
            organization_id: state.organization.id
        });

        let checkIfLanguageExists = getCurrentProfiles.filter(profile => parseInt(fields.language_id) == profile.language_id);
        if (checkIfLanguageExists.length) throw new Error(ctx.i18n.__('cannotHaveMoreThanOneActiveProfileWithSameLanguage'));


        let insertProfile = await queries.createOrganizationProfile(state, params, info);
        if (insertProfile instanceof Error) throw new Error(insertProfile.message);


        return helpers.handleResponse(ctx, 200, insertProfile)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// PATCH: /organization/:name/profile
async function modifyOrganizationProfile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let modifyOrganization = await queries.modifyOrganizationProfile(state, params, info);
        if (modifyOrganization instanceof Error) throw new Error(modifyOrganization.message);

        return helpers.handleResponse(ctx, 200, modifyOrganization)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// DELETE: /organization/:name/organization-profile/:id
async function deleteOrganizationProfile(ctx) {
    try {
        let params = ctx.params;
        let state = ctx.state;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'delete_profile');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let deleteProfile = await queries.deleteOrganizationProfile(state, params);
        if (deleteProfile instanceof Error) throw new Error(deleteProfile.message);

        return helpers.handleResponse(ctx, 200, deleteProfile)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// POST: /organization/:name/send-member-invitations
async function sendMemberInvitation(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let sendInvitations = await queries.createMemberInvitations(state, params, info);
        if (sendInvitations instanceof Error) throw new Error(sendInvitations.message);

        return helpers.handleResponse(ctx, 200, sendInvitations)
    }

    catch
        (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// PATCH: /organization/member-invitation/:inviteId
async function answerMemberInvitation(ctx) {
    //TODO: Review this
    try {
        let params = ctx.params;
        let data = ctx.request.body;
        let user = ctx.state.user;

        let findOrganization = await permissionQueries.findOrganizationFromName(ctx.i18n, params);
        if (findOrganization instanceof Error) throw new Error(findOrganization.message);

        let findMemberInviteParams = {
            organization_id: findOrganization.organization_id,
            user_id: user.id,
            id: parseInt(params.inviteId)
        };

        let findMemberInvite = await generalQueries.singleSelectQuery(null, '*', 'organization_member_invitation', findMemberInviteParams)
        if (!findMemberInvite) throw new Error(ctx.i18n.__('cannotFindMemberInvitation'));

        if (data.accepted == true) {
            await queries.acceptMemberInvitation(findMemberInviteParams);
        }
        else {
            await queries.rejectMemberInvitation(findMemberInviteParams);
        }

        let answered = data.accepted ? 'accepted' : 'rejected';

        return helpers.handleResponse(ctx, 200, {
            message: ctx.i18n.__('successfullyRespondedToMemberInvitation', answered, params.name)
        })
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// PATCH: /organization/:name/member-permissions/:memberId
async function modifyMemberPermissions(ctx) {
    try {
        // TODO: Review
        let body = ctx.request.body;
        let params = ctx.params;
        let state = ctx.state;

        let updatePermissions = await queries.updateUserPermissions(ctx.i18n, body, params, state);
        if (updatePermissions instanceof Error) throw new Error(updatePermissions.message);

        return helpers.handleResponse(ctx, 200, {
            message: ctx.i18n.__('successfullyUpdatedMemberPermissions'),
            permissions: updatePermissions
        })
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// DELETE: /organization/:name/member/:member
async function deleteOrganizationMember(ctx) {
    try {
        // TODO: Review
        let params = ctx.params;
        let user = ctx.state.user;

        if (user.id == params.member) throw new Error(ctx.i18n.__('unableToModifyOwnAccount'));

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'delete_member');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let deleteParams = {
            organization_id: ctx.state.organization.id,
            id: params.member
        };

        let deleteMember = await queries.deleteOrganizationMember(ctx.i18n, deleteParams, user);
        if (deleteMember instanceof Error) throw new Error(deleteMember.message);

        return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('successfullyDeleteMember')})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// POST: /organization/:name/account
async function createOrganizationAccount(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let createOrganizationAccount = await queries.createOrganizationAccount(state, params, info);
        if (createOrganizationAccount instanceof Error) throw new Error(createOrganizationAccount.message);

        return helpers.handleResponse(ctx, 200, createOrganizationAccount)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// PATCH: /organization/:name/organization-account/:id
async function modifyOrganizationAccount(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let modifyOrganizationAccount = await queries.modifyOrganizationAccount(state, params, info);
        if (modifyOrganizationAccount instanceof Error) throw new Error(modifyOrganizationAccount.message);

        return helpers.handleResponse(ctx, 200, modifyOrganizationAccount)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// DELETE: /organization/:name/organization-account/:id
async function deleteOrganizationAccount(ctx) {
    try {
        let params = ctx.params;
        let state = ctx.state;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'delete_account');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let deleteAccount = await queries.deleteOrganizationAccount(state, params);
        if (deleteAccount instanceof Error) throw new Error(deleteAccount.message);

        return helpers.handleResponse(ctx, 200, {message: deleteAccount})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// POST: /organization/:name/account/:accountId/access/:memberId
async function createOrganizationAccountAccess(ctx) {
    try {
        //TODO: Probably reduce the amount of queries here?
        let params = ctx.params;
        let state = ctx.state;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(state, params, 'create_account_access');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let findAccount = await generalQueries.singleSelectQuery(null, '*', 'organization_account', {
            id: params.accountId,
            organization_id: state.organization.id
        });
        if (findAccount instanceof Error) throw new Error(findAccount.message);
        if (!findAccount) throw new Error(ctx.i18n.__('cannotFindOrganizationAccount'));

        let getCurrentAccountAccess = await generalQueries.singleSelectQuery(null, '*', 'organization_account_access', {
            organization_member: params.memberId,
            organization_id: state.organization.id,
            organization_account: params.accountId
        });
        if (getCurrentAccountAccess instanceof Error) throw new Error(getCurrentAccountAccess.message);
        if (getCurrentAccountAccess) throw new Error(ctx.i18n.__('memberCanAlreadyAccessThisAccount'));

        let checkMemberExists = await generalQueries.singleSelectQuery(null, '*', 'organization_member', {
            id: params.memberId,
            organization_id: state.organization.id
        });
        if (checkMemberExists instanceof Error) throw new Error(checkMemberExists);
        if (!checkMemberExists) throw new Error(ctx.i18n.__('cannotFindMember'));

        let insertNewOrganizationAccountAccess = await generalQueries.insertQuery(null, {
            organization_account: params.accountId,
            organization_id: state.organization.id,
            organization_member: params.memberId,
            created_by: state.user.id
        }, 'organization_account_access', '*');
        if (insertNewOrganizationAccountAccess instanceof Error) throw new Error(insertNewOrganizationAccountAccess.message);

        return helpers.handleResponse(ctx, 200, {
            message: ctx.i18n.__('successfullyCreatedNewOrganizationAccountAccess'),
            account: insertNewOrganizationAccountAccess
        })
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// DELETE: /organization/:name/account/:accountId/access/:memberId
async function deleteOrganizationAccountAccess(ctx) {
    // TODO: Review this, should we check if account exists etc first?
    try {
        let params = ctx.params;
        let state = ctx.state;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'delete_account_access');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);


        let deleteAccountAccess = await queries.deleteOrganizationAccountAccess(state, params);
        if (deleteAccountAccess instanceof Error) throw new Error(deleteAccountAccess.message);

        return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('successfullyDeletedAccountAccess')})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}


module.exports = (router) => {
    router.get('/organizations/', getAllOrganizations);
    router.get('/organization/:name', getSingleOrganization);

    router.get('/admin/organization/:name', helpers.passportJWT, checkOrganizationAdminAccess);
    router.get('/admin/organization/:name/getMembers', helpers.passportJWT, fetchOrganizationMembers);

    router.post('/organization', helpers.passportJWT, validateOrganizationRoutes.createOrganization, createOrganization);

    router.post('/organization/:name/file', helpers.passportJWT, validateOrganizationRoutes.createOrganizationFile, createOrganizationFile);
    router.patch('/organization/:name/file/:fileId', helpers.passportJWT, validateOrganizationRoutes.modifyOrganizationFile, modifyOrganizationFile);

    router.post('/organization/:name/upload/official', helpers.passportJWT, validateOrganizationRoutes.createOrganizationOfficialDocument, createOrganizationOfficialDocument)

    router.get('/admin/organization/:organizationId/cards', helpers.passportJWT, getOrganizationCards)
    router.patch('/admin/organization/:name/card/:cardId', helpers.passportJWT, validateOrganizationRoutes.modifyOrganizationCard, modifyOrganizationCard);

    router.post('/organization/:name/profile/', helpers.passportJWT, validateOrganizationRoutes.createOrganizationProfile, createOrganizationProfile);
    router.patch('/organization/:name/profile/:profileId', helpers.passportJWT, validateOrganizationRoutes.modifyOrganizationProfile, modifyOrganizationProfile);
    router.delete('/organization/:name/profile/:profileId', helpers.passportJWT, deleteOrganizationProfile);

    router.post('/organization/:name/invite', helpers.passportJWT, validateOrganizationRoutes.sendMemberInvitations, sendMemberInvitation);
    router.patch('/organization/:name/invite/:inviteId', helpers.passportJWT, validateOrganizationRoutes.acceptMemberInvitation, answerMemberInvitation);

    router.patch('/organization/:name/member-permissions/:memberId', helpers.passportJWT, validateOrganizationRoutes.modifyMemberPermissions, modifyMemberPermissions);
    router.delete('/organization/:name/member/:member', helpers.passportJWT, deleteOrganizationMember);

    router.post('/organization/:name/account', helpers.passportJWT, validateOrganizationRoutes.createOrganizationAccount, createOrganizationAccount);
    router.patch('/organization/:name/account/:accountId', helpers.passportJWT, validateOrganizationRoutes.modifyOrganizationAccount, modifyOrganizationAccount);
    router.delete('/organization/:name/account/:accountId', helpers.passportJWT, deleteOrganizationAccount);

    router.post('/organization/:name/account/:accountId/access/:memberId', helpers.passportJWT, createOrganizationAccountAccess);
    router.delete('/organization/:name/account/:accountId/access/:memberId', helpers.passportJWT, deleteOrganizationAccountAccess);
}
