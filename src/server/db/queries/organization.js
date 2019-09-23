const knex = require('../connection');
const general = require('./general');
const moment = require('moment');
const uploadHelpers = require('../../_helpers/uploads');

const awsUrl = 'https://tormundo.s3.eu-west-3.amazonaws.com/';

function createOrganization(state, info) {
    return knex.transaction(async (trx) => {
        // TODO: Update testing for organization card insertion.
        let insertOrganizationFile;
        let fields = info;
        // let fields = info.fields;
        //  let file = info.files.cover_image;

        let checkOrgName = await general.singleSelectQuery(trx, 'name', 'organization', {name: fields.name});

        if (checkOrgName instanceof Error) throw new Error(checkOrgName);
        if (checkOrgName) throw new Error(state.i18n.__('organizationAlreadyExists', fields.name));

        let orgInfo = {
            owner: state.user.id,
            created_by: state.user.id,
            name: fields.name,
            language_id: info.language_id,
            country_id: fields.country_id
        };

        let insertOrg = await general.insertSingleQuery(trx, orgInfo, 'organization', '*');
        if (insertOrg instanceof Error) throw new Error(insertOrg);

        /*    if (file) {
                let dest = 'organization/' + fields.name;

                let upload = await uploadHelpers.uploadFile(file, dest, null);
                if (upload instanceof Error) throw new Error(upload.message);

                insertOrganizationFile = await general.insertSingleQuery(trx, {
                    name: 'Organization cover image',
                    type: file.type,
                    description: 'Organization cover image.',
                    loc: upload.Location,
                    key: upload.key,
                    organization_id: insertOrg.id,
                    created_by: state.user.id
                }, 'organization_file', '*');
                if (insertOrganizationFile instanceof Error) throw new Error(insertOrganizationFile.message)
            }*/

        /*      let profileInfo = {
                  description: fields.description,
                  language_id: fields.language_id,
                  cover_image: insertOrganizationFile ? insertOrganizationFile.id : null,
                  created_by: state.user.id,
                  organization_id: insertOrg.id
              };*/

        let profileInfo = {
            description: fields.description,
            language_id: fields.language_id,
            cover_image: null,
            created_by: state.user.id,
            organization_id: insertOrg.id
        };

        // TODO: Test if error throws okay without .message on insertProfile.
        let insertProfile = await general.insertSingleQuery(trx, profileInfo, 'organization_profile', '*');
        if (insertProfile instanceof Error) throw new Error(insertProfile);

        let insertCard = await general.insertSingleQuery(trx, profileInfo, 'organization_card', '*');
        if (insertCard instanceof Error) throw new Error(insertCard.message);

        let insertDefaultAccount = await general.insertSingleQuery(trx, {
            name: 'contact@' + fields.name,
            description: 'general account',
            created_by: state.user.id,
            organization_id: insertOrg.id
        }, 'organization_account', '*');
        if (insertDefaultAccount instanceof Error) throw new Error(insertDefaultAccount.message);

        let result = {
            message: state.i18n.__('successfullyCreatedOrganization', fields.name),
            organization: insertOrg,
            profile: insertProfile,
            cover_image: insertOrganizationFile,
            account: insertDefaultAccount
        };

        return result
    })
        .then(res => res)
        .catch(err => err);
}

