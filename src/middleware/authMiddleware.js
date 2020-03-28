import HttpClient from '@azteam/http-client';
import { ErrorException, TOKEN_EXPIRED } from '@azteam/error';




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


export default (cb_refresh_token, cb_api_key) => {
    return async (req, res, next) => {
        let token = req.headers.authorization || req.signedCookies.access_token;

        if (token && token.startsWith('Bearer ')) {
            token = token.replace('Bearer ', '');
        }

        return jwt.verify(token, process.env.SECRET_KEY, async (error, jwt_data) => {
            if (error) {
                if (error.name === 'TokenExpiredError') {
                    if (req.signedCookies.refresh_token) {
                        const access_token = await cb_refresh_token(req.signedCookies.refresh_token);
                        if (data) {
                            res.cookie('access_token', data.access_token, {
                                httpOnly: true,
                                signed: true,
                                maxAge: 86400000 * 365 // 1 year
                            });
                            jwt_data = jwt.decode(access_token);
                        }
                    } else {
                        throw new ErrorException(TOKEN_EXPIRED)
                    }
                } else if (error.name === 'JsonWebTokenError') {
                    const data = await cb_api_key(token);
                    data && (jwt_data = data);
                }
            }
            if (jwt_data) {
                req.user = jwt_data;
            }
            return next();
        });
    };

}