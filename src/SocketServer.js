import fs from 'fs';
import http from 'http';
import express from 'express';
import socketIO from 'socket.io';
import helmet from 'helmet';
import _ from 'lodash';
import 'express-async-errors';
import { decryptAES, encryptAES } from '@azteam/crypto';
import { errorCatch, ErrorException, NOT_FOUND } from '@azteam/error';


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

    addGlobalMiddleware(middleware) {
        this.middlewares.push(middleware);
        return this;
    }

    startPort(port) {
        if (!_.isEmpty(this.controllers)) {

            const WHITE_LIST = this.whiteList;

            const server = http.Server(express());

            io.use(wrap(helmet({
                frameguard: false
            })));


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


            _.map(this.middlewares, (middleware) => {
                io.use(middleware);
            });


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
}

export default new SocketServer;