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
import { encryptAES, decryptAES } from '@azteam/crypto';


const morgan = require('morgan');

import { ErrorException, errorCatch, NOT_FOUND } from '@azteam/error';


class SocketServer {
    
    
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

export default new SocketServer;