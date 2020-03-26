import HttpClient from '@azteam/http-client';




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


export default (refreshTokenEndpoint, checkAPITokenEndpoint) => {
    return async (req, res, next) => {
        let token = req.signedCookies.access_token;

        if (token && token.startsWith('Bearer ')) {
            token = token.replace('Bearer ', '');
        }
        return jwt.verify(token, process.env.SECRET_KEY, async (error, jwt_data) => {
            if (error) {
                if (error.name === 'TokenExpiredError') {
                    const data = await refreshToken(refreshTokenEndpoint, {
                        refreshToken: req.signedCookies.refresh_token,
                        ip: req.ip,
                        agent: req.get('User-Agent')
                    });
                    if (data) {
                        res.cookie('access_token', data.access_token, {
                            httpOnly: true,
                            signed: true,
                            maxAge: 86400000 * 365 // 1 year
                        });
                        jwt_data = jwt.decode(data.access_token);
                    }
                } else if (error.name === 'JsonWebTokenError') {
                    const data = await getInfoByAPIToken(checkAPITokenEndpoint, token);
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