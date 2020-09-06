import {ErrorException, VALIDATE} from '@azteam/error';


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


export default (type, rules) => {
    return async (req, res, next) => {
        const errors = [];
        const reqData = req[type];

        for (const field in rules) {
            if (rules.hasOwnProperty(field)) {
                const ruleData = rules[field];
                for (const rule in ruleData) {
                    if (ruleData.hasOwnProperty(rule)) {
                        const value = ruleData[rule];
                        let error = null;
                        switch (rule) {
                            case 'required':
                                error = validateRequired(field, reqData[field]);
                                break;
                            case 'length':
                                error = validateLength(field, reqData[field], value);
                                break;
                            case 'minLength':
                                error = validateMinLength(field, reqData[field], value);
                                break;
                            case 'maxLength':
                                error = validateMaxLength(field, reqData[field], value);
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
