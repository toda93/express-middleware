import fs from 'fs';
import http from 'http';
import express from 'express';
import socketIO from 'socket.io';
import helmet from 'helmet';
import _ from 'lodash';
import 'express-async-errors';


const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

class SocketServer {

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

            const server = http.Server(express());

            const io = socketIO(server, {
                cors: {
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
                },
                wsEngine: 'eiows',
                perMessageDeflate: {
                    threshold: 32768
                }
            });

            io.use(wrap(helmet({
                frameguard: false
            })));


            _.map(this.middlewares, (middleware) => {
                io.use(wrap(middleware));
            });


            const msg = [];
            _.map(this.controllers, (obj) => {
                const controller = obj.controller;
                
                _.map(controller, (item, key) => {
                    item.path = obj.version.startsWith('v') ? `/${obj.version}${item.path}` : item.path;
                    
                    const nsp = io.of(item.path);

                    _.map(item.middlewares, (middleware) => {
                        nsp.use(wrap(middleware));
                    });

                    nsp.on('connection', item.method);



                    msg.push({
                        controller: obj.name,
                        version: obj.version,
                        method: key,
                        path: item.path,
                    });
                    
                });
            });

            console.table(msg);



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

export default SocketServer;
