const generalQueries = require('../db/queries/general');
const helpers = require('../_helpers/general');

// TODO: Set up testing for this.

// GET: general/locales
async function getLocales(ctx) {
    try {
        let getCountries = await generalQueries.selectAllQuery(null, 'json_agg(countries) as countries', 'countries', '');
        let getLanguages = await generalQueries.selectAllQuery(null, 'json_agg(languages) as languages', 'languages', '');

        const result = {
            languages: getLanguages[0].languages,
            countries: getCountries[0].countries
        };

        return helpers.handleResponse(ctx, 200, result)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err})
    }
}

module.exports = (router) => {
    router.get('/general/locales', getLocales);
};