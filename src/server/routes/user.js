const queries = require('../db/queries/user');
const authQueries = require('../db/queries/auth');
const helpers = require('../_helpers/general');
const uploadHelpers = require('../_helpers/uploads');
const emails = require('../emails/index');
const validateUserRoutes = require('../validation/user');


// GET: /user
async function getUser(ctx) {
    try {
        const state = ctx.state;

        const getInfo = await queries.getUserAndProfile(state);

        return helpers.handleResponse(ctx, 200, getInfo)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// patch : /user/profile
async function modifyUserProfile(ctx) {
    try {
        let state = ctx.state;
        let info = ctx.request.body;

        let updateUserProfile = await queries.updateUserProfile(state, info);
        if (updateUserProfile instanceof Error) throw new Error(updateUserProfile.message);

        /* if (body.avatar_loc) {
             let uploadImage = await uploadHelpers.uploadFile(body.avatar_loc, user.id, 'profile');
             if (uploadImage instanceof Error) throw new Error(uploadImage);
             body['avatar_loc'] = uploadImage.loc;
         }*/

        //let updateUserProfile = await queries.updateUserProfile(user, body);

        /*
        * {
            message: ctx.i18n.__('successfullyUpdatedProfile'),
            updated: ctx.i18n.__('successfullyUpdatedFollowingFields', updateUserProfile.success)
        }
        *
        * */

        updateUserProfile.message = ctx.i18n.__('successfullyUpdatedProfile');

        return helpers.handleResponse(ctx, 200, updateUserProfile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// patch : /user/settings
async function modifyUserSettings(ctx) {
    try {
        let user = ctx.state.user;
        let body = ctx.request.body;

        let updateSettings = await queries.modifyUserSettings({id: user.id}, body);
        if (updateSettings instanceof Error) throw new Error(updateSettings);

        return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('modifiedUserSettings')})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}


module.exports = (router) => {
    router.get('/user', helpers.passportJWT, getUser);
    router.patch('/user/modify-settings', helpers.passportJWT, validateUserRoutes.modifyUserSettings, modifyUserSettings);
    router.patch('/user/modify-profile', helpers.passportJWT, validateUserRoutes.modifyUserProfile, modifyUserProfile);

}


