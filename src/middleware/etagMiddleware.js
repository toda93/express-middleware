import { ErrorException } from '@azteam/error';
import etag from 'etag';



function floorToMinute(time, minutes) {
    const roundSecond = minutes * 60;
    time = time - (time % (Math.floor(time / roundSecond) * roundSecond));
    return time;
}

export default (mTimeout = 5) => {
    return async (req, res, next) => {
        if (req.method === 'GET') {
            const etag_hash = etag(req.url + floorToMinute(Math.floor(Date.now() / 1000), mTimeout));
            if (req.headers['if-none-match'] === etag_hash) {
                return res.status(304).send();
            }
            res.setHeader('ETag', etag_hash);
        }
        return next();
    }
}