import rateLimit from 'express-rate-limit';
import { BLOCKED } from '@azteam/error';

export default function limitRequest(max = 10, seconds = 30) {
    return rateLimit({
        max,
        windowMs: seconds * 1000, // default 30 seconds
        message: {
            success: false,
            errors: [{
                'code': BLOCKED,
                'message': 'Too many request',
            }]
        }
    });

}