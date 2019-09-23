const api_key = '';

const domain = '';

const nodemailer = require('nodemailer');
const mailgun = require('nodemailer-mailgun-transport');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

const auth = {
    auth: {
        api_key: api_key,
        domain: domain
    }
}

const transporter = nodemailer.createTransport(mailgun(auth));

const readHTMLFile = function (path, callback) {
    fs.readFile('./src/server/emails/templates/' + path + '.html', {encoding: 'utf-8'}, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        }
        else {
            callback(null, handlebars.compile(html));
        }
    });
};

async function sendEmail(email, params, subject, emailPath) {
    return new Promise((resolve, reject) => {
        readHTMLFile(emailPath, (err, html) => {
            transporter.sendMail({
                from: 'Alex <contact@sandbox0e1e0172c6af42e88c5a6970657f0ad6.mailgun.org>',
                to: email,
                subject: subject,
                html: html(params)
            }, function (err, info) {
                if (err) {
                    reject('Email could not be sent, please try again later.');
                }
                else {
                    resolve(info);
                }
            });
        })
    })
}

module.exports = {
    sendEmail
}
