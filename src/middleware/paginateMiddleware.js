export default (defaultLimit) => {
    return async (req, res, next) => {
        req.paginate = {
            page: 1,
            limit: defaultLimit
        };
        if (req.query.page) {
            req.paginate.page = Number(req.query.page);
            req.paginate.limit = req.query.limit ? Number(req.query.limit) : req.paginate.limit;
            req.paginate.offset = (req.paginate.page - 1) * req.paginate.limit;
        }
        return next();
    }
}