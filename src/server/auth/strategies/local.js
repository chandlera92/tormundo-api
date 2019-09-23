const LocalStrategy = require('passport-local').Strategy;

const queries = require('../../db/queries/auth');
const authHelpers = require('../../_helpers/auth');

const opts = {
    usernameField: 'email'
};

module.exports = () => new LocalStrategy(opts, async (username, password, done) => {
    try {
        console.log(username)
        console.log(password)
        let user = await queries.logIn(username);

        if(user instanceof Error) throw new Error(user.message);
        // todo: this should be in locales file (the error warning);
        if (!user || !authHelpers.comparePass(password, user.user.password)) throw new Error('Email or Password is incorrect, Please check and try again.');



        return done(null, user);
    }
    catch(err) {
        return done(err, false)
    }
});
