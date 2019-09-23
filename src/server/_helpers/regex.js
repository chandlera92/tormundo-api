module.exports = {
    alphaNumericWithSpace: new RegExp('^[a-zA-Z0-9 ]*$'),
    alphaNumeric: new RegExp('^[a-zA-Z0-9]+$'),
    numeric: new RegExp('^[0-9]*$'),
    validateOrgUserName: new RegExp('^[a-zA-Z0-9@]*$'),
    removeWhiteSpace: (string) => string.replace(/\s/g, "")
};