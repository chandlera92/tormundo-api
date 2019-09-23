/* TODO: Rethink Errors */

const Koa = require('koa');

const fs = require('fs');

const middleware = require('./config/middleware');
const routes = require('./config/routes');
const errors = require('./config/errors');

const i18n = require('koa-i18n')
const locale = require('koa-locale')

const app = new Koa();
const PORT = process.env.PORT || 1337;

locale(app);

app.use(i18n(app, {
    directory: __dirname + '/locales',
    locales: ['en', 'fr'],
    extension: '.json',
    modes: [
        function () {
            let locale = this.getLocaleFromHeader();

            if (!locale) return 'en';

            if (locale.length > 2) locale = locale.slice(0, 2);

            return locale;
        }
    ]
}));


errors.init(app);
app.use(middleware());
app.use(routes());

const server = app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});

module.exports = server;


