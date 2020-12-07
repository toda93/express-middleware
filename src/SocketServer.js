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
import morgan from 'morgan';

import { ErrorException, errorCatch, NOT_FOUND } from '@azteam/error';


function omitItem(item, guard) {
    if (item.toJSON) {
        item = item.toJSON();
    }
    if (_.isObject(item)) {
        return _.omit(item, guard);
    }
    return item;
}

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