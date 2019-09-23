async function testApi(ctx) {
    ctx.body = {
        status: 'success',
        message: ctx.i18n.__('Hello World')
    };
}

module.exports = (router) => {
    router.get('/', testApi);
};