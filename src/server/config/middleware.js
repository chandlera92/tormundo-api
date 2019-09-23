const dotenv = require('dotenv').config();

const compose = require('koa-compose');
const logger = require('koa-logger')();
const passport = require('../auth/passport');
const koaBody = require('koa-body');
const cors = require('@koa/cors');

module.exports = () =>
    compose([
        logger,
        koaBody({ multipart: true }),
        passport.initialize(),
        cors()
    ])
