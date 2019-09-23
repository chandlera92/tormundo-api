const bcrypt = require('bcryptjs');
const crypto = require('crypto');



function comparePass(userPassword, databasePassword) {
    return bcrypt.compareSync(userPassword, databasePassword);
}

function createHash(password){
    const salt = bcrypt.genSaltSync();
    return bcrypt.hashSync(password, salt);
}

function randomString(length) {
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

function createLink() {
    return crypto.randomBytes(20).toString('Hex')
}

async function findVerificationEntry(ctx, queries) {
    let req = ctx.request.body;

    let user = await queries.findUserByEmail(req.email)

    if (user == null) throw new Error('Email address not found in system');

    let verification = await queries.findUserVerificationEntry(user.id)

    ctx.state.user = user;

    return verification
}

async function generateUniqueLink(queries) {
    /* TODO: Unit test this? */
    let token = await createLink();

    while (await queries.findPasswordResetByCode(token).length > 0) {
        token = await createLink()
    }

    return token
}


module.exports = {
    comparePass,
    randomString,
    generateUniqueLink,
    findVerificationEntry,
    createHash
};