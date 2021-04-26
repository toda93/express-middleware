import { ErrorException, VALIDATE } from '@azteam/error';
import Validator from 'fastest-validator';


const v = new Validator({
    messages: {
        // Register our new error message text
        json: "The '{field}' field must be an json string! Actual: {actual}"
    }
});
v.add("json", function({ schema, messages }, path, context) {
    try {
        JSON.parse(string);
    } catch (e) {
        return false;
    }

    return true;

    return {
        source: `

            try {
                JSON.parse(string);
            } catch (e) {
                ${this.makeError({ type: "jsonString",  actual: "value", messages })}
            }
            return value; 
        `
    };
});


/* remove empty field or not have validate field */
function omitData(data, inKeys = []) {
    Object.keys(data).map(function(key, index) {
        if (inKeys.includes(key)) {
            let value = data[key];
            if (typeof value === 'string') {
                value = value.trim();
                if (value === '' || value === 'NaN' || value === 'null' || value === 'undefined') {
                    delete data[key];
                } else {
                    data[key] = value;
                }
            } else {
                if (value === null || value === undefined || Number.isNaN(value)) {
                    delete data[key];
                }
            }
        } else {
            delete data[key];
        }
    });
    return data;
}

export default function(type, rules) {
    return async function(req, res, next) {
        const reqData = omitData(req[type], Object.keys(rules));

        /* validate field */
        const errors = v.validate(reqData, rules);

        if (Array.isArray(errors)) {
            return next(new ErrorException(VALIDATE, errors));
        }
        return next();
    }
}