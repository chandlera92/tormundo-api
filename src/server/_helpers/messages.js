const _ = require('lodash');
const queries = require('../db/queries/general');
const organizationAccountValidation = require('../validation/permissions')
const regex = require('./regex');

async function validateSender(t, message, state) {
    try {
        let user = state.user;
        if (regex.validateOrgUserName.test(message.sender)) {
            let countAt = (message.sender.match(/@/g) || []).length;
            if (countAt == 0 && message.sender !== user.user_name) throw new Error(t.__('sendOnlyAsActiveAccount'));
            else if (countAt > 1) throw new Error('NO')
            else {
                let findOrganizationAccount = await queries.singleSelectQuery(null, '*', 'organization_account', {name: message.sender});

                let setOrgState = await organizationAccountValidation.setOrganizationState(state, {name: findOrganizationAccount.name.split('@')[1]});
                if (setOrgState instanceof Error) throw new Error(setOrgState.message);



                let checkOrgAccountPermissions = await organizationAccountValidation.checkOrganizationAccountPermissions(t, params)
            }

        }
        else {
            throw new Error('do not recognise sender')
        }
    }
    catch (err) {
        return err;
    }


}

/*
async function validateNewMessages(t, files, message, user) {
    if (_.isEmpty(files)) {
        message['attachments'] = false
    }

    if(regex.validateOrgUserName.test(message.sender)){
        let countAt = (message.sender.match(/@/g) || []).length;
        if(countAt == 0 && message.sender !== user.user_name) throw new Error(t.__('sendOnlyAsActiveAccount'));
        else if(countAt > 1) throw new Error('NO')
        else {
            let findOrganizationAccount = await queries.singleSelectQuery(null, '*', 'organization_account', {name:message.sender});

        }

    }
    else {
        throw new Error('do not recognise sender')
    }


    return true;
}
*/

async function simpleFilter(messages, search, user) {
    let filteredMessages = messages.filter(v => {
            let sender, attachment_names, a, cc
            sender = v['sender'].includes(search) && v['sender'] != user
            a = v['a'].includes(search) && v['a'] != user

            attachment_names = v['attachment_names'] !== null && v['attachment_names'].includes(search)
            cc = v['cc'] !== null && v['cc'].includes(search) && v['a'] != user;

            return v.subject.includes(search) ||
                v.text.includes(search) ||
                attachment_names ||
                cc ||
                sender ||
                a
        }
    )
    return filteredMessages
}


module.exports = {
    validateSender,
    simpleFilter
}