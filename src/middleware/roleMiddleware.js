export default (roles = null) => {
    return async (req, res, next) => {
        if (!req.user) {
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            throw new ErrorException(UNAUTHORIZED);
        }
        if (!roles || req.user.level === 100 || req.user.roles.some(r => roles.includes(r))) {
            return next();
        }
        throw new ErrorException(PERMISSION);
    }
}