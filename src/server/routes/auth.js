/* TODO: Think about requiring user to use different password than last 5 attempts. */


const moment = require('moment');
const bcrypt = require('bcryptjs');

const queries = require('../db/queries/auth');
const helpers = require('../_helpers/general');
const authHelpers = require('../_helpers/auth');
const emails = require('../emails/index');
const validateRoutes = require('../validation/auth');
const generalQueries = require('../db/queries/general');

// get : /auth/forgot-password
async function accessForgotPassword(ctx) {
    try {

        return helpers.handleResponse(ctx, 200, {
            access: true,
        })
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// get : /auth/generate_verification
async function generateNewVerification(ctx) {
    try {

        /* TODO REDO TESTING FOR THIS. (NO LONGER A POST REQUEST) */
        let state = ctx.state;
        if (state.user.verified) throw new Error(ctx.i18n.__('accountAlreadyVerifiedError'));

        let verification = await generalQueries.singleSelectQuery(null, '*', 'verification', {user_id: state.user.id});
        let code;

        /* TODO: Store refresh verifications in new table? probably not. */
        /* TODO: Fix this, don't need to call queries in other folder.*/
        if (verification) {
            code = await queries.refreshVerification(state.user.id);
        }
        else {
            code = await queries.insertUserVerification(state.user.id);
        }

        /*      await emails.sendEmail(
                  state.user.email,
                  {name: state.user.user_name, verificationCode: code},
                  ctx.i18n.__('newVerificationCodeSubject'),
                  ctx.i18n.locale + '/verification-code-generated'
              );*/

        return helpers.handleResponse(ctx, 200, {message: 'New code created! Please check email'})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }

}

// post : /auth/register
async function registerUser(ctx) {
    try {
        let user = ctx.request.body;

        const checkIfUserEmailExists = await queries.findUserByEmail(user.email);
        const checkIfUserNameExists = await queries.findUserByUserName(user.user_name);

        if (checkIfUserEmailExists) throw ctx.i18n.__('emailAddressExistsError');
        if (checkIfUserNameExists) throw ctx.i18n.__('userNameExistsError');

        const registeredUser = await queries.registerUser(user);

        if (registeredUser instanceof Error) throw new Error(registeredUser)

        // TODO: Figure out how to send proper error message if email fails to send
        // TODO: Set up so gravatar is returned

        //await
        /*      emails.sendEmail(
                  registeredUser.user.email,
                  {name: registeredUser.user.user_name, verificationCode: registeredUser.code},
                  ctx.i18n.__('accountRegisteredSubject'),
                  ctx.i18n.locale + '/registration-confirmed'
              );*/

        const token = await helpers.signToken(registeredUser.user.id);


        return helpers.handleResponse(ctx, 200, {
            message: ctx.i18n.__('accountSuccessfullyRegistered'), auth: {
                user_name: registeredUser.user.user_name,
                token: token
            }
        });
    } catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

// post : /auth/verify
async function verifyUser(ctx) {
    try {
        const state = ctx.state;

        let getVerification = await generalQueries.singleSelectQuery(null, '*', 'verification', {user_id: state.user.id});
        if (getVerification instanceof Error) throw new Error(getVerification.message);
        if (getVerification == null) throw new Error(ctx.i18n.__('verificationCodeNotFound'));

        if (ctx.request.body.code !== getVerification.code)
            throw new Error(ctx.i18n.__('verificationCodeIncorrect'));
        else if (moment().diff(getVerification.created_at, 'minutes') > 120)
            throw new Error(ctx.i18n.__('verificationCodeExpired'));
        else {
            const verifyUser = await queries.verifyUser(state);

            await emails.sendEmail(
                verifyUser.email,
                {name: verifyUser.user_name},
                ctx.i18n.__('verificationCompleteSubject'),
                ctx.i18n.locale + '/verification-complete'
            );

            return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('verificationSuccess')})

        }
        /*   let verification = await authHelpers.findVerificationEntry(ctx, queries);

           if (verification == null) throw new Error(ctx.i18n.__('verificationCodeNotFound'))

           if (moment().diff(verification.created_at, 'minutes') > 120)
               throw new Error(ctx.i18n.__('verificationCodeExpired'));
           else if (ctx.request.body.code !== verification.code)
               throw new Error(ctx.i18n.__('verificationCodeIncorrect'));
           else {
               const verifyUser = await queries.verifyUser(verification.user_id);

               await emails.sendEmail(
                   verifyUser.email,
                   {name: verifyUser.user_name},
                   ctx.i18n.__('verificationCompleteSubject'),
                   ctx.i18n.locale + '/verification-complete'
               )
               }
   */

    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }


}

// post : /auth/login
async function userLogin(ctx) {
    try {
        //todo: login by email / username?
        //todo: Get profile back also in order to save profile picture to local storage on front end. You'll have to do this later, and it will bore you.


        console.log(ctx.state.user)
        const token = await helpers.signToken(ctx.state.user.id);
        console.log(token)
        let authInfo = {
            organizations: ctx.state.organizations,
            token: token,
            user_name: ctx.state.user.user_name,
            gravatar: ctx.state.user.gravatar + '&s=50'
        };

        return helpers.handleResponse(ctx, 200, {message: 'Successfully Logged In!', auth: authInfo})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

// get : /auth/logout
async function userLogout(ctx) {
    try {
        await queries.addToBlacklist(ctx.header.authorization);

        return helpers.handleResponse(ctx, 200, {message: 'Successfully logged out'})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }

}

// post : /auth/forgot-password
async function forgotPassword(ctx) {
    /*TODO: Should we be sending back an error if they email doesn't exist? You can look at the network tab and see the response. Kickstarter does this wrong. */
    /*TODO: Should you be blocked if you're already signed in? Probably. */
    try {
        let user = ctx.request.body;


        let getUser = await queries.findUserByEmail(user.email);

        if (!getUser) throw ctx.i18n.__('emailAddressDoesNotExist');

        let uniqueLink = await authHelpers.generateUniqueLink(queries);


        console.log(1)
        let passwordResetPreviouslyRequested = await queries.findPasswordResetById(getUser.id);

        console.log(2)
        console.log(passwordResetPreviouslyRequested);

        let passwordResetEntry = passwordResetPreviouslyRequested
            ? await queries.updatePasswordReset(getUser.id, uniqueLink)
            : await queries.createPasswordReset(getUser.id, uniqueLink);

        console.log(passwordResetEntry)


        let emailParams = {
            name: getUser.user_name,
            url: 'http://localhost:4200/reset-password/' + uniqueLink
        };

        console.log(emailParams)

        await emails.sendEmail(
            getUser.email,
            emailParams,
            ctx.i18n.__('passwordResetSubject'),
            ctx.i18n.locale + '/forgot-password'
        );

        return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('passwordResetRequestComplete')});
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }


}

// post/get : /auth/reset-password/:token
async function checkResetToken(ctx, next) {
    try {
        /*    if (ctx.params.token.length !== 40) throw new Error(ctx.i18n.__('resetPasswordTokenInvalid'));

            let getUser = await queries.findPasswordResetByCode(ctx.params.token);

            if (!getUser) throw new Error(ctx.i18n.__('resetPasswordTokenExpired'));

            ctx.state.user = getUser;

            if (moment().diff(getUser.created_at, 'minutes') > 10) throw new Error(ctx.i18n.__('resetPasswordTokenExpired'));
    */

        let getReset = await queries.checkResetCode(ctx.params);
        if (getReset instanceof Error) throw new Error(getReset.message);

        return helpers.handleResponse(ctx, 200, getReset)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }

}

// get /auth/reset-password/:token
async function directToPasswordReset(ctx) {
    return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('resetPasswordTokenValid')})
}

