export default (options = {}) => {
    options = {
    	limit: 50,
        searchFields: [],
        sortFields: [],
        ...options
    };


    return async (req, res, next) => {
        req.resOptions = options;
        req.paginate = {};
        if (req.query.page) {
            req.paginate.page = Number(req.query.page);
            req.paginate.limit = req.query.limit ? Number(req.query.limit) : options.limit;
            req.paginate.offset = (req.paginate.page - 1) * req.paginate.limit;

            delete req.query.page;
            delete req.query.limit;
        }

        if (req.query.sort_by && options.sortFields.includes(req.query.sort_by)) {
            req.paginate.sort = {[req.query.sort_by]: req.query.sort_type === 'asc' ? 'asc' : 'desc'};

            delete req.query.sort_by;
            delete req.query.sort_type;
        }

        for (const key in req.query) {
            if (req.query.hasOwnProperty(key) || options.searchFields.includes(key)) {
                delete req.query[key];
            }
        }

        return next();
    }
}
