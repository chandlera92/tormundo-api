const JWT = require('jsonwebtoken');

const passport = require('koa-passport');
const mkdirp = require('mkdirp');
const fs = require('fs');

/* TODO: Should this be a function? maybe not. */
const jwtErrors = (i18n) => {
    return {
        TokenExpiredError: i18n.__('jwtExpired'),
        JsonWebTokenError: i18n.__('jwtInvalid'),
        Error: i18n.__('jwtNotFound')
    }
};

/* TODO: Add testing for passportJWT*/
const passportJWT = async (ctx, next) => passport.authenticate('jwt', (err, user, info) => {
    try {
        if (err) throw new Error(err.message);
        if (info) throw new Error(jwtErrors(ctx.i18n)[info.name]);
        ctx.state.user = user;
        return next();
    }
    catch (err) {
        return handleResponse(ctx, 401, {message: err.message});
    }
})(ctx, next);

//const passportJWT = passport.authenticate('jwt', { session: false });

const passportLocal = (ctx, next) => passport.authenticate('local', (err, user) => {
    if (err) return handleResponse(ctx, 401, {message: err});
    ctx.state.user = user.user;
    ctx.state.organizations = user.organizations;
    return next()
})(ctx, next);

const handleResponse = (ctx, code, res) => {
    ctx.status = code;
    ctx.body = res
}

const checkIfTokenExpired = (token) => JWT.verify(token, process.env.SECRET_KEY, (err, decoded, info) => {
    if (err) return null;
    return true;
});

async function blockIfTokenSent(ctx, next) {
    let authHeader = ctx.headers.authorization;

    let verifyAuthHeader;

    authHeader ? verifyAuthHeader = await checkIfTokenExpired(authHeader) : verifyAuthHeader = null;

    if (verifyAuthHeader) return handleResponse(ctx, 401, {message: 'You are already logged in!'});

    return next();
}

const signToken = (id) => {
    console.log(id)
    // TODO: Fix this. Shouldn't have to prefix?
   // let prefix = process.env.NODE_ENV == 'development' ? '' : 'Bearer ';
    return JWT.sign({
        iss: 'realTest',
        data: id
    }, process.env.SECRET_KEY, {expiresIn: '1d'});
}


module.exports = {
    passportJWT,
    passportLocal,
    handleResponse,
    signToken,
    blockIfTokenSent
}
