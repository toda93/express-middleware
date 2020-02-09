import http from 'http';
import express from 'express';
import helmet from 'helmet';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from 'morgan';
import _ from 'lodash';
import { ErrorException, httpErrorHandler, NOT_FOUND } from '@azteam/error';

async function bindingController(app, controllerPaths) {
    const msg = [];

    await _.map(controllerPaths, async (controllerPath) => {

        const { controller, name } = require(controllerPath);

        await _.map(controller, async (item, key) => {
            msg.push({
                service: process.env.SERVICE,
                controller: name,
                method: key,
                path: item.path,
                type: item.type.toUpperCase()
            });

            if (name !== 'index') {
                await app[item.type.toLowerCase()](`/${name}${item.path}`, ...item.method);
            } else {
                await app[item.type.toLowerCase()](`/${item.path}`, ...item.method);
            }

        });
    });

    console.table(msg);

}

export async function startServer(controllerPaths, whiteList = [], appVariable = {
    SECRET_KEY: 'SECRET_KEY'
}) {
    const app = express();
    app.use(helmet());

    app.use(methodOverride());
    app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
    app.use(bodyParser.json({}));

    app.set('trust proxy', 1);

    _.map(appVariable, (value, key) => {
        app.set(key, value);
    });

    app.use(cookieParser(appVariable.SECRET_KEY));
    app.use(cors({
        credentials: true,
        origin: (origin, callback) => {
            if (!origin ||
                origin.includes('localhost') ||
                whiteList.some(re => origin.match(re))) {
                callback(null, true)
            } else {
                callback(null, false)
            }
        },
    }));

    if (process.env.NODE_ENV === 'development') {
        app.use(logger('dev'));
    } else if (process.env.NODE_ENV === 'production') {
        // app.use(logger('combined'));
    }

    app.get('/favicon.ico', (req, res) => res.status(204).json({}));

    app.use(async function(req, res, next) {
        res.success = function(data, guard = []) {
            if (!_.isEmpty(guard) && false) {
                if (_.isArray(data)) {
                    data = _.map(data, object =>
                        _.omit(object, guard)
                    );
                } else {
                    if (data.rows) {
                        data.rows = _.map(data.rows, object =>
                            _.omit(object, guard)
                        );
                    } else {
                        if (_.isFunction(data.toJSON)) {
                            data = data.toJSON();
                        }
                        data = _.omit(data, guard);
                    }
                }
            }

            return res.json({
                success: true,
                data,
                options: req.filter_options,
            });
        };
        next();
    });

    await bindingController(app, controllerPaths);

    app.use((req, res) => {
        throw new ErrorException(NOT_FOUND);
    });

    app.use(httpErrorHandler);

    const server = http.Server(app);

    server.on('listening', () => {
        console.info(`Server ${process.env.SERVICE} start at http://localhost:${server.address().port}`);
    });

    server.on('error', (error) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        let bind = typeof process.env.APP_PORT === 'string' ?
            'Pipe ' + process.env.APP_PORT :
            'Port ' + process.env.APP_PORT;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    server.listen(process.env.APP_PORT);
}