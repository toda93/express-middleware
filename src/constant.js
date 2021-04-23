export const HTTP_METHOD = {
    HEAD: 'HEAD',
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DEL: 'DELETE',
};

export const REQUEST_TYPE = {
    PARAMS: 'params',
    BODY: 'body',
    QUERY: 'query',
}

export const SET_COOKIES_OPTIONS = {
    domain: `.${process.env.DOMAIN}`,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'Lax',
    httpOnly: true,
    signed: true,
};

export const CLEAR_COOKIES_OPTIONS = {
    domain: `.${process.env.DOMAIN}`,
};