const validation = require('../_helpers/validation');
const general = require('../_helpers/general');
const messageHelpers = require('../_helpers/messages');
const regexHelpers = require('../_helpers/regex');
const uploadValidation = require('../_helpers/uploads');
const generalQueries = require('../db/queries/general');
const moment = require('moment');
const validateMemberPermissions = require('./permissions');


async function sendMessageAsOrgAccount(ctx, next) {
    try {
        let checkAccountPermissions = await validateMemberPermissions.checkOrganizationAccountPermissions(ctx.i18n, ctx.state, ctx.params);

        if (checkAccountPermissions instanceof Error) throw new Error(checkAccountPermissions.message);

        if (checkAccountPermissions.name !== ctx.request.body.fields.sender) throw new Error(ctx.i18n.__('sendOnlyAsActiveAccount'));

        ctx.state.user['org'] = true;

        return next()
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function sendMessageAsUserAccount(ctx, next) {
    try {
        let user = ctx.state.user;

        if (user.user_name !== ctx.request.body.fields.sender) throw new Error(ctx.i18n.__('sendOnlyAsActiveAccount'));

        ctx.state.user['org'] = false;

        return next()
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function checkOrgAccountAccess(ctx, next) {
    try {
        let checkAccountPermissions = await validateMemberPermissions.checkOrganizationAccountPermissions(ctx.i18n, ctx.state, ctx.params);

        if (checkAccountPermissions instanceof Error) throw new Error(checkAccountPermissions.message);

        ctx.state.user['org'] = true;

        return next()
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function sendMessage(ctx, next) {
    /* TODO: Remove option for 'sender' to even be there. NOT NEEDED USE TOKEN INFORMATION. */
    try {
        //TODO: Expect form data, throws error if you try to send raw json.
        let recieved = ctx.request.body;
        let message = recieved.fields;
        let files = recieved.files;

        let recievedKeys = Object.keys(message);
        let expectedKeys = ['subject', 'message', 'a', 'cc', 'sender'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of recievedKeys) {
            if (['message', 'subject'].includes(key) && message[key].length == 0) message[key] = '(No ' + key + ')';
            if (key == 'a' || key == 'cc' || key == 'sender') message[key] = regexHelpers.removeWhiteSpace(message[key]);
            if (['a', 'sender'].includes(key) && message[key].length == 0) throw new Error(ctx.i18n.__('expectedValueToNotBeEmpty', key));
        }

        if (Object.keys(files).length > 0) {
            let uploadLimits = {
                filesPermitted: 3,
                size: uploadValidation.calcMB(5),
                type: 'any'
            };
            await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits);
            message.attachments = true;
        }
        else {
            message.attachments = false;
        }


        return next();
    }

    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function generalSearch(ctx, next) {
    try {
        if (!ctx.params.search) throw new Error(ctx.i18n.__('noSearchQueryEntered'))
        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function createMessageCategory(ctx, next) {
    try {
        let expectedKeys = ['path', 'name'];
        let recievedKeys = Object.keys(ctx.request.body);

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        for (let key of recievedKeys) {
            if (typeof ctx.request.body[key] !== 'string') throw new Error(ctx.i18n.__('expectedValueToBeString', key));
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function deleteMessageCategory(ctx, next) {
    //TODO: Consistency problem - Move this into routes? No data to validate really.
    try {
        let user = ctx.state.user;

        let findMessageCategoryParams = {
            organization_account: user.org ? ctx.params.orgAccount : null,
            id: ctx.params.categoryId
        };

        if (user.org) findMessageCategoryParams.organization_account = ctx.params.orgAccount;
        else findMessageCategoryParams.user_account = user.id;

        let checkIfMessageCategoryExists = await generalQueries.singleSelectQuery(null, '*', 'message_custom_categories', findMessageCategoryParams);


        if (checkIfMessageCategoryExists instanceof Error) throw new Error(checkIfMessageCategoryExists.message);
        if (!checkIfMessageCategoryExists) throw new Error(ctx.i18n.__('messageCategoryDoesNotExist'));

        ctx.state.category = checkIfMessageCategoryExists;

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function changeMessageCategories(ctx, next) {
    try {
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['category', 'message_id'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        let defaultCategories = ['inbox', 'sent', 'drafts', 'trash'];

        let user = ctx.state.user;
        let cat = ctx.request.body.category;
        let msg = ctx.request.body.message_id;

        if (msg == null || msg.constructor !== Array) throw new Error(ctx.i18n.__('expectedValueToBeArray', 'message_id'));

        if (typeof cat !== 'string' && typeof cat !== 'number') throw new Error(ctx.i18n.__('messageCategoryTypeInvalid'));
        if (typeof cat == 'string' && !defaultCategories.includes(cat)) throw new Error(ctx.i18n.__('messageCategoryDoesNotExist'));

        //TODO: Further testing. For example, change 'organization_account' to 'organization_account_id' and only one of your tests fail for this section. Is this correct?
        if (typeof cat == 'number') {
            let findMessageCategoryParams = {
                organization_account: user.org ? ctx.params.orgAccount : null,
                id: cat
            };

            if (user.org) findMessageCategoryParams.organization_account = ctx.params.orgAccount;
            else findMessageCategoryParams.user_account = user.id;

            let checkIfMessageCategoryExists = await generalQueries.singleSelectQuery(null, '*', 'message_custom_categories', findMessageCategoryParams);

            if (!checkIfMessageCategoryExists) throw new Error(ctx.i18n.__('messageCategoryDoesNotExist'));

            ctx.state.setStatement = {
                category: null,
                custom_category: cat,
                deleted: false,
                deleted_at: null
            }
        }
        else {
            ctx.state.setStatement = {
                category: cat,
                custom_category: null,
                deleted: false,
                deleted_at: null
            }

            if (cat == 'trash') {
                ctx.state.setStatement.deleted = true;
                ctx.state.setStatement.deleted_at = moment().format();
            }
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function markMessageSingle(ctx, next) {
    try {
        let allowedItems = ['read', 'starred', 'important']
        let recievedKeys = Object.keys(ctx.request.body);

        for (let key of recievedKeys) {
            if (!allowedItems.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            else if (typeof(ctx.request.body[key]) !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            if (key == 'read') {
                ctx.request.body[key] == true
                    ? ctx.request.body[key + '_at'] = moment().format()
                    : ctx.request.body[key + '_at'] = null
            }
        }

        return next()

    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function markMessageMulti(ctx, next) {
    try {
        let body = ctx.request.body;
        let recievedKeys = Object.keys(body);
        let expectedKeys = ['participant_id', 'read', 'starred', 'important'];

        //let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!expectedKeys.includes('participant_id')) throw new Error(ctx.i18n.__('unexpectedParameters'));

        let buildSetStatement = '';
        ctx.state.setAs = 'id';
        let getValues = [];

        for (let key of recievedKeys) {
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            if (key == 'participant_id' && body[key].constructor !== Array) throw new Error(ctx.i18n.__('expectedValueToBeArray', key));
            else if (key !== 'participant_id') {
                if (body[key] == null || body[key].constructor !== Boolean) throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key));
            }


            if (key == 'participant_id') {
                continue;
            }
            else {
                if (key == 'read') {
                    // ctx.state.setAs = ctx.state.setAs += ', read_at';
                    let readVal = body[key] == true ? 'now()' : 'DEFAULT';
                    buildSetStatement += 'read_at = ' + readVal + ', ';
                }

                ctx.state.setAs = ctx.state.setAs += ', ' + key;
                buildSetStatement += key + ' = mc.' + key + ', ';
                getValues.push(body[key]);
            }
        }

        ctx.state.setStatement = buildSetStatement;
        ctx.state.setValues = getValues;

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

module.exports = {
    // getMessage,
    // markMessageRead,
    // markMessageDelete,
    sendMessage,
    sendMessageAsOrgAccount,
    sendMessageAsUserAccount,
    generalSearch,
    changeMessageCategories,
    markMessageMulti,
    markMessageSingle,
    createMessageCategory,
    deleteMessageCategory,
    checkOrgAccountAccess
}


/*async function markMessageRead(ctx, next) {
    try {
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['message_id', 'read'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        if (typeof(ctx.request.body.read) !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', 'read'))

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function markMessageDelete(ctx, next) {
    try {
        //let keysMatch;
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['message_id', 'delete'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));


        if (typeof(ctx.request.body.delete) !== 'boolean') throw new Error(ctx.i18n.__('expectedValueToBeBoolean', 'delete'))
        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}*/
/*
async function getMessage(ctx, next) {
    try {
        let params = ctx.params;

        if (params.category == null) params.category = 'inbox';
        if (params.messageId) {
            params['message.id'] = params.messageId;
            delete params.messageId;
        }
        if (params.category == 'all') delete params.category

        return next();
    }

    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}
*/