/* TODO: Come up with solution for deletion strategy! */
/* TODO: Revisit retrieving mail by different methods. I.E. If you search by category, should only retrieve messages in that category but still collect information about other folders. (i.e. Count unread messages). */
/* TODO: Future Features : Allow user to move categories to new sub categories etc. Allow users to move all messages to whichever folder they want when they delete category. (instead of just trash) */
/* TODO: Change 'change-categories' route to 'change-message-categories'. It's more clear this way. */
const moment = require('moment');
const helpers = require('../_helpers/general');
const queries = require('../db/queries/messages');
const generalQueries = require('../db/queries/general');
const messageHelpers = require('../_helpers/messages');
const validateRoutes = require('../validation/messages');
const validatePermissions = require('../validation/permissions');
const _ = require('lodash');


// post : /messages/mark-message-single || /messages/mark-message/org/:name/:orgAccount/:participantId
async function markMessageSingle(ctx) {
    try {
        let body = ctx.request.body;
        let user = ctx.state.user;

        let findMessageParticipantParams = {
            user_account: user.id,
            id: ctx.params.participantId,
            organization_account: null
        };

        if (user.org) findMessageParticipantParams = {
            id: ctx.params.participantId,
            organization_account: ctx.params.orgAccount
        };

        let checkMessageParticipantExists = await generalQueries.singleSelectQuery(null, 'id', 'message_participants', findMessageParticipantParams)

        if (!checkMessageParticipantExists || checkMessageParticipantExists instanceof Error) throw new Error(ctx.i18n.__('messageCannotBeFound'));

        let updateMessageParticipant = await generalQueries.updateSingleQuery(null, body, 'message_participants', checkMessageParticipantExists, '*');

        if (updateMessageParticipant instanceof Error) throw new Error(ctx.i18n.__(updateMessageParticipant.message));

        return helpers.handleResponse(ctx, 200, {
            message: ctx.i18n.__('messageSuccessfullyModified'),
            res: updateMessageParticipant
        })
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// post : /messages/mark-messages
async function markMessagesMulti(ctx) {
    try {
        let body = ctx.request.body;
        let setStatement = ctx.state.setStatement;
        let setValues = ctx.state.setValues;
        let joinSet = setValues.join(', ');


        let buildValuesStatement = '';

        let findParticipantsWhere = {organization_account: null};

        if (ctx.state.user.org) findParticipantsWhere.organization_account = ctx.params.orgAccount;
        else findParticipantsWhere.user_account = ctx.state.user.id;

        let findParticipants = await queries.findMultipleParticipants(findParticipantsWhere, body.participant_id);

        if (findParticipants instanceof Error) throw new Error(findParticipants.message);

        if (findParticipants.length == 0) throw new Error(ctx.i18n.__('messagesNotFound'));

        for (let participant of findParticipants) {
            let participantID = participant += ', ';
            buildValuesStatement += '(' + participantID + joinSet + '), ';
        }


        setStatement = setStatement.slice(0, -2);
        buildValuesStatement = buildValuesStatement.slice(0, -2);

        let updateMessages = await queries.markMultipleMessages(setStatement, ctx.state.setAs, buildValuesStatement);

        if (updateMessages instanceof Error) throw new Error(updateMessages.message);

        return helpers.handleResponse(ctx, 200, {
                message: ctx.i18n.__('messagesSuccessfullyModified'),
                count: updateMessages.rowCount,
                updated: updateMessages.rows
            }
        )
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// post : /messages/change-categories
async function changeMessageCategories(ctx) {
    try {

        let state = ctx.state;
        let body = ctx.request.body;

        let messages = body.message_id;

        let findMessagesWhere = {organization_account: null};

        if (ctx.state.user.org) findMessagesWhere.organization_account = ctx.params.orgAccount;
        else findMessagesWhere.user_account = ctx.state.user.id;

        let findMessages = await queries.findMultipleParticipants(findMessagesWhere, messages);

        if (findMessages instanceof Error) throw new Error(findMessages.message);

        if (findMessages.length == 0) throw new Error(ctx.i18n.__('messagesNotFound'));

        let updateMessageParticipants = await generalQueries.updateMultipleRecords(null, state.setStatement, 'message_participants', 'id', findMessages, '*');
        if (updateMessageParticipants instanceof Error) throw new Error(updateMessageParticipants);

        return helpers.handleResponse(ctx, 200, {
                message: ctx.i18n.__('messagesSuccessfullyModified'),
                count: updateMessageParticipants.length,
                updated: updateMessageParticipants
            }
        )
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// post : /messages/create-category
async function createMessageCategory(ctx) {
    try {
        /* TODO: Not sure if splitting path is best way to check if category has parent? */
        let user = ctx.state.user;
        let body = ctx.request.body;
        let params = ctx.params;

        let splitPath = body.path.split('.');

        params['user_account'] = user.id;

        let checkIfCatExistsParams = {
            path: body.path,
            organization_account: null
        };

        if (user.org) checkIfCatExistsParams.organization_account = parseInt(params.orgAccount);
        else checkIfCatExistsParams.user_account = user.id;

        let checkIfCatExists = await generalQueries.singleSelectQuery(null, '*', 'message_custom_categories', checkIfCatExistsParams);

        if (checkIfCatExists) throw new Error(ctx.i18n.__('messageCategoryAlreadyExists', body.name));

        if (splitPath.length > 1) {
            let removeLastItem = splitPath;
            removeLastItem.splice(-1, 1);

            let checkIfCatParentExistsParams = {
                path: removeLastItem.join('.'),
                organization_account: null
            };

            if (user.org) checkIfCatParentExistsParams.organization_account = params.orgAccount;
            else checkIfCatParentExistsParams.user_account = user.id;

            let checkIfCatParentExists = await generalQueries.singleSelectQuery(null, '*', 'message_custom_categories', checkIfCatParentExistsParams);

            if (!checkIfCatParentExists) throw new Error(ctx.i18n.__('subCategoryParentDoesNotExist'));
        }

        let catInfo = {
            user_account: user.id,
            organization_account: user.org ? params.orgAccount : null,
            name: body.name,
            path: body.path
        };

        let insertCat = await generalQueries.insertSingleQuery(null, catInfo, 'message_custom_categories', '*')

        return helpers.handleResponse(ctx, 200, {
            message: ctx.i18n.__('successfullyInsertedNewCategory', insertCat.name),
            cat: insertCat
        });
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// post: /messages/reply-message/:messageId || /messages/reply-message/org/:name/:orgAccount/:messageId
async function replyToMessage(ctx, next) {
    try {
        let params = ctx.params;

        let findRepliedToMessage = await queries.findRepliedToMessage(ctx.i18n, params, ctx.state.user);

        if (!findRepliedToMessage) throw new Error(ctx.i18n.__('messageCannotBeFound'))

        ctx.state.replyTo = findRepliedToMessage;

        return next();
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// post : /messages/send-message || /messages/send-message/org/:name/:orgAccount
async function sendMessage(ctx) {
    try {
        let message = ctx.request.body.fields;
        let files = ctx.request.body.files;
        let routeParams = ctx.params;

        let sendMessage = await queries.sendNewMessage(ctx.i18n, message, files, ctx.state, routeParams);
        if (sendMessage instanceof Error) throw new Error(sendMessage.message);

        return helpers.handleResponse(ctx, 200, sendMessage);
    } catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// get : /messages/get-messages
async function getMessages(ctx) {
    try {
        let params = ctx.params;
        let user = ctx.state.user;
        let customCategories, mapped, categories, messages;

        customCategories = await queries.getMessageCategories(user.id);

        //mapped = new Map(Object.entries(defaultCategories))
        mapped = new Map();
        mapped
            .set('inbox', {
                name: 'inbox',
                path: 'inbox',
                messages: [],
                children: null
            })
            .set('sent', {
                name: 'sent',
                path: 'sent',
                messages: [],
                children: null
            })
            .set('draft', {
                name: 'draft',
                path: 'draft',
                messages: [],
                children: null
            })
            .set('trash', {
                name: 'trash',
                path: 'trash',
                messages: [],
                children: null
            })

        categories = new Map([...mapped, ...customCategories.nested])

        params['user_account'] = user.id;

        messages = await queries.getMessages(params);

        function getCategoryEntry(categories, categoryId) {
            let cat;

            for (let [i, v] of customCategories.flat.get(categoryId).split('.').entries()) {
                if (i == 0) {
                    cat = categories.get(v)
                }
                else {
                    cat = cat.children[v]
                }
            }

            return cat;
        }


        for (let message of messages) {
            if (!message['custom_category']) categories.get(message.category).messages.push(message)
            else {
                let customCat = getCategoryEntry(categories, message['custom_category'])
                customCat.messages.push(message)
            }
        }

        function mapToObj(map) {
            let obj = Object.create(null);
            for (let [k, v] of map) {
                obj[k] = v;
            }
            return obj;
        }

        return helpers.handleResponse(ctx, 200, {messages: mapToObj(categories)});
    }

    catch
        (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// get: /messages/get-messages/:search
async function searchMessagesSimple(ctx) {
    try {
        let params = ctx.params;
        let user = ctx.state.user;

        let messages = await queries.getMessages({user_account: user.id})

        let filtered = await messageHelpers.simpleFilter(messages, params.search, user.user_name)


        return helpers.handleResponse(ctx, 200, {messages: filtered});
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// post : /messages/delete-category
async function deleteCategory(ctx) {
    try {
        let user = ctx.state.user;
        let cat = ctx.state.category;

        let params = {organization_account: null};

        user.org
            ? params.organization_account = ctx.params.orgAccount
            : params.user_account = user.id;

        let subCategories = await queries.getSubCategories(cat.path, params);

        let getMessages = await queries.getAllMessagesInCategories(params, subCategories);

        let removeCategory = await queries.deleteCategoryTransaction(subCategories, getMessages);
        if (removeCategory instanceof Error) throw new Error(removeCategory);

        return helpers.handleResponse(ctx, 200, {
            message: ctx.i18n.__('deletedFollowingCategories', removeCategory.deletedCategories.map(dc => dc.path).join(', ')),
            messagesMoved: removeCategory.movedMessages.length
        });
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}


module.exports = (router) => {
    router.post('/messages/send-message', helpers.passportJWT, validateRoutes.sendMessage, validateRoutes.sendMessageAsUserAccount, sendMessage);
    router.post('/messages/send-message/org/:name/:orgAccount', helpers.passportJWT, validateRoutes.sendMessage, validateRoutes.sendMessageAsOrgAccount, sendMessage);

    router.post('/messages/reply-message/:messageId', helpers.passportJWT, validateRoutes.sendMessage, validateRoutes.sendMessageAsUserAccount, replyToMessage, sendMessage);
    router.post('/messages/reply-message/org/:name/:orgAccount/:messageId', helpers.passportJWT, validateRoutes.sendMessage, validateRoutes.sendMessageAsOrgAccount, replyToMessage, sendMessage);

    router.patch('/messages/mark-message/:participantId', helpers.passportJWT, validateRoutes.markMessageSingle, markMessageSingle);
    router.patch('/messages/mark-message/org/:name/:orgAccount/:participantId', helpers.passportJWT, validateRoutes.checkOrgAccountAccess, validateRoutes.markMessageSingle, markMessageSingle);

    router.patch('/messages/mark-messages', helpers.passportJWT, validateRoutes.markMessageMulti, markMessagesMulti);
    router.patch('/messages/mark-messages/org/:name/:orgAccount', helpers.passportJWT, validateRoutes.checkOrgAccountAccess, validateRoutes.markMessageMulti, markMessagesMulti);

    router.post('/messages/create-category', helpers.passportJWT, validateRoutes.createMessageCategory, createMessageCategory);
    router.post('/messages/create-category/org/:name/:orgAccount', helpers.passportJWT, validateRoutes.checkOrgAccountAccess, validateRoutes.createMessageCategory, createMessageCategory);

    router.patch('/messages/change-categories', helpers.passportJWT, validateRoutes.changeMessageCategories, changeMessageCategories);
    router.patch('/messages/change-categories/org/:name/:orgAccount', helpers.passportJWT, validateRoutes.checkOrgAccountAccess, validateRoutes.changeMessageCategories, changeMessageCategories);

    router.delete('/messages/delete-category/:categoryId', helpers.passportJWT, validateRoutes.deleteMessageCategory, deleteCategory);
    router.delete('/messages/delete-category/org/:name/:orgAccount/:categoryId', helpers.passportJWT, validateRoutes.checkOrgAccountAccess, validateRoutes.deleteMessageCategory, deleteCategory);


    router.get('/messages/get-messages/', helpers.passportJWT, getMessages);
    router.get('/messages/search-messages/:search', helpers.passportJWT, searchMessagesSimple);
    router.get('/messages/search-messages', helpers.passportJWT, validateRoutes.generalSearch);
};