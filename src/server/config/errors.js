(function (errorConfig) {

    'use strict';

    // *** error handling *** //

    errorConfig.init = function (app) {
        app.use(async (ctx, next) => {
            try {
                await next();
                if (ctx.status === 404) {
                    ctx.status = 404;
                    ctx.body = {message: 'Page does not exist!'}
                }
            } catch (err) {
                ctx.status = err.status || 500;
                ctx.body = { message: err.message };
            }
        });

     /*   // catch 404 and forward to error handler
        /!*        app.use(function(ctx, next) {
                    const err = new Error('Not found!!!');
                    err.status = 404;
                    next(err);
                });*!/
        app.use(async (ctx, next) => {
            try {
                await next()
                if (ctx.status === 404) ctx.body = 'Page does not exist!'
            }
            catch (err) {
                if (app.env == 'development') {
                    ctx.status = err.status || 500;
                    //ctx.body = err;
                    ctx.throw(500,'Error Message');

                 //  ctx.throw(500, {message: err.message, error: JSON.stringify(err)})
                    /!*  ctx.body = {
                          message: err.message,
                          error: err
                      }*!/
                    //ctx.app.emit('error', err, ctx)
                }
                else {
                    ctx.status = err.status || 500;
                    ctx.body = err;
                }

            }
        })

        /!*     // development error handler (will print stacktrace)
             if (app.env === 'development') {
                 console.log(app.env)
                 app.use(function(err, ctx) {
                     ctx.status = err.status || 500;
                     ctx.body = {
                         message: err.message,
                         error: err
                     }
                 });
             }

             app.use(function(err, ctx) {
                 ctx.status = err.status || 500;
                 ctx.body = {
                     message: err.message,
                     error: {}
                 }
             });
     *!/
        /!*  // production error handler (no stacktraces leaked to user)
          app.use(function(err, ctx) {
              ctx.status(err.status || 500).send({
                  message: err.message,
                  error: {}
              });
          });*!/
*/
    };

})(module.exports);
