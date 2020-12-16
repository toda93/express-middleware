import { ErrorException, UNAUTHORIZED, PERMISSION } from '@azteam/error';


export default (roles = null, minLevel = 1) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new ErrorException(UNAUTHORIZED));
        }
        if (req.user.level < minLevel) {
            return next(new ErrorException(PERMISSION));
        }
        if (!roles || req.user.level === 100 || req.user.roles.some(r => roles.includes(r))) {
            return next();
        }
        return next(new ErrorException(PERMISSION));
    }
}