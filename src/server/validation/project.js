const validation = require('../_helpers/validation');
const general = require('../_helpers/general');
const uploadHelpers = require('../_helpers/uploads');
const validateMemberPermissions = require('./permissions');
const generalQueries = require('../db/queries/general');
const moment = require('moment');
const uploadValidation = require('../_helpers/uploads');

async function createProject(ctx, next) {
    try {
        if (!ctx.request.body.files && !ctx.request.body.fields) throw new Error(ctx.i18n.__('formEmpty'));

        let params = ctx.params;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(ctx.state, params, 'create_project');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;
        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        const expectedKeys = ['project_location', 'start_date', 'end_date', 'currency', 'goal', 'name', 'description', 'public'];

        let checkFields = await validation.compareIncomingDataKeys(fieldKeys, expectedKeys);
        if (!checkFields || fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        /* TODO: Remove .includes from validation? (looping for each key might be excessive?) */

        for (let key of fieldKeys) {
            let val = fields[key];
            if (key.includes('date') && !moment(val).isValid()) throw new Error(ctx.i18n.__('expectedValueToBeValidDate', key));
            if (['currency', 'goal', 'language_id'].includes(key) && isNaN(val)) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key))

            if (key == 'public') {
                if (!['true', 'false'].includes(val)) throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key))
            }

            if (key == 'currency') {
                if (parseInt(val) < 1 || parseInt(val) > 118) throw new Error(ctx.i18n.__('currencyNotFound'));
            }
        }

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

async function modifyProject(ctx, next) {
    try {
        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        if (!fieldKeys.length) throw new Error(ctx.i18n.__('formEmpty'));

        const expectedKeys = ['project_location', 'start_date', 'end_date', 'currency', 'goal', 'public', 'suspended'];

        for (let key of fieldKeys) {
            let val = fields[key];
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            if (key.includes('date') && !moment(val).isValid()) throw new Error(ctx.i18n.__('expectedValueToBeValidDate', key));

            if (['currency', 'goal'].includes(key)) {
                if (isNaN(val) || val == null) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
            }

            if (['suspended', 'public'].includes(key)) {
                if (typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
                else fields[key + '_at'] = 'now()';
            }

            if (key == 'currency') {
                if (parseInt(val) < 1 || parseInt(val) > 118) throw new Error(ctx.i18n.__('currencyNotFound'));
            }
        }


        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function createProfile(ctx, next) {
    try {
        if (!ctx.request.body.files && !ctx.request.body.fields) throw new Error(ctx.i18n.__('formEmpty'));

        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;
        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        const expectedKeys = ['name', 'description', 'language_id', 'public', 'cover_image'];
        const requiredKeys = ['name', 'description', 'language_id', 'public'];

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
                if (ctx.state.projectFiles.filter(file => file.id == parseInt(val)).length == 0) throw new Error(ctx.i18n.__('cannotFindProjectFile'));
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

async function modifyProfile(ctx, next) {
    try {
        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        if (!fieldKeys.length) throw new Error(ctx.i18n.__('unexpectedParameters'));

        const expectedKeys = ['name', 'description', 'language_id', 'public', 'cover_image'];

        for (let key of fieldKeys) {
            let val = fields[key];
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            if (['public'].includes(key) && typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            if (['name', 'description'].includes(key) && typeof val !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));
            if (key == 'language_id') {
                if (isNaN(val) || val == null) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (val < 1 || val > 4) throw new Error(ctx.i18n.__('languageNotFound'));
            }
            if (key == 'cover_image') {
                if (isNaN(val)) throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (ctx.state.projectFiles.filter(file => file.id == parseInt(val)).length == 0) throw new Error(ctx.i18n.__('cannotFindProjectFile'));
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function createUpdate(ctx, next) {
    try {
        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        if (fieldKeys.length == 0) throw new Error(ctx.i18n.__('formEmpty'));

        const expectedKeys = ['public', 'title', 'body'];

        let checkFields = await validation.compareIncomingDataKeys(fieldKeys, expectedKeys);
        if (!checkFields || fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of fieldKeys) {
            let val = fields[key];
            if (key == 'public' && typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            if (['title', 'body'].includes(key) && typeof val !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }

}

async function modifyUpdate(ctx, next) {
    try {
        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        const expectedKeys = ['public'];

        let checkFields = await validation.compareIncomingDataKeys(fieldKeys, expectedKeys);
        if (!checkFields || fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of fieldKeys) {
            let val = fields[key];
            if (key == 'public' && typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }

}

async function createUpdateProfile(ctx, next) {
    try {
        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        const expectedKeys = ['public', 'language_id', 'title', 'body'];

        let checkFields = await validation.compareIncomingDataKeys(fieldKeys, expectedKeys);
        if (!checkFields || fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of fieldKeys) {
            let val = fields[key];
            if (key == 'public' && typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            if (['title', 'body'].includes(key) && typeof val !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));
            if (key == 'language_id') {
                if (isNaN(val) || val == null || typeof val !== 'number') throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (val < 1 || val > 4) throw new Error(ctx.i18n.__('languageNotFound'));
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function modifyUpdateProfile(ctx, next) {
    try {
        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let fields = ctx.request.body;
        let fieldKeys = Object.keys(fields);

        const expectedKeys = ['public', 'language_id', 'title', 'body'];

        if (fieldKeys.length == 0) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of fieldKeys) {
            let val = fields[key];
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            if (key == 'public' && typeof val !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            if (['title', 'body'].includes(key) && typeof val !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));
            if (key == 'language_id') {
                if (isNaN(val) || val == null || typeof val !== 'number') throw new Error(ctx.i18n.__('expectedValueToBeNumber', key));
                if (val < 1 || val > 4) throw new Error(ctx.i18n.__('languageNotFound'));
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function createProjectFile(ctx, next) {
    try {
        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;

        if (!files && !fields) throw new Error(ctx.i18n.__('formEmpty'));

        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

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

async function modifyProjectFile(ctx, next) {
    try {

        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;

        if (!files && !fields) throw new Error(ctx.i18n.__('formEmpty'));

        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

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

module.exports = {
    createProject,
    modifyProject,
    createProfile,
    modifyProfile,
    createUpdate,
    modifyUpdate,
    createUpdateProfile,
    modifyUpdateProfile,
    createProjectFile,
    modifyProjectFile
}