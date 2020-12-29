import { ErrorException } from '@azteam/error';
import jwt from 'jsonwebtoken';
import Cookies from 'universal-cookie';

import { CLEAR_COOKIES_OPTIONS } from '../cookie';


function systemLogin(userData = null) {
    let user = {};
    if (userData) {
        try {
            user = JSON.parse(userData);
        } catch (e) {}
    }
    return user;
}

const cookie = new Cookies();


export default function(cb_refresh_token, cb_login_api) {
    return async function(req, res, next) {

        const { headers, signedCookies } = req;


        if (headers['x-app-secret'] === process.env.SECRET_KEY) {
            req.user = systemLogin(headers['x-app-user']);
        } else {
            let token = signedCookies.access_token;

            if (headers.authorization && signedCookies.api_key != headers.authorization) {
                token = headers.authorization;
            }

            if (token) {
                token = token.replace('Bearer ', '');
                return jwt.verify(token, process.env.SECRET_KEY, async (error, jwt_data) => {
                    if (error) {
                        try {
                            let data = null;
                            if (error.name === 'TokenExpiredError') {
                                if (signedCookies.refresh_token) {
                                    data = await cb_refresh_token(signedCookies.refresh_token);
                                } else if (signedCookies.api_key) {
                                    data = await cb_login_api(signedCookies.api_key);
                                }
                            } else if (error.name === 'JsonWebTokenError') {
                                data = await cb_login_api(token);
                            }

                            if (data) {
                                jwt_data = jwt.decode(data.access_token);
                            }
                        } catch (e) {}
                    }
                    if (jwt_data) {
                        req.user = jwt_data;
                    } else {
                        cookie.remove('access_token', CLEAR_COOKIES_OPTIONS);
                        cookie.remove('refresh_token', CLEAR_COOKIES_OPTIONS);
                    }
                    return next();
                });
            }
        }


        return next();
    };

}