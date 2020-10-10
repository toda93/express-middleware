function omitEmpty(data) {
    Object.keys(data).map(function(key, index) {
        let value = data[key];
        if (typeof value === 'string') {
        	
            value = value.trim();

            if (value === '' || value === 'NaN' || value === 'null' || value === 'undefined') {
                delete data[key];
            } else {

                data[key] = value;

                if (!isNaN(value)) {
                    data[key] = Number(value);
                }
            }

        } else {

            if (value === null || value === undefined || Number.isNaN(value)) {
                delete data[key];
            }
        }
    });
}



export default () => {
    return function(req, res, next) {
        req.body = omitEmpty(req.body);
        req.params = omitEmpty(req.params);
        req.query = omitEmpty(req.query);
        return next();
    }
}