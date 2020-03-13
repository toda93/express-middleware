export default (defaultLimit) => {
    return async (req, res, next) => {
        req.paginate = {};
        if (req.query.page) {
            req.paginate.page = Number(req.query.page);
            req.paginate.limit = req.query.limit ? Number(req.query.limit) : defaultLimit;
            req.paginate.offset = (req.paginate.page - 1) * req.paginate.limit;
        }
        return next();
    }
}