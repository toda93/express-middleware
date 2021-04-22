import fs from 'fs';
import http from 'http';
import express from 'express';
import helmet from 'helmet';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import _ from 'lodash';
import 'express-async-errors';
import { decryptAES, encryptAES } from '@azteam/crypto';
import { errorCatch, ErrorException, NOT_FOUND, UNKNOWN } from '@azteam/error';

import { SET_COOKIES_OPTIONS, CLEAR_COOKIES_OPTIONS } from './constant';

function omitItem(item, guard) {
    if (item.toJSON) {
        item = item.toJSON();
    }
    if (_.isObject(item)) {
        return _.omit(item, guard);
    }
    return item;
}



class ApiServer {
    constructor(currentDir = '', options = {}) {
        this.options = options;
        
        this.middlewares = [];
        this.controllers = [];
        this.whiteList = [];
        this.debug = process.env.NODE_ENV === 'development';

        this.initController(currentDir);


    }


    setCallbackError(callback = null) {
        this.callbackError = callback;
        return this;
    }

    setWhiteList(whiteList) {
        this.whiteList = whiteList;
        return this;
    }

    setDebug(debug) {
        this.debug = debug;
        return this;
    }

    addController(name, version, controller) {
        this.controllers.push({
            name,
            version,
            controller
        });
        return this;
    }

    initController(apiDir) {
        if (apiDir) {
            const controllerDirs = fs.readdirSync(apiDir);

            for (const dirName of controllerDirs) {
                if (fs.statSync(`${apiDir}/${dirName}`).isDirectory()) {
                    const versionDirs = fs.readdirSync(`${apiDir}/${dirName}`);

                    for (const versionName of versionDirs) {
                        const controller = require(`${apiDir}/${dirName}/${versionName}/controller`).default;
                        this.addController(dirName, versionName, controller);
                    }
                }
            }
        }
        return this;
    }

    addGlobalMiddleware(middleware) {
        this.middlewares.push(middleware);
        return this;
    }


    startPort(port) {
        if (!_.isEmpty(this.controllers)) {

            const WHITE_LIST = this.whiteList;


            const app = express();
            app.use(helmet({
                frameguard: false
            }));

            app.use(methodOverride());
            app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
            app.use(bodyParser.json({ limit: '5mb' }));

            app.set('trust proxy', 1);

            app.use(cookieParser(process.env.SECRET_KEY));


            app.use(cors({
                credentials: true,
                origin: function(origin, callback) {
                    if (
                        !origin || !WHITE_LIST.length ||
                        WHITE_LIST.some(re => origin.endsWith(re))) {
                        callback(null, true)
                    } else {
                        callback(new Error(`${origin} Not allowed by CORS`));
                    }
                },
            }));

            if (this.debug) {
                app.use(morgan('dev'));
            }

            app.get('/robots.txt', function(req, res) {
                res.type('text/plain');
                res.send('User-agent: *\nDisallow: /');
            });
            app.get('/favicon.ico', (req, res) => res.status(204).json({}));

            app.use(async function(req, res, next) {
                req.trackDevice = {
                    ip: req.ip,
                    device: req.get('X-DEVICE') || req.get('User-Agent'),
                    device_id: req.get('X-DEVICE-ID') || 'web',
                    os: req.get('X-OS') || 'web',
                }


                res.error = function(code, errors = []) {
                    throw new ErrorException(code, errors);
                }

                res.success = function(data = {}, guard = [], allows = []) {
                    if (data) {
                        guard = [
                            ...guard,
                            '__v',
                            '_id',
                            'deleted_at',
                            'updated_at',
                            'created_id',
                            'modified_id'
                        ];

                        if (_.isArray(data) || data.docs) {
                            guard = [
                                ...guard,
                                'metadata_disable',
                                'metadata_title',
                                'metadata_keywords',
                                'metadata_description',
                                'metadata_image_url',
                            ];
                        }

                        guard = _.difference(guard, allows);

                        if (_.isArray(data)) {
                            data = _.map(data, item => {
                                return omitItem(item, guard);
                            });
                        } else if (_.isObject(data)) {
                            if (data.docs) {
                                data.docs = _.map(data.docs, item => {
                                    return omitItem(item, guard);
                                });
                            } else {
                                data = omitItem(data, guard);
                            }
                        }
                    }

                    return res.json({
                        success: true,
                        data,
                        options: req.resOptions,
                    });
                };

                res.cleanCookie = function(data) {
                    _.map(data, (name) => {
                        res.clearCookie(name, CLEAR_COOKIES_OPTIONS);
                    });
                }
                res.addCookie = function(data) {
                    _.map(data, (value, key) => {
                        const maxAge = 86400000 * 365; // 1 year
                        res.cookie(key, value, {
                            ...SET_COOKIES_OPTIONS,
                            maxAge,
                            expires: new Date(Date.now() + maxAge)
                        });
                    });
                }
                next();
            });

            _.map(this.middlewares, (middleware) => {
                app.use(middleware);
            });

            const msg = [];
            _.map(this.controllers, (obj) => {
                const controller = obj.controller;
                _.map(controller, (item, key) => {
                    item.path = obj.version.startsWith('v') ? `/${obj.version}${item.path}` : item.path;

                    msg.push({
                        controller: obj.name,
                        version: obj.version,
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

            app.use((e, req, res, next) => {
                const error = errorCatch(e);

                if (error.errors[0].code === UNKNOWN) {
                    console.error(req.originalUrl, e);
                }

                if (this.callbackError) {
                    this.callbackError(error);
                }

                return res.status(error.status).json({ success: false, errors: error.errors });
            });

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

            return server;

        } else {
            throw Error('No controllers in use');
        }
        return null;
    }

    setAlertCallback(callback) {
        this.alertCallback = callback;
        return this;
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