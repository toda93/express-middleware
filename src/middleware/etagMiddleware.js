import etag from 'etag';

import { HTTP_GET } from '../contant';


function floorToMinute(time, minutes) {
    const roundSecond = minutes * 60;
    time = time - (time % (Math.floor(time / roundSecond) * roundSecond));
    return time;
}

export default function(mTimeout = 5) {
    return async function(req, res, next) {
        if (req.method === HTTP_GET) {
            const etag_hash = etag(req.url + floorToMinute(Math.floor(Date.now() / 1000), mTimeout));
            if (req.headers['if-none-match'] === etag_hash) {
                return res.status(304).send();
            }
            res.setHeader('ETag', etag_hash);
        }
        return next();
    }
}