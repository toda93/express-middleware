import jwt from 'jsonwebtoken';

import ApiServer from './ApiServer';

import signMiddleware from './middleware/signMiddleware';
import etagMiddleware from './middleware/etagMiddleware';
import paginateMiddleware from './middleware/paginateMiddleware';


function jwtSign(payload) {
    jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: TOKEN_TIME_LIFE + 'm' });
}


export {
    jwtSign,

    ApiServer,

    signMiddleware,
    etagMiddleware,
    paginateMiddleware,
}