import { isValidSign } from '@azteam/crypto';
import { ErrorException, SIGNATURE_FAILED } from '@azteam/error';
import etag from 'etag';




export default (mTimeout = 5) => {
    return async (req, res, next) => {
        if (req.query.sign) {
            if (req.method === 'GET') {
                const etag_hash = etag(req.url);
                if (req.headers['if-none-match'] === etag_hash) {
                    return res.status(304).send();
                }
                res.setHeader('ETag', etag_hash);
            }
            const secretKey = req.app.get('SECRET_KEY');
            let url = `${req.protocol}://${req.hostname}${req.originalUrl}`;
            if (isValidSign(url, secretKey, mTimeout)) {
                return next();
            }
        }
        throw new ErrorException(SIGNATURE_FAILED);
    }
}