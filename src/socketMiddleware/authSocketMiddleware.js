import { ErrorException } from '@azteam/error';
import jwt from 'jsonwebtoken';



function systemLogin(userData = null) {
    let user = {};
    if (userData) {
        try {
            user = JSON.parse(userData);
        } catch (e) {}
    }
    return user;
}


export default (cb_refresh_token, cb_login_api) => {
    return async (socket, next) => {
    
        return next();
    };

}