import path from 'path';

import http from 'http';
import express from 'express';
import helmet from 'helmet';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from 'morgan';
import _ from 'lodash';
import 'express-async-errors';

import { ErrorException, httpErrorHandler, NOT_FOUND } from '@azteam/error';

async function bindingController(app, controllerPaths) {
    const msg = [];
    _.map(controllerPaths, async (controllerPath) => {
        const { controller } = require(controllerPath);
        _.map(controller, async (item, key) => {

            msg.push({
                controller: path.basename(controllerPath, '.controller.js'),
                method: key,
                path: item.path,
                type: item.type
            });
            app[item.type.toLowerCase()](item.path, ...item.method);
        });
    });
    console.table(msg);
}

export async function startServer(
    port = 3000,
    controllerPaths = [],
    whiteList = [],
    appVariables = {
        SECRET_KEY: 'SECRET_KEY'
    },
    callback = null
) {

    const app = express();
    app.use(helmet());

    app.use(methodOverride());
    app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
    app.use(bodyParser.json({}));

    app.set('trust proxy', 1);

    _.map(appVariables, (value, key) => {
        app.set(key, value);
    });

    app.use(cookieParser(appVariables.SECRET_KEY));
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

            if (Array.isArray(guard)) {
                guard = [
                    ...guard,
                    '_id',
                    '__v',
                ];
            } else {
                guard = [];
            }

            if (!_.isEmpty(guard)) {
                if (_.isArray(data)) {
                    data = _.map(data, object => {
                        if (object.toJSON) {
                            object = object.toJSON();
                        }
                        return _.omit(object, guard);
                    });
                } else if (_.isObject(data)) {
                    if (data.toJSON) {
                        data = data.toJSON();
                    }
                    data = _.omit(data, guard);
                }
            }

            return res.json({
                success: true,
                data
            });
        };
        next();
    });

    await bindingController(app, controllerPaths);

    app.all('/', async (req, res) => {
        return res.success('welcome');
    });

    app.use((req, res) => {
        throw new ErrorException(NOT_FOUND);
    });

    app.use(httpErrorHandler);

    const server = http.Server(app);

    server.on('listening', () => {

        if (typeof callback === 'function') {
            callback('start');
        }
        console.info(`Server start at http://localhost:${server.address().port}`);
    });

    server.on('error', (error) => {
        if (typeof callback === 'function') {
            callback('error', error);
        }

        if (error.syscall !== 'listen') {
            throw error;
        }

        let bind = typeof port === 'string' ?
            'Pipe ' + port :
            'Port ' + port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                callback('error', bind + ' requires elevated privileges');
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                callback('error', bind + ' is already in use');
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    server.listen(port);
}