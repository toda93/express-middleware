import { isValidSign } from '@azteam/crypto';
import { ErrorException, SIGNATURE_FAILED } from '@azteam/error';
import etag from 'etag';

export default (req, res, next) => {
    if (req.method === 'GET') {
        const etag_hash = etag(req.url);
        if (req.headers['if-none-match'] === etag_hash) {
            return res.status(304).send();
        }
        res.setHeader('ETag', etag_hash);
    }
     return next();
};