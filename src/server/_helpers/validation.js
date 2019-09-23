const _ = require('lodash')
const authHelpers = require('../_helpers/auth');

async function checkTrueFalse(val){
    if(val == 'true'){
        return true;
    }
    else if(val == 'false'){
        return false;
    }
    else {
        return null
    }
}

function validateCurrentPassword(password, currentPassword){
    return authHelpers.comparePass(currentPassword, password);
}

async function validatePasswordChange(t, user, body, keys) {
    try {
        let countPasswordKeys = 0;
        for(let key of keys){
            if(key.toLowerCase().includes('password')){
                countPasswordKeys += 1;
            }
        }
        if(countPasswordKeys !== 3) throw new Error(t.__('unexpectedParameters'));


        if(body.password !== body.confirmPassword) throw new Error(t.__('passwordsDoNotMatch'));

        if (body.password.length < 6) throw new Error(t.__('passwordLengthError'));


        if(authHelpers.comparePass(body.password, user.password)) throw new Error(t.__('passwordUsedPreviously'));
        else {
            body.password = authHelpers.createHash(body.password)
            delete body.confirmPassword;
            delete body.currentPassword;
            body['password_modified'] = 'now()';
        }

        return true;
    }
    catch(err){
        throw new Error(err.message)
    }
}

async function compareIncomingDataKeys(recieved, expected){
    return _.isEqual(recieved.sort(), expected.sort());
}

function checkIfDataKeysAllowed(recieved, expected){
    let allowed = true;
    for(let key of recieved){
        if(!expected.includes(key)) allowed = false;
    }
    return allowed;
}

async function validateEmail(t, email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(re.test(email))
        return true;
    else
        throw new Error(t.__('emailAddressNotValid'));
}

async function getFormDataKeys(data) {
    let mapped = [];
    Object.keys(data).map((v, i) => {
        Object.keys(data[v]).map((k, int) => {
            mapped.push(k);
        })
    });

    return mapped;
}


module.exports = {
    validateEmail,
    validatePasswordChange,
    validateCurrentPassword,
    getFormDataKeys,
    compareIncomingDataKeys,
    checkIfDataKeysAllowed,
    checkTrueFalse
}