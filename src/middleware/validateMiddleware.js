import { ErrorException, VALIDATE } from '@azteam/error';
import Validator from 'fastest-validator';


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


function validateRequired(field, value) {
    let error = null;
    if (value === undefined) {
        error = {
            field,
            code: 'VALIDATE_REQUIRED',
            message: `'${field}' is required`
        };
    }
    return error;
}

function validateLength(field, value, length) {
    let error = null;
    if (value !== undefined && value.length !== length) {
        error = {
            field,
            code: 'VALIDATE_LENGTH',
            message: `'${field}' length must be exactly ${length} characters`
        };
    }
    return error;
}

function validateMinLength(field, value, length) {

    let error = null;
    if (value !== undefined && value.length < length) {
        error = {
            field,
            code: 'VALIDATE_MIN_LENGTH',
            message: `'${field}' minimum length should be ${length} characters`
        };
    }
    return error;
}

function validateMaxLength(field, value, length) {
    let error = null;
    if (value !== undefined && value.length > length) {
        error = {
            field,
            code: 'VALIDATE_REQUIRED',
            message: `'${field}' maximum length should be ${length} characters`
        };
    }
    return error;
}

function validateIn(field, value, range) {
    let error = null;
    if (value !== undefined && !range.includes(value)) {
        error = {
            field,
            code: 'VALIDATE_IN',
            message: `'${field}' only accept range [${range.join(',')}]`
        };
    }
    return error;
}

export default (type, rules) => {
    return async (req, res, next) => {
        const errors = [];
        const reqData = omitData(req[type], Object.keys(rules));

        /* validate field */
        for (const field in rules) {
            if (rules.hasOwnProperty(field)) {
                const ruleData = rules[field];
                for (const rule in ruleData) {
                    if (ruleData.hasOwnProperty(rule)) {
                        const ruleValue = ruleData[rule];
                        let error = null;
                        switch (rule) {
                            case 'required':
                                error = validateRequired(field, reqData[field]);
                                break;
                            case 'length':
                                error = validateLength(field, reqData[field], ruleValue);
                                break;
                            case 'minLength':
                                error = validateMinLength(field, reqData[field], ruleValue);
                                break;
                            case 'maxLength':
                                error = validateMaxLength(field, reqData[field], ruleValue);
                                break;
                            case 'in':
                                error = validateIn(field, reqData[field], ruleValue);
                                break;
                        }
                        if (error) errors.push(error);
                    }
                }
            }

        }

        if (errors.length) {
            throw new ErrorException(VALIDATE, errors);
        }
        return next();
    }
}