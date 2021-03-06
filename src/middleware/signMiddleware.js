import { isValidSign } from '@azteam/crypto';
import { ErrorException, SIGNATURE_FAILED } from '@azteam/error';




export default function(secretKey, mTimeout = 5) {
    return async function(req, res, next) {
        if (req.query.sign) {
            let url = `${req.protocol}://${req.hostname}${req.originalUrl}`;
            if (isValidSign(url, secretKey, mTimeout)) {
                return next();
            }
        }
        return next(new ErrorException(SIGNATURE_FAILED));
    }
}