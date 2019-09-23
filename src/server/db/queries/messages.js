const knex = require('../connection');
const moment = require('moment');
const _ = require('lodash');
const uploadHelpers = require('../../_helpers/uploads');
const general = require('./general');

async function findRepliedToMessage(t, params, user) {
    let whereParams = {message_id: params.messageId};
    user.org ? whereParams.organization_account = params.orgAccount : whereParams.user_account = user.id;
    return knex.select('mp.id as participant_id', 'subject', 'group_id')
        .from('message_participants as mp')
        .innerJoin('message as m', 'm.id', 'mp.message_id')
        .innerJoin('message_group as mg', 'mg.id', 'm.group_id')
        .where(whereParams)
        .first()
        .then(res => res)
        .catch(err => err)
}

async function sendNewMessage(t, message, files, state, routeParams) {
    return knex.transaction(async (trx) => {
        let user = state.user;
        let messageChain, res = {message: {}};
        /* INSERT / APPEND TO MESSAGE CHAIN */
        if (state.replyTo) {
            /*  messageChain = await general.singleSelectQuery(trx, '*', 'message_group', {id: message.group_id});
              if (!messageChain) throw new Error(t.__('cannotFindConversationChain'));
              if (messageChain instanceof Error) throw new Error(messageChain.message);
  */
            let info = {replied: true, replied_at: moment().format()};
            let params = {id: state.replyTo.participant_id};

            let updateParticipantMessage = await general.patchQuery(trx, info, params, 'message_participants', '*');
            if (updateParticipantMessage instanceof Error) throw new Error(updateParticipantMessage.message);

            res['result'] = t.__('successfullyRepliedToMessage');
            message.group_id = state.replyTo.group_id;
            res.message.subject = state.replyTo.subject;
        }
        else {
            messageChain = await general.insertQuery(trx, {subject: message.subject}, 'message_group', '*');
            res['result'] = t.__('successfullySentNewMessage');
            message.group_id = messageChain[0].id;
            res.message.subject = message.subject;

        }
        /* END OF MESSAGE CHAIN */
        /* INSERT MESSAGE */

        let messageInfo = {
            group_id: message.group_id,
            text: message.message,
            attachments: message.attachments,
            sender: message.sender,
            a: message.a,
            cc: message.cc == 'null' ? null : message.cc
        };

        let insertMessage = await general.insertSingleQuery(trx, messageInfo, 'message', '*');
        if (insertMessage instanceof Error) throw new Error(insertMessage.message);

        Object.keys(insertMessage).forEach(item => res['message'][item] = insertMessage[item]);

        //res['message'] = insertMessage;

        /* END OF INSERT MESSAGE */
        /* INSERT ATTACHMENTS */

        if (message.attachments == true) {
            let uploadImage;
            let attachmentsToInsert = [];

            if (files.attachments.constructor == Array) {
                for (let file of files.attachments) {
                    uploadImage = await uploadHelpers.uploadFile(file, insertMessage.id, 'messages');
                    uploadImage['message_id'] = insertMessage.id;
                    attachmentsToInsert.push(uploadImage);
                }
            }
            else {
                uploadImage = await uploadHelpers.uploadFile(files.attachments, insertMessage.id, 'messages');
                uploadImage['message_id'] = insertMessage.id;
                attachmentsToInsert.push(uploadImage);
            }

            let insertAttachments = await general.insertQuery(trx, attachmentsToInsert, 'message_attachments', '*');
            if (insertAttachments instanceof Error) throw new Error(insertAttachments.message);
            res['attachments'] = insertAttachments;

        }


        /* END OF INSERT ATTACHMENTS */
        /* INSERT PARTICIPANTS */

        let handleParticipants = await insertParticipants(trx, t, message, insertMessage.id, user, routeParams);
        if (handleParticipants instanceof Error) throw new Error(handleParticipants.message);

        res['participants'] = handleParticipants.length;
        return res
    })
        .then(res => res)
        .catch(err => err)
}

async function insertParticipants(trx, t, message, messageId, sender, routeParams) {
    try {
        let insertParams = [{
            category: 'sent',
            read: true,
            read_at: moment().format(),
            message_id: messageId,
            user_account: sender.id,
            organization_account: sender.org ? routeParams.orgAccount : null
        }];

        let mergeRecipitants = message.cc.length == 0 ? message.a.split(',') : [].concat.apply([], [message.a.split(','), message.cc.split(',')]);

        let userAccounts = [], orgAccounts = [];

        for (let name of mergeRecipitants) {
            if (name.includes('@')) orgAccounts.push(name);
            else userAccounts.push(name)
        }

        let unionAcc = await trx.raw(
            "select id, name, true as org from organization_account where name in ('" + orgAccounts.join("','") + "')" +
            " union " +
            "select id, user_name, false as org from users where user_name in ('" + userAccounts.join("','") + "')");

        if (unionAcc.rowCount !== mergeRecipitants.length) {
            let foundUsers = unionAcc.rows.map(x => x.name);
            let notFound = mergeRecipitants.filter(x => foundUsers.indexOf(x) == -1);
            throw new Error(t.__('usersDoNotExist', notFound.join(', ')));
        }
        else {
            for (let acc of unionAcc.rows) {
                let p = {category: 'inbox', message_id: messageId};
                if (acc.org) p.organization_account = acc.id;
                p.user_account = acc.id;
                insertParams.push(p)
            }
        }

        let insertParticipants = await general.insertQuery(trx, insertParams, 'message_participants', '*');
        if (insertParticipants instanceof Error) throw new Error(insertParticipants);

        return insertParticipants
    }
    catch (err) {
        return err;
    }
}


