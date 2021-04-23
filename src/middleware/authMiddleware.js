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

export default function(cbRefreshToken, cbLoginAPI) {
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
                return jwt.verify(token, process.env.SECRET_KEY, async (error, jwtData) => {
                    if (error) {
                        try {
                            let data = null;
                            if (error.name === 'TokenExpiredError') {
                                if (signedCookies.refresh_token) {
                                    data = await cbRefreshToken(signedCookies.refresh_token);
                                } else if (signedCookies.api_key) {
                                    data = await cbLoginAPI(signedCookies.api_key);
                                }
                            } else if (error.name === 'JsonWebTokenError') {
                                data = await cbLoginAPI(token);
                            }
                            if (data) {
                                jwtData = jwt.decode(data.access_token);

                                res.addCookie([
                                    'access_token', data.access_token
                                ]);
                            }
                        } catch (e) {}
                    }
                    if (jwtData) {
                        req.user = jwtData;
                    }
                    return next();
                });
            }
        }


        return next();
    };

}