// post /auth/reset-password/:token
async function resetPassword(ctx) {
    try {
        let user = await ctx.state.user;


        const salt = bcrypt.genSaltSync();

        let info = {password: bcrypt.hashSync(ctx.request.body.password, salt)};

        let updatedUser = await queries.updateUser(user.user_id, info);
        await queries.deletePasswordReset(user.user_id);

        await emails.sendEmail(
            updatedUser[0].email,
            {name: updatedUser[0].user_name},
            ctx.i18n.__('passwordUpdatedSubject'),
            ctx.i18n.locale + '/password-reset'
        );

        return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('passwordChangedSuccessfully')});
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

async function test(ctx) {
    try {
        return helpers.handleResponse(ctx, 200, {message: 'hello'});
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

module.exports = (router) => {
    router.post('/auth/register', helpers.blockIfTokenSent, validateRoutes.registration, registerUser);
    router.post('/auth/verify', helpers.passportJWT, validateRoutes.verifyUser, verifyUser);
    router.post('/auth/login', helpers.blockIfTokenSent, validateRoutes.login, helpers.passportLocal, userLogin);
    router.get('/auth/generate_verification', helpers.passportJWT, generateNewVerification);
    router.get('/auth/test', test);
    router.get('/auth/logout', helpers.passportJWT, userLogout);
    router.post('/auth/forgot-password', validateRoutes.checkEmail, forgotPassword);
    router.get('/auth/reset-password/:token', checkResetToken);
    router.post('/auth/reset-password/:token', checkResetToken, validateRoutes.resetPassword, resetPassword);
};
