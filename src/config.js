export const SET_COOKIES_OPTIONS = {
    domain: process.env.DOMAIN,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'Lax',
    httpOnly: true,
    signed: true,
    maxAge: 86400000 * 365 // 1 year
};

export const CLEAR_COOKIES_OPTIONS = {
    domain: process.env.DOMAIN
};