function createOrganizationOfficialDocument(state, params, info) {
    return knex.transaction(async (trx) => {
        let fields = info.fields;
        let files = info.files;

        let result = {message: state.i18n.__('successfullyUploadedOrganizationFile')};

        let dest = 'organization/official/' + params.name;
        const getFile = files.file;

        let upload = await uploadHelpers.uploadPrivateFile(getFile, dest, state.projectFiles);


        if (upload instanceof Error) throw new Error(upload.message);

        let insertOrganizationFile = await general.insertSingleQuery(trx, {
            name: fields.name,
            type: getFile.type,
            description: fields.description,
            loc: upload.Location,
            key: upload.key,
            organization_id: state.organization.id,
            created_by: state.user.id,
            created_at: 'now()'
        }, 'organization_official_document', '*');

        if (insertOrganizationFile instanceof Error) throw new Error(insertOrganizationFile.message);

        result.organizationFile = insertOrganizationFile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function createOrganizationFile(state, params, info) {
    return knex.transaction(async (trx) => {
        let fields = info.fields;
        let files = info.files;

        let result = {message: state.i18n.__('successfullyUploadedOrganizationFile')};

        let dest = 'organization/' + params.name;
        const getFile = files.file;

        let upload = await uploadHelpers.uploadFile(getFile, dest, state.projectFiles);
        if (upload instanceof Error) throw new Error(upload.message);

        let insertOrganizationFile = await general.insertSingleQuery(trx, {
            name: fields.name,
            type: getFile.type,
            description: fields.description,
            loc: upload.Location,
            key: upload.key,
            organization_id: state.organization.id,
            created_by: state.user.id,
            created_at: 'now()'
        }, 'organization_file', '*');

        if (insertOrganizationFile instanceof Error) throw new Error(insertOrganizationFile.message);

        result.organizationFile = insertOrganizationFile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyOrganizationFile(state, params, info) {
    return knex.transaction(async (trx) => {
        let fields = info.fields;
        let files = info.files;

        let orgFiles = await general.multiSelectQuery(trx, '*', 'organization_file', {organization_id: state.organization.id});

        let getCurrentFile = orgFiles.filter(file => file.id == params.fileId)[0];
        if (!getCurrentFile) throw new Error(state.i18n.__('cannotFindProjectFile'));

        let insertFileHistoryInfo = {
            organization_file_id: getCurrentFile.id,
            name: getCurrentFile.name,
            description: getCurrentFile.description,
            type: getCurrentFile.type,
            key: getCurrentFile.key,
            loc: getCurrentFile.loc,
            created_at: 'now()',
            created_by: state.user.id
        };

        let updateInfo = Object.assign({}, fields);

        let result = {message: state.i18n.__('successfullyModifiedOrganizationFile')};

        const getNewFile = files.file;

        if (getNewFile) {
            let dest = 'organization/' + params.name;
            let modifyFileUpload = await uploadHelpers.modifyFile(getNewFile, getCurrentFile, dest, state.projectFiles);
            if (modifyFileUpload instanceof Error) throw new Error(modifyFileUpload.message);
            updateInfo.key = modifyFileUpload.uploaded.key;
            updateInfo.loc = modifyFileUpload.uploaded.Location;
            updateInfo.type = getNewFile.type;
            insertFileHistoryInfo.key = modifyFileUpload.moved.key;
            insertFileHistoryInfo.loc = awsUrl + modifyFileUpload.moved.key;
        }

        let returnKeys = Object.keys(updateInfo);

        updateInfo.modified_at = 'now()';
        updateInfo.modified_by = state.user.id;

        let insertFileHistory = await general.insertSingleQuery(trx, insertFileHistoryInfo, 'organization_file_history', returnKeys);
        if (insertFileHistory instanceof Error) throw new Error(insertFileHistory.message);

        let updateFile = await general.updateSingleQuery(trx, updateInfo, 'organization_file', {id: getCurrentFile.id}, ['modified_at', 'modified_by', ...returnKeys]);
        if (updateFile instanceof Error) throw new Error(updateFile.info);

        result.updated = updateFile;
        result.from = insertFileHistory;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyOrganizationCard(state, params, info) {
    return knex.transaction(async (trx) => {
        let returnKeys = Object.keys(info);
        let result = {message: 'Updated card'};

        let getCurrentCard = await general.singleSelectQuery(trx, '*', 'organization_card', {
            id: params.cardId,
            organization_id: state.organization.id
        });

        if (getCurrentCard.language_id == state.organization.language_id) {
            if (info.public == false && state.organization.public == true) throw new Error(state.i18n.__('cannotSetMainProfileToNotPublicIfOrganizationIsLive'));
        }

        let updateProfile = await general.updateSingleQuery(trx, info, 'organization_card', {
            id: getCurrentCard.id
        }, '*');

        result.updated = updateProfile;


        return result;

    })
        .then(res => res)
        .catch(err => err);
}

function createOrganizationProfile(state, params, info) {
    return knex.transaction(async (trx) => {

        let result = {message: state.i18n.__('successfullyCreatedProfile')},
            insertOrganizationFile;

        let files = info.files;
        let fields = info.fields;
        let insertNewProfileData = fields;
        let coverImage = files.cover_image;

        if (coverImage) {
            let dest = 'organization/' + params.name;

            let upload = await uploadHelpers.uploadFile(coverImage, dest, null);
            if (upload instanceof Error) throw new Error(upload.message);

            insertOrganizationFile = await general.insertSingleQuery(trx, {
                name: 'Project cover image',
                type: coverImage.type,
                description: 'Project cover image.',
                loc: upload.Location,
                key: upload.key,
                organization_id: state.organization.id,
                created_by: state.user.id
            }, 'organization_file', '*');

            if (insertOrganizationFile instanceof Error) throw new Error(insertOrganizationFile.message);

            insertNewProfileData.cover_image = insertOrganizationFile.id;
            result.cover_image = insertOrganizationFile;
        }

        insertNewProfileData.organization_id = state.organization.id;
        insertNewProfileData.created_by = state.user.id;

        let insertNewProfile = await general.insertSingleQuery(trx, insertNewProfileData, 'organization_profile', '*');
        if (insertNewProfile instanceof Error) throw new Error(insertNewProfile.message);

        result.profile = insertNewProfile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyOrganizationProfile(state, params, info) {
    return knex.transaction(async (trx) => {
        let returnKeys = Object.keys(info);
        let result = {message: state.i18n.__('successfullyUpdatedProfile')};

        let currentProfiles = await general.multiSelectQuery(null, '*', 'organization_profile', {
            organization_id: state.organization.id
        });

        let getCurrentProfile = currentProfiles.filter(profile => profile.id == params.profileId)[0];

        if (!getCurrentProfile) throw new Error(state.i18n.__('cannotFindProfile'));

        if (info.language_id) {
            let checkIfLanguageExists = currentProfiles.filter(profile => info.language_id == profile.language_id && parseInt(params.profileId) !== profile.id);
            if (checkIfLanguageExists.length) throw new Error(state.i18n.__('cannotHaveMoreThanOneActiveProfileWithSameLanguage'));
        }

        if (getCurrentProfile.language_id == state.organization.language_id) {
            if (info.public == false && state.organization.public == true) throw new Error(state.i18n.__('cannotSetMainProfileToNotPublicIfOrganizationIsLive'));
            if (info.language_id && info.language_id !== state.organization.language_id) throw new Error(state.i18n.__('cannotChangeLanguageOfMainProfile'));
        }

        getCurrentProfile.profile_id = getCurrentProfile.id;

        ['modified_by', 'modified_at', 'id'].forEach(item => delete getCurrentProfile[item]);

        let insertHistory = await general.insertSingleQuery(trx, getCurrentProfile, 'organization_profile_history', returnKeys);
        if (insertHistory instanceof Error) throw new Error(insertHistory);


        info.modified_by = state.user.id;
        info.modified_at = 'now()';

        let updateProfile = await general.updateSingleQuery(trx, info, 'organization_profile', {id: params.profileId}, returnKeys);
        if (updateProfile instanceof Error) throw new Error(updateProfile);

        result.updated = updateProfile;
        result.from = insertHistory;

        return result
    })

        .then(res => res)
        .catch(err => err)
}

function deleteOrganizationProfile(state, params) {
    return knex.transaction(async (trx) => {
        let result = {message: state.i18n.__('successfullyDeleteOrganizationProfile')}

        let getProfile = await general.singleSelectQuery(trx, '*', 'organization_profile', {
            id: params.profileId,
            organization_id: state.organization.id
        });
        if (getProfile instanceof Error) throw new Error(getProfile.message);
        if (!getProfile) throw new Error(state.i18n.__('cannotFindProfile'));

        if (getProfile.language_id == state.organization.language_id) throw new Error(state.i18n.__('cannotDeleteMainProfile'));

        let removalInfo = {
            profile_id: getProfile.id,
            organization_id: getProfile.organization_id,
            language_id: getProfile.language_id,
            created_by: getProfile.created_by,
            created_at: getProfile.created_at,
            description: getProfile.description,
            public: getProfile.public,
            cover_image: getProfile.cover_image,
            removed_by: state.user.id,
            removed_at: 'now()'
        };

        let insertProfileRemoved = await general.insertQuery(trx, removalInfo, 'organization_profile_removed', '*');
        if (insertProfileRemoved instanceof Error) throw new Error(insertProfileRemoved.message);


        let removeProfile = await general.deleteQuery(trx, {id: params.profileId}, 'organization_profile', '*');
        if (removeProfile instanceof Error) throw new Error(removeProfile.message);

        result.removed = removeProfile[0];

        return result;
    })
        .then(res => res)
        .catch(err => err)
}

function createMemberInvitations(state, params, info) {
    return knex.transaction(async (trx) => {
        let sendMembershipInvitations;
        let inviteMembers = [], membersFound = [], alreadyInvitedMembers = [], alreadyMembers = [];
        let membersNotFound = info.user_names;

        // TODO: Should not allow duplicates in user_names array?
        let getUsers = await general.selectWhereInQuery(trx, '*', 'users', 'user_name', info.user_names);

        for (let user of getUsers) {
            if (user.id == state.organization.owner) {
                alreadyMembers.push(user.user_name)
            }
            else {
                inviteMembers.push({user_id: user.id, organization_id: state.organization.id, sent_by: state.user.id});
                membersFound.push({user_name: user.user_name, id: user.id, sent_by: state.user.id});
            }
            membersNotFound = membersNotFound.filter(e => e !== user.user_name)
        }

        let membersId = membersFound.map(r => r.id);

        let checkInvitesUnique = await general.selectWhereInWhereQuery(trx, '*', 'organization_member_invitation', {organization_id: state.organization.id}, 'user_id', membersId);

        if (checkInvitesUnique) {
            for (let invite of checkInvitesUnique) {
                inviteMembers = inviteMembers.filter(r => {
                    if (r.user_id == invite.user_id) {
                        let findInvitedMemberUserName = membersFound.find(val => val.id == r.user_id);
                        alreadyInvitedMembers.push(findInvitedMemberUserName.user_name)
                    }
                    else {
                        return r;
                    }
                })
            }
        }

        let checkIfMemberExists = await general.selectWhereInWhereQuery(trx, '*', 'organization_member', {organization_id: state.organization.id}, 'user_id', membersId);

        if (checkIfMemberExists) {
            for (let member of checkIfMemberExists) {
                inviteMembers = inviteMembers.filter(r => {
                    if (r.user_id == member.user_id) {
                        let findMemberUserName = membersFound.find(val => val.id == r.user_id);
                        alreadyMembers.push(findMemberUserName.user_name)
                    }
                    else {
                        return r;
                    }
                })
            }
        }

        if (inviteMembers.length > 0) {
            sendMembershipInvitations = await general.insertQuery(trx, inviteMembers, 'organization_member_invitation', '*');
        }
        else {
            sendMembershipInvitations = 'No invitations sent';
        }

        // TODO: Change message depending on result? i.e, if no invitations are sent, should not show that they have.

        let results = {
            usersNotFound: membersNotFound,
            membersAlreadyInvited: alreadyInvitedMembers,
            membersAlreadyExist: alreadyMembers,
            sentInvitations: sendMembershipInvitations,
            message: state.i18n.__('successfullySentMemberInvitations')
        };

        return results;


    })
        .then(res => res)
        .catch(err => err);
}

function acceptMemberInvitation(params) {
    return knex.transaction(async (trx) => {

        // remove invitation / insert into history

        let removeInvitation = await general.deleteQuery(trx, params, 'organization_member_invitation', '*');

        removeInvitation[0]['accepted'] = true;
        delete removeInvitation[0].id;

        let insertInvitationHistory = await general.insertQuery(trx, removeInvitation[0], 'organization_member_invitation_history', '*')

        params['created_by'] = insertInvitationHistory[0].sent_by;
        delete params.id;

        // create new member here

        let createMemberPermissions = await general.insertQuery(trx, {created_by: params.created_by}, 'organization_member_permissions', '*');

        params['organization_member_permissions_id'] = createMemberPermissions[0].id;

        let createMember = await general.insertQuery(trx, params, 'organization_member', '*');

        return {member: createMember[0], permissions: createMemberPermissions[0]};
    })
        .then(res => res)
        .catch(err => err);
}

function rejectMemberInvitation(params) {
    return knex.transaction(async (trx) => {
        let removeInvitation = await general.deleteQuery(trx, params, 'organization_member_invitation', '*');

        removeInvitation[0]['accepted'] = false;
        delete removeInvitation[0].id;

        let insertInvitationHistory = await general.insertQuery(trx, removeInvitation[0], 'organization_member_invitation_history', '*')

        let result = {removed: removeInvitation, history: insertInvitationHistory};

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function updateUserPermissions(t, info, params, state) {
    return knex.transaction(async (trx) => {
        let org = state.organization;

        /*    let findUserMember = await trx
                .select('*')
                .from('organization_member')
                .where({id: params.member, organization_id: org.id})
                .first()
                .then(res => res)
                .catch(err => err);

            if (!findUserMember) throw new Error(t.__('cannotFindMember'));
            if (findUserMember instanceof Error) throw new Error(findUserMember.message);

            let permissionsBeforeUpdate = await trx
                .select('id as organization_member_permissions_id',
                    'invite_members',
                    'edit_profile',
                    'edit_settings',
                    'edit_permissions',
                    'create_profile',
                    'delete_member',
                    'delete_profile',
                    'create_account',
                    'edit_account',
                    'delete_account',
                    'create_account_access',
                    'delete_account_access',
                    'created_at', 'created_by')
                .from('organization_member_permissions')
                .where({id: findUserMember.organization_member_permissions_id})
                .returning('*')
                .then(res => res[0])
                .catch(err => err);

            if (permissionsBeforeUpdate instanceof Error) throw new Error(permissionsBeforeUpdate.message);
    */
        info['created_by'] = state.user.id;
        info['created_at'] = 'now()';

        let updatePermissions = await general.patchQuery(trx, info, {id: state.memberPermissions.organization_member_permissions_id}, 'organization_member_permissions', '*');
        if (updatePermissions instanceof Error) throw new Error(updatePermissions.message);

        let updatePermissionsHistory = await general.insertQuery(trx, state.memberPermissions, 'organization_member_permissions_history', '*');
        if (updatePermissionsHistory instanceof Error) throw new Error(updatePermissionsHistory.message);


        let result = {updated: updatePermissions[0], from: updatePermissionsHistory[0]};

        return result;
    })
        .then(res => res)
        .catch(err => err)


}

function deleteOrganizationMember(t, params, user) {
    return knex.transaction(async (trx) => {

        let deleteMember = await general.deleteQuery(trx, params, 'organization_member', '*');

        if (deleteMember.length == 0) throw new Error(t.__('cannotFindMember'));

        let deleteMemberPermissions = await general.deleteQuery(trx, {id: deleteMember[0].organization_member_permissions_id}, 'organization_member_permissions', '*')

        deleteMember[0].organization_member_permissions_id = deleteMember[0].id;
        deleteMember[0].removed_by = user.id;
        delete deleteMember[0].id;

        deleteMemberPermissions[0].created_by = user.id;
        deleteMemberPermissions[0].organization_member_permissions_id = deleteMemberPermissions[0].id;
        delete deleteMemberPermissions[0].id;

        let insertMemberHistory = await general.insertQuery(trx, deleteMember[0], 'organization_member_history', '*');
        let insertMemberPermissionsHistory = await general.insertQuery(trx, deleteMemberPermissions[0], 'organization_member_permissions_history', '*');

        return true;

    })
        .then(res => res)
        .catch(err => err)

    // return general.deleteQuery(null, params, 'organization_member', '*')
}

function createOrganizationAccount(state, params, info) {
    return knex.transaction(async (trx) => {

        let result = {message: state.i18n.__('successfullyCreatedNewOrganizationAccount')},
            insertOrganizationFile, insertAccountAccess;

        let files = info.files;
        let fields = info.fields;

        let insertAccountInfo = {
            created_by: state.user.id,
            organization_id: state.organization.id,
            name: fields.name + '@' + params.name,
            description: fields.description,
            profile_picture: fields.profile_picture ? fields.profile_picture : null
        };

        let getCurrentAccount = await general.singleSelectQuery(null, '*', 'organization_account', {
            name: insertAccountInfo.name,
            organization_id: state.organization.id
        });

        if (getCurrentAccount instanceof Error) throw new Error(getCurrentAccount.message);
        if (getCurrentAccount) throw new Error(state.i18n.__('organizationAccountAlreadyExists'));

        let image = files.profile_picture;

        if (image) {
            let dest = 'organization/' + params.name;

            let upload = await uploadHelpers.uploadFile(image, dest, null);
            if (upload instanceof Error) throw new Error(upload.message);

            insertOrganizationFile = await general.insertSingleQuery(trx, {
                name: 'Organization account "' + insertAccountInfo.name + '" profile picture.',
                type: image.type,
                description: 'Organization account "' + insertAccountInfo.name + '" profile picture.',
                loc: upload.Location,
                key: upload.key,
                organization_id: state.organization.id,
                created_by: state.user.id
            }, 'organization_file', '*');

            if (insertOrganizationFile instanceof Error) throw new Error(insertOrganizationFile.message);

            insertAccountInfo.profile_picture = insertOrganizationFile.id;
            result.profile_picture = insertOrganizationFile;
        }

        let insertNewAccount = await general.insertSingleQuery(trx, insertAccountInfo, 'organization_account', '*');
        if (insertNewAccount instanceof Error) throw new Error(insertNewAccount.message);

        result.account = insertNewAccount;


        if (state.organization.owner !== state.user.id) {
            insertAccountAccess = await general.insertSingleQuery(trx, {
                organization_id: state.organization.id,
                organization_member: state.user.memberId,
                organization_account: insertNewAccount.id,
                created_by: state.user.id
            }, 'organization_account_access', '*');
            result.accountAccess = insertAccountAccess;
            if (insertAccountAccess instanceof Error) throw new Error(insertAccountAccess.message);
        }

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyOrganizationAccount(state, params, info) {
    return knex.transaction(async (trx) => {
        let result = {
            message: state.i18n.__('successfullyModifiedOrganizationAccount')
        };

        let returnKeys = Object.keys(info);

        let updateAccountInfo = Object.assign({
            modified_by: state.user.id,
            modified_at: 'now()'
        }, info);

        if (info.name && state.account.name !== info.name) {
            if (state.account.name == 'contact@' + params.name) throw new Error(state.i18n.__('cannotChangeGeneralContactAccountName'));
            updateAccountInfo.name = info.name + '@' + params.name;
            let checkNewName = await general.singleSelectQuery(null, '*', 'organization_account', {
                name: updateAccountInfo.name,
                organization_id: state.organization.id
            });
            if (checkNewName instanceof Error) throw new Error(checkNewName.message);
            if (checkNewName) throw new Error(state.i18n.__('organizationAccountAlreadyExists'));
        }

        let accountHistory = {
            organization_account_id: state.account.id,
            organization_id: state.organization.id,
            name: state.account.name,
            description: state.account.description,
            profile_picture: state.account.profile_picture,
            created_by: state.user.id
        };

        let insertAccountHistory = await general.insertSingleQuery(trx, accountHistory, 'organization_account_history', returnKeys);
        if (insertAccountHistory instanceof Error) throw new Error(insertAccountHistory.message);

        info.modified_by = state.user.id;
        info.modified_at = 'now()';

        let updateAccount = await general.updateSingleQuery(trx, updateAccountInfo, 'organization_account', {id: state.account.id}, returnKeys);
        if (updateAccount instanceof Error) throw new Error(updateAccount.message);

        result.updated = updateAccount;
        result.from = insertAccountHistory;

        return result
    })
        .then(res => res)
        .catch(err => err)
}

function deleteOrganizationAccount(state, params) {
    return knex.transaction(async (trx) => {

        let getCurrentAccount = await general.singleSelectQuery(null, '*', 'organization_account', {
            id: params.accountId,
            organization_id: state.organization.id
        });

        if (getCurrentAccount instanceof Error) throw new Error(getCurrentAccount.message);
        if (!getCurrentAccount) throw new Error(state.i18n.__('cannotFindOrganizationAccount'));

        if (getCurrentAccount.name == 'contact@' + params.name) throw new Error(state.i18n.__('cannotDeleteGeneralContactAccount'));

        let deleteAllOrganizationAccountAccess = await general.deleteQuery(trx, {
            organization_id: state.organization.id,
            organization_account: params.accountId
        }, 'organization_account_access', ['id as organization_account_access_id', 'organization_member', 'organization_account', 'organization_id', 'created_by', 'created_at']);

        if (deleteAllOrganizationAccountAccess instanceof Error) throw new Error(deleteAllOrganizationAccountAccess.message);

        let insertAccountAccessHistory = false;

        if (deleteAllOrganizationAccountAccess.length > 0) {
            for (let account of deleteAllOrganizationAccountAccess) {
                account['removed_by'] = state.user.id;
            }
            insertAccountAccessHistory = await general.insertQuery(trx, deleteAllOrganizationAccountAccess, 'organization_account_access_history', '*')
            if (insertAccountAccessHistory instanceof Error) throw new Error(insertAccountAccessHistory.message);
        }


        let deleteAccount = await general.deleteQuery(trx, {id: params.accountId}, 'organization_account', '*');

        if (deleteAccount.length == 0) throw new Error(state.i18n.__('cannotFindOrganizationAccount'));
        if (deleteAccount instanceof Error) throw new Error(deleteAccount.message);

        deleteAccount[0].organization_account_id = deleteAccount[0].id;
        deleteAccount[0].removed_by = state.user.id;
        delete deleteAccount[0].id;

        let insertAccountRemoved = await general.insertQuery(trx, deleteAccount[0], 'organization_account_removed', '*');
        if (insertAccountRemoved instanceof Error) throw new Error(insertAccountRemoved.message);

        let result = insertAccountAccessHistory ? state.i18n.__('deletedAccountAndAccountAccess', insertAccountAccessHistory.length) : state.i18n.__('successfullyDeletedOrganizationAccount');

        return result;
    })
        .then(res => res)
        .catch(err => err)
}

function deleteOrganizationAccountAccess(state, params) {
    return knex.transaction(async (trx) => {

        let deleteAccountAccess = await general.deleteQuery(trx, {
            organization_member: params.memberId,
            organization_id: state.organization.id,
            organization_account: params.accountId
        }, 'organization_account_access', '*');

        if (deleteAccountAccess.length == 0) throw new Error(state.i18n.__('cannotFindAccountAccessItem'));
        if (deleteAccountAccess instanceof Error) throw new Error(deleteAccountAccess.message);

        deleteAccountAccess[0].removed_by = state.user.id;
        delete deleteAccountAccess[0].id;

        let insertAccountAccessHistory = await general.insertQuery(trx, deleteAccountAccess[0], 'organization_account_access_history', '*');
        if (insertAccountAccessHistory instanceof Error) throw new Error(insertAccountAccessHistory.message)

        return true;
    })
        .catch(err => err)
        .then(res => res)
}

function getSingleOrganizationByName(t, params) {
    return knex
        .select('o.id', 'os.name', 'op.details', 'os.public')
        .from('organization as o')
        .innerJoin('organization_profile as op', 'o.id', 'op.organization_id')
        .innerJoin('organization_settings as os', 'o.id', 'os.organization_id')
        .where(knex.raw('LOWER(os.name) = LOWER(\'' + params.name + '\')'))
        .first()
        .then(res => {
            if (res) return {profile: res, found: true};
            else return {profile: t.__('noResultsFound', 'Organization'), found: false};
        })
        .catch(err => err)
}

// TODO: TEST THIS.
function getAllOrganizations(t) {
    return knex
    // 'o.id', 'os.name', 'os.public',
    // .select(knex.raw("array_to_string(array_agg(op.details, ',')) as details_list"))
        .select(knex.raw("organization.*, geo_location.lng, geo_location.lat, json_agg(organization_profile) as organization_profiles"))
        .from('organization')
        .innerJoin('geo_location', 'organization.geo_location_id', 'geo_location.id')
        .leftJoin('organization_profile', 'organization.id', 'organization_profile.organization_id')
        .groupBy('organization.id', 'geo_location.id')
        .returning('*')
        .then(res => {
            if (res.length == 0) return t.__('noResultsFound', 'Organizations');
            else return res;
        })
        .catch(err => err)
}

function getOrganizationMembers(params) {
    // knex.raw("json_agg(json_build_object('user_name', u.user_name)) as members")
    return knex
        .select(knex.raw("json_agg(json_build_object('id', om.id,'user_name', u.user_name, 'created_by', cb.user_name, 'created_at', om.created_at, 'permissions', omp)) as members"))
        .from('organization as o')
        .leftJoin('organization_member as om', 'om.organization_id', 'o.id')
        .innerJoin('organization_member_permissions as omp', 'om.organization_member_permissions_id', 'omp.id')
        .innerJoin('users as u', 'om.user_id', 'u.id')
        .innerJoin('users as cb', 'cb.id', 'om.created_by')
        .where('o.name', params.name)
        .then(res => res[0])
        .catch(err => err)
}

// select json_agg(json_build_object('user_name', u.user_name, 'created_by', cb.user_name, 'created_at', om.created_at, 'permissions', omp))


module.exports = {
    getSingleOrganizationByName,
    getAllOrganizations,
    createOrganization,
    createOrganizationOfficialDocument,
    createOrganizationFile,
    modifyOrganizationFile,
    modifyOrganizationCard,
    createOrganizationProfile,
    modifyOrganizationProfile,
    deleteOrganizationProfile,
    createMemberInvitations,
    acceptMemberInvitation,
    rejectMemberInvitation,
    updateUserPermissions,
    deleteOrganizationMember,
    createOrganizationAccount,
    modifyOrganizationAccount,
    deleteOrganizationAccount,
    deleteOrganizationAccountAccess,
    getOrganizationMembers
}