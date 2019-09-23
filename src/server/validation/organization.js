const validation = require('../_helpers/validation');
const general = require('../_helpers/general');
const uploadHelpers = require('../_helpers/uploads');
const validateMemberPermissions = require('./permissions');
const generalQueries = require('../db/queries/general');
const uploadValidation = require('../_helpers/uploads');


// TODO: Implement generic regex methods to check all kinds of strings site-wide (for security ETC!!! just do it tomorrow you lazy sob)
var alphanumeric = new RegExp('^[a-zA-Z0-9 ]*$');
var numeric = new RegExp('^[0-9]*$');

async function createOrganization(ctx, next) {
    try {
        if (!ctx.request.body) throw new Error(ctx.i18n.__('formEmpty'));

        let fields = ctx.request.body;
        //   let files = ctx.request.body.files;
        let fieldKeys = Object.keys(fields);
        //    let fileKeys = Object.keys(files);

        let expectedKeys = ['name', 'description', 'language_id', 'country_id'];

        let checkFields = await validation.compareIncomingDataKeys(fieldKeys, expectedKeys);
        if (!checkFields || fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        // TODO: Add check for country_id here

        for (let key of fieldKeys) {
            let val = fields[key];
            if (key == 'name') {
                if (val.trim().length == 0) throw new Error(ctx.i18n.__('expectedValueToNotBeEmpty', 'name'));
                if (!alphanumeric.test(val)) throw new Error(ctx.i18n.__('expectedValueToContainOnlyLettersSpacesNumbers', 'name'));
            }
            if (key == 'language_id') {
                if (isNaN(val) || val == null) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (parseInt(val) < 1 || parseInt(val) > 4) throw new Error(ctx.i18n.__('languageNotFound'));
            }
        }

        /*
                if (fileKeys.length) {
                    if (fileKeys.length == 1 && fileKeys[0] == 'cover_image') {
                        let uploadLimits = {
                            filesPermitted: 1,
                            size: uploadValidation.calcMB(5),
                            type: 'image'
                        };
                        await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits)
                    }
                    else {
                        throw new Error(ctx.i18n.__('unexpectedParameters'));
                    }
                }
        */


        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function createOrganizationOfficialDocument(ctx, next) {
    try {
        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;

        if (!files && !fields) throw new Error(ctx.i18n.__('formEmpty'));

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, 'create_official');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        const expectedKeys = ['name', 'description'];

        let checkFields = await validation.compareIncomingDataKeys(fieldKeys, expectedKeys);
        if (!checkFields || fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        if (fileKeys.length == 1 && fileKeys[0] == 'file') {
            let uploadLimits = {
                filesPermitted: 1,
                size: uploadValidation.calcMB(5),
                type: '*'
            };
            await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits)
        }
        else {
            throw new Error(ctx.i18n.__('unexpectedParameters'));
        }


        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}


async function createOrganizationFile(ctx, next) {
    try {
        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;

        if (!files && !fields) throw new Error(ctx.i18n.__('formEmpty'));

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, 'create_file');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);


        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        const expectedKeys = ['name', 'description'];

        let checkFields = await validation.compareIncomingDataKeys(fieldKeys, expectedKeys);
        if (!checkFields || fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        if (fileKeys.length == 1 && fileKeys[0] == 'file') {
            let uploadLimits = {
                filesPermitted: 1,
                size: uploadValidation.calcMB(5),
                type: '*'
            };
            await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits)
        }
        else {
            throw new Error(ctx.i18n.__('unexpectedParameters'));
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function modifyOrganizationFile(ctx, next) {
    try {

        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;

        if (!files && !fields) throw new Error(ctx.i18n.__('formEmpty'));

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, 'create_file');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        const expectedKeys = ['name', 'description'];

        for (let key of fieldKeys) {
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
        }
        if (fileKeys.length) {
            if (fileKeys.length == 1 && fileKeys[0] == 'file') {
                let uploadLimits = {
                    filesPermitted: 1,
                    size: uploadValidation.calcMB(5),
                    type: '*'
                };
                await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits)
            }
            else {
                throw new Error(ctx.i18n.__('unexpectedParameters'));
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function modifyOrganizationCard(ctx, next) {
    try {
        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, 'edit_profile');
        if (checkPermissions instanceof Error) ctx.throw(400, checkPermissions.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        let expectedKeys = ['description', 'image', 'public'];

        if (!fieldKeys.length) ctx.throw(400, ctx.i18n.__('formEmpty'));

        for (let key of fieldKeys) {
            let val = fields[key];
            if (!expectedKeys.includes(key)) ctx.throw(400, ctx.i18n.__('unexpectedParameters'));
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, err.status, {message: err.message})
    }


}

async function createOrganizationProfile(ctx, next) {
    try {

        if (!ctx.request.body.files && !ctx.request.body.fields) throw new Error(ctx.i18n.__('formEmpty'));

        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;
        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, 'create_file');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        const expectedKeys = ['description', 'language_id', 'public', 'cover_image'];
        const requiredKeys = ['description', 'language_id', 'public'];

        if (files.cover_image && fields.cover_image) throw new Error(ctx.i18n.__('cannotUploadAndSetCoverToExistingFile'));

        for (let key of fieldKeys) {
            let val = fields[key];
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));

            if (['public'].includes(key) && !['true', 'false'].includes(val)) throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));

            if (key == 'language_id') {
                if (isNaN(val) || val == null) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (parseInt(val) < 1 || parseInt(val) > 4) throw new Error(ctx.i18n.__('languageNotFound'));
            }
            if (key == 'cover_image') {
                if (isNaN(val)) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (ctx.state.organizationFiles.filter(file => file.id == parseInt(val)).length == 0) throw new Error(ctx.i18n.__('cannotFindOrganizationFile'));
            }

            if (requiredKeys.includes(key)) requiredKeys.splice(requiredKeys.indexOf(key), 1);
        }

        if (requiredKeys.length) throw new Error(ctx.i18n.__('unexpectedParameters'));

        if (fileKeys.length) {
            if (fileKeys.length == 1 && fileKeys[0] == 'cover_image') {
                let uploadLimits = {
                    filesPermitted: 1,
                    size: uploadValidation.calcMB(5),
                    type: 'image'
                };
                await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits)
            }
            else {
                throw new Error(ctx.i18n.__('unexpectedParameters'));
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function modifyOrganizationProfile(ctx, next) {
    try {
        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, ctx.params, 'edit_profile');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        if (!fieldKeys.length) throw new Error(ctx.i18n.__('unexpectedParameters'));

        const expectedKeys = ['description', 'language_id', 'public', 'cover_image'];


        for (let key of fieldKeys) {
            let val = fields[key];
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            if (['public'].includes(key) && typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            if (['description'].includes(key) && typeof val !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));
            if (key == 'language_id') {
                if (isNaN(val) || val == null) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (val < 1 || val > 4) throw new Error(ctx.i18n.__('languageNotFound'));
            }
            if (key == 'cover_image') {
                if (isNaN(val)) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (ctx.state.organizationFiles.filter(file => file.id == parseInt(val)).length == 0) throw new Error(ctx.i18n.__('cannotFindProjectFile'));
            }

        }


        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }


}

async function modifyMemberPermissions(ctx, next) {
    try {
        let params = ctx.params;
        let user = ctx.state.user;

        let checkPermissions = await validateMemberPermissions.editMemberPermissions(ctx.state, ctx.params, 'edit_permissions');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message)

        let recievedKeys = Object.keys(ctx.request.body);
        let allowedKeys = ['level', 'create_account_access', 'invite_members', 'edit_profile', 'edit_settings', 'edit_member_permissions'];

        if (recievedKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of recievedKeys) {
            let val = ctx.request.body[key];
            if (!allowedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            if (key !== 'level' && typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            else if (key == 'level' && typeof val !== 'number') throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));

            if (user.permissions !== true) {
                if (key !== 'level' && user.permissions[key] !== true) throw new Error(ctx.i18n.__('cannotModifyPermissions', key));
                else if (key == 'level' && val <= user.permissions[key]) throw new Error(ctx.i18n.__('cannotUpgradePermissionLevelToSameOrHigherLevel'))
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function sendMemberInvitations(ctx, next) {
    try {
        let params = ctx.params;
        let users = ctx.request.body.user_names;
        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'invite_members');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['user_names'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        if (users instanceof Array == false) throw new Error(ctx.i18n.__('expectedValueToBeArray', 'user_names'));
        if (users.length < 1) throw new Error(ctx.i18n.__('expectedArrayToNotBeEmpty', 'user_names'));
        for (let user of users) {
            if (typeof user !== 'string') throw new Error(ctx.i18n.__('expectAllItemsInArrayToBeStrings', 'user_names'));
        }

        return next()
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function acceptMemberInvitation(ctx, next) {
    try {
        let accepted = ctx.request.body.accepted;

        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['accepted'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        if (typeof accepted !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', 'accepted'));

        return next()
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function createOrganizationAccount(ctx, next) {
    try {
        if (!ctx.request.body.files && !ctx.request.body.fields) throw new Error(ctx.i18n.__('formEmpty'));

        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;
        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        let params = ctx.params;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'create_account');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        const expectedKeys = ['name', 'description', 'profile_picture'];
        const requiredKeys = ['name', 'description'];

        if (files.profile_picture && fields.profile_picture) throw new Error(ctx.i18n.__('cannotUploadAndSetCoverToExistingFile'));

        for (let key of fieldKeys) {
            let val = fields[key];

            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));

            if (typeof val !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));

            if (key == 'name') {
                if (val.trim().length == 0) throw new Error(ctx.i18n.__('expectedValueToNotBeEmpty', 'name'));
                if (!alphanumeric.test(val)) throw new Error(ctx.i18n.__('expectedValueToContainOnlyLettersSpacesNumbers', 'name'));
            }
            if (key == 'profile_picture') {
                if (isNaN(val)) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (ctx.state.organizationFiles.filter(file => file.id == parseInt(val)).length == 0) throw new Error(ctx.i18n.__('cannotFindOrganizationFile'));
            }

            if (requiredKeys.includes(key)) requiredKeys.splice(requiredKeys.indexOf(key), 1);
        }

        if (requiredKeys.length) throw new Error(ctx.i18n.__('unexpectedParameters'));


        if (fileKeys.length) {
            if (fileKeys.length == 1 && fileKeys[0] == 'profile_picture') {
                let uploadLimits = {
                    filesPermitted: 1,
                    size: uploadValidation.calcMB(5),
                    type: 'image'
                };
                await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits)
            }
            else {
                throw new Error(ctx.i18n.__('unexpectedParameters'));
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function modifyOrganizationAccount(ctx, next) {
    try {
        let checkAccountAccess = await validateMemberPermissions.checkOrganizationAccountAccess(ctx.state, ctx.params);
        if (checkAccountAccess instanceof Error) throw new Error(checkAccountAccess.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        if (!fieldKeys.length) throw new Error(ctx.i18n.__('unexpectedParameters'));

        let expectedKeys = ['name', 'description', 'profile_picture'];

        for (let key of fieldKeys) {
            let val = fields[key];
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));

            if (['name', 'description'].includes(key) && typeof val !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));

            if (key == 'name') {
                if (val.trim().length == 0) throw new Error(ctx.i18n.__('expectedValueToNotBeEmpty', 'name'));
                if (!alphanumeric.test(val)) throw new Error(ctx.i18n.__('expectedValueToContainOnlyLettersSpacesNumbers', 'name'));
            }

            if (key == 'profile_picture') {
                if (isNaN(val)) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (ctx.state.organizationFiles.filter(file => file.id == parseInt(val)).length == 0) throw new Error(ctx.i18n.__('cannotFindOrganizationFile'));
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function createOrganizationAccountAccess(ctx, next) {
    try {
        // TODO: Change organization_member to :memberId in route params.
        // TODO: Change organization_account to :accountId in route params.
        let params = ctx.params;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'create_account_access');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['organization_member', 'organization_account'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of recievedKeys) {
            let val = ctx.request.body[key];
            if (typeof val !== 'number') throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

module.exports = {
    createOrganization,
    createOrganizationOfficialDocument,
    createOrganizationFile,
    modifyOrganizationFile,
    modifyOrganizationCard,
    createOrganizationProfile,
    modifyOrganizationProfile,
    sendMemberInvitations,
    acceptMemberInvitation,
    modifyMemberPermissions,
    createOrganizationAccount,
    modifyOrganizationAccount,
    createOrganizationAccountAccess
}