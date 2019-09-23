const validation = require('../_helpers/validation');
const general = require('../_helpers/general');

async function registration(ctx, next) {
    try {
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['email', 'password', 'user_name', 'country_id', 'language_id'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));



        await validation.validateEmail(ctx.i18n, ctx.request.body.email);

        if (ctx.request.body.password.length < 6)
            throw new Error(ctx.i18n.__('passwordLengthError'))
        else
            return next();
    }

    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function checkEmail(ctx, next) {
    try {
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['email']

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        await validation.validateEmail(ctx.i18n, ctx.request.body.email);

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function resetPassword(ctx, next) {
    try {
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['password']

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        if (ctx.request.body.password.length < 6) throw new Error(ctx.i18n.__('passwordLengthError'))

        return next();
    }

    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function verifyUser(ctx, next) {
    try {
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['code']

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        return next();
    }
    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

async function login(ctx, next) {
    try {
        let recievedKeys = Object.keys(ctx.request.body);
        let expectedKeys = ['email', 'password'];

        let keysMatch = await validation.compareIncomingDataKeys(recievedKeys, expectedKeys);
        if (!keysMatch) throw new Error(ctx.i18n.__('unexpectedParameters'));

        await validation.validateEmail(ctx.i18n, ctx.request.body.email);

        return next();
    }

    catch (err) {
        return general.handleResponse(ctx, 401, {message: err.message})
    }
}

module.exports = {
    registration,
    checkEmail,
    verifyUser,
    login,
    resetPassword
}