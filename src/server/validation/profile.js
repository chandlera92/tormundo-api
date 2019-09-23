const validation = require('../_helpers/validation');
const general = require('../_helpers/general');

async function modifyUserSettings(ctx, next) {
    try {
        let body = ctx.request.body;

        let expectedKeys = ['password', 'confirmPassword', 'currentPassword', 'email', 'language_id', 'country_id'];
        let recievedKeys = Object.keys(body);

        let keysMatch = await validation.checkIfDataKeysAllowed(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));



        return next();
    }

    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

module.exports = {

}