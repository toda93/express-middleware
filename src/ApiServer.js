import path from 'path';
import fs from 'fs';
import http from 'http';
import express from 'express';
import helmet from 'helmet';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import _ from 'lodash';
import 'express-async-errors';
import jwt from 'jsonwebtoken';
import { encyptAES, decryptAES } from '@azteam/crypto';


const morgan = require('morgan');

import { ErrorException, httpErrorHandler, NOT_FOUND } from '@azteam/error';


class ApiServer {
    constructor() {
        this.controllers = {};
        this.middlewares = [];
        this.whiteList = [];
        this.debug = false;
    }

    jwtSign(payload, mTTL = 15) {
        return jwt.sign({
            ...payload,
            exp: Math.floor(Date.now() / 1000) + (60 * mTTL),
        }, process.env.SECRET_KEY);
    }

    jwtDecode(token) {
        return jwt.decode(token);
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

    addMiddleware(controllers, middleware) {
        controllers.map(function(controller) {
            this.middlewares.push({
                controller,
                middleware
            });
        }, this);

        return this;
    }

    addControllersByPath(controllersPath) {
        const controllerFiles = fs.readdirSync(controllersPath);
        for (const fileName of controllerFiles) {
            if (fileName.includes('controller.js')) {
                const controller = require(`${controllersPath}/${fileName}`).default;
                this.addController(path.basename(fileName, '.controller.js'), controller);
            }
        }
        return this;
    }

    start(port) {
        if (!_.isEmpty(this.controllers)) {
            const COOKIES_OPTIONS = {
                secure: !this.debug,
                httpOnly: true,
                signed: true,
                maxAge: 86400000 * 365 // 1 year
            }
            
            const app = express();
            app.use(helmet({
                frameguard: false
            }));

            app.use(methodOverride());
            app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
            app.use(bodyParser.json({}));

            app.set('trust proxy', 1);

            app.use(cookieParser(process.env.SECRET_KEY));


            if (this.whiteList) {
                const whiteList = this.whiteList;
                app.use(cors({
                    credentials: true,
                    origin: (origin, callback) => {
                        if (!origin ||
                            whiteList.some(re => origin.match(re))) {
                            callback(null, true)
                        } else {
                            callback(null, false)
                        }
                    },
                }));
            }

            if (this.debug) {
                app.use(morgan('dev'));
            }

            app.get('/robots.txt', function(req, res) {
                res.type('text/plain');
                res.send("User-agent: *\nDisallow: /");
            });
            app.get('/favicon.ico', (req, res) => res.status(204).json({}));

            app.use(async function(req, res, next) {


                res.error = function(code, errors = []) {
                    throw new ErrorException(code, errors);
                }

                res.success = function(data, guard = [], force = false) {

                    if (Array.isArray(guard) && !force) {
                        guard = [
                            ...guard,
                            '__v',
                            'updated_at',
                            'created_at',
                            'created_id',
                            'modified_at',
                            'modified_id',
                        ];
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
                            if (data.docs) {
                                data.docs = _.omit(data.docs, guard);
                            } else {
                                data = _.omit(data, guard);

                            }
                        }
                    }

                    return res.json({
                        success: true,
                        data
                    });
                };

                res.cleanCookie = function(data) {
                    _.map(data, (name) => {
                        res.clearCookie(name);
                    });
                }
                res.addCookie = function(data) {
                    _.map(data, (value, key) => {
                        res.cookie(key, value, COOKIES_OPTIONS);
                    });
                }
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

                    let middlewares = [];
                    const mid = _.find(this.middlewares, (item) => item.controller === name || item.controller === '*');
                    if (mid) {
                        middlewares.push(mid.middleware);
                    }
                    app[item.type.toLowerCase()](item.path, ...middlewares, ...item.method);
                });
            });
            console.table(msg);

            app.get('/cors/:hash', function(req, res) {
                const cookies = JSON.parse(decryptAES(req.params.hash, process.env.SECRET_KEY));
                res.addCookie(cookies);
                return res.success('welcome');
            });

            app.all('/', async (req, res) => {
                if (req.headers['sec-fetch-dest'] === 'iframe' || req.headers['sec-fetch-mode'] === 'cors') {
                    const hash = encyptAES(JSON.stringify(req.signedCookies), process.env.SECRET_KEY);
                    return res.redirect(req.protocol + '://' + req.get('host') + '/cors/' + hash);
                }
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

            return server;

        } else {
            throw Error('No controllers in use');
        }
        return null;
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

export default new ApiServer;
