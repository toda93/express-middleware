export default (options = {}) => {
    options = {
        limit: 20,
        searchFields: [],
        sortFields: [],
        ...options
    };


    return async (req, res, next) => {
        req.resOptions = options;
        req.paginate = {
            limit: options.limit
        };
        if (req.query.limit) {
            req.paginate.limit = Number(req.query.limit);
            delete req.query.limit;

        }
        if (req.query.page) {
            req.paginate.page = Number(req.query.page);
            req.paginate.offset = (req.paginate.page - 1) * req.paginate.limit;

            delete req.query.page;
        }

        if (req.query.sort_by && options.sortFields.includes(req.query.sort_by)) {
            req.paginate.sort = {
                [req.query.sort_by]: req.query.sort_type === 'asc' ? 'asc' : 'desc'
            };

            delete req.query.sort_by;
            delete req.query.sort_type;
        }

        for (const key in req.query) {
            if (req.query.hasOwnProperty(key)) {
                const value = req.query[key];

                if (key.endsWith('_start')) {
                    const newKey = key.replace('_start', '');

                    req.query[newKey] = {
                        ...req.query[newKey],
                        $gte: value
                    }
                } else if (key.endsWith('_end')) {
                    const newKey = key.replace('_end', '');

                    req.query[newKey] = {
                        ...req.query[newKey],
                        $lt: value
                    }
                }


                if (!options.searchFields.includes(key)) {
                    delete req.query[key];
                }
            }
        }
        if (req.query.keywords) {
            req.query = {
                ...req.query,
                $text: {
                    $search: req.query.keywords
                }
            };
            delete req.query.keywords;
        }

        return next();
    }
}