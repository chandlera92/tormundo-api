/* TODO: If token blacklisted, redirect to login page. */

const jwtStrategy = require('passport-jwt').Strategy;
const {ExtractJwt} = require('passport-jwt');
const queries = require('../../db/queries/auth')

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken('authorization'),
    secretOrKey: process.env.SECRET_KEY,
    passReqToCallback: true,
    state: true
};

module.exports = () => new jwtStrategy(opts, async (req, payload, done) => {
    try {
        let sbl = await queries.searchBlackList(req.header.authorization);

        if (sbl.length > 0) throw new Error('jwtExpired');

        let findUser = await queries.findUserById(payload.data);

        if (!findUser) throw new Error('Cannot find user');

        return done(null, findUser)
    }
    catch (err) {
        return done(err);
    }
});
