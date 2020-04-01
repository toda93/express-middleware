import HttpClient from '@azteam/http-client';
import { ErrorException, TOKEN_EXPIRED } from '@azteam/error';
import jwt from 'jsonwebtoken';


const COOKIE_OPTIONS = {
    httpOnly: true,
    signed: true,
    maxAge: 86400000 * 365 // 1 year
};

async function refreshToken(endpoint, data) {
    const client = new HttpClient();
    const res = await client.response.responseJSON().post(endpoint, data);
    if (res.success) {
        return res.data;
    }
    return false;
}

async function getInfoByAPIToken(endpoint, token) {
    const client = new HttpClient();
    const res = await client.responseJSON().get(`${endpoint}/${token}`);
    if (res.success) {
        return res.data;
    }
    return false;
}


export default (cb_refresh_token, cb_login_api) => {
    return async (req, res, next) => {
        let token = req.signedCookies.access_token || req.headers.authorization;
        if (token) {
            token = token.replace('Bearer ', '');

            return jwt.verify(token, process.env.SECRET_KEY, async (error, jwt_data) => {
                if (error) {
                    let data;
                    if (error.name === 'TokenExpiredError') {
                        if (req.signedCookies.refresh_token) {
                            data = await cb_refresh_token(req.signedCookies.refresh_token);
                        } else {
                            throw new ErrorException(TOKEN_EXPIRED)
                        }
                    } else if (error.name === 'JsonWebTokenError') {
                        data = await cb_login_api(token);
                    }
                    if (data) {
                        res.cookie('access_token', data.access_token, COOKIE_OPTIONS);
                        jwt_data = jwt.decode(data.access_token);
                    }
                }
                if (jwt_data) {
                    req.user = jwt_data;
                }
                return next();
            });
        }
        return next();    
    };

}