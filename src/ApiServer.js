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


class ApiServer {
    constructor(secretKey) {
        this.secretKey = secretKey;
        this.controllers = {};
        this.whiteList = [];
        this.debug = false;
    }
    setWhiteList(whiteList) {
        this.whiteList = whiteList;
        return this;
    }
    setDebug(debug) {
        this.debug = debug;
        return this;
    }
    addController(name, controller) {
        this.controllers[name] = controller;
        return this;
    }

    start(port) {
        if (!_.isEmpty(this.controllers)) {

            const app = express();
            app.use(helmet());

            app.use(methodOverride());
            app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
            app.use(bodyParser.json({}));

            app.set('trust proxy', 1);

            // _.map(appVariables, (value, key) => {
            //     app.set(key, value);
            // });

            app.use(cookieParser(this.secretKey));


            if (this.whiteList) {
                const whiteList = this.whiteList;
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
            }



            if (this.debug) {
                app.use(logger('dev'));
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

            const msg = [];
            _.map(this.controllers, (controller, name) => {
                _.map(controller, (item, key) => {
                    msg.push({
                        controller: name,
                        type: item.type,
                        method: key,
                        path: item.path,
                    });
                    app[item.type.toLowerCase()](item.path, ...item.method);
                });
            });
            console.table(msg);

            app.all('/', async (req, res) => {
                return res.success('welcome');
            });

            app.use((req, res) => {
                throw new ErrorException(NOT_FOUND);
            });

            app.use(httpErrorHandler);

            const server = http.Server(app);

            server.on('listening', () => {
                this._alert('listening', `Server start at http://localhost:${server.address().port}`);
            });

            server.on('error', (error) => {
                if (error.syscall !== 'listen') {
                    throw error;
                }

                let bind = typeof port === 'string' ?
                    'Pipe ' + port :
                    'Port ' + port;

                switch (error.code) {
                    case 'EACCES':
                        this._alert('EACCES', `${bind} requires elevated privileges`);
                        process.exit(1);
                        break;
                    case 'EADDRINUSE':
                        this._alert('EACCES', `${bind} is already in use`);
                        process.exit(1);
                        break;
                    default:
                        throw error;
                }
            });

            server.listen(port);

        } else {
            throw Error('No controllers in use');
        }
    }

    setAlertCallback(callback) {
        this.alertCallback = callback;
    }

    _alert(status, msg) {
        if (typeof this.alertCallback === 'function') {
            this.alertCallback(status, msg);
        } else {
            console.log(status, msg);
        }
    }
}

export default ApiServer;