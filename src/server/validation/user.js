const validation = require('../_helpers/validation');
const general = require('../_helpers/general');
const uploadHelpers = require('../_helpers/uploads');
const authHelpers = require('../_helpers/auth');
const authQueries = require('../db/queries/auth');

const uploadValidation = require('../_helpers/uploads');


const checkCountriesLength = require('../db/data/countries.json').length;
const checkLanguagesLength = require('../db/data/languages.json').length;

// TODO: check if empty objects passes validation check
// TODO: Assess form data validation checker method.
// TODO: Implement previous password restriction
// TODO: No error handling for name/desc, as all form data is treated as strings.
// TODO: Ensure that people cannot use text fields as file fields in messaging section.
async function modifyUserProfile(ctx, next) {
    try {
        // TODO: Redo testing for this.
        let fields = ctx.request.body.fields;
        let files = ctx.request.body.files;

        if (!files && !fields) throw new Error(ctx.i18n.__('formEmpty'));

        let fieldKeys = Object.keys(fields);
        let fileKeys = Object.keys(files);

        let expectedKeys = ['first_name', 'last_name', 'description', 'gravatar_active', 'public'];

        for (let key of fieldKeys) {
            if (!expectedKeys.includes(key)) throw new Error(ctx.i18n.__('unexpectedParameters'));
            if (key == 'public' || key == 'gravatar_active') {
                if (fields[key].length >= 0) {
                    fields[key] = await validation.checkTrueFalse(fields[key].toLowerCase());
                    if (fields[key] == null) throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key))
                }
                else {
                    throw new Error(ctx.i18n.__('expectedValueToBeBoolean', key))
                }
            }
        }

        if (fileKeys.length == 1 && fileKeys[0] == 'profile_picture') {
            // TODO: Make sure this fails if data is incorrect.
            let uploadLimits = {
                filesPermitted: 1,
                size: uploadValidation.calcMB(5),
                type: 'image'
            };
            await uploadValidation.validateUploads(ctx.i18n, files, uploadLimits)
            ctx.state.uploadImage = true;
        }
        else {
            ctx.state.uploadImage = false;
        }

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})

    }
}

async function modifyUserSettings(ctx, next) {
    try {
        let body = ctx.request.body;

        let expectedKeys = ['password', 'confirmPassword', 'currentPassword', 'email', 'language_id', 'country_id'];
        let recievedKeys = Object.keys(body);

        let keysMatch = await validation.checkIfDataKeysAllowed(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        let emailValid, uniqueEmail;


        // check current password in order to make any changes
        if (!body.currentPassword) throw new Error(ctx.i18n.__('currentPasswordRequired'));

        if (!validation.validateCurrentPassword(ctx.state.user.password, body.currentPassword)) throw new Error(ctx.i18n.__('passwordDoesNotMatchRecord'))
        else delete body.currentPassword

        // Email
        if (body.email) emailValid = await validation.validateEmail(ctx.i18n, body.email);

        if (emailValid) {
            uniqueEmail = await authQueries.findUserByEmail(body.email);
            if (body.email !== ctx.state.user.email && uniqueEmail) throw new Error(ctx.i18n.__('emailAddressExistsError'))
            else if (body.email == ctx.state.user.email) delete body.email;

            if (Object.keys(body).length == 0) return general.handleResponse(ctx, 200, {message: ctx.i18n.__('modifiedUserSettings')})

        }


        // Language/Country change
        if (body.language_id !== undefined) {
            if (typeof body.language_id !== 'number') throw new Error(ctx.i18n.__('expectedValueToBeNumber', 'language'));
            if (body.language_id < 1 || body.language_id > checkLanguagesLength) throw new Error(ctx.i18n.__('languageNotFound'))
        }
        if (body.country_id !== undefined) {
            if (typeof body.country_id !== 'number') throw new Error(ctx.i18n.__('expectedValueToBeNumber', 'country'));
            if (body.country_id < 1 || body.country_id > checkCountriesLength) throw new Error(ctx.i18n.__('countryNotFound'))
        }


        // Password change
        if (body.password || body.confirmPassword) await validation.validatePasswordChange(ctx.i18n, ctx.state.user, body, recievedKeys);


        return next();
    }

    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

module.exports = {
    modifyUserSettings,
    modifyUserProfile
}