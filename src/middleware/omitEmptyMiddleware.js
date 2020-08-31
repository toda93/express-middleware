import omitEmpty from 'omit-empty';


export default () => {
    return function(req, res, next) {
        req.body = omitEmpty(req.body);
        req.params = omitEmpty(req.params);
        req.query = omitEmpty(req.query);
        return next();
    }
}