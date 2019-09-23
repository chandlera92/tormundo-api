const knex = require('../connection');
const bcrypt = require('bcryptjs');
const authHelpers = require('../../_helpers/auth')
const general = require('./general');
const uploadHelpers = require('../../_helpers/uploads');

/*
function updateUserProfileImage(id, path) {
    return knex('profile')
        .select('*')
        .where({id:id})
        .update({picture:path})
        .returning('*')
}
*/

function updateUserProfile(state, info) {
    return knex.transaction(async (trx) => {
        let uploadNewImage;

        // TODO: Shouldn't have to do two updates for user profile field if image has not been uploaded yet?

        let updateUserProfileFields = await general.updateSingleQuery(trx, info.fields, 'profile', {'user_id': state.user.id}, '*');
        if (updateUserProfileFields instanceof Error) throw new Error(updateUserProfileFields.message);

        if (state.uploadImage) {
            let imageId = updateUserProfileFields.profile_image_id;

            let getImage = info.files.profile_picture;
            let imageDest = 'users/' + state.user.id + '/profile';

            let uploadImage = await uploadHelpers.uploadFile(getImage, imageDest, null);
            if (uploadImage instanceof Error) throw new Error(uploadImage.message);

            let uploadedFile = {
                type: getImage.type,
                key: uploadImage.key,
                loc: uploadImage.Location
            };

            if (imageId) {
                uploadNewImage = await general.updateSingleQuery(trx, uploadedFile, 'profile_image', {id: updateUserProfileFields.profile_image_id}, '*');
            }
            else {
                uploadNewImage = await general.insertSingleQuery(trx, uploadedFile, 'profile_image', '*');
                updateUserProfileFields = await general.updateSingleQuery(trx, {profile_image_id: uploadNewImage.id}, 'profile', {'user_id': state.user.id}, '*');
                if (updateUserProfileFields instanceof Error) throw new Error(updateUserProfileFields.message);
            }

            if (uploadNewImage instanceof Error) throw new Error(uploadNewImage.message);

        }

        return {
            image: uploadNewImage,
            profile: updateUserProfileFields
        }
    })
        .then(res => res)
        .catch(err => err);


    /*  info['modified'] = 'now()'
      return knex('profile')
          .select('*')
          .where({user_id: params.id})
          .update(info)
          .returning('*')
          .then(res => {
              delete info['modified'];
              return {success: Object.keys(info).join(', '), res: res}
          })
          .catch(err => err)*/
}

function modifyUserSettings(params, info) {
    return knex('users')
        .select('*')
        .where(params)
        .update(info)
        .returning('*')
        .then(res => res[0])
        .catch(err => err)
}

/*
.select(knex.raw('json_agg(distinct (users.email as email, users.country_id as country_id, users.language_id as language_id, users.user_name as user_name, users.verified as verified)) as user, json_agg(distinct (profile.first_name as first_name, profile.last_name as last_name, profile.description as description, profile.gravatar as gravatar)) as profile'))
*/

function getUserAndProfile(state) {
    return knex
        .select(knex.raw("" +
            "json_build_object('email', users.email, 'country_id', users.country_id, 'language_id', users.language_id, 'user_name', users.user_name, 'verified', users.verified) as user, " +
            "json_build_object('first_name', profile.first_name, 'last_name', profile.last_name, 'description', profile.description, 'gravatar', profile.gravatar, 'gravatar_active', profile.gravatar_active, 'profile_image', profile_image.loc ,'isPublic',profile.public) as profile"))
        .from('users')
        .innerJoin('profile', 'profile.user_id', 'users.id')
        .leftJoin('profile_image', 'profile_image.id', 'profile.profile_image_id')
        .where({"users.id": state.user.id})
        .first()
        .then(res => res)
        .catch(err => err)
}

module.exports = {
    modifyUserSettings,
    updateUserProfile,
    getUserAndProfile
}