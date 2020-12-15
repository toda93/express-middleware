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

    return async (socket, next) => {
        const {headers, signedCookies} = socket.request;

        if (headers['x-app-secret'] === process.env.SECRET_KEY) {
            socket.user = systemLogin(headers['x-app-user']);
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
                        socket.user = jwt_data;
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
