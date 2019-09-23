const compose = require('koa-compose');
const Router = require('koa-router');
const importDir = require('import-dir');

const routerConfigs = [{folder: '../routes', prefix: '/api'}];

module.exports = () => {
    const composed = routerConfigs.reduce((prev, curr) => {
        const routes = importDir(curr.folder);
        const router = new Router({
            prefix: curr.prefix
        });

        Object.keys(routes).map(name => routes[name](router));

        return [router.routes(), router.allowedMethods(), ...prev];
    }, []);
    return compose(composed);
};
