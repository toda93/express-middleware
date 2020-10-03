import { ErrorException } from '@azteam/error';
import jwt from 'jsonwebtoken';



function systemLogin(userData = null) {
    let user = {};
    if (userData) {
        try {
            user = JSON.parse(userData);
        } catch (e) {}
    }
    return user;
}





export default (cb_refresh_token, cb_login_api) => {
    return async (req, res, next) => {
        if (req.headers['x-app-secret'] === process.env.SECRET_KEY) {
            req.user = systemLogin(req.headers['x-app-user']);
        } else {
            let token = req.signedCookies.access_token;

            if (req.headers.authorization && req.signedCookies.api_key != req.headers.authorization) {
                token = req.headers.authorization;
            }

            if (token) {
                token = token.replace('Bearer ', '');
                return jwt.verify(token, process.env.SECRET_KEY, async (error, jwt_data) => {
                    if (error) {
                        try {
                            let data = null;
                            if (error.name === 'TokenExpiredError') {
                                if (req.signedCookies.refresh_token) {
                                    data = await cb_refresh_token(req.signedCookies.refresh_token);
                                } else if (req.signedCookies.api_key) {
                                    data = await cb_login_api(req.signedCookies.api_key);
                                }
                            } else if (error.name === 'JsonWebTokenError') {
                                data = await cb_login_api(token);
                            }

                            if (data) {
                                res.addCookie(data);
                                jwt_data = jwt.decode(data.access_token);
                            }
                        } catch (e) {}
                    }
                    if (jwt_data) {
                        req.user = jwt_data;
                    } else {
                        res.cleanCookie(['access_token', 'refresh_token']);
                    }
                    return next();
                });
            }
        }


        return next();
    };

}