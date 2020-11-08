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
import jwt from 'jsonwebtoken';
import { decryptAES, encryptAES } from '@azteam/crypto';
import { errorCatch, ErrorException, NOT_FOUND } from '@azteam/error';

import omitEmptyMiddleware from './middleware/omitEmptyMiddleware';

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

    static jwtSign(payload, mTTL = 15) {
        return jwt.sign({
            ...payload,
            exp: Math.floor(Date.now() / 1000) + (60 * mTTL),
        }, process.env.SECRET_KEY);
    }


    constructor(currentDir = '') {

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
            const SET_COOKIES_OPTIONS = {
                domain: process.env.DOMAIN,
                secure: process.env.NODE_ENV !== 'development',
                sameSite: 'Lax',
                httpOnly: true,
                signed: true,
                maxAge: 86400000 * 365 // 1 year
            };

            const CLEAR_COOKIES_OPTIONS = {
                domain: process.env.DOMAIN
            };

            const WHITE_LIST = this.whiteList;


            const app = express();
            app.use(helmet({
                frameguard: false
            }));

            app.use(methodOverride());
            app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
            app.use(bodyParser.json({}));

            app.set('trust proxy', 1);

            app.use(cookieParser(process.env.SECRET_KEY));


            app.use(cors({
                credentials: true,
                origin: (origin, callback) => {
                    if (
                        !origin || !WHITE_LIST.length ||
                        WHITE_LIST.some(re => origin.endsWith(re))) {
                        callback(null, true)
                    } else {
                        callback(new Error('Not allowed by CORS'));
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

                res.error = function(code, errors = []) {
                    throw new ErrorException(code, errors);
                }

                res.success = function(data = {}, guard = [], allows = []) {
                    guard = [
                        ...guard,
                        '__v',
                        '_id',
                        // 'status',
                        'deleted_at',
                        'updated_at',
                        // 'created_at',
                        'created_id',
                        // 'modified_at',
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
                        res.cookie(key, value, SET_COOKIES_OPTIONS);
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

            app.get('/cors/:hash', function(req, res) {
                const cookies = JSON.parse(decryptAES(req.params.hash, process.env.SECRET_KEY));
                res.addCookie(cookies);
                return res.success('welcome');
            });

            app.all('/', async (req, res) => {
                if (req.query.host && WHITE_LIST.some(re => req.query.host.match(re))) {
                    const hash = encryptAES(JSON.stringify(req.signedCookies), process.env.SECRET_KEY);
                    return res.redirect(req.query.host + '/cors/' + hash);
                }
                return res.success('welcome');
            });

            app.use((req, res) => {
                throw new ErrorException(NOT_FOUND);
            });

            app.use((e, req, res, next) => {
                const error = errorCatch(e);

                if (process.env.NODE_ENV === 'development') {
                    console.log(error.errors);
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