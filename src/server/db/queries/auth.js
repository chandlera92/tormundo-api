const knex = require('../connection');
const authHelpers = require('../../_helpers/auth');
const general = require('./general');
const bcrypt = require('bcryptjs');

const gravatar = require('gravatar');
const defaultAvatar = (email) => gravatar.url(email, {d: 'identicon'}, true);

function checkResetCode(params){
    return knex('password_reset')
        .select('*')
        .innerJoin('users', 'password_reset.user_id', 'users.id')
        .where({'password_reset.code': params.token})
        .then(res => res)
        .catch(err => err)

}

function searchBlackList(token) {
    return knex('blacklist')
        .where({token: token})
}

function addToBlacklist(token) {
    return knex('blacklist')
        .insert({token: token})
}

function registerUser(user) {
    return knex.transaction(async (trx) => {
        const salt = bcrypt.genSaltSync();

        user.password = bcrypt.hashSync(user.password, salt);

        let insertUser = await trx
            .insert(user)
            .into('users')
            .returning('*')
            .then(res => res[0])
            .catch(err => err);

        if (insertUser instanceof Error) throw new Error(insertUser.message);

        let code = await trx
            .insert({
                user_id: parseInt(insertUser.id),
                code: authHelpers.randomString(6)
            })
            .into('verification')
            .returning('*')
            .then(res => res[0].code)
            .catch(err => err);

        if (code instanceof Error) throw new Error(code.message)


        let profile = await trx
            .insert({
                user_id: insertUser.id,
                gravatar: defaultAvatar(insertUser.email)
            })
            .into('profile')
            .returning('*')
            .then(res => res[0])
            .catch(err => err);


        if (profile instanceof Error) throw new Error(profile.message);

        let result = {user: insertUser, code: code};


        return result

    })
        .then(res => res)
        .catch(err => err);
}

function findUserById(id) {
    return knex('users')
        .where({id: id})
        .first()
}

function findUserByEmail(email) {
    return knex('users')
        .where({email: email})
        .first()
}

function findUserByUserName(username) {
    return knex('users')
        .where({user_name: username})
        .first()
}

function updateUser(id, info) {
    return knex('users')
        .select('*')
        .where({id: id})
        .update(info)
        .returning('*')
}

function insertUserVerification(user) {
    return knex('verification')
        .insert({user_id: parseInt(user), code: authHelpers.randomString(6)})
        .returning('code')
}

function findUserVerificationEntry(id) {
    return knex('verification')
        .where({user_id: id})
        .first()
}

function refreshVerification(id) {
    return knex('verification')
        .select('*')
        .where({user_id: id})
        .update({code: authHelpers.randomString(6), created_at: new Date()})
        .returning('*')
}

function verifyUser(state) {
    return knex.transaction(async (trx) => {
        let updateUserRecord = await general.updateSingleQuery(trx, {verified: true}, 'users', {id: state.user.id}, '*');
        if (updateUserRecord instanceof Error) throw new Error(updateUserRecord.message);

        let removeVerificationRecord = await general.deleteQuery(trx, {id: state.user.id}, 'verification', '*');
        if (removeVerificationRecord instanceof Error) throw new Error(removeVerificationRecord.message);

        return updateUserRecord;
    })
        .then(res => res)
        .catch(err => err);
}


function createPasswordReset(id, code) {
    return knex('password-reset')
        .insert({user_id: parseInt(id), code: code})
        .returning('*')
}

function deletePasswordReset(id) {
    return knex('password-reset')
        .select('*')
        .where({user_id: id})
        .delete()
}

function updatePasswordReset(id, code) {
    return knex('password-reset')
        .select('*')
        .where({user_id: id})
        .update({code: code, created_at: new Date()})
}

function findPasswordResetById(id) {
    console.log(knex)
    return knex('password-reset')
        .where({user_id: id})
        .first()
}

function findPasswordResetByCode(code) {
    return knex('password-reset')
        .where({code: code})
        .first()
}

function logIn(email) {
    const userObject = "'id', users.id, 'password', users.password, 'user_name', users.user_name, 'gravatar', profile.gravatar";
    return knex('users')
        .select(knex.raw("json_build_object(" + userObject + ") as user, json_agg(json_build_object('id', organization.id, 'name', organization.name)) as organizations"))
        .innerJoin('profile', 'profile.user_id', 'users.id')
        .leftJoin('organization', 'users.id', 'organization.owner')
        // .innerJoin('organization_member', 'users.id', 'organization_member.user_id')
        .where({'users.email': email})
        .first()
        .groupBy('users.id', 'profile.id')
        .then(res => {
            return res
        })
        .catch(err => {
            return err
        })
}

module.exports = {
    registerUser,
    findUserById,
    findUserByEmail,
    findUserByUserName,
    insertUserVerification,
    findUserVerificationEntry,
    verifyUser,
    refreshVerification,
    searchBlackList,
    addToBlacklist,
    logIn,
    createPasswordReset,
    deletePasswordReset,
    updatePasswordReset,
    findPasswordResetById,
    findPasswordResetByCode,
    checkResetCode,
    updateUser
};

