import rateLimit from 'express-rate-limit';
import {BLOCKED} from '@azteam/error';

export default function limitRequest(max = 10) {
    return rateLimit({
        max,
        windowMs: 30 * 1000, // 30 seconds
        message: {
            success: false,
            errors: [{
                'code': BLOCKED,
                'message': 'Too many request',
            }]
        }
    });

}