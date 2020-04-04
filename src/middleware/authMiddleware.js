import HttpClient from '@azteam/http-client';
import {ErrorException, TOKEN_EXPIRED} from '@azteam/error';
import jwt from 'jsonwebtoken';


const COOKIES_OPTIONS = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    httpOnly: true,
    signed: true,
    maxAge: 86400000 * 365 // 1 year
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
                            if (req.signedCookies.api) {
                                data = await cb_login_api(token);
                            }
                            throw new ErrorException(TOKEN_EXPIRED)
                        }
                    } else if (error.name === 'JsonWebTokenError') {
                        data = await cb_login_api(token);
                    }
                    if (data) {
                        res.addCookie(data);
                        jwt_data = jwt.decode(data.access_token);
                    }
                }
                if (jwt_data) {
                    req.user = jwt_data;
                } else {
                    res.cleanCookie(['access_token', 'refresh_token']);
                }
                return next();
            });
        }
        return next();
    };

}