function getMessageCategories(id) {
    return knex
        .select(knex.raw('id, name, path, nlevel(path) as level'))
        .from('message_custom_categories')
        .where({user_id: id})
        .orderBy('level', 'path')
        .returning('*')
        .then((res) => {
            let map = new Map();
            let flatMap = new Map();
            for (let result in res) {
                let dp = res[result];
                flatMap.set(dp.id, dp.path)
                if (dp.level == 1 && !map.has(dp.name)) {
                    map.set(dp.name, {
                        id: dp.id,
                        name: dp.name,
                        path: dp.path,
                        messages: [],
                        children: {}
                    })
                }
                else if (dp.level > 1) {
                    let root, breakPath;
                    let splitPath = dp.path.split('.');
                    root = map.get(splitPath[0])

                    breakPath = splitPath.slice(1)
                    for (let [i, v] of breakPath.entries()) {
                        if (breakPath.length == 1) {
                            root.children[dp.name] = {
                                id: dp.id,
                                name: dp.name,
                                path: dp.path,
                                messages: [],
                                children: {}
                            }
                        }
                        else if (i == breakPath.length - 1) {
                            root.children[dp.name] = {
                                id: dp.id,
                                name: dp.name,
                                path: dp.path,
                                messages: [],
                                children: {}
                            }
                        }
                        else {
                            root = root.children[v];
                        }
                    }
                }
            }
            return {nested: map, flat: flatMap};
        })
}




function findMultipleParticipants(params, paramsIn) {
    return knex
        .select('id')
        .from('message_participants')
        .where(params)
        .whereIn('id', paramsIn)
        .then(res => res.map(r => r.id))
        .catch(err => err)
}

function markMultipleMessages(set, as, values) {
    return knex.raw('UPDATE message_participants as mp ' +
        'SET ' + set +
        ' FROM(values' + values + ')' +
        ' as mc(' + as + ')' +
        ' WHERE mc.id = mp.id' +
        ' returning message_id,mp.read,mp.read_at,mp.important,mp.starred')
        .then(res => res)
        .catch(err => err)
}

function deleteCategoryTransaction(categories, messages) {
    return knex.transaction(async (trx) => {

        let moveMessagesToTrash = await general.updateMultipleRecords(trx, {
            category: 'trash',
            custom_category: null,
            deleted: true,
            deleted_at: moment().format()
        }, 'message_participants', 'id', messages, '*');

        if (moveMessagesToTrash instanceof Error) throw new Error(moveMessagesToTrash.message)

        let deleteCategories = await general.deleteMultipleRecords(trx, 'message_custom_categories', 'id', categories, '*');
        if (deleteCategories instanceof Error) throw new Error(deleteCategories.message)

        return {movedMessages: moveMessagesToTrash, deletedCategories: deleteCategories};
    })
        .catch(err => err)
        .then(res => res)
}

async function getSubCategories(path, params) {
    return knex('message_custom_categories')
        .select('*')
        .where(knex.raw('path <@ \'' + path + '\''))
        .where(params)
        .returning('*')
        .then(res => res.map(r => r.id))
}

function getAllMessagesInCategories(user, val) {
    return knex('message_participants')
        .select('id')
        .where(user)
        .whereIn('custom_category', val)
        .then(res => res.map(r => r.id))
        .catch(err => err);
}

async function getMessages(params) {
    /* TODO: Restructure image storage! */
    /*  let parameters = {
          user_account: id
      }*/
    return knex
        .distinct(knex.raw('ON (message.id) message.id'))
        .select(
            'message_participants.category', 'message_participants.replied_at',
            'message_participants.deleted_at', 'message_participants.read', 'message_participants.read_at',
            'message_participants.deleted', 'message_participants.replied', 'message_participants.custom_category',
            'message.group_id', 'message.created_at', 'message.text', 'message.sender', 'message.a',
            'message.cc', 'message.attachments', 'message_group.subject',
            knex.raw("string_agg(message_attachments.loc, ',') AS attachment_locs"), knex.raw("string_agg(message_attachments.name, ',') AS attachment_names"))
        .from('message_participants')
        //        .whereRaw('message_participants.user_account = ' + id + 'AND message_participants.category = ' + category + '')
        .innerJoin('message', 'message_participants.message_id', 'message.id')
        .innerJoin('message_group', 'message.group_id', 'message_group.id')
        .leftJoin('message_attachments', 'message.id', 'message_attachments.message_id')
        .where(params)
        .groupBy('﻿message.id', 'message_participants.id', 'message_group.id')
        .returning('*')
}

module.exports = {
    sendNewMessage,
    getMessages,
    getMessageCategories,
    markMultipleMessages,
    deleteCategoryTransaction,
    getSubCategories,
    findRepliedToMessage,
    findMultipleParticipants,
    getAllMessagesInCategories
};

