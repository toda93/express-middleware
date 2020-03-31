import { ErrorException, UNAUTHORIZED, PERMISSION } from '@azteam/error';


export default (roles = null) => {
    return async (req, res, next) => {
        if (!req.user) {
            throw new ErrorException(UNAUTHORIZED);
        }
        if (!roles || req.user.level === 100 || req.user.roles.some(r => roles.includes(r))) {
            return next();
        }
        throw new ErrorException(PERMISSION);
    }
}