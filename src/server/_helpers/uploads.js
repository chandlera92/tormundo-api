const fs = require('fs');
const _ = require('lodash');

const awsCredentials = {
    accessKeyId: '',
    secretAccessKey: '',
    region: 'eu-west-3'
};

const crypto = require("crypto");


var AWS = require('aws-sdk');
AWS.config.update(awsCredentials);

var s3 = new AWS.S3();

const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const removeFile = promisify(fs.unlink);


const allowedFileTypes = {
    image: ['jpeg', 'jpg', 'png']
};

async function validateUploads(t, files, params) {
    let checkFile;
    for (let k in files) {
        let multipleFiles = await validateAmountOfImagesInSingleField(t, files[k], params.filesPermitted);
        if (multipleFiles) {
            for (let file of files[k]) {
                checkFile = await uploadLimits(t, file, params.size, params.type);
            }
        }
        else {
            checkFile = await uploadLimits(t, files[k], params.size, params.type)
        }
    }
}

async function validateAmountOfImagesInSingleField(t, files, limit) {
    /* TODO: Do I need to check if single item constructor has name of File?? */
    if (files.constructor == Array && _.size(files) > limit) {
        throw new Error(t.__('fileUploadLimitReached', limit));
    }
    else if (files.constructor == Array) {
        return true;
    }
    else {
        return false;
    }
}

async function uploadLimits(t, file, size, type) {
    if (file.size > size) {
        throw new Error(t.__('fileSizeTooLarge', file.name, (size / 1000000) + "mb"));
    }
    // TODO: Change 'any' to wildcard option = '*'
    else if (type !== '*' && !allowedFileTypes[type].includes(file.type.split('/')[1])) {
        let fileTypeClone = allowedFileTypes[type];
        fileTypeClone[fileTypeClone.length - 1] = 'or ' + fileTypeClone[fileTypeClone.length - 1];
        throw new Error(t.__('fileFormatNotOfExpectedType', file.name, fileTypeClone.join(', ')));
    }
    else {
        return true;
    }
}

async function modifyFile(newFile, currentFile, dest, checkFiles) {
    try {
        const folderPath = process.env.NODE_ENV + '/' + dest + '/active/';

        let newKey = currentFile.key.split('/');
        let activeIndex = newKey.indexOf('active');
        newKey[activeIndex] = 'removed';

        //TODO: Random generation isn't foolpoof as files could potentially get overwritten in the removed folder.
        let newRand = crypto.randomBytes(16).toString("hex");

        if (checkFiles) {
            while (checkFiles.map(file => file.key.includes(newRand))[0]) {
                newRand = crypto.randomBytes(16).toString("hex");
            }
        }


        let fileBuffer = await readFile(newFile.path);
        if (fileBuffer instanceof Error) throw new Error(fileBuffer.message);

        const s3CopyParams = {
            Bucket: 'tormundo',
            CopySource: 'tormundo/' + currentFile.key,
            Key: newKey.join('/')
        };

        const s3Params = {
            Body: fileBuffer,
            Bucket: 'tormundo',
            Key: folderPath + (newRand + '-' + newFile.name),
            ContentType: newFile.type,
            ACL: 'public-read'
        };

        let s3Upload = await s3.copyObject(s3CopyParams)
            .promise()
            .then(async (data) => {
                let deleteFile = await s3.deleteObject({
                    Bucket: 'tormundo',
                    Key: currentFile.key
                })
                    .promise()
                    .then(data => {
                        return data
                    })
                    .catch(err => err);
                let uploadFile = await s3.upload(s3Params).promise().then(data => data).catch(err => err);
                let result = {deleted: deleteFile, moved: data, uploaded: uploadFile};
                result.moved.key = newKey.join('/');


                return result;
            })
            .catch(err => err);

        let removeFromTmp = await removeFile(newFile.path);
        if (removeFromTmp instanceof Error) throw new Error(removeFromTmp.message);

        return s3Upload;
    }
    catch (err) {
        return err;
    }

}

async function uploadPrivateFile(file, dest, checkFiles) {
    try {
        const folderPath = process.env.NODE_ENV + '/' + dest + '/active/';

        let fileBuffer = await readFile(file.path);
        if (fileBuffer instanceof Error) throw new Error(fileBuffer.message);

        let newRand = crypto.randomBytes(16).toString("hex");

        if (checkFiles) {
            while (checkFiles.map(file => file.key.includes(newRand))[0]) {
                newRand = crypto.randomBytes(16).toString("hex");
            }
        }

        const s3Params = {
            Body: fileBuffer,
            Bucket: 'tormundoprivate',
            Key: folderPath + (newRand + '-' + file.name),
            ContentType: file.type
            /*,
            ACL: 'public-read',*/
        };

        let upload = await s3.upload(s3Params).promise()
            .then(data => data)
            .catch(err => err);

        let getSignedUrl = s3.getSignedUrl('getObject', {
            Bucket: 'tormundoprivate',
            Key: upload.key,
            Expires: 60 * 5
        });

        let removeFromTmp = await removeFile(file.path);
        if (removeFromTmp instanceof Error) throw new Error(removeFromTmp.message);

        return upload;


    }
    catch (err) {
        console.log(err);
        return err;
    }
}

async function uploadFile(file, dest, checkFiles) {
    try {
        const folderPath = process.env.NODE_ENV + '/' + dest + '/active/';

        let fileBuffer = await readFile(file.path);
        if (fileBuffer instanceof Error) throw new Error(fileBuffer.message);

        let newRand = crypto.randomBytes(16).toString("hex");

        if (checkFiles) {
            while (checkFiles.map(file => file.key.includes(newRand))[0]) {
                newRand = crypto.randomBytes(16).toString("hex");
            }
        }

        const s3Params = {
            Body: fileBuffer,
            Bucket: 'tormundo',
            Key: folderPath + (newRand + '-' + file.name),
            ContentType: file.type,
            ACL: 'public-read',
        };

        let upload = await s3.upload(s3Params).promise()
            .then(data => data)
            .catch(err => err);

        let removeFromTmp = await removeFile(file.path);
        if (removeFromTmp instanceof Error) throw new Error(removeFromTmp.message);

        return upload;
    }
    catch (err) {
        return err;
    }
}

function calcMB(num) {
    return num * 1000000
}

module.exports = {
    uploadLimits,
    validateUploads,
    calcMB,
    uploadFile,
    uploadPrivateFile,
    modifyFile
}
