const knex = require('../connection');

function getSingleProfileById(t, params) {
    return knex
        .select('*')
        .from('users')
       .innerJoin('profile', 'profile.user_id', 'users.id')
        .where({"user_name": params.userName})
        .first()
        .then(res => res)
        .catch(err => err)
}

function getAllProfiles(){
    return knex
        .select('profile.id as profileId', 'profile.first_name', 'profile.last_name', 'profile.description', 'profile.avatar_loc', 'profile.projects_supported', 'profile.amount_pledged', 'profile.public', 'users.user_name')
        .from('profile')
        .innerJoin('users', 'profile.user_id', 'users.id')
        .returning('*')
        .where('profile.public', true)
        .returning('*')
        .then(res => res)
        .catch(err => err)
}

module.exports = {
    getSingleProfileById,
    getAllProfiles
}