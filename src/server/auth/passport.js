/* TODO: Work out serialize/deserialize users. (GET TEST COVERAGE HERE) */

const passport = require('koa-passport');
const knex = require('../db/connection');
const jwtStrat = require('./strategies/jwt')();
const localStrat = require('./strategies/local')();

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    knex('users').where({id}).first()
        .then((user) => {
            done(null, user);
        })
        .catch((err) => {
            done(err, null);
        });
});

passport.use('jwt', jwtStrat)
passport.use('local', localStrat)

module.exports = passport;
