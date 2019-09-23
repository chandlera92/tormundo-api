const queries = require('../db/queries/profile');
const helpers = require('../_helpers/general');
const generalQueries = require('../db/queries/general');

// get : /profile/
async function getAllProfiles(ctx) {
    try {
        let getProfiles = await queries.getAllProfiles();

        return helpers.handleResponse(ctx, 200, {profiles: getProfiles})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

// get : /profile/:id
async function getSingleProfile(ctx) {
    try {
        let params = ctx.params;
        let getProfile = await queries.getSingleProfileById(ctx.i18n, params);

        let test = await generalQueries.singleSelectQuery(null, '*', 'users', {user_name: params.userName} );

        return helpers.handleResponse(ctx, 200, {profile: getProfile})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

module.exports = (router) => {
    router.get('/profile/:userName', getSingleProfile)
    //router.get('/profile/:id', getSingleProfile)
    router.get('/profile/', getAllProfiles)

